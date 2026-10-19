// Sidebar de grupos: filtro, seções Fixados e Todos (recolhíveis), fotos dos grupos e seleção para lote.
import { $, mostrarAviso } from './ui.js';
import { iniciarLote, recarregarGrupos } from './api.js';
import { aoMudar, atualizarEstado, obterEstado } from './estado.js';
import { abrirGrupo } from './grupo.js';
import { filtrarGrupos, separarSecoes } from './logica/filtros.js';
import { normalizar } from './logica/texto.js';
import { criarAvatar } from './componentes/avatar.js';
import { criarEstrela } from './componentes/estrela.js';
import { observarFotoGrupo } from './fotos-grupos.js';

// Mudam o que aparece na lista: redesenho completo. Seleção e fotos só ajustam o que já está na tela.
const CHAVES_REDESENHO = ['conexao', 'abaAtiva', 'fixados', 'secoes'];
const TAMANHO_AVATAR = 32;

const SECOES = {
  fixados: { titulo: 'secaoFixadosTitulo', corpo: 'secaoFixadosCorpo', contador: 'secaoFixadosContador' },
  todos: { titulo: 'secaoTodosTitulo', corpo: 'secaoTodosCorpo', contador: 'secaoTodosContador' },
};

const gruposDoServidor = () => obterEstado().conexao.groups || [];
const nomeDoGrupo = (g) => g.name || '(Sem nome)';
const textoMembros = (g) => (g.size > 0 ? `${g.size} ${g.size === 1 ? 'membro' : 'membros'}` : 'Membros pendentes');

function gruposFiltrados() {
  return filtrarGrupos(gruposDoServidor(), $('groupSearch').value);
}

export function alternarFixado(id) {
  const { fixados } = obterEstado();
  atualizarEstado({ fixados: fixados.includes(id) ? fixados.filter((f) => f !== id) : [...fixados, id] });
}

function criarAvatarDoGrupo(g) {
  const foto = obterEstado().fotosGrupos.get(g.id) || null;
  return criarAvatar({ id: g.id, nome: g.name, foto, tamanho: TAMANHO_AVATAR });
}

function criarItem(g, secao) {
  const { abaAtiva, selecionados, fixados } = obterEstado();
  const nome = nomeDoGrupo(g);
  const ativo = abaAtiva === g.id;
  const fixado = fixados.includes(g.id);

  const li = document.createElement('li');
  li.className = `group-item${ativo ? ' active' : ''}${fixado ? ' fixado' : ''}`;
  li.dataset.grupo = g.id;
  li.addEventListener('click', () => abrirGrupo(g));

  const caixa = document.createElement('input');
  caixa.type = 'checkbox';
  caixa.checked = selecionados.has(g.id);
  caixa.dataset.grupo = g.id;
  caixa.dataset.foco = `${secao}:caixa:${g.id}`;
  caixa.setAttribute('aria-label', `Selecionar ${nome}`);
  caixa.addEventListener('click', (e) => e.stopPropagation());
  caixa.addEventListener('change', () => alternarSelecao(g.id, caixa.checked));

  const slotAvatar = document.createElement('span');
  slotAvatar.className = 'group-avatar';
  slotAvatar.dataset.avatarGrupo = g.id;
  slotAvatar.appendChild(criarAvatarDoGrupo(g));

  // O botão dá o Enter e o foco por teclado; o clique dele sobe para o item
  const abrir = document.createElement('button');
  abrir.type = 'button';
  abrir.className = 'group-abrir';
  abrir.dataset.foco = `${secao}:abrir:${g.id}`;
  if (ativo) abrir.setAttribute('aria-current', 'true');

  const nomeEl = document.createElement('span');
  nomeEl.className = 'group-name';
  nomeEl.textContent = nome;
  nomeEl.title = g.name || '';

  const sub = document.createElement('span');
  sub.className = 'group-sub';
  sub.textContent = textoMembros(g);

  abrir.append(nomeEl, sub);

  const estrela = criarEstrela({ ativa: fixado, rotulo: nome, aoAlternar: () => alternarFixado(g.id) });
  estrela.dataset.foco = `${secao}:estrela:${g.id}`;

  li.append(caixa, slotAvatar, abrir, estrela);
  observarFotoGrupo(li, g.id);
  return li;
}

function criarAvisoVazio(texto) {
  const li = document.createElement('li');
  li.className = 'sidebar-vazio';
  li.textContent = texto;
  return li;
}

function renderizarSecao(chave, grupos, textoVazio) {
  const ids = SECOES[chave];
  const aberta = obterEstado().secoes[chave] !== false;
  const titulo = $(ids.titulo);
  titulo.setAttribute('aria-expanded', aberta ? 'true' : 'false');
  $(ids.contador).textContent = grupos.length;
  const corpo = $(ids.corpo);
  corpo.hidden = !aberta;
  corpo.replaceChildren();
  if (!aberta) return;
  if (!grupos.length) {
    corpo.appendChild(criarAvisoVazio(textoVazio));
    return;
  }
  for (const g of grupos) corpo.appendChild(criarItem(g, chave));
}

// Redesenhar troca os elementos; o foco volta para o equivalente (mesma ação, mesmo grupo).
function focoAtual() {
  const ativo = document.activeElement;
  return ativo && ativo.dataset ? ativo.dataset.foco || null : null;
}

function restaurarFoco(chave) {
  if (!chave || focoAtual() === chave) return;
  const lista = $('groupList');
  const alvo = lista.querySelector(`[data-foco="${CSS.escape(chave)}"]`)
    || lista.querySelector(`[data-foco$="${CSS.escape(chave.slice(chave.indexOf(':')))}"]`);
  if (alvo) alvo.focus({ preventScroll: true });
}

function renderizarSidebar() {
  const lista = $('groupList');
  const foco = focoAtual();
  const rolagem = lista.scrollTop;
  const todos = gruposDoServidor();
  const filtrados = gruposFiltrados();
  const secoes = separarSecoes(filtrados, obterEstado().fixados);
  const comFiltro = normalizar($('groupSearch').value) !== '';

  $('totalGroupsCount').textContent = todos.length;
  const semFixados = separarSecoes(todos, obterEstado().fixados).fixados.length === 0;
  renderizarSecao('fixados', secoes.fixados, semFixados ? 'Clique na ☆ para fixar um grupo.' : 'Nenhum fixado com este filtro.');
  renderizarSecao('todos', secoes.todos, comFiltro ? 'Nenhum grupo com este filtro.' : 'Nenhum grupo encontrado.');
  lista.scrollTop = rolagem;
  restaurarFoco(foco);
  atualizarContadorSelecionados();
}

function atualizarFotos() {
  const { fotosGrupos } = obterEstado();
  const porId = new Map(gruposDoServidor().map((g) => [g.id, g]));
  for (const slot of document.querySelectorAll('[data-avatar-grupo]')) {
    const id = slot.dataset.avatarGrupo;
    const temFoto = slot.querySelector('.avatar--com-foto');
    if (temFoto || !fotosGrupos.get(id) || !porId.has(id)) continue;
    slot.replaceChildren(criarAvatarDoGrupo(porId.get(id)));
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

function alternarSecao(chave) {
  const secoes = obterEstado().secoes;
  atualizarEstado({ secoes: { ...secoes, [chave]: secoes[chave] === false } });
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
    if (chaves.includes('fotosGrupos')) atualizarFotos();
  });
  for (const chave of Object.keys(SECOES)) {
    $(SECOES[chave].titulo).addEventListener('click', () => alternarSecao(chave));
  }
  $('selectAllBtn').addEventListener('click', () => atualizarEstado({ selecionados: new Set(gruposDoServidor().map((g) => g.id)) }));
  $('clearSelectionBtn').addEventListener('click', () => atualizarEstado({ selecionados: new Set() }));
  $('groupSearch').addEventListener('input', renderizarSidebar);
  $('refreshGroupsBtn').addEventListener('click', () => recarregarGrupos());
  $('startBatchBtn').addEventListener('click', extrairSelecionados);
}
