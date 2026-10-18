const path = require('path');
const readline = require('readline');
const qrcode = require('qrcode-terminal');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { SqliteStore } = require('./sqlite-store');
const { listGroups, getGroupParticipants, saveGroupCsv } = require('./whatsapp-extractor');
const log = require('./logger');

// Compartilha o mesmo armazenamento SQLite da GUI
const store = new SqliteStore({ dbPath: path.join(__dirname, 'session.db') });

const client = new Client({
  authStrategy: new RemoteAuth({
    clientId: 'main',
    store,
    backupSyncIntervalMs: 5 * 60 * 1000,
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1050767301-alpha.html',
    strict: false,
  },
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

function perguntar(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(texto, (resposta) => {
      rl.close();
      resolve(resposta.trim());
    })
  );
}

client.on('qr', (qr) => {
  log.info('AUTH', 'Aguardando leitura do QR Code pelo WhatsApp...');
  console.log('\nEscaneie o código abaixo no celular:');
  console.log('(WhatsApp > Aparelhos conectados > Conectar um aparelho)\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  log.success('AUTH', 'Autenticado com sucesso! Carregando dados...');
});

client.on('auth_failure', (msg) => {
  log.error('AUTH', `Falha de autenticação: ${msg}`);
});

client.on('disconnected', (reason) => {
  log.warn('CLIENT', `WhatsApp desconectado: ${reason}`);
});

client.on('remote_session_saved', () => {
  log.success('AUTH', 'Sessão sincronizada com o banco local session.db');
});

client.on('ready', async () => {
  log.success('CLIENT', 'WhatsApp Web pronto e conectado!');
  log.info('GROUPS', 'Iniciando sincronização de grupos...');

  let grupos = [];
  const maxTentativas = 5;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    log.info('GROUPS', `Verificando grupos (tentativa ${tentativa}/${maxTentativas})...`);
    await new Promise((r) => setTimeout(r, tentativa === 1 ? 3000 : 4000));
    try {
      grupos = await listGroups(client);
      if (grupos && grupos.length > 0) break;
    } catch (err) {
      log.warn('GROUPS', `Tentativa ${tentativa}/${maxTentativas} falhou: ${err.message}`);
    }
  }

  if (!grupos || grupos.length === 0) {
    log.error('GROUPS', 'Nenhum grupo encontrado na conta conectada.');
    await client.destroy();
    store.close();
    process.exit(0);
  }

  log.success('GROUPS', `Total de grupos encontrados: ${grupos.length}`);
  console.log(`\n=== GRUPOS DISPONÍVEIS (${grupos.length}) ===\n`);
  grupos.forEach((g, i) => {
    const qtd = g.size > 0 ? `${g.size} membros` : 'tamanho pendente';
    console.log(`  ${String(i + 1).padStart(3)}) ${g.name} (${qtd})`);
  });

  console.log('\nOpções de extração:');
  console.log(' - O número do grupo (ex: 1)');
  console.log(' - Vários grupos separados por vírgula (ex: 1, 3, 5)');
  console.log(' - "todos" para extrair todos os grupos da lista');
  const resposta = await perguntar('\nSua escolha: ');

  let escolhidos = [];
  if (resposta.toLowerCase() === 'todos') {
    escolhidos = grupos;
  } else {
    const indices = resposta
      .split(',')
      .map((n) => parseInt(n.trim(), 10) - 1)
      .filter((i) => i >= 0 && i < grupos.length);
    escolhidos = [...new Set(indices)].map((i) => grupos[i]);
  }

  if (escolhidos.length === 0) {
    log.warn('CLI', 'Nenhuma opção válida selecionada. Encerrando.');
    await client.destroy();
    store.close();
    process.exit(1);
  }

  log.info('EXTRACT', `Iniciando extração de ${escolhidos.length} grupo(s)...`);
  for (let i = 0; i < escolhidos.length; i++) {
    const g = escolhidos[i];
    const itemStart = Date.now();
    log.info('EXTRACT', `[${i + 1}/${escolhidos.length}] Extraindo membros de "${g.name}"...`);

    const progressTimer = setInterval(() => {
      const elapsed = ((Date.now() - itemStart) / 1000).toFixed(1);
      log.info('EXTRACT', `Processando "${g.name}"... (${elapsed}s decorridos)`);
    }, 3000);

    try {
      const dados = await getGroupParticipants(client, g.id);
      clearInterval(progressTimer);
      const { filename } = saveGroupCsv(dados.name, dados.participants);
      const totalSec = ((Date.now() - itemStart) / 1000).toFixed(2);
      log.success('EXTRACT', `Grupo "${g.name}": ${dados.participants.length} contatos exportados em ${totalSec}s para "${filename}"`);
    } catch (err) {
      clearInterval(progressTimer);
      log.error('EXTRACT', `Erro ao extrair grupo "${g.name}": ${err.message || err}`);
    }
  }

  log.success('CLI', 'Todas as extrações foram finalizadas com sucesso!');
  await client.destroy();
  store.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  log.info('CLI', 'Encerrando script...');
  try {
    await client.destroy();
  } catch (_) {}
  store.close();
  process.exit(0);
});

log.info('CLI', 'Iniciando navegador Puppeteer em segundo plano...');
client.initialize();
