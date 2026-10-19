import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAgrupador } from '../../public/js/logica/agrupador.js';

test('agrupador junta os ids por 150ms e ignora repetidos', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const envios = [];
  const ag = criarAgrupador({ enviar: (ids) => envios.push(ids) });
  ag.adicionar('a'); ag.adicionar('b'); ag.adicionar('a');
  t.mock.timers.tick(149);
  assert.equal(envios.length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(envios, [['a', 'b']]);
});

test('agrupador divide em lotes de 50', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const envios = [];
  const ag = criarAgrupador({ enviar: (ids) => envios.push(ids) });
  ag.adicionar('a');
  t.mock.timers.tick(150);
  for (let i = 0; i < 120; i++) ag.adicionar(`g${i}`);
  t.mock.timers.tick(150);
  assert.deepEqual(envios.slice(1).map((l) => l.length), [50, 50, 20]);
  assert.deepEqual(envios.slice(1).flat(), Array.from({ length: 120 }, (_, i) => `g${i}`));
  ag.adicionar('a');
  t.mock.timers.tick(150);
  assert.equal(envios.length, 4); // já enviado
  ag.esquecer('a'); ag.adicionar('a');
  t.mock.timers.tick(150);
  assert.deepEqual(envios.at(-1), ['a']);
});

test('janela conta a partir do primeiro id, sem reiniciar a cada novo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const envios = [];
  const ag = criarAgrupador({ enviar: (ids) => envios.push(ids) });
  ag.adicionar('a');
  t.mock.timers.tick(100);
  ag.adicionar('b');
  t.mock.timers.tick(50);
  assert.deepEqual(envios, [['a', 'b']]);
  ag.adicionar('c');
  t.mock.timers.tick(150);
  assert.deepEqual(envios, [['a', 'b'], ['c']]);
});

test('esperaMs, maximo e agendar podem ser trocados', () => {
  const agendados = [];
  const envios = [];
  const ag = criarAgrupador({
    esperaMs: 10,
    maximo: 2,
    enviar: (ids) => envios.push(ids),
    agendar: (fn, ms) => agendados.push({ fn, ms }),
  });
  for (const id of ['a', 'b', 'c']) ag.adicionar(id);
  assert.equal(agendados.length, 1);
  assert.equal(agendados[0].ms, 10);
  agendados[0].fn();
  assert.deepEqual(envios, [['a', 'b'], ['c']]);
});

test('esquecer um id pendente tira ele do próximo envio', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const envios = [];
  const ag = criarAgrupador({ enviar: (ids) => envios.push(ids) });
  ag.adicionar('a'); ag.adicionar('b');
  ag.esquecer('a');
  t.mock.timers.tick(150);
  assert.deepEqual(envios, [['b']]);
});

test('sem pendentes nada é enviado', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const envios = [];
  const ag = criarAgrupador({ enviar: (ids) => envios.push(ids) });
  ag.adicionar('a'); ag.esquecer('a');
  t.mock.timers.tick(150);
  assert.equal(envios.length, 0);
});
