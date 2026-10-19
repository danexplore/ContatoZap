import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PALETA_AVATAR, corDoId } from '../../public/js/logica/cor.js';

// document falso: só o que criarAvatar usa
function elementoFalso(tag) {
  const classes = new Set();
  const ouvintes = {};
  const el = {
    tagName: tag.toUpperCase(), children: [], style: {}, atributos: {}, parent: null, textContent: '',
    classList: { add: (...c) => c.forEach((x) => classes.add(x)), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    get className() { return [...classes].join(' '); },
    set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
    set innerHTML(_) { throw new Error('criarAvatar não pode usar innerHTML'); },
    setAttribute(k, v) { el.atributos[k] = String(v); },
    appendChild(filho) { filho.parent = el; el.children.push(filho); return filho; },
    remove() { if (el.parent) el.parent.children = el.parent.children.filter((c) => c !== el); },
    addEventListener(tipo, fn) { (ouvintes[tipo] ||= []).push(fn); },
    disparar(tipo) { (ouvintes[tipo] || []).forEach((fn) => fn({})); },
  };
  return el;
}

let criarAvatar;
before(async () => {
  globalThis.document = { createElement: elementoFalso };
  ({ criarAvatar } = await import('../../public/js/componentes/avatar.js'));
});
after(() => { delete globalThis.document; });

test('mostra as iniciais como texto, na cor do id, escondido do leitor de tela', () => {
  const a = criarAvatar({ id: 'g1@g.us', nome: 'Maria da Silva' });
  assert.equal(a.children[0].textContent, 'MS');
  assert.equal(a.style.backgroundColor, corDoId('g1@g.us'));
  assert.ok(PALETA_AVATAR.includes(a.style.backgroundColor));
  assert.equal(a.atributos['aria-hidden'], 'true');
  assert.equal(a.style.width, '32px');
  assert.ok(a.classList.contains('avatar--circulo'));
});

test('nome com HTML vira só iniciais em texto', () => {
  const a = criarAvatar({ id: 'x', nome: '<img src=x onerror=alert(1)>' });
  assert.equal(a.children[0].textContent, 'IO');
});

test('preencher e quadrado', () => {
  const a = criarAvatar({ id: 'x', nome: 'Ana', tamanho: 'preencher', forma: 'quadrado' });
  assert.ok(a.classList.contains('avatar--preencher'));
  assert.ok(a.classList.contains('avatar--quadrado'));
  assert.equal(a.style.width, undefined);
});

test('foto por cima das iniciais; se falhar, some sem aviso', () => {
  const a = criarAvatar({ id: 'x', nome: 'Ana', foto: 'https://exemplo/foto.jpg', tamanho: 40 });
  const img = a.children[1];
  assert.equal(img.tagName, 'IMG');
  assert.equal(img.loading, 'lazy');
  assert.equal(img.alt, '');
  assert.equal(img.src, 'https://exemplo/foto.jpg');
  assert.ok(a.classList.contains('avatar--com-foto'));
  img.disparar('error');
  assert.equal(a.children.length, 1);
  assert.equal(a.children[0].textContent, 'A');
  assert.ok(!a.classList.contains('avatar--com-foto'));
});

test('URL que já falhou não é usada de novo: fica só com as iniciais', () => {
  const url = 'https://exemplo/quebrada.jpg';
  criarAvatar({ id: 'y', nome: 'Bia', foto: url }).children[1].disparar('error');
  const outro = criarAvatar({ id: 'y', nome: 'Bia', foto: url });
  assert.equal(outro.children.length, 1);
  assert.ok(!outro.classList.contains('avatar--com-foto'));
});
