const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const QRCode = require('qrcode');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { SqliteStore } = require('./sqlite-store');
const { listGroups, getGroupParticipants } = require('./whatsapp-extractor');
const log = require('./logger');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '127.0.0.1'; // apenas local

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const msg = (err) => (err && err.message ? err.message : String(err));

// Sessão armazenada em SQLite local (session.db)
const store = new SqliteStore({ dbPath: path.join(__dirname, 'session.db') });

process.on('unhandledRejection', (err) => log.error('REJECTION', msg(err)));
process.on('uncaughtException', (err) => log.error('EXCEPTION', msg(err)));

const state = {
  status: 'starting', // starting | qr | loading | ready | error
  message: 'Iniciando WhatsApp...',
  qr: null,
  groups: [],
  error: null,
};

let client = null;
let loadingGroups = false;
const participantsCache = new Map(); // id -> { data, timestamp }
const sseClients = new Set();
let currentBatch = null; // { cancelRequested: boolean }

function broadcastEvent(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (_) {
      sseClients.delete(res);
    }
  }
}

function setState(patch) {
  Object.assign(state, patch);
  broadcastEvent('state', state);
}

// Heartbeat keepalive para conexões SSE ativas
setInterval(() => {
  for (const res of sseClients) {
    try {
      res.write(': keepalive\n\n');
    } catch (_) {
      sseClients.delete(res);
    }
  }
}, 20000);

function parseJsonBody(req, limit = 1048576) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('Corpo da requisição excede o limite'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Formato JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

async function runBatchExtraction(ids) {
  if (currentBatch) {
    throw new Error('Já existe uma extração em lote em andamento.');
  }

  currentBatch = { cancelRequested: false };
  const total = ids.length;
  const results = [];

  log.info('BATCH', `Iniciando extração em lote de ${total} grupos...`);
  broadcastEvent('batch_start', { total });

  try {
    for (let i = 0; i < total; i++) {
      if (currentBatch.cancelRequested) {
        log.warn('BATCH', `Extração em lote cancelada pelo usuário após ${i} grupos.`);
        broadcastEvent('batch_cancelled', { current: i, total, results });
        return { cancelled: true, results };
      }

      const id = ids[i];
      const groupInfo = (state.groups || []).find((g) => g.id === id) || { id, name: id };
      broadcastEvent('batch_progress', {
        current: i + 1,
        total,
        groupId: id,
        groupName: groupInfo.name,
        percentage: Math.round((i / total) * 100),
      });

      try {
        const data = await getParticipants(id, false);
        results.push(data);
        broadcastEvent('batch_item_done', {
          current: i + 1,
          total,
          groupId: id,
          groupName: data.name,
          participantsCount: data.participants ? data.participants.length : 0,
          percentage: Math.round(((i + 1) / total) * 100),
        });
      } catch (err) {
        log.error('BATCH', `Erro ao extrair grupo "${groupInfo.name}": ${msg(err)}`);
        results.push({
          id,
          name: groupInfo.name,
          error: msg(err),
          participants: [],
        });
        broadcastEvent('batch_item_error', {
          current: i + 1,
          total,
          groupId: id,
          groupName: groupInfo.name,
          error: msg(err),
          percentage: Math.round(((i + 1) / total) * 100),
        });
      }

      // Pequena pausa para desafogar o loop de eventos e Puppeteer
      await sleep(350);
    }

    log.success('BATCH', `Extração em lote de ${total} grupos concluída!`);
    broadcastEvent('batch_complete', { total, results });
    return { cancelled: false, results };
  } finally {
    currentBatch = null;
  }
}

async function stopClient() {
  const old = client;
  client = null;
  loadingGroups = false;
  if (!old) return;

  log.info('CLIENT', 'Encerrando cliente WhatsApp anterior...');

  if (state.status === 'ready' && old.authStrategy && old.authStrategy.storeRemoteSession) {
    try {
      log.info('CLIENT', 'Realizando backup da sessão antes do encerramento...');
      await Promise.race([old.authStrategy.storeRemoteSession(), sleep(15000)]);
    } catch (err) {
      log.warn('CLIENT', `Backup final da sessão: ${msg(err)}`);
    }
  }

  try {
    await Promise.race([old.destroy(), sleep(8000)]);
    log.info('CLIENT', 'Cliente anterior finalizado');
  } catch (err) {
    log.warn('CLIENT', `Erro ao fechar cliente: ${msg(err)}`);
  }
}

async function startClient() {
  await stopClient();
  setState({
    status: 'starting',
    message: 'Iniciando WhatsApp...',
    qr: null,
    groups: [],
    error: null,
  });

  log.info('CLIENT', 'Iniciando nova instância do WhatsApp com RemoteAuth...');

  const c = new Client({
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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  client = c;
  const live = () => c === client;

  c.on('qr', async (qr) => {
    if (!live()) return;
    log.info('AUTH', 'Novo QR Code gerado pelo WhatsApp (aguardando leitura pelo celular)');
    try {
      const dataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 });
      if (live()) {
        setState({
          status: 'qr',
          qr: dataUrl,
          message: 'Aguardando leitura do QR code',
        });
      }
    } catch (err) {
      log.error('AUTH', `Erro ao gerar DataURL do QR Code: ${msg(err)}`);
    }
  });

  c.on('authenticated', () => {
    if (live()) {
      log.success('AUTH', 'Sessão autenticada com sucesso! Carregando dados...');
      setState({
        status: 'starting',
        qr: null,
        message: 'Autenticado com sucesso! Carregando WhatsApp...',
      });
    }
  });

  c.on('auth_failure', (m) => {
    if (live()) {
      log.error('AUTH', `Falha de autenticação: ${m}`);
      setState({
        status: 'error',
        qr: null,
        error: 'Falha de autenticação: ' + m,
        message: 'Falha de autenticação',
      });
    }
  });

  c.on('disconnected', (reason) => {
    if (live()) {
      log.warn('CLIENT', `WhatsApp desconectado: ${reason}`);
      setState({
        status: 'error',
        qr: null,
        groups: [],
        error: 'Desconectado: ' + reason + '. Clique em "Reiniciar conexão".',
        message: 'Desconectado',
      });
    }
  });

  c.on('ready', () => {
    if (live()) {
      log.success('CLIENT', 'WhatsApp Web pronto e conectado!');
      loadGroups();
    }
  });

  c.on('remote_session_saved', () => {
    log.success('AUTH', 'Sessão remota salva e sincronizada com session.db');
  });

  try {
    log.info('CLIENT', 'Inicializando navegador Puppeteer...');
    await c.initialize();
  } catch (err) {
    if (live()) {
      log.error('CLIENT', `Não foi possível iniciar o WhatsApp: ${msg(err)}`);
      setState({
        status: 'error',
        qr: null,
        error: msg(err),
        message: 'Não foi possível iniciar o WhatsApp',
      });
    }
  }
}

async function loadGroups() {
  const c = client;
  if (!c || loadingGroups) return;
  loadingGroups = true;
  participantsCache.clear();
  setState({ status: 'loading', message: 'Carregando grupos...', error: null });

  let lastErr = null;
  try {
    for (let i = 1; i <= 5; i++) {
      log.info('GROUPS', `Carregando lista de grupos (tentativa ${i}/5)...`);
      await sleep(i === 1 ? 3000 : 3500);
      if (c !== client) return;

      try {
        const groups = await listGroups(c);
        if (groups && groups.length > 0) {
          if (c === client) {
            log.success('GROUPS', `Sucesso: ${groups.length} grupos carregados e prontos para extração`);
            setState({
              status: 'ready',
              groups,
              message: `${groups.length} grupos encontrados`,
              error: null,
            });
          }
          return;
        }
      } catch (err) {
        lastErr = err;
        log.warn('GROUPS', `Tentativa ${i}/5 falhou: ${msg(err)}`);
        if (c === client) {
          setState({ message: `Carregando grupos... tentativa ${i}/5 (${msg(err)})` });
        }
      }
    }

    if (c === client) {
      log.error('GROUPS', `Esgotadas as tentativas de carregar grupos: ${msg(lastErr)}`);
      setState({
        status: 'error',
        message: 'Não foi possível carregar os grupos',
        error: msg(lastErr) || 'Nenhum grupo encontrado ou tempo limite esgotado.',
      });
    }
  } finally {
    loadingGroups = false;
  }
}

async function getParticipants(id, forceRefresh = false) {
  const c = client;
  if (!c || state.status !== 'ready') {
    throw new Error('O WhatsApp ainda não está conectado.');
  }

  if (!forceRefresh && participantsCache.has(id)) {
    const entry = participantsCache.get(id);
    if (Date.now() - entry.timestamp < 5 * 60 * 1000) {
      log.info('CACHE', `Retornando participantes do cache em memória para o grupo ${id}`);
      return entry.data;
    }
  }

  let lastErr = null;
  for (let i = 1; i <= 2; i++) {
    try {
      const data = await getGroupParticipants(c, id);
      participantsCache.set(id, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      lastErr = err;
      log.warn('EXTRACT', `Tentativa ${i}/2 ao extrair participantes (${id}): ${msg(err)}`);
      if (i < 2) await sleep(800);
    }
  }
  throw lastErr || new Error('Não foi possível obter participantes.');
}

function sendJson(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const startAt = Date.now();
  const url = new URL(req.url, 'http://localhost');

  const logDone = (status) => {
    log.http(req.method, url.pathname, status, Date.now() - startAt);
  };

  try {
    if (req.method === 'GET' && url.pathname === '/') {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
      return logDone(200);
    }

    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      // Envia o estado atual imediatamente no momento da conexão
      res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
      sseClients.add(res);
      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      sendJson(res, 200, state);
      // Log /api/state only on status changes or errors to keep console readable
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/batch-extract') {
      try {
        const body = await parseJsonBody(req);
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length) {
          sendJson(res, 400, { error: 'Nenhum grupo selecionado para extração.' });
          return logDone(400);
        }
        if (currentBatch) {
          sendJson(res, 409, { error: 'Uma extração em lote já está em andamento.' });
          return logDone(409);
        }
        log.info('API', `Recebida solicitação de extração em lote para ${ids.length} grupo(s)`);
        // Inicia execução em background sem bloquear a resposta HTTP
        runBatchExtraction(ids).catch((err) => log.error('BATCH', msg(err)));
        sendJson(res, 202, { ok: true, message: 'Extração em lote iniciada.', total: ids.length });
        return logDone(202);
      } catch (err) {
        sendJson(res, 400, { error: msg(err) });
        return logDone(400);
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/batch-cancel') {
      if (currentBatch) {
        currentBatch.cancelRequested = true;
        log.info('API', 'Recebida solicitação de cancelamento da extração em lote');
        sendJson(res, 200, { ok: true, message: 'Cancelamento em processamento...' });
      } else {
        sendJson(res, 200, { ok: true, message: 'Nenhuma extração em lote ativa.' });
      }
      return logDone(200);
    }

    if (req.method === 'POST' && url.pathname === '/api/clear-cache') {
      participantsCache.clear();
      log.info('CACHE', 'Cache de participantes limpo por solicitação do usuário.');
      sendJson(res, 200, { ok: true, message: 'Cache limpo com sucesso.' });
      return logDone(200);
    }

    if (req.method === 'POST' && url.pathname === '/api/retry-groups') {
      log.info('API', 'Recebida solicitação de recarregar grupos');
      if (client) loadGroups();
      else startClient();
      sendJson(res, 200, { ok: true });
      return logDone(200);
    }

    if (req.method === 'POST' && url.pathname === '/api/restart') {
      log.info('API', 'Recebida solicitação de reiniciar conexão do WhatsApp');
      startClient();
      sendJson(res, 200, { ok: true });
      return logDone(200);
    }

    if (req.method === 'GET' && url.pathname === '/api/group') {
      const id = url.searchParams.get('id');
      const refresh = url.searchParams.get('refresh') === '1';
      if (!id) {
        sendJson(res, 400, { error: 'ID do grupo não informado' });
        return logDone(400);
      }

      const reqStart = Date.now();
      log.info('API', `Recebida requisição para extrair membros do grupo: ${id}${refresh ? ' (atualização forçada)' : ''}`);

      const progressTimer = setInterval(() => {
        const sec = ((Date.now() - reqStart) / 1000).toFixed(1);
        log.info('EXTRACT', `Aguardando extração do grupo... (${sec}s decorridos)`);
      }, 3000);

      try {
        const data = await getParticipants(id, refresh);
        clearInterval(progressTimer);
        const totalSec = ((Date.now() - reqStart) / 1000).toFixed(2);
        data.totalDurationMs = Date.now() - reqStart;
        data.durationSec = totalSec;
        log.success('API', `Extração do grupo "${data.name}" concluída com sucesso em ${totalSec}s (${data.participants.length} membros)`);
        sendJson(res, 200, data);
        return logDone(200);
      } catch (err) {
        clearInterval(progressTimer);
        const totalSec = ((Date.now() - reqStart) / 1000).toFixed(2);
        log.error('API', `Erro ao extrair grupo ${id} após ${totalSec}s: ${msg(err)}`);
        sendJson(res, 500, { error: msg(err) });
        return logDone(500);
      }
    }

    sendJson(res, 404, { error: 'Não encontrado' });
    logDone(404);
  } catch (err) {
    log.error('SERVER', `Erro interno na requisição: ${msg(err)}`);
    sendJson(res, 500, { error: msg(err) });
    logDone(500);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log.error('SERVER', `Porta ${PORT} já está em uso por outro processo. Feche-o e tente novamente.`);
  } else {
    log.error('SERVER', `Erro no servidor HTTP: ${msg(err)}`);
  }
  process.exit(1);
});

process.on('SIGINT', async () => {
  log.info('SERVER', 'Encerrando servidor por comando SIGINT...');
  await stopClient();
  store.close();
  process.exit(0);
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    const url = `http://localhost:${PORT}`;
    log.success('SERVER', `Interface Web GUI iniciada com sucesso em ${url}`);
    const cmd =
      process.platform === 'win32'
        ? `start "" "${url}"`
        : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, () => {});
    startClient();
  });
}

module.exports = { startClient, stopClient, getParticipants, loadGroups };
