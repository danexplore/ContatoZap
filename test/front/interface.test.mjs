import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { montarDom } from '../helpers/dom.mjs';
import { atualizarEstado, atualizarVisao, obterEstado } from '../../public/js/estado.js';

const esperar = () => new Promise((resolve) => setImmediate(resolve));
const erros = [];
const originalError = console.error;
let document;
let timer;
let eventosConectados = false;
const intervaloOriginal = globalThis.setInterval;
let estreito = false;
const consultas = [];
let responder;
let buscaPendente = false;

before(async () => {
  document = montarDom(readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8'));
  globalThis.document = document;
  globalThis.CSS = { escape: (s) => s };
  globalThis.matchMedia = (q) => ({ matches: q === '(max-width: 1279px)' && estreito, addEventListener() {} });
  globalThis.EventSource = class { constructor() { eventosConectados = true; } addEventListener() {} };
  globalThis.setInterval = (fn, ms) => { assert.equal(ms, 60000); timer = fn; return { unref() {} }; };
  globalThis.fetch = async (url) => {
    consultas.push(url);
    if (buscaPendente) return new Promise((resolve) => { responder = (data) => resolve({ ok: true, json: async () => data }); });
    return { ok: true, json: async () => [] };
  };
  console.error = (...args) => erros.push(args);
  await import('../../public/js/app.js');
});
after(() => {
  console.error = originalError;
  globalThis.setInterval = intervaloOriginal;
  for (const k of ['document', 'CSS', 'matchMedia', 'EventSource']) delete globalThis[k];
});

const $ = (id) => document.getElementById(id);
const linha = (id) => $('areaParticipantes').querySelector(`[data-id="${id}"]`);
const tecla = (key, props) => document.activeElement.disparar('keydown', { key, ...props });
const pessoas = [
  { id: 'ana', name: 'Ana', pushname: '<img src=x onerror=alert(1)>', savedName: 'Ana agenda', phone: '5511999999999', admin: true },
  { id: 'bia', name: 'Bia', phone: '', hidden: true },
  { id: 'caio', name: 'Caio', phone: '5511888888888', admin: true },
];

test('app inicializa com os ids reais do HTML e conecta eventos', () => {
  assert.deepEqual(erros, []);
  assert.equal(typeof timer, 'function');
  assert.equal(eventosConectados, true);
});

test('lista, grade, tamanho e chips respondem ao estado sem tabela antiga', () => {
  atualizarEstado({ abaAtiva: 'g1', recentes: [{ id: 'g1', name: 'Grupo' }], grupos: new Map([['g1', { status: 'pronto', dados: { name: 'Grupo', extractedAt: Date.now(), participants: pessoas } }]]) });
  assert.ok(linha('ana'));
  document.querySelector('[data-modo="grade"]').disparar('click');
  assert.ok($('areaParticipantes').querySelector('.grade-participantes'));
  document.querySelector('[data-tamanho-grade="G"]').disparar('click');
  assert.equal($('areaParticipantes').querySelector('.grade-participantes').dataset.tamanho, 'G');
  $('groupFilterChips').querySelector('[data-filtro="admins"]').disparar('click');
  assert.equal($('areaParticipantes').querySelectorAll('.card-participante').length, 2);
  assert.equal(linha('ana').getAttribute('role'), 'button');
  assert.deepEqual(erros, []);
});

test('ficha mostra texto seguro, navega na ordem filtrada e Esc devolve foco', async () => {
  linha('ana').focus();
  tecla(' ');
  await esperar();
  assert.equal($('fichaContainer').hidden, false);
  assert.ok($('mainView').classList.contains('com-ficha'));
  assert.equal(document.querySelector('.ficha-nome-whatsapp').textContent, pessoas[0].pushname);
  assert.equal(document.querySelector('.ficha-nome-agenda').textContent, 'Ana agenda');
  tecla('ArrowDown');
  assert.equal(obterEstado().fichaAberta, 'caio');
  assert.equal(linha('caio').rolou, true);
  tecla('Escape');
  assert.equal($('fichaContainer').hidden, true);
  assert.equal(document.activeElement, linha('ana'));
});

test('pessoa privada sem telefone tem ações desativadas e consulta por id', async () => {
  atualizarVisao('g1', { filtro: 'todos' });
  linha('bia').disparar('click');
  await esperar();
  const acoes = document.querySelector('.ficha-acoes');
  assert.ok(acoes.children.every((el) => el.disabled));
  assert.ok(consultas.some((url) => url.includes('id=bia') && !url.includes('phone=')));
});

test('gaveta prende Tab, torna conteúdo inerte e limpar ficha restaura o fundo', () => {
  estreito = true;
  linha('caio').disparar('click');
  assert.equal(document.querySelector('.painel').getAttribute('aria-modal'), 'true');
  assert.equal($('main-content').inert, true);
  tecla('Tab', { shiftKey: true });
  const ultimo = document.querySelector('.ficha-acoes').children.at(-1);
  assert.equal(document.activeElement, ultimo);
  tecla('Tab');
  assert.ok(document.activeElement.classList.contains('painel-fechar'));
  tecla('Escape');
  assert.equal($('main-content').inert, false);
  estreito = false;
});

test('trocar de aba fecha ficha e descarta resposta atrasada', async () => {
  buscaPendente = true;
  linha('ana').disparar('click');
  await esperar();
  atualizarEstado({ abaAtiva: null });
  responder([{ id: 'outro', name: 'Grupo antigo' }]);
  await esperar();
  assert.equal(obterEstado().fichaAberta, null);
  assert.equal($('fichaContainer').hidden, true);
  assert.equal($('fichaContainer').children.length, 0);
  buscaPendente = false;
});

test('relógio atualiza só o horário visível sem remover foco ou participantes', () => {
  atualizarEstado({ abaAtiva: 'g1' });
  $('mainView').hidden = false;
  const dados = obterEstado().grupos.get('g1').dados;
  dados.extractedAt = Date.now() - 120000;
  const original = linha('ana');
  timer();
  assert.equal($('activeGroupExtractedAt').textContent, 'há 2 min');
  assert.equal(linha('ana'), original);
  assert.deepEqual(erros, []);
});


test('menu mantém foco interno, fecha ao sair e não captura setas do campo numérico', () => {
  const menu = $('menuExportar').children[0];
  const botao = menu.children[0];
  const lista = menu.children[1];
  botao.disparar('click');
  assert.equal(lista.hidden, false);
  const input = lista.querySelector('input');
  menu.disparar('focusout', { relatedTarget: input });
  assert.equal(lista.hidden, false);
  input.focus();
  assert.equal(tecla('ArrowDown').defaultPrevented, false);
  menu.disparar('focusout', { relatedTarget: $('memberSearch') });
  assert.equal(lista.hidden, true);
});

test('sincronização bloqueia os novos botões de exportação', () => {
  atualizarEstado({ conexao: { status: 'ready', groups: [], syncProgress: { progress: 50 } } });
  assert.ok($('menuExportar').querySelectorAll('button').every((b) => b.disabled));
  atualizarEstado({ conexao: { status: 'ready', groups: [] } });
  assert.ok($('menuExportar').querySelectorAll('button').every((b) => !b.disabled));
  assert.deepEqual(erros, []);
});

test('busca com debounce atualiza resultados e não vaza para outra aba', async () => {
  const campo = $('memberSearch');
  campo.value = 'Caio';
  campo.disparar('input');
  await new Promise((resolve) => setTimeout(resolve, 240));
  assert.equal($('areaParticipantes').querySelectorAll('.card-participante').length, 1);
  assert.ok(linha('caio'));
  campo.value = 'Ana';
  campo.disparar('input');
  atualizarEstado({ abaAtiva: null });
  await new Promise((resolve) => setTimeout(resolve, 240));
  assert.equal(obterEstado().visoes.get('g1').busca, 'Caio');
  assert.deepEqual(erros, []);
});
