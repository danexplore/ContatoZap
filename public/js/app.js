// Ponto de entrada: tema, ligação dos botões de cada área e eventos do servidor.
import { $ } from './ui.js';
import { conectarEventos } from './api.js';
import { aplicarEstadoConexao, iniciarConexao } from './conexao.js';
import { atualizarTamanhoGrupo, iniciarSidebar } from './sidebar.js';
import { iniciarGrupo } from './grupo.js';
import { ativarRedimensionamentoFoto, iniciarLista } from './lista.js';
import { abrirLote, atualizarLote, finalizarLote, iniciarDrawerLote } from './lote.js';

function aplicarTema(escuro) {
  document.documentElement.setAttribute('data-theme', escuro ? 'dark' : 'light');
  $('themeIconMoon').hidden = escuro;
  $('themeIconSun').hidden = !escuro;
  localStorage.setItem('contatozap_theme', escuro ? 'dark' : 'light');
}

function iniciarTema() {
  const salvo = localStorage.getItem('contatozap_theme');
  const prefereEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  aplicarTema(salvo ? salvo === 'dark' : prefereEscuro);
  $('themeToggleBtn').addEventListener('click', () => {
    aplicarTema(document.documentElement.getAttribute('data-theme') !== 'dark');
  });
}

iniciarTema();
iniciarConexao();
iniciarSidebar();
iniciarGrupo();
iniciarLista();
ativarRedimensionamentoFoto();
iniciarDrawerLote();

conectarEventos({
  state: aplicarEstadoConexao,
  batch_start: (d) => abrirLote(d.total),
  batch_progress: atualizarLote,
  batch_item_done: (d) => { if (d.groupId) atualizarTamanhoGrupo(d.groupId, d.participantsCount); },
  batch_complete: (d) => finalizarLote(d.results),
  batch_cancelled: (d) => finalizarLote(d.results, true),
});
