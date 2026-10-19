import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { montarDom } from '../helpers/dom.mjs';
import { imprimirGrade } from '../../public/js/imprimir.js';

let documento;
let fim;
let impressoes;
const grupo = { name: '<img onerror=alert(1)>', participants: [
  { id: 'a', name: 'Ana', phone: '5511999999999', admin: true },
  { id: 'b', name: 'Bia', hidden: true },
  { id: 'c', name: 'Caio', phone: '5511888888888', admin: true },
] };

beforeEach(() => {
  documento = montarDom('');
  documento.title = 'Aplicação';
  globalThis.document = documento;
  impressoes = 0;
  fim = null;
  globalThis.window = {
    addEventListener(_, fn) { fim = fn; }, removeEventListener() {},
    print() { impressoes++; },
  };
});
afterEach(() => {
  fim?.();
  delete globalThis.document;
  delete globalThis.window;
});

test('snapshot ordena o filtro, usa nome literal e não modifica os dados originais', async () => {
  const original = structuredClone(grupo);
  await imprimirGrade({ grupo, filtro: 'admins', ordenacao: { coluna: 'nome_whatsapp', asc: false }, tamanho: 'P' });
  const pagina = documento.getElementById('impressaoGrade');
  assert.equal(pagina.querySelector('h1').textContent, '<img onerror=alert(1)>');
  assert.equal(pagina.querySelector('p').textContent, '2 de 3 participantes');
  assert.deepEqual(pagina.querySelectorAll('.card-nome').map((el) => el.textContent), ['Caio', 'Ana']);
  assert.equal(pagina.querySelectorAll('img').length, 0);
  assert.deepEqual(grupo, original);
});

test('dois cliques abrem uma impressão; após cancelar pode imprimir outra vez', async () => {
  await imprimirGrade({ grupo });
  await imprimirGrade({ grupo });
  assert.equal(impressoes, 1);
  assert.equal(documento.querySelectorAll('#impressaoGrade').length, 1);
  fim();
  await imprimirGrade({ grupo, busca: 'ninguém' });
  assert.equal(impressoes, 2);
  assert.equal(documento.querySelectorAll('.card-participante').length, 0);
  assert.ok(documento.querySelector('.lista-vazia'));
});

test('falha no diálogo remove snapshot, restaura título e permite tentar novamente', async () => {
  window.print = () => { throw new Error('impressão indisponível'); };
  await assert.rejects(imprimirGrade({ grupo }), /impressão indisponível/);
  assert.equal(documento.getElementById('impressaoGrade'), null);
  assert.equal(documento.title, 'Aplicação');
  window.print = () => { impressoes++; };
  await imprimirGrade({ grupo });
  assert.equal(impressoes, 1);
});

test('aguarda foto eager antes de abrir o diálogo', async () => {
  const criar = documento.createElement;
  let liberarFoto;
  documento.createElement = (tag) => {
    const el = criar(tag);
    if (tag === 'img') {
      el.complete = true;
      el.naturalWidth = 160;
      el.decode = () => new Promise((resolve) => { liberarFoto = resolve; });
    }
    return el;
  };
  const tarefa = imprimirGrade({ grupo: { name: 'Fotos', participants: [{ id: 'p', name: 'Pessoa', photoUrl: 'https://foto.invalid/teste' }] } });
  const foto = documento.querySelector('img');
  assert.equal(foto.loading, 'eager');
  assert.equal(impressoes, 0);
  liberarFoto();
  await tarefa;
  assert.equal(impressoes, 1);
  assert.equal(documento.querySelectorAll('img').length, 1);
});
