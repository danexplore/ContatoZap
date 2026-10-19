// Monta a URL da requisição como caminho local. Concatenar com a origem (em vez de usar o 2º
// argumento de new URL) impede que `//host/x` seja lido como URL de outro host e lance erro.
// Devolve null quando o alvo da requisição não é um caminho válido (ex.: `*`, URL absoluta).
function urlLocal(alvoRequisicao) {
  if (typeof alvoRequisicao !== 'string' || !alvoRequisicao.startsWith('/')) return null;
  try {
    return new URL('http://localhost' + alvoRequisicao);
  } catch {
    return null;
  }
}

module.exports = { urlLocal };
