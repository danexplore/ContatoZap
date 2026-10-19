import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETA_AVATAR, corDoId } from '../../public/js/logica/cor.js';

// Contraste WCAG com texto branco a partir de "hsl(H S% L%)"
function contrasteComBranco(cor) {
  const [h, s, l] = cor.match(/[\d.]+/g).map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const canal = (n) => {
    const k = (n + h / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [canal(0), canal(8), canal(4)].map(linear);
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

test('corDoId é estável e sempre sai da paleta', () => {
  assert.equal(corDoId('120363@g.us'), corDoId('120363@g.us'));
  assert.ok(PALETA_AVATAR.includes(corDoId('')));
  assert.ok(PALETA_AVATAR.includes(corDoId(undefined)));
  assert.equal(PALETA_AVATAR.length, 8);
});

test('ids diferentes espalham pela paleta', () => {
  const usadas = new Set(Array.from({ length: 64 }, (_, i) => corDoId(`5511${i}@c.us`)));
  assert.ok(usadas.size >= 6, `só ${usadas.size} cores usadas`);
});

test('toda cor da paleta tem contraste ≥ 4,5:1 com texto branco', () => {
  for (const cor of PALETA_AVATAR) assert.ok(contrasteComBranco(cor) >= 4.5, cor);
});
