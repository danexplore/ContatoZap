// Busca rápida de grupos (Ctrl+K / ⌘K). Dialog nativo com lista navegável por teclado.
import { $ } from './ui.js';
import { obterEstado } from './estado.js';
import { resultadosBuscaRapida } from './logica/filtros.js';
import { abrirGrupo } from './abas.js';
import { fecharGavetaSidebar } from './sidebar.js';
import { criarAvatar } from './componentes/avatar.js';

let dialog = null;
let input = null;
let lista = null;
let contador = null;
let ultimoFoco = null;
let opcoes = [];
let indiceAtivo = -1;

function pronto() {
  return obterEstado().conexao.status === 'ready';
}

function atualizarLista() {
  const termo = input ? input.value : '';
  const { conexao, fixados, recentes } = obterEstado();
  const grupos = conexao.groups || [];
  opcoes = resultadosBuscaRapida(grupos, termo, fixados, recentes);
  renderizarOpcoes();
}

function renderizarOpcoes() {
  if (!lista || !contador) return;
  lista.innerHTML = '';
  if (!opcoes.length) {
    const vazio = document.createElement('li');
    vazio.className = 'busca-vazia';
    vazio.textContent = input && input.value ? 'Nenhum grupo encontrado.' : 'Nenhum grupo disponível.';
    lista.appendChild(vazio);
    contador.textContent = '0 resultados';
    indiceAtivo = -1;
    return;
  }
  opcoes.forEach((g, i) => {
    const li = document.createElement('li');
    li.className = 'busca-opcao';
    li.id = `busca-opcao-${i}`;
    li.setAttribute('role', 'option');
    li.dataset.indice = String(i);
    const avatar = criarAvatar({ id: g.id, nome: g.name, tamanho: 'sm' });
    const texto = document.createElement('span');
    texto.className = 'busca-opcao-nome';
    texto.textContent = g.name || '(Sem nome)';
    li.append(avatar, texto);
    li.addEventListener('click', () => selecionar(i));
    lista.appendChild(li);
  });
  contador.textContent = `${opcoes.length} resultado${opcoes.length === 1 ? '' : 's'}`;
  setarAtivo(Math.min(Math.max(indiceAtivo, 0), opcoes.length - 1));
}

function setarAtivo(i) {
  if (!lista) return;
  const anterior = lista.querySelector('.busca-opcao[aria-selected="true"]');
  if (anterior) {
    anterior.removeAttribute('aria-selected');
    anterior.classList.remove('ativa');
  }
  indiceAtivo = opcoes.length ? Math.max(0, Math.min(i, opcoes.length - 1)) : -1;
  if (indiceAtivo < 0) {
    input && input.removeAttribute('aria-activedescendant');
    return;
  }
  const alvo = lista.children[indiceAtivo];
  if (!alvo) return;
  alvo.setAttribute('aria-selected', 'true');
  alvo.classList.add('ativa');
  alvo.scrollIntoView({ block: 'nearest' });
  if (input) input.setAttribute('aria-activedescendant', alvo.id);
}

function selecionar(i) {
  const grupo = opcoes[i];
  if (!grupo) return;
  fechar();
  fecharGavetaSidebar();
  abrirGrupo({ id: grupo.id, name: grupo.name });
}

function abrir() {
  if (!dialog || !pronto()) return;
  ultimoFoco = document.activeElement;
  input.value = '';
  indiceAtivo = -1;
  atualizarLista();
  dialog.showModal();
  requestAnimationFrame(() => input && input.focus());
}

function fechar() {
  if (!dialog) return;
  dialog.close();
  if (ultimoFoco && typeof ultimoFoco.focus === 'function') {
    try { ultimoFoco.focus({ preventScroll: true }); } catch (_) {}
  }
  ultimoFoco = null;
}

function lidarTeclado(e) {
  if (!dialog || !dialog.open) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setarAtivo(indiceAtivo + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setarAtivo(indiceAtivo - 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (indiceAtivo >= 0) selecionar(indiceAtivo);
  } else if (e.key === 'Escape') {
    // O dialog fecha sozinho; devolvemos o foco no evento close.
  }
}

export function iniciarBuscaRapida() {
  dialog = $('buscaRapida');
  input = $('buscaRapidaInput');
  lista = $('buscaRapidaLista');
  contador = $('buscaRapidaContador');
  if (!dialog || !input || !lista) return;

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) fechar(); else abrir();
    }
  });

  input.addEventListener('input', () => {
    indiceAtivo = 0;
    atualizarLista();
  });
  lista.addEventListener('keydown', lidarTeclado);
  input.addEventListener('keydown', lidarTeclado);
  dialog.addEventListener('close', () => {
    if (ultimoFoco && typeof ultimoFoco.focus === 'function') {
      try { ultimoFoco.focus({ preventScroll: true }); } catch (_) {}
    }
    ultimoFoco = null;
  });
  // Clique no backdrop fecha
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) fechar();
  });
}

export function abrirBuscaRapida() {
  abrir();
}