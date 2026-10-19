// Sidebar de grupos: filtro, seções Fixados e Todos (recolhíveis), fotos dos grupos e seleção para lote.
// ≥1024px fica fixa ao lado (ou recolhida no trilho de avatares); abaixo disso abre como gaveta pelo ☰.
import { $, mostrarAviso } from './ui.js';
import { iniciarLote, recarregarGrupos } from './api.js';
import { aoMudar, atualizarEstado, obterEstado } from './estado.js';
import { abrirGrupo } from './abas.js';
import { filtrarGrupos, separarSecoes } from './logica/filtros.js';
import { normalizar, textoMembros } from './logica/texto.js';
import { criarAvatar } from './componentes/avatar.js';
import { criarEstrela } from './componentes/estrela.js';
import { observarFotoGrupo } from './fotos-grupos.js';

// Mudam o que aparece na lista: redesenho completo. Seleção e fotos só ajustam o que já está na tela.
const CHAVES_REDESENHO = ['conexao', 'abaAtiva', 'fixados', 'secoes', 'sidebarRecolhida'];
const TAMANHO_AVATAR = 32;
const CONSULTA_GAVETA = '(max-width: 1023px)';
const ESPERA_FILTRO_MS = 100;

let gavetaAberta = false;

const SECOES = {
  fixados: { titulo: 'secaoFixadosTitulo', corpo: 'secaoFixadosCorpo', contador: 'secaoFixadosContador' },
  todos: { titulo: 'secaoTodosTitulo', corpo: 'secaoTodosCorpo', contador: 'secaoTodosContador' },
};

const gruposDoServidor = () => obterEstado().conexao.groups || [];
const nomeDoGrupo = (g) => g.name || '(Sem nome)';

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
  li.addEventListener('click', () => abrirDaSidebar(g));

  // Estilo Gmail: o avatar vira caixa de seleção no hover/foco, e todos viram quando há seleção
  const marca = document.createElement('label');
  marca.className = 'group-marca';
  marca.addEventListener('click', (e) => e.stopPropagation());

  const slotAvatar = document.createElement('span');
  slotAvatar.className = 'group-avatar';
  slotAvatar.dataset.avatarGrupo = g.id;
  slotAvatar.appendChild(criarAvatarDoGrupo(g));

  const caixa = document.createElement('input');
  caixa.type = 'checkbox';
  caixa.checked = selecionados.has(g.id);
  caixa.dataset.grupo = g.id;
  caixa.dataset.foco = `${secao}:caixa:${g.id}`;
  caixa.setAttribute('aria-label', `Selecionar ${nome}`);
  caixa.addEventListener('change', () => alternarSelecao(g.id, caixa.checked));

  marca.append(slotAvatar, caixa);

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
  sub.textContent = textoMembros(g.size);

  abrir.append(nomeEl, sub);

  const estrela = criarEstrela({ ativa: fixado, rotulo: nome, aoAlternar: () => alternarFixado(g.id) });
  estrela.dataset.foco = `${secao}:estrela:${g.id}`;

  li.append(marca, abrir, estrela);
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

function criarItemTrilho(g) {
  const ativo = obterEstado().abaAtiva === g.id;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `trilho-item${ativo ? ' ativo' : ''}`;
  botao.title = nomeDoGrupo(g);
  botao.setAttribute('aria-label', nomeDoGrupo(g));
  if (ativo) botao.setAttribute('aria-current', 'true');
  botao.dataset.foco = `trilho:abrir:${g.id}`;
  botao.dataset.avatarGrupo = g.id;
  botao.appendChild(criarAvatarDoGrupo(g));
  botao.addEventListener('click', () => abrirGrupo(g));
  observarFotoGrupo(botao, g.id);
  return botao;
}

// Trilho: fixados primeiro, divisor e os demais. Ignora o filtro (só há avatares).
function renderizarTrilho() {
  const trilho = $('trilhoLista');
  if (!obterEstado().sidebarRecolhida) {
    trilho.replaceChildren();
    return;
  }
  const grupos = gruposDoServidor();
  const fixados = separarSecoes(grupos, obterEstado().fixados).fixados;
  const idsFixados = new Set(fixados.map((g) => g.id));
  const demais = grupos.filter((g) => !idsFixados.has(g.id));
  const itens = fixados.map(criarItemTrilho);
  if (fixados.length && demais.length) {
    const divisor = document.createElement('hr');
    divisor.className = 'trilho-divisor';
    itens.push(divisor);
  }
  itens.push(...demais.map(criarItemTrilho));
  trilho.replaceChildren(...itens);
}

function aplicarRecolhida() {
  const recolhida = obterEstado().sidebarRecolhida;
  $('sidebar').classList.toggle('sidebar--recolhida', recolhida);
  $('mainView').classList.toggle('layout--trilho', recolhida);
}

// Redesenhar troca os elementos; o foco volta para o equivalente (mesma ação, mesmo grupo).
function focoAtual() {
  const ativo = document.activeElement;
  return ativo && ativo.dataset ? ativo.dataset.foco || null : null;
}

function restaurarFoco(chave) {
  if (!chave || focoAtual() === chave) return;
  const lista = $('sidebar');
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
  // No trilho as seções ficam escondidas (e são redesenhadas ao expandir): não vale montá-las
  if (!obterEstado().sidebarRecolhida) {
    renderizarSecao('fixados', secoes.fixados, semFixados ? 'Clique na ☆ para fixar um grupo.' : 'Nenhum fixado com este filtro.');
    renderizarSecao('todos', secoes.todos, comFiltro ? 'Nenhum grupo com este filtro.' : 'Nenhum grupo encontrado.');
  }
  lista.scrollTop = rolagem;
  aplicarRecolhida();
  renderizarTrilho();
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
  $('sidebar').classList.toggle('sidebar--selecionando', total > 0);
  $('selectedCount').textContent = total;
  $('batchSidebarBar').hidden = total === 0;
  $('batchSidebarText').textContent = `${total} grupo(s)`;
  const selo = $('trilhoSelecionados');
  selo.hidden = total === 0;
  selo.textContent = total;
  selo.setAttribute('aria-label', `${total} ${total === 1 ? 'grupo selecionado' : 'grupos selecionados'}. Expandir a lista de grupos`);
}

function alternarSecao(chave) {
  const secoes = obterEstado().secoes;
  atualizarEstado({ secoes: { ...secoes, [chave]: secoes[chave] === false } });
}

function alternarRecolhida() {
  const recolhida = !obterEstado().sidebarRecolhida;
  atualizarEstado({ sidebarRecolhida: recolhida });
  $(recolhida ? 'expandirSidebarBtn' : 'recolherSidebarBtn').focus();
}

const emModoGaveta = () => typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(CONSULTA_GAVETA).matches;

function mostrarGaveta(aberta) {
  gavetaAberta = aberta;
  $('sidebar').classList.toggle('sidebar--aberta', aberta);
  $('sidebarFundo').hidden = !aberta;
  $('abrirSidebarBtn').setAttribute('aria-expanded', aberta ? 'true' : 'false');
  $('main-content').inert = aberta;
  document.querySelector('.app-header').inert = aberta;
}

export function abrirGavetaSidebar() {
  if (gavetaAberta || !emModoGaveta()) return;
  mostrarGaveta(true);
  $('groupSearch').focus();
}

export function fecharGavetaSidebar() {
  if (!gavetaAberta) return;
  mostrarGaveta(false);
  $('abrirSidebarBtn').focus();
}

function abrirDaSidebar(g) {
  fecharGavetaSidebar();
  abrirGrupo(g);
}

function atualizarBotaoMenu() {
  $('abrirSidebarBtn').hidden = obterEstado().conexao.status !== 'ready';
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
    if (chaves.includes('conexao')) atualizarBotaoMenu();
    if (chaves.some((c) => CHAVES_REDESENHO.includes(c))) renderizarSidebar();
    else if (chaves.includes('selecionados')) sincronizarSelecao();
    if (chaves.includes('fotosGrupos')) atualizarFotos();
  });
  for (const chave of Object.keys(SECOES)) {
    $(SECOES[chave].titulo).addEventListener('click', () => alternarSecao(chave));
  }
  // Marca os grupos que o filtro mostra, somando aos já marcados
  $('selectAllBtn').addEventListener('click', () => {
    const selecionados = new Set(obterEstado().selecionados);
    for (const g of gruposFiltrados()) selecionados.add(g.id);
    atualizarEstado({ selecionados });
  });
  $('clearSelectionBtn').addEventListener('click', () => atualizarEstado({ selecionados: new Set() }));
  let temporizadorFiltro = null;
  $('groupSearch').addEventListener('input', () => {
    clearTimeout(temporizadorFiltro);
    temporizadorFiltro = setTimeout(renderizarSidebar, ESPERA_FILTRO_MS);
  });
  $('refreshGroupsBtn').addEventListener('click', () => recarregarGrupos());
  $('startBatchBtn').addEventListener('click', extrairSelecionados);

  $('recolherSidebarBtn').addEventListener('click', alternarRecolhida);
  $('expandirSidebarBtn').addEventListener('click', alternarRecolhida);
  $('trilhoSelecionados').addEventListener('click', alternarRecolhida);
  $('abrirSidebarBtn').addEventListener('click', abrirGavetaSidebar);
  $('fecharSidebarBtn').addEventListener('click', fecharGavetaSidebar);
  $('sidebarFundo').addEventListener('click', fecharGavetaSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gavetaAberta) fecharGavetaSidebar();
  });
  // Passou para a largura com sidebar fixa: a gaveta deixa de existir, sem mexer no foco
  if (typeof globalThis.matchMedia === 'function') {
    const consulta = globalThis.matchMedia(CONSULTA_GAVETA);
    if (consulta.addEventListener) consulta.addEventListener('change', (e) => { if (!e.matches && gavetaAberta) mostrarGaveta(false); });
  }
  atualizarBotaoMenu();
  aplicarRecolhida();
}
