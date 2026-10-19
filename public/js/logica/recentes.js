// Abas de recentes: até 8; passando disso sai a usada há mais tempo. Nenhuma função muta a entrada.

export const LIMITE_RECENTES = 8;

export function abrirRecente(lista, { id, name }, agora, limite = LIMITE_RECENTES) {
  if (lista.some((r) => r.id === id)) {
    return lista.map((r) => (r.id === id ? { id, name, usadoEm: agora } : r));
  }
  let nova = [{ id, name, usadoEm: agora }, ...lista];
  while (nova.length > limite) {
    // Índice 0 é o recém-aberto: procura o mais antigo só entre os demais; no empate, o mais à direita
    let maisAntigo = 1;
    for (let i = 2; i < nova.length; i++) if (nova[i].usadoEm <= nova[maisAntigo].usadoEm) maisAntigo = i;
    if (maisAntigo >= nova.length) break;
    nova = nova.filter((_, i) => i !== maisAntigo);
  }
  return nova;
}

export function fecharRecente(lista, id, abaAtiva) {
  const indice = lista.findIndex((r) => r.id === id);
  if (indice === -1) return { lista, proximaAtiva: abaAtiva };
  const nova = lista.filter((_, i) => i !== indice);
  if (id !== abaAtiva) return { lista: nova, proximaAtiva: abaAtiva };
  const vizinha = lista[indice + 1] || lista[indice - 1] || null;
  return { lista: nova, proximaAtiva: vizinha ? vizinha.id : null };
}

function recenteValido(item) {
  return item !== null && typeof item === 'object'
    && typeof item.id === 'string' && item.id !== ''
    && typeof item.name === 'string';
}

export function normalizarRecentes(valor) {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set();
  const lista = [];
  for (const item of valor) {
    if (!recenteValido(item) || vistos.has(item.id)) continue;
    vistos.add(item.id);
    const usadoEm = Number.isFinite(item.usadoEm) ? item.usadoEm : 0;
    lista.push({ id: item.id, name: item.name, usadoEm });
    if (lista.length === LIMITE_RECENTES) break;
  }
  return lista;
}
