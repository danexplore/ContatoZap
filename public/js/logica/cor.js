// Cor fixa do avatar a partir do id: o mesmo grupo ou pessoa tem sempre a mesma cor.

// Todas com contraste ≥ 4,5:1 com texto branco (conferido em test/front/cor.test.mjs)
export const PALETA_AVATAR = [
  'hsl(175 77% 26%)',
  'hsl(217 71% 42%)',
  'hsl(262 52% 47%)',
  'hsl(330 65% 40%)',
  'hsl(0 65% 42%)',
  'hsl(24 85% 34%)',
  'hsl(142 64% 27%)',
  'hsl(200 80% 32%)',
];

// djb2 em 32 bits sem sinal
function hashDjb2(texto) {
  let hash = 5381;
  for (let i = 0; i < texto.length; i++) hash = ((hash << 5) + hash + texto.charCodeAt(i)) >>> 0;
  return hash;
}

export function corDoId(id) {
  return PALETA_AVATAR[hashDjb2(String(id ?? '')) % PALETA_AVATAR.length];
}
