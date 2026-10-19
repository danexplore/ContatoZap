// Lista de grupos à esquerda: filtro por nome, abrir grupo e seleção para extração em lote.
import { $, mostrarAviso } from './ui.js';
import { iniciarLote, recarregarGrupos } from './api.js';
import { obterEstadoServidor } from './conexao.js';
import { abrirGrupo, obterGrupoAtivo } from './grupo.js';
import { filtrarGrupos } from './logica/filtros.js';

const gruposSelecionados = new Set();

export function renderizarSidebar() {
  const lista = $('groupList');
  const termo = $('groupSearch').value;
  const grupos = obterEstadoServidor().groups || [];
  const grupoAtivo = obterGrupoAtivo();
  $('totalGroupsCount').textContent = grupos.length;
  const filtrados = filtrarGrupos(grupos, termo);
  lista.replaceChildren();
  if (!filtrados.length) {
    const vazio = document.createElement('li');
    vazio.className = 'group-item';
    vazio.style.justifyContent = 'center';
    vazio.style.color = 'hsl(var(--color-text-tertiary))';
    vazio.textContent = grupos.length ? 'Nenhum grupo com este filtro.' : 'Nenhum grupo encontrado.';
    lista.appendChild(vazio);
    return;
  }
  for (const g of filtrados) {
    const selecionado = gruposSelecionados.has(g.id);
    const ativo = grupoAtivo && grupoAtivo.id === g.id;
    const li = document.createElement('li');
    li.className = `group-item ${ativo ? 'active' : ''}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', ativo ? 'true' : 'false');

    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.checked = selecionado;
    caixa.setAttribute('aria-label', `Selecionar grupo ${g.name || '(Sem nome)'}`);
    caixa.addEventListener('click', (e) => { e.stopPropagation(); alternarSelecao(g.id, caixa.checked); });

    const info = document.createElement('div');
    info.className = 'group-info';
    info.addEventListener('click', () => abrirGrupo(g));

    const nome = document.createElement('div');
    nome.className = 'group-name';
    nome.textContent = g.name || '(Sem nome)';
    nome.title = g.name || '';

    const sub = document.createElement('div');
    sub.className = 'group-sub';
    sub.textContent = g.size > 0 ? `${g.size} participantes` : 'Membros pendentes';

    info.append(nome, sub);

    const selo = document.createElement('span');
    selo.className = 'badge neutral';
    selo.textContent = g.size > 0 ? `${g.size}` : '—';

    li.append(caixa, info, selo);
    lista.appendChild(li);
  }
  atualizarContadorSelecionados();
}

function alternarSelecao(id, marcado) {
  if (marcado) gruposSelecionados.add(id); else gruposSelecionados.delete(id);
  atualizarContadorSelecionados();
}

function atualizarContadorSelecionados() {
  const total = gruposSelecionados.size;
  $('selectedCount').textContent = total;
  $('batchSidebarBar').hidden = total === 0;
  $('batchSidebarText').textContent = `${total} grupo(s)`;
}

export function atualizarTamanhoGrupo(id, total) {
  const g = (obterEstadoServidor().groups || []).find((x) => x.id === id);
  if (g) { g.size = total; renderizarSidebar(); }
}

function extrairSelecionados() {
  if (gruposSelecionados.size === 0) return;
  const ids = Array.from(gruposSelecionados);
  const fotos = Boolean($('batchPhotosCheck') && $('batchPhotosCheck').checked);
  iniciarLote(ids, fotos).catch((err) => mostrarAviso(`Erro ao iniciar lote: ${err.message}`, 'error'));
}

export function iniciarSidebar() {
  $('selectAllBtn').addEventListener('click', () => { (obterEstadoServidor().groups || []).forEach((g) => gruposSelecionados.add(g.id)); renderizarSidebar(); });
  $('clearSelectionBtn').addEventListener('click', () => { gruposSelecionados.clear(); renderizarSidebar(); });
  $('groupSearch').addEventListener('input', renderizarSidebar);
  $('refreshGroupsBtn').addEventListener('click', () => recarregarGrupos());
  $('startBatchBtn').addEventListener('click', extrairSelecionados);
}
