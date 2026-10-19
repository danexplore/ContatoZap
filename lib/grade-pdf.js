const fs = require('node:fs');
const path = require('node:path');

const ORIGEM = 'http://contatozap-pdf.invalid';
const PUBLICO = path.join(__dirname, '..', 'public');
const ARQUIVOS = [
  'css/tokens.css', 'css/base.css', 'css/grade.css', 'css/imprimir.css',
  'js/imprimir.js', 'js/grade.js', 'js/componentes/card-participante.js',
  'js/componentes/avatar.js', 'js/logica/texto.js', 'js/logica/cor.js', 'js/logica/filtros.js',
];
const FILTROS = ['todos', 'telefone', 'admins', 'privados'];
const COLUNAS = [null, 'nome_whatsapp', 'nome_agenda', 'telefone', 'admin', 'status'];
const falha = (status, message) => Object.assign(new Error(message), { status });

function lerPedido(pedido) {
  if (!pedido || typeof pedido.id !== 'string' || !pedido.id || pedido.id.length > 200) throw falha(400, 'Informe o grupo para baixar o PDF.');
  const { filtro = 'todos', busca = '', tamanho = 'M', ordenacao = {}, fotos = false } = pedido;
  if (!FILTROS.includes(filtro) || typeof busca !== 'string' || busca.length > 500 || !['P', 'M', 'G'].includes(tamanho)
    || !ordenacao || typeof ordenacao !== 'object' || Array.isArray(ordenacao)
    || !COLUNAS.includes(ordenacao.coluna ?? null) || typeof (ordenacao.asc ?? true) !== 'boolean' || typeof fotos !== 'boolean') {
    throw falha(400, 'Opções do PDF inválidas.');
  }
  return { id: pedido.id, filtro, busca, tamanho, fotos, ordenacao: { coluna: ordenacao.coluna ?? null, asc: ordenacao.asc ?? true } };
}

async function renderizarGradePdf(browser, opcoes) {
  // Contexto isolado: não compartilha cookies ou páginas da sessão do WhatsApp.
  const contexto = await browser.createBrowserContext();
  try {
    const pagina = await contexto.newPage();
    pagina.setDefaultTimeout(15000);
    const arquivos = new Map(ARQUIVOS.map((arquivo) => ['/' + arquivo, fs.readFileSync(path.join(PUBLICO, arquivo))]));
    const fotos = new Set((opcoes.grupo.participants || []).map((p) => p.photoUrl).filter((url) => typeof url === 'string' && (url.startsWith('https://') || /^data:image\/(png|jpeg);base64,/.test(url))));
    await pagina.setRequestInterception(true);
    pagina.on('request', (req) => {
      const terminar = (promessa) => promessa.catch(() => {});
      const endereco = new URL(req.url());
      if (endereco.origin === ORIGEM && endereco.pathname === '/') {
        return terminar(req.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Grade</title>' + ['tokens', 'base', 'grade', 'imprimir'].map((nome) => `<link rel="stylesheet" href="/css/${nome}.css">`).join('') + '</head><body></body></html>' }));
      }
      const arquivo = endereco.origin === ORIGEM ? arquivos.get(endereco.pathname) : null;
      if (arquivo) return terminar(req.respond({ status: 200, contentType: endereco.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', body: arquivo }));
      // Somente fotos já conhecidas do cache; nenhum endereço fornecido pelo pedido é aberto.
      if (fotos.has(req.url()) && req.resourceType() === 'image') return terminar(req.continue());
      return terminar(req.abort());
    });
    await pagina.goto(ORIGEM + '/', { waitUntil: 'load', timeout: 15000 });
    await pagina.evaluate(async (dados) => {
      window.print = () => {};
      const { imprimirGrade } = await import('/js/imprimir.js');
      await imprimirGrade(dados);
    }, opcoes);
    return Buffer.from(await pagina.pdf({ preferCSSPageSize: true, printBackground: true, timeout: 30000 }));
  } finally {
    await contexto.close();
  }
}

function criarDownloadGradePdf({ cache, obterBrowser, estaSincronizando = () => false, renderizar = renderizarGradePdf }) {
  let gerando = false;
  return async (pedido) => {
    const opcoes = lerPedido(pedido);
    const entrada = cache.get(`${opcoes.id}:${opcoes.fotos ? 'with_photos' : 'basic'}`)
      || cache.get(`${opcoes.id}:with_photos`) || cache.get(`${opcoes.id}:basic`);
    if (!entrada?.data) throw falha(404, 'Atualize o grupo antes de baixar o PDF.');
    const browser = obterBrowser();
    if (!browser) throw falha(503, 'Aguarde a conexão com o WhatsApp para baixar o PDF.');
    if (estaSincronizando()) throw falha(409, 'Aguarde a sincronização concluir para baixar o PDF.');
    if (gerando) throw falha(409, 'Um PDF já está sendo gerado. Aguarde terminar.');
    gerando = true;
    try {
      return await renderizar(browser, { grupo: entrada.data, filtro: opcoes.filtro, busca: opcoes.busca, ordenacao: opcoes.ordenacao, tamanho: opcoes.tamanho });
    } finally {
      gerando = false;
    }
  };
}

module.exports = { criarDownloadGradePdf, renderizarGradePdf };
