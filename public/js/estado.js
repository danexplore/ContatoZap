// Estado central da interface: preferências no localStorage e aviso às áreas quando algo muda.
// Não toca em `document`, para rodar no Node nos testes. Maps e Sets são substituídos, nunca mutados.
import { normalizarRecentes } from './logica/recentes.js';
import { FILTROS } from './logica/filtros.js';

const MODOS = ['lista', 'grade'];
const TAMANHOS_GRADE = ['P', 'M', 'G'];
const FOTO_EXCEL_MIN = 20;
const FOTO_EXCEL_MAX = 500;

function lerJson(texto) {
  try { return JSON.parse(texto); } catch { return undefined; }
}

// '1'/'0' → boolean; qualquer outra coisa → undefined (usa o padrão)
const lerBooleano = (texto) => (texto === '1' ? true : texto === '0' ? false : undefined);
const gravarBooleano = (valor) => (valor ? '1' : '0');
const lerOpcao = (opcoes) => (texto) => (opcoes.includes(texto) ? texto : undefined);
const gravarTexto = (valor) => String(valor);

function lerFixados(texto) {
  const valor = lerJson(texto);
  if (!Array.isArray(valor)) return undefined;
  return [...new Set(valor.filter((id) => typeof id === 'string' && id !== ''))];
}

function lerSecoes(texto) {
  const valor = lerJson(texto);
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return undefined;
  return {
    fixados: typeof valor.fixados === 'boolean' ? valor.fixados : true,
    todos: typeof valor.todos === 'boolean' ? valor.todos : true,
  };
}

function lerTamanhoFotoExcel(texto) {
  if (!/^\d+$/.test(texto)) return undefined;
  const tamanho = Number(texto);
  return tamanho >= FOTO_EXCEL_MIN && tamanho <= FOTO_EXCEL_MAX ? tamanho : undefined;
}

function temaDoSistema() {
  try {
    if (typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch { /* sem matchMedia utilizável: claro */ }
  return 'light';
}

// estado → { chave do localStorage, padrão, ler(texto) → valor | undefined, gravar(valor) → texto }
const PREFERENCIAS = {
  tema: { chave: 'contatozap_theme', padrao: temaDoSistema, ler: lerOpcao(['light', 'dark']), gravar: gravarTexto },
  buscarFotos: { chave: 'contatozap_fetch_photos', padrao: () => false, ler: lerBooleano, gravar: gravarBooleano },
  fixados: { chave: 'contatozap_fixados', padrao: () => [], ler: lerFixados, gravar: JSON.stringify },
  recentes: { chave: 'contatozap_recentes', padrao: () => [], ler: (t) => normalizarRecentes(lerJson(t)), gravar: JSON.stringify },
  secoes: { chave: 'contatozap_secoes', padrao: () => ({ fixados: true, todos: true }), ler: lerSecoes, gravar: JSON.stringify },
  sidebarRecolhida: { chave: 'contatozap_sidebar_recolhida', padrao: () => false, ler: lerBooleano, gravar: gravarBooleano },
  modo: { chave: 'contatozap_modo', padrao: () => 'lista', ler: lerOpcao(MODOS), gravar: gravarTexto },
  tamanhoGrade: { chave: 'contatozap_tamanho_grade', padrao: () => 'M', ler: lerOpcao(TAMANHOS_GRADE), gravar: gravarTexto },
  tamanhoFotoExcel: { chave: 'contatozap_tamanho_foto_excel', padrao: () => 100, ler: lerTamanhoFotoExcel, gravar: gravarTexto },
};

// Em alguns navegadores (cookies bloqueados, iframe isolado) só ler `localStorage` já lança.
function armazenamentoDoNavegador() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

function lerPreferencia({ chave, padrao, ler }, armazenamento) {
  try {
    const texto = armazenamento ? armazenamento.getItem(chave) : null;
    if (typeof texto !== 'string') return padrao();
    const valor = ler(texto);
    return valor === undefined ? padrao() : valor;
  } catch {
    return padrao();
  }
}

export function carregarPreferencias(armazenamento = armazenamentoDoNavegador()) {
  const preferencias = {};
  for (const [nome, descritor] of Object.entries(PREFERENCIAS)) {
    preferencias[nome] = lerPreferencia(descritor, armazenamento);
  }
  return preferencias;
}

const visaoPadrao = () => ({ filtro: 'todos', busca: '', rolagem: 0, ordenacao: { coluna: null, asc: true } });

function estadoInicial(armazenamento) {
  return {
    conexao: { status: 'starting', groups: [] },
    ...carregarPreferencias(armazenamento),
    abaAtiva: null,
    grupos: new Map(),
    visoes: new Map(),
    selecionados: new Set(),
    fichaAberta: null,
    fotosGrupos: new Map(),
    lote: { ativo: false, resultados: [] },
  };
}

let armazenamentoAtual;
let estado = estadoInicial(undefined);
let ouvintes = new Set();

// Chamado uma vez pelo app.js, antes de as áreas assinarem. Recomeçar descarta os ouvintes.
export function iniciarEstado(armazenamento = armazenamentoDoNavegador()) {
  armazenamentoAtual = armazenamento;
  estado = estadoInicial(armazenamento);
  ouvintes = new Set();
}

export const obterEstado = () => estado;

function persistir(patch) {
  if (!armazenamentoAtual) return;
  for (const nome of Object.keys(patch)) {
    const descritor = PREFERENCIAS[nome];
    if (!descritor) continue;
    try {
      armazenamentoAtual.setItem(descritor.chave, descritor.gravar(patch[nome]));
    } catch { /* cota cheia ou armazenamento bloqueado: a preferência vale só nesta sessão */ }
  }
}

function avisar(chaves) {
  for (const ouvinte of [...ouvintes]) {
    try {
      ouvinte(estado, chaves);
    } catch (erro) {
      console.error('Erro ao atualizar a interface:', erro);
    }
  }
}

export function atualizarEstado(patch) {
  estado = { ...estado, ...patch };
  persistir(patch);
  avisar(Object.keys(patch));
}

export function aoMudar(fn) {
  ouvintes.add(fn);
  return () => { ouvintes.delete(fn); };
}

export function visaoDoGrupo(id) {
  return estado.visoes.get(id) || visaoPadrao();
}

export function atualizarVisao(id, patch) {
  const atual = visaoDoGrupo(id);
  const nova = {
    ...atual,
    ...patch,
    filtro: FILTROS.includes(patch.filtro) ? patch.filtro : atual.filtro,
    ordenacao: { ...atual.ordenacao, ...(patch.ordenacao || {}) },
  };
  const visoes = new Map(estado.visoes);
  visoes.set(id, nova);
  estado = { ...estado, visoes };
  avisar(['visoes']);
}
