// Grupo aberto: carregamento (com cache no navegador), cabeçalho, métricas e ações de exportação.
import { $, mostrarAviso } from './ui.js';
import { buscarGrupo } from './api.js';
import { aoMudar, atualizarEstado, obterEstado, FOTO_EXCEL_MIN, FOTO_EXCEL_MAX } from './estado.js';
import { atualizarTamanhoGrupo } from './sidebar.js';
import { copiarTelefones, exportarCsv, exportarExcel, exportarJson } from './exportar.js';
import { contarFiltros } from './logica/filtros.js';

const CHAVES_GRUPO = ['abaAtiva', 'grupos'];

// `${id}:basic|with_photos` -> GrupoExtraido (memória das respostas da API, não é estado de tela)
const cacheCliente = new Map();

// Dados do grupo ativo já carregado, ou null enquanto carrega / sem grupo / com erro.
export function obterGrupoAtivo() {
  const { abaAtiva, grupos } = obterEstado();
  const entrada = abaAtiva ? grupos.get(abaAtiva) : null;
  return entrada && entrada.status === 'pronto' ? entrada.dados : null;
}

function nomeDoGrupo(id) {
  const g = (obterEstado().conexao.groups || []).find((x) => x.id === id);
  return g ? g.name : '';
}

function comEntrada(id, entrada) {
  const grupos = new Map(obterEstado().grupos);
  grupos.set(id, entrada);
  return grupos;
}

export async function abrirGrupo(g, { atualizar = false } = {}) {
  const fotos = obterEstado().buscarFotos;
  const chave = `${g.id}:${fotos ? 'with_photos' : 'basic'}`;
  if (!atualizar) {
    const emCache = cacheCliente.get(chave) || (!fotos && cacheCliente.get(`${g.id}:with_photos`));
    if (emCache) {
      atualizarEstado({ abaAtiva: g.id, grupos: comEntrada(g.id, { status: 'pronto', dados: emCache }) });
      return;
    }
  }
  atualizarEstado({ abaAtiva: g.id, grupos: comEntrada(g.id, { status: 'carregando' }) });
  try {
    const data = await buscarGrupo(g.id, { atualizar, fotos });
    cacheCliente.set(chave, data);
    if (fotos) cacheCliente.set(`${g.id}:basic`, data);
    atualizarEstado({ grupos: comEntrada(g.id, { status: 'pronto', dados: data }) });
    atualizarTamanhoGrupo(g.id, data.participants.length);
  } catch (err) {
    atualizarEstado({ grupos: comEntrada(g.id, { status: 'erro', erro: err.message }) });
    mostrarAviso(`Erro ao extrair grupo: ${err.message}`, 'error', 4500);
  }
}

function mostrarCarregando(id) {
  $('emptyDetail').hidden = true;
  $('activeGroupView').hidden = true;
  $('loadingDetail').hidden = false;
  const nome = nomeDoGrupo(id);
  $('loadingDetailMsg').textContent = obterEstado().buscarFotos
    ? `Carregando membros e fotos de "${nome}"...`
    : `Carregando membros de "${nome}"...`;
}

function mostrarVazio() {
  $('loadingDetail').hidden = true;
  $('activeGroupView').hidden = true;
  $('emptyDetail').hidden = false;
}

function mostrarGrupo(grupo) {
  $('loadingDetail').hidden = true;
  $('emptyDetail').hidden = true;
  $('activeGroupView').hidden = false;
  $('activeGroupName').textContent = grupo.name;
  const lista = grupo.participants || [];
  const comFoto = lista.filter((p) => Boolean(p.photoUrl)).length;
  $('activeGroupCount').textContent = comFoto > 0 ? `${lista.length} participante(s) · ${comFoto} com foto` : `${lista.length} participante(s)`;
  $('activeGroupDuration').textContent = grupo.durationSec ? `${grupo.durationSec}s` : 'Cache';
  const contagem = contarFiltros(lista);
  $('metricTotal').textContent = contagem.todos;
  $('metricPhones').textContent = contagem.telefone;
  $('metricAdmins').textContent = contagem.admins;
  $('metricHidden').textContent = contagem.privados;
  $('tabCountAll').textContent = contagem.todos;
  $('tabCountPhones').textContent = contagem.telefone;
  $('tabCountAdmins').textContent = contagem.admins;
  $('tabCountHidden').textContent = contagem.privados;
}

function renderizarGrupo() {
  const { abaAtiva, grupos } = obterEstado();
  const entrada = abaAtiva ? grupos.get(abaAtiva) : null;
  if (!entrada || entrada.status === 'erro') mostrarVazio();
  else if (entrada.status === 'carregando') mostrarCarregando(abaAtiva);
  else mostrarGrupo(entrada.dados);
}

function comParticipantes(acao) {
  return () => { const grupo = obterGrupoAtivo(); if (grupo && grupo.participants) acao(grupo); };
}

function recarregarAtivo() {
  const { abaAtiva } = obterEstado();
  if (abaAtiva) abrirGrupo({ id: abaAtiva }, { atualizar: true });
}

function iniciarPreferenciasDoGrupo() {
  const caixaFotos = $('fetchPhotosCheckbox');
  if (caixaFotos) {
    caixaFotos.checked = obterEstado().buscarFotos;
    caixaFotos.addEventListener('change', (e) => {
      atualizarEstado({ buscarFotos: e.target.checked });
      recarregarAtivo();
    });
  }

  const campoFotoExcel = $('imageSizeInput');
  if (campoFotoExcel) {
    campoFotoExcel.value = obterEstado().tamanhoFotoExcel;
    campoFotoExcel.addEventListener('change', () => {
      const tamanho = parseInt(campoFotoExcel.value, 10);
      const valido = Number.isFinite(tamanho) ? Math.min(FOTO_EXCEL_MAX, Math.max(FOTO_EXCEL_MIN, tamanho)) : obterEstado().tamanhoFotoExcel;
      campoFotoExcel.value = valido;
      atualizarEstado({ tamanhoFotoExcel: valido });
    });
  }
}

export function iniciarGrupo() {
  aoMudar((_, chaves) => { if (chaves.some((c) => CHAVES_GRUPO.includes(c))) renderizarGrupo(); });
  $('refreshActiveGroupBtn').addEventListener('click', recarregarAtivo);
  $('copyPhonesBtn').addEventListener('click', comParticipantes(copiarTelefones));
  $('exportCsvBtn').addEventListener('click', comParticipantes(exportarCsv));
  $('exportExcelBtn').addEventListener('click', comParticipantes((g) => exportarExcel(g, $('exportExcelBtn'))));
  $('exportJsonBtn').addEventListener('click', () => { const grupo = obterGrupoAtivo(); if (grupo) exportarJson(grupo); });
  iniciarPreferenciasDoGrupo();
}
