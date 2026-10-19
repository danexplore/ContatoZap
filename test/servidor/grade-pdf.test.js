const { test } = require('node:test');
const assert = require('node:assert/strict');

const dados = { id: 'g1', name: 'Grupo', participants: [{ id: 'p1', name: 'Ana' }] };

test('download lê o grupo do cache mesmo após TTL e passa somente opções válidas', async () => {
  const { criarDownloadGradePdf } = require('../../lib/grade-pdf');
  let recebido;
  const gerar = criarDownloadGradePdf({
    cache: new Map([['g1:basic', { timestamp: 0, data: dados }]]), obterBrowser: () => ({}),
    renderizar: async (_, opcoes) => { recebido = opcoes; return Buffer.from('%PDF-teste'); },
  });
  const resultado = await gerar({ id: 'g1', filtro: 'admins', busca: 'Ana', tamanho: 'G', ordenacao: { coluna: 'nome_whatsapp', asc: false }, participants: [{ id: 'injetado' }] });
  assert.equal(resultado.toString(), '%PDF-teste');
  assert.equal(recebido.grupo, dados);
  assert.equal(recebido.filtro, 'admins');
  assert.equal(recebido.busca, 'Ana');
  assert.equal(recebido.tamanho, 'G');
  assert.deepEqual(recebido.ordenacao, { coluna: 'nome_whatsapp', asc: false });
});

test('pedido inválido ou grupo ausente não abre o navegador', async () => {
  const { criarDownloadGradePdf } = require('../../lib/grade-pdf');
  const gerar = criarDownloadGradePdf({ cache: new Map(), obterBrowser: () => { throw new Error('não deve chegar aqui'); } });
  for (const pedido of [null, {}, { id: 'g1', tamanho: 'enorme' }, { id: 'g1', busca: {} }, { id: 'g1', ordenacao: { coluna: 'injetado' } }]) {
    await assert.rejects(gerar(pedido), (erro) => erro.status === 400);
  }
  await assert.rejects(gerar({ id: 'g1' }), (erro) => erro.status === 404);
});

test('conexão ausente e sincronização impedem a geração', async () => {
  const { criarDownloadGradePdf } = require('../../lib/grade-pdf');
  const cache = new Map([['g1:basic', { data: dados }]]);
  await assert.rejects(criarDownloadGradePdf({ cache, obterBrowser: () => null })({ id: 'g1' }), (e) => e.status === 503);
  await assert.rejects(criarDownloadGradePdf({ cache, obterBrowser: () => ({}), estaSincronizando: () => true })({ id: 'g1' }), (e) => e.status === 409);
});

test('limita a geração simultânea e libera a fila após erro', async () => {
  const { criarDownloadGradePdf } = require('../../lib/grade-pdf');
  let falhar;
  const gerar = criarDownloadGradePdf({ cache: new Map([['g1:basic', { data: dados }]]), obterBrowser: () => ({}), renderizar: () => new Promise((_, reject) => { falhar = reject; }) });
  const primeiro = gerar({ id: 'g1' });
  await assert.rejects(gerar({ id: 'g1' }), (e) => e.status === 409);
  falhar(new Error('falha de renderização'));
  await assert.rejects(primeiro, /falha de renderização/);
  const proximo = gerar({ id: 'g1' });
  falhar(new Error('segunda execução'));
  await assert.rejects(proximo, /segunda execução/);
});


test('falha de navegação fecha o contexto isolado sem fechar o navegador da sessão', async () => {
  const { renderizarGradePdf } = require('../../lib/grade-pdf');
  let fechou = false;
  const pagina = { setDefaultTimeout() {}, async setRequestInterception() {}, on() {}, async goto() { throw new Error('navegação falhou'); } };
  const browser = { async createBrowserContext() { return { async newPage() { return pagina; }, async close() { fechou = true; } }; } };
  await assert.rejects(renderizarGradePdf(browser, { grupo: dados }), /navegação falhou/);
  assert.equal(fechou, true);
});
