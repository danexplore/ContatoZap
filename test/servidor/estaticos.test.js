const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  RAIZ_PUBLICA,
  resolverArquivoPublico,
  tipoConteudo,
  servirArquivoPublico,
} = require('../../lib/estaticos');

let raiz;
let irmao;

before(() => {
  raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'publico-'));
  irmao = `${raiz}-mal`;
  fs.mkdirSync(path.join(raiz, 'js'));
  fs.mkdirSync(path.join(raiz, 'css'));
  fs.writeFileSync(path.join(raiz, 'js', 'a.js'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(raiz, 'css', 'b.css'), 'body {}\n');
  fs.writeFileSync(path.join(raiz, 'segredo.txt'), 'segredo');
  fs.mkdirSync(irmao);
  fs.writeFileSync(path.join(irmao, 'x.js'), 'alert(1)');
});

after(() => {
  fs.rmSync(raiz, { recursive: true, force: true });
  fs.rmSync(irmao, { recursive: true, force: true });
});

async function servir(pathname) {
  const res = {
    statusCode: null,
    headers: null,
    body: undefined,
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers || {};
    },
    end(body) {
      this.body = body;
    },
  };
  await servirArquivoPublico(res, raiz, pathname);
  return res;
}

test('RAIZ_PUBLICA aponta para public/ na raiz do projeto', () => {
  assert.equal(RAIZ_PUBLICA, path.join(__dirname, '..', '..', 'public'));
});

test('resolverArquivoPublico aceita arquivos dentro de js/ e css/', () => {
  assert.equal(resolverArquivoPublico(raiz, '/js/a.js'), path.join(raiz, 'js', 'a.js'));
  assert.equal(resolverArquivoPublico(raiz, '/css/b.css'), path.join(raiz, 'css', 'b.css'));
});

test('resolverArquivoPublico recusa caminhos maliciosos ou fora do prefixo', () => {
  const maliciosos = [
    '/js/../segredo.txt',
    '/js/%2e%2e/segredo.txt',
    '/js/..%2fsegredo.txt',
    '/js/..%5csegredo.txt',
    '/js/%2e%2e%2f%2e%2e%2fserver.js',
    '/css/a%00.css',
    '/js/%E0%A4%A',
    '/package.json',
    '/js/../../' + path.basename(raiz) + '-mal/x.js',
  ];
  for (const p of maliciosos) assert.equal(resolverArquivoPublico(raiz, p), null, p);
});

test('tipoConteudo devolve o Content-Type pela extensão', () => {
  assert.equal(tipoConteudo('x.css'), 'text/css; charset=utf-8');
  assert.equal(tipoConteudo('x.js'), 'application/javascript; charset=utf-8');
  assert.equal(tipoConteudo('x.html'), 'text/html; charset=utf-8');
  assert.equal(tipoConteudo('x.svg'), 'image/svg+xml');
  assert.equal(tipoConteudo('x.bin'), 'application/octet-stream');
});

test('servirArquivoPublico entrega arquivo válido com no-store', async () => {
  const r = await servir('/js/a.js');
  assert.equal(r.statusCode, 200);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  assert.equal(r.headers['Content-Type'], 'application/javascript; charset=utf-8');
  assert.equal(String(r.body), 'export const a = 1;\n');
});

test('servirArquivoPublico dá 404 para inexistente, diretório e caminho recusado', async () => {
  for (const p of ['/js/nao-existe.js', '/js/', '/js/..%2fsegredo.txt']) {
    const r = await servir(p);
    assert.equal(r.statusCode, 404, p);
    assert.match(r.headers['Content-Type'], /^text\/plain/, p);
  }
});

test('servirArquivoPublico não segue symlink que aponta para fora de js/ e css/', async (t) => {
  const arquivoLink = path.join(raiz, 'js', 'link.js');
  const pastaLink = path.join(raiz, 'css', 'pasta-link');
  try {
    fs.symlinkSync(path.join(raiz, 'segredo.txt'), arquivoLink);
    fs.symlinkSync(irmao, pastaLink, 'dir');
  } catch (err) {
    fs.rmSync(arquivoLink, { force: true });
    return t.skip(`plataforma não permite symlink: ${err.code}`);
  }
  for (const p of ['/js/link.js', '/css/pasta-link/x.js']) {
    const r = await servir(p);
    assert.equal(r.statusCode, 404, p);
    assert.doesNotMatch(String(r.body), /segredo|alert/, p);
  }
});

test('servirArquivoPublico segue symlink que continua dentro da pasta pública', async (t) => {
  const interno = path.join(raiz, 'js', 'interno.js');
  try {
    fs.symlinkSync(path.join(raiz, 'js', 'a.js'), interno);
  } catch (err) {
    return t.skip(`plataforma não permite symlink: ${err.code}`);
  }
  const r = await servir('/js/interno.js');
  assert.equal(r.statusCode, 200);
});
