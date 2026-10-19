import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { montarDom } from '../helpers/dom.mjs';

let baixados;
let blobs;
const criarUrl = URL.createObjectURL;
const revogarUrl = URL.revokeObjectURL;
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  const documento = montarDom('');
  const criar = documento.createElement;
  baixados = [];
  blobs = [];
  documento.createElement = (tag) => {
    const el = criar(tag);
    if (tag === 'a') el.click = () => baixados.push({ nome: el.download, url: el.href });
    return el;
  };
  globalThis.document = documento;
  URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:pdf'; };
  URL.revokeObjectURL = () => {};
});
afterEach(() => {
  delete globalThis.document;
  globalThis.fetch = fetchOriginal;
  URL.createObjectURL = criarUrl;
  URL.revokeObjectURL = revogarUrl;
});

test('baixa arquivo PDF com nome do grupo e envia apenas id e opções da grade', async () => {
  const { baixarGradePdf } = await import('../../public/js/baixar-pdf.js');
  let pedido;
  globalThis.fetch = async (url, opcoes) => {
    assert.equal(url, '/api/group-pdf');
    assert.equal(opcoes.method, 'POST');
    pedido = JSON.parse(opcoes.body);
    return new Response('%PDF-1.7 teste', { headers: { 'Content-Type': 'application/pdf' } });
  };
  await baixarGradePdf({ grupo: { id: 'g1', name: 'Equipe / São Paulo', participants: [{ id: 'privado' }] }, filtro: 'admins', busca: 'Ana', ordenacao: { coluna: 'telefone', asc: false }, tamanho: 'P', fotos: true });
  assert.deepEqual(pedido, { id: 'g1', filtro: 'admins', busca: 'Ana', ordenacao: { coluna: 'telefone', asc: false }, tamanho: 'P', fotos: true });
  assert.equal(baixados.length, 1);
  assert.equal(baixados[0].nome, 'grade_Equipe_São_Paulo.pdf');
  assert.equal(blobs[0].type, 'application/pdf');
  assert.match(await blobs[0].text(), /^%PDF/);
});

test('erro do servidor não baixa arquivo inválido e mostra a causa', async () => {
  const { baixarGradePdf } = await import('../../public/js/baixar-pdf.js');
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Atualize o grupo.' }), { status: 404 });
  await assert.rejects(baixarGradePdf({ grupo: { id: 'g1' } }), /Atualize o grupo/);
  assert.equal(baixados.length, 0);
});
