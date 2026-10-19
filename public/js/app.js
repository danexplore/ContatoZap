// Ponto de entrada: estado, tema, ligação dos botões de cada área e eventos do servidor.
import { $ } from './ui.js';
import { conectarEventos } from './api.js';
import { aoMudar, atualizarEstado, iniciarEstado, obterEstado } from './estado.js';
import { iniciarConexao } from './conexao.js';
import { atualizarTamanhoGrupo, iniciarSidebar } from './sidebar.js';
import { iniciarGrupo } from './grupo.js';
import { ativarRedimensionamentoFoto, iniciarLista } from './lista.js';
import { abrirLote, atualizarLote, finalizarLote, iniciarDrawerLote } from './lote.js';

function aplicarTema(tema) {
  const escuro = tema === 'dark';
  document.documentElement.setAttribute('data-theme', escuro ? 'dark' : 'light');
  $('themeIconMoon').hidden = escuro;
  $('themeIconSun').hidden = !escuro;
}

function iniciarTema() {
  aplicarTema(obterEstado().tema);
  aoMudar((estado, chaves) => { if (chaves.includes('tema')) aplicarTema(estado.tema); });
  $('themeToggleBtn').addEventListener('click', () => {
    atualizarEstado({ tema: obterEstado().tema === 'dark' ? 'light' : 'dark' });
  });
}

iniciarEstado();
iniciarTema();
iniciarConexao();
iniciarSidebar();
iniciarGrupo();
iniciarLista();
ativarRedimensionamentoFoto();
iniciarDrawerLote();

conectarEventos({
  state: (conexao) => atualizarEstado({ conexao }),
  batch_start: (d) => abrirLote(d.total),
  batch_progress: atualizarLote,
  batch_item_done: (d) => { if (d.groupId) atualizarTamanhoGrupo(d.groupId, d.participantsCount); },
  batch_complete: (d) => finalizarLote(d.results),
  batch_cancelled: (d) => finalizarLote(d.results, true),
});
