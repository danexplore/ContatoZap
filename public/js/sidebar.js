// Lista de grupos à esquerda: filtro por nome, abrir grupo e seleção para extração em lote.
import { $, mostrarAviso } from './ui.js';
import { iniciarLote, recarregarGrupos } from './api.js';
import { aoMudar, atualizarEstado, obterEstado } from './estado.js';
import { abrirGrupo } from './grupo.js';
import { filtrarGrupos } from './logica/filtros.js';

// Lista e grupo ativo pedem redesenho; seleção só marca as caixas, sem tirar o foco do teclado.
const CHAVES_REDESENHO = ['conexao', 'abaAtiva'];

const gruposDoServidor = () => obterEstado().conexao.groups || [];

function renderizarSidebar() {
  const lista = $('groupList');
  const termo = $('groupSearch').value;
  const grupos = gruposDoServidor();
  const { abaAtiva, selecionados } = obterEstado();
  $('totalGroupsCount').textContent = grupos.length;
  atualizarContadorSelecionados();
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
    const selecionado = selecionados.has(g.id);
    const ativo = abaAtiva === g.id;
    const li = document.createElement('li');
    li.className = `group-item ${ativo ? 'active' : ''}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', ativo ? 'true' : 'false');

    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.checked = selecionado;
    caixa.dataset.grupo = g.id;
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
}

function sincronizarSelecao() {
  const { selecionados } = obterEstado();
  for (const caixa of $('groupList').querySelectorAll('input[type="checkbox"][data-grupo]')) {
    caixa.checked = selecionados.has(caixa.dataset.grupo);
  }
  atualizarContadorSelecionados();
}

function alternarSelecao(id, marcado) {
  const selecionados = new Set(obterEstado().selecionados);
  if (marcado) selecionados.add(id); else selecionados.delete(id);
  atualizarEstado({ selecionados });
}

function atualizarContadorSelecionados() {
  const total = obterEstado().selecionados.size;
  $('selectedCount').textContent = total;
  $('batchSidebarBar').hidden = total === 0;
  $('batchSidebarText').textContent = `${total} grupo(s)`;
}

export function atualizarTamanhoGrupo(id, total) {
  const { conexao } = obterEstado();
  const grupos = conexao.groups || [];
  if (!grupos.some((g) => g.id === id)) return;
  atualizarEstado({ conexao: { ...conexao, groups: grupos.map((g) => (g.id === id ? { ...g, size: total } : g)) } });
}

function extrairSelecionados() {
  const { selecionados } = obterEstado();
  if (selecionados.size === 0) return;
  const ids = Array.from(selecionados);
  const fotos = Boolean($('batchPhotosCheck') && $('batchPhotosCheck').checked);
  iniciarLote(ids, fotos).catch((err) => mostrarAviso(`Erro ao iniciar lote: ${err.message}`, 'error'));
}

export function iniciarSidebar() {
  aoMudar((_, chaves) => {
    if (chaves.some((c) => CHAVES_REDESENHO.includes(c))) renderizarSidebar();
    else if (chaves.includes('selecionados')) sincronizarSelecao();
  });
  $('selectAllBtn').addEventListener('click', () => atualizarEstado({ selecionados: new Set(gruposDoServidor().map((g) => g.id)) }));
  $('clearSelectionBtn').addEventListener('click', () => atualizarEstado({ selecionados: new Set() }));
  $('groupSearch').addEventListener('input', renderizarSidebar);
  $('refreshGroupsBtn').addEventListener('click', () => recarregarGrupos());
  $('startBatchBtn').addEventListener('click', extrairSelecionados);
}
