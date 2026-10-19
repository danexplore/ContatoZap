import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE_RECENTES, abrirRecente, fecharRecente, normalizarRecentes } from '../../public/js/logica/recentes.js';

function oitoAbertos() {
  let l = [];
  for (let i = 1; i <= 8; i++) l = abrirRecente(l, { id: `g${i}`, name: `G${i}` }, i);
  return l;
}

test('limite é 8', () => assert.equal(LIMITE_RECENTES, 8));

test('abrirRecente insere no início, reativa no lugar e respeita o limite', () => {
  let l = oitoAbertos();
  assert.deepEqual(l.map((r) => r.id), ['g8', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1']);
  l = abrirRecente(l, { id: 'g1', name: 'G1' }, 100);
  assert.equal(l.length, 8); assert.equal(l[7].id, 'g1'); assert.equal(l[7].usadoEm, 100);
  l = abrirRecente(l, { id: 'g9', name: 'G9' }, 101);
  assert.equal(l.length, 8); assert.equal(l[0].id, 'g9'); assert.ok(!l.some((r) => r.id === 'g2'));
});

test('abrirRecente atualiza o nome e não muta a entrada', () => {
  const l = oitoAbertos();
  const antes = structuredClone(l);
  const nova = abrirRecente(l, { id: 'g3', name: 'Novo nome' }, 50);
  assert.deepEqual(l, antes);
  assert.equal(nova[5].name, 'Novo nome');
});

test('abrirRecente com limite menor nunca remove o recém-aberto', () => {
  const l = abrirRecente([{ id: 'a', name: 'A', usadoEm: 500 }], { id: 'b', name: 'B' }, 1, 1);
  assert.deepEqual(l.map((r) => r.id), ['b']);
});

test('fecharRecente escolhe a próxima ativa', () => {
  let l = oitoAbertos();
  l = abrirRecente(l, { id: 'g1', name: 'G1' }, 100);
  l = abrirRecente(l, { id: 'g9', name: 'G9' }, 101);
  assert.deepEqual(fecharRecente(l, 'g9', 'g9').proximaAtiva, 'g8');
  assert.deepEqual(fecharRecente(l, 'g1', 'g1').proximaAtiva, l[6].id);
  assert.deepEqual(fecharRecente([l[0]], l[0].id, l[0].id), { lista: [], proximaAtiva: null });
  const outra = fecharRecente(l, 'g5', 'g9');
  assert.equal(outra.proximaAtiva, 'g9');
  assert.equal(outra.lista.length, 7);
  assert.equal(l.length, 8, 'não muta a entrada');
});

test('normalizarRecentes descarta formato inesperado', () => {
  for (const ruim of ['oi', null, 42, ['g1'], [{ id: 1 }], { id: 'x' }, undefined]) {
    assert.deepEqual(normalizarRecentes(ruim), [], JSON.stringify(ruim));
  }
  assert.equal(normalizarRecentes(Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, name: 'x' }))).length, 8);
  const dup = normalizarRecentes([{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }]);
  assert.equal(dup.length, 1); assert.equal(dup[0].name, 'A');
  assert.deepEqual(normalizarRecentes([{ id: 'a', name: 'A', usadoEm: 'ontem' }, { id: 'b', name: 'B', usadoEm: 7, extra: 1 }]), [
    { id: 'a', name: 'A', usadoEm: 0 },
    { id: 'b', name: 'B', usadoEm: 7 },
  ]);
});
