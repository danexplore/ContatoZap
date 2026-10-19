const fs = require('fs');
const path = require('path');

const RAIZ_PUBLICA = path.join(__dirname, '..', 'public');

const PASTAS_PUBLICAS = ['css', 'js'];

const TIPOS = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function pastaDoCaminho(pathname) {
  return PASTAS_PUBLICAS.find((pasta) => pathname.startsWith(`/${pasta}/`)) || null;
}

function decodificar(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

// Devolve o caminho absoluto do arquivo pedido, ou null se ele sair da pasta pública
// do prefixo (/css/ ou /js/). Barra invertida é recusada porque no Windows vira separador.
function resolverArquivoPublico(raiz, pathname) {
  const pasta = pastaDoCaminho(pathname);
  if (!pasta) return null;
  const decodificado = decodificar(pathname);
  if (decodificado === null || decodificado.includes('\0') || decodificado.includes('\\')) return null;
  const base = path.resolve(raiz, pasta);
  const caminho = path.resolve(raiz, '.' + decodificado);
  return caminho.startsWith(base + path.sep) ? caminho : null;
}

function tipoConteudo(caminho) {
  return TIPOS[path.extname(caminho).toLowerCase()] || 'application/octet-stream';
}

function naoEncontrado(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end('Não encontrado');
}

async function servirArquivoPublico(res, raiz, pathname) {
  const caminho = resolverArquivoPublico(raiz, pathname);
  if (!caminho) return naoEncontrado(res);
  try {
    const info = await fs.promises.stat(caminho);
    if (!info.isFile()) return naoEncontrado(res);
    const conteudo = await fs.promises.readFile(caminho);
    res.writeHead(200, { 'Content-Type': tipoConteudo(caminho), 'Cache-Control': 'no-store' });
    res.end(conteudo);
  } catch {
    naoEncontrado(res);
  }
}

module.exports = { RAIZ_PUBLICA, resolverArquivoPublico, tipoConteudo, servirArquivoPublico };
