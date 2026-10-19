import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarEstado, obterEstado, atualizarEstado, atualizarVisao } from '../../public/js/estado.js';
import { abrirGrupo, fecharAba } from '../../public/js/abas.js';

// localStorage falso sobre um Map
function falso() {
  const dados = new Map();
  return { getItem: (k) => (dados.has(k) ? dados.get(k) : null), setItem: (k, v) => { dados.set(k, String(v)); } };
}

// Deixa a resposta do fetch e o resto da carga terminarem
const esperar = () => new Promise((resolve) => setImmediate(resolve));

let chamadas;
let relogio;
const agoraOriginal = Date.now;

function grupos(prefixo, total) {
  return Array.from({ length: total }, (_, i) => ({ id: `${prefixo}${i + 1}@g.us`, name: `${prefixo.toUpperCase()}${i + 1}`, size: 3 }));
}

beforeEach(() => {
  chamadas = [];
  relogio = 1000;
  Date.now = () => ++relogio;
  globalThis.fetch = async (url) => {
    const id = new URL(url, 'http://local').searchParams.get('id');
    chamadas.push(id);
    return { ok: true, json: async () => ({ id, name: id, participants: [{ id: 'p1' }] }) };
  };
  iniciarEstado(falso());
  atualizarEstado({ conexao: { status: 'ready', groups: [...grupos('a', 3), ...grupos('c', 9), ...grupos('d', 3), ...grupos('e', 1)] } });
});

afterEach(() => {
  Date.now = agoraOriginal;
  delete globalThis.fetch;
});

test('abrirGrupo põe a aba no início, ativa e carrega uma vez só', async () => {
  abrirGrupo({ id: 'a1@g.us', name: 'A1' });
  assert.equal(obterEstado().abaAtiva, 'a1@g.us');
  assert.deepEqual(obterEstado().recentes.map((r) => r.id), ['a1@g.us']);
  assert.equal(obterEstado().grupos.get('a1@g.us').status, 'carregando');
  await esperar();
  assert.equal(obterEstado().grupos.get('a1@g.us').status, 'pronto');

  abrirGrupo({ id: 'a2@g.us', name: 'A2' });
  await esperar();
  abrirGrupo({ id: 'a1@g.us', name: 'A1' });
  await esperar();
  assert.equal(obterEstado().abaAtiva, 'a1@g.us');
  assert.deepEqual(obterEstado().recentes.map((r) => r.id), ['a2@g.us', 'a1@g.us'], 'reabrir só ativa, não muda de lugar');
  assert.deepEqual(chamadas, ['a1@g.us', 'a2@g.us']);
});

test('abrirGrupo sem nome usa o nome da lista de grupos', () => {
  abrirGrupo({ id: 'a3@g.us' });
  assert.equal(obterEstado().recentes[0].name, 'A3');
});

test('com 9 grupos ficam 8 abas: sai a usada há mais tempo, com os dados dela', async () => {
  for (let i = 1; i <= 8; i++) abrirGrupo({ id: `c${i}@g.us`, name: `C${i}` });
  await esperar();
  abrirGrupo({ id: 'c1@g.us', name: 'C1' });
  atualizarVisao('c2@g.us', { busca: 'ana' });
  abrirGrupo({ id: 'c9@g.us', name: 'C9' });
  await esperar();
  const { recentes, grupos: dados, visoes } = obterEstado();
  assert.equal(recentes.length, 8);
  assert.equal(recentes[0].id, 'c9@g.us');
  assert.ok(!recentes.some((r) => r.id === 'c2@g.us'));
  assert.ok(recentes.some((r) => r.id === 'c1@g.us'));
  assert.ok(!dados.has('c2@g.us'));
  assert.ok(!visoes.has('c2@g.us'));
});

test('fecharAba da ativa ativa a vizinha e apaga grupo e visão do id', async () => {
  for (const id of ['d1', 'd2', 'd3']) abrirGrupo({ id: `${id}@g.us`, name: id });
  await esperar();
  atualizarVisao('d3@g.us', { busca: 'ana' });
  fecharAba('d3@g.us');
  let estado = obterEstado();
  assert.deepEqual(estado.recentes.map((r) => r.id), ['d2@g.us', 'd1@g.us']);
  assert.equal(estado.abaAtiva, 'd2@g.us');
  assert.ok(!estado.grupos.has('d3@g.us'));
  assert.ok(!estado.visoes.has('d3@g.us'));

  fecharAba('d1@g.us');
  estado = obterEstado();
  assert.equal(estado.abaAtiva, 'd2@g.us', 'fechar outra aba não troca a ativa');
  fecharAba('d2@g.us');
  assert.equal(obterEstado().abaAtiva, null);
  assert.deepEqual(obterEstado().recentes, []);
});

test('carga que termina depois de a aba fechar não grava nada', async () => {
  let responder;
  globalThis.fetch = (url) => new Promise((resolve) => {
    responder = () => resolve({ ok: true, json: async () => ({ id: url, name: 'E1', participants: [] }) });
  });
  abrirGrupo({ id: 'e1@g.us', name: 'E1' });
  fecharAba('e1@g.us');
  responder();
  await esperar();
  assert.ok(!obterEstado().grupos.has('e1@g.us'));
});
