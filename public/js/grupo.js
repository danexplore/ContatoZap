// Grupo aberto: carregamento (com cache no navegador), cabeçalho, métricas e ações de exportação.
import { $, mostrarAviso } from './ui.js';
import { buscarGrupo } from './api.js';
import { renderizarSidebar, atualizarTamanhoGrupo } from './sidebar.js';
import { renderizarLista } from './lista.js';
import { copiarTelefones, exportarCsv, exportarExcel, exportarJson } from './exportar.js';
import { contarFiltros } from './logica/filtros.js';

// null | { id, name } enquanto carrega | GrupoExtraido
let grupoAtivo = null;
// `${id}:basic|with_photos` -> GrupoExtraido
const cacheCliente = new Map();

export const obterGrupoAtivo = () => grupoAtivo;

function querFotos() {
  return Boolean($('fetchPhotosCheckbox') && $('fetchPhotosCheckbox').checked);
}

export async function abrirGrupo(g, { atualizar = false } = {}) {
  grupoAtivo = { id: g.id, name: g.name };
  renderizarSidebar();
  $('emptyDetail').hidden = true;
  $('activeGroupView').hidden = true;
  $('loadingDetail').hidden = false;
  const fotos = querFotos();
  $('loadingDetailMsg').textContent = fotos ? `Carregando membros e fotos de "${g.name}"...` : `Carregando membros de "${g.name}"...`;
  const chave = `${g.id}:${fotos ? 'with_photos' : 'basic'}`;
  if (!atualizar) {
    if (cacheCliente.has(chave)) { grupoAtivo = cacheCliente.get(chave); renderizarGrupoAtivo(); return; }
    if (!fotos && cacheCliente.has(`${g.id}:with_photos`)) { grupoAtivo = cacheCliente.get(`${g.id}:with_photos`); renderizarGrupoAtivo(); return; }
  }
  try {
    const data = await buscarGrupo(g.id, { atualizar, fotos });
    cacheCliente.set(chave, data);
    if (fotos) cacheCliente.set(`${g.id}:basic`, data);
    atualizarTamanhoGrupo(g.id, data.participants.length);
    if (grupoAtivo && grupoAtivo.id === g.id) { grupoAtivo = data; renderizarGrupoAtivo(); }
  } catch (err) {
    $('loadingDetail').hidden = true;
    mostrarAviso(`Erro ao extrair grupo: ${err.message}`, 'error', 4500);
    $('emptyDetail').hidden = false;
  }
}

export function renderizarGrupoAtivo() {
  $('loadingDetail').hidden = true;
  $('emptyDetail').hidden = true;
  $('activeGroupView').hidden = false;
  $('activeGroupName').textContent = grupoAtivo.name;
  const lista = grupoAtivo.participants || [];
  const comFoto = lista.filter((p) => Boolean(p.photoUrl)).length;
  $('activeGroupCount').textContent = comFoto > 0 ? `${lista.length} participante(s) · ${comFoto} com foto` : `${lista.length} participante(s)`;
  $('activeGroupDuration').textContent = grupoAtivo.durationSec ? `${grupoAtivo.durationSec}s` : 'Cache';
  const contagem = contarFiltros(lista);
  $('metricTotal').textContent = contagem.todos;
  $('metricPhones').textContent = contagem.telefone;
  $('metricAdmins').textContent = contagem.admins;
  $('metricHidden').textContent = contagem.privados;
  $('tabCountAll').textContent = contagem.todos;
  $('tabCountPhones').textContent = contagem.telefone;
  $('tabCountAdmins').textContent = contagem.admins;
  $('tabCountHidden').textContent = contagem.privados;
  renderizarLista({ primeiraPagina: true });
}

function comParticipantes(acao) {
  return () => { if (grupoAtivo && grupoAtivo.participants) acao(grupoAtivo); };
}

export function iniciarGrupo() {
  $('refreshActiveGroupBtn').addEventListener('click', () => { if (grupoAtivo) abrirGrupo(grupoAtivo, { atualizar: true }); });
  $('copyPhonesBtn').addEventListener('click', comParticipantes(copiarTelefones));
  $('exportCsvBtn').addEventListener('click', comParticipantes(exportarCsv));
  $('exportExcelBtn').addEventListener('click', comParticipantes((g) => exportarExcel(g, $('exportExcelBtn'))));
  $('exportJsonBtn').addEventListener('click', () => { if (grupoAtivo) exportarJson(grupoAtivo); });

  const caixaFotos = $('fetchPhotosCheckbox');
  if (caixaFotos) {
    const preferencia = localStorage.getItem('contatozap_fetch_photos');
    if (preferencia !== null) caixaFotos.checked = preferencia === '1';
    caixaFotos.addEventListener('change', (e) => {
      localStorage.setItem('contatozap_fetch_photos', e.target.checked ? '1' : '0');
      if (grupoAtivo && grupoAtivo.id) abrirGrupo(grupoAtivo, { atualizar: true });
    });
  }
}
