// Funções puras de filtro, busca, ordenação e seções. Nenhuma muta a entrada.
import { apenasDigitos, contemTexto, normalizar } from './texto.js';

export const FILTROS = ['todos', 'telefone', 'admins', 'privados'];

const PASSA_NO_FILTRO = {
  todos: () => true,
  telefone: (p) => Boolean(p.phone) && !p.hidden,
  admins: (p) => Boolean(p.admin),
  privados: (p) => Boolean(p.hidden),
};

export function contarFiltros(ps) {
  const contagem = {};
  for (const filtro of FILTROS) contagem[filtro] = ps.filter(PASSA_NO_FILTRO[filtro]).length;
  return contagem;
}

function palavras(termo) {
  return normalizar(termo).split(/\s+/).filter(Boolean);
}

// Busca sem letras é um telefone, mesmo com espaços ("+55 11 9876"): compara os dígitos juntos.
function casaTelefoneInteiro(p, busca) {
  const digitos = apenasDigitos(busca);
  return Boolean(digitos) && apenasDigitos(p.phone).includes(digitos);
}

// Com letras, cada palavra precisa bater em algum nome ou no telefone.
function casaBusca(p, busca) {
  const termos = palavras(busca);
  if (!termos.length) return true;
  if (!/\p{L}/u.test(busca)) return casaTelefoneInteiro(p, busca);
  const telefone = apenasDigitos(p.phone);
  return termos.every((termo) => {
    if ([p.pushname, p.name, p.savedName].some((nome) => contemTexto(nome, termo))) return true;
    const digitos = apenasDigitos(termo);
    return Boolean(digitos) && telefone.includes(digitos);
  });
}

export function filtrarParticipantes(ps, { filtro = 'todos', busca = '' } = {}) {
  const passa = PASSA_NO_FILTRO[filtro] || PASSA_NO_FILTRO.todos;
  return ps.filter((p) => passa(p) && casaBusca(p, busca));
}

// Mesmos valores das colunas do Excel; a tabela ordena por eles.
export function linhaExportacao(p) {
  const telefone = apenasDigitos(p.phone);
  return {
    preview: '',
    nome_whatsapp: p.pushname || p.name || '',
    nome_agenda: p.savedName || '',
    telefone: telefone ? '+' + telefone : '',
    admin: p.admin ? 'sim' : 'não',
    status: p.hidden ? 'ID de privacidade (LID)' : 'Normal',
  };
}

export function ordenarParticipantes(ps, coluna, asc) {
  if (coluna === null || coluna === undefined) return [...ps];
  const comChave = ps.map((p) => ({ p, chave: String(linhaExportacao(p)[coluna] ?? '') }));
  comChave.sort((a, b) => {
    const cmp = a.chave.localeCompare(b.chave, 'pt-BR', { numeric: true });
    return asc ? cmp : -cmp;
  });
  return comChave.map(({ p }) => p);
}

export function filtrarGrupos(grupos, termo) {
  const termos = palavras(termo);
  return grupos.filter((g) => termos.every((t) => contemTexto(g.name, t)));
}

export function separarSecoes(grupos, fixados) {
  const porId = new Map(grupos.map((g) => [g.id, g]));
  return {
    fixados: fixados.filter((id) => porId.has(id)).map((id) => porId.get(id)),
    todos: [...grupos],
  };
}

export function resultadosBuscaRapida(grupos, termo, fixados, recentes) {
  if (normalizar(termo)) return filtrarGrupos(grupos, termo);
  const porId = new Map(grupos.map((g) => [g.id, g]));
  const ids = [...fixados, ...recentes.map((r) => r.id)];
  const vistos = new Set();
  const resultado = [];
  for (const id of ids) {
    if (vistos.has(id) || !porId.has(id)) continue;
    vistos.add(id);
    resultado.push(porId.get(id));
  }
  return resultado;
}

export function vizinhoNaLista(ps, idAtual, direcao) {
  const indice = ps.findIndex((p) => p.id === idAtual);
  if (indice === -1) return null;
  const vizinho = ps[indice + direcao];
  return vizinho ? vizinho.id : null;
}
