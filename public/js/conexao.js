// Estado da conexão com o WhatsApp: pílula de status, QR, erro e banner de sincronização.
import { $ } from './ui.js';
import { recarregarGrupos, reiniciarConexao } from './api.js';
import { aoMudar, obterEstado } from './estado.js';

export const estaSincronizando = () => Boolean(obterEstado().conexao.syncProgress);

/* Exportar durante a sincronização gera arquivos incompletos */
export const BOTOES_EXPORTACAO = ['copyPhonesBtn', 'startBatchBtn'];

function renderizarConexao(s) {
  const pronto = s.status === 'ready';
  const sincronizando = Boolean(s.syncProgress);
  renderizarSincronizacao(s.syncProgress);
  const totalGrupos = s.groups ? s.groups.length : 0;
  const pilula = $('statusPill');
  const textoPilula = $('statusPillText');
  pilula.className = 'pill ' + (pronto ? (sincronizando ? 'loading' : 'ok') : s.status === 'error' ? 'err' : 'loading');
  textoPilula.textContent = pronto
    ? (sincronizando ? `${totalGrupos} Grupos · Sincronizando...` : `${totalGrupos} Grupos Prontos`)
    : s.message;
  $('mainView').hidden = !pronto;
  $('statusCard').hidden = pronto;
  if (!pronto) {
    $('spinner').hidden = !(s.status === 'starting' || s.status === 'loading');
    const mostrarQr = s.status === 'qr' && !!s.qr;
    $('qr').hidden = !mostrarQr;
    if (mostrarQr && $('qr').src !== s.qr) $('qr').src = s.qr;
    $('statusMsg').textContent = mostrarQr ? 'Abra o WhatsApp no celular > Aparelhos Conectados > Conectar um aparelho e escaneie o código acima.' : s.message || '';
    $('errorBox').hidden = !s.error;
    $('errorBox').textContent = s.error || '';
    $('retryBtn').hidden = s.status !== 'error';
  }
}

function renderizarSincronizacao(syncProgress) {
  const sincronizando = Boolean(syncProgress);
  $('syncBanner').hidden = !sincronizando;
  if (sincronizando) {
    $('syncBannerText').textContent = syncProgress.detail
      ? `Sincronizando: ${syncProgress.detail}`
      : 'Sincronizando dados do WhatsApp...';
    const pct = typeof syncProgress.progress === 'number'
      ? Math.min(100, Math.max(0, syncProgress.progress))
      : 60;
    $('syncProgressFill').style.width = `${pct}%`;
  }
  const botoes = [...BOTOES_EXPORTACAO.map($), ...document.querySelectorAll('#menuExportar button')];
  for (const botao of botoes) {
    if (!botao) continue;
    botao.disabled = sincronizando;
    botao.title = sincronizando ? 'Aguarde a sincronização concluir para exportar dados completos' : '';
  }
}

export function iniciarConexao() {
  aoMudar((estado, chaves) => { if (chaves.includes('conexao')) renderizarConexao(estado.conexao); });
  $('retryBtn').addEventListener('click', () => recarregarGrupos());
  $('restartBtn').addEventListener('click', () => reiniciarConexao());
  $('restartHeroBtn').addEventListener('click', () => reiniciarConexao());
}
