// Drawer da extração em lote: progresso, resumo e exportações consolidadas.
import { $, baixarArquivo, copiarTexto, mostrarAviso } from './ui.js';
import { cancelarLote } from './api.js';
import { executarExportacaoExcel, gerarCsv, montarPlanilha } from './exportar.js';
import { apenasDigitos } from './logica/texto.js';
import { atualizarEstado, obterEstado } from './estado.js';

const resultadosLote = () => obterEstado().lote.resultados;

export function abrirLote(total) {
  atualizarEstado({ lote: { ativo: true, resultados: [] } });
  $('batchDrawer').hidden = false;
  $('batchTitle').textContent = `Extraindo ${total} Grupos`;
  $('batchPercentage').textContent = '0%';
  $('batchProgressFill').style.width = '0%';
  $('batchCurrentGroupText').textContent = 'Preparando fila...';
  $('batchCounterText').textContent = `0 / ${total}`;
  $('batchCompletedSummary').hidden = true;
  $('batchCancelBtn').hidden = false;
  $('batchCopyPhonesBtn').hidden = true;
  $('batchDownloadCsvBtn').hidden = true;
  $('batchDownloadExcelBtn').hidden = true;
  $('batchCloseBtn').hidden = true;
}

export function atualizarLote(dados) {
  const pct = `${dados.percentage}%`;
  $('batchPercentage').textContent = pct;
  $('batchProgressFill').style.width = pct;
  $('batchCurrentGroupText').textContent = `Extraindo: ${dados.groupName}`;
  $('batchCounterText').textContent = `${dados.current} / ${dados.total}`;
}

export function finalizarLote(resultados, cancelado = false) {
  atualizarEstado({ lote: { ativo: false, resultados: resultados || [] } });
  $('batchProgressFill').style.width = '100%';
  $('batchPercentage').textContent = '100%';
  $('batchCurrentGroupText').textContent = cancelado ? 'Lote cancelado' : 'Concluído!';
  let totalContatos = 0;
  const telefonesUnicos = new Set();
  resultadosLote().forEach((g) => { (g.participants || []).forEach((p) => { totalContatos++; if (p.phone && !p.hidden) telefonesUnicos.add(apenasDigitos(p.phone)); }); });
  $('batchSummaryTotal').textContent = totalContatos;
  $('batchSummaryUnique').textContent = telefonesUnicos.size;
  $('batchCompletedSummary').hidden = false;
  $('batchCancelBtn').hidden = true;
  $('batchCopyPhonesBtn').hidden = false;
  $('batchDownloadCsvBtn').hidden = false;
  $('batchDownloadExcelBtn').hidden = false;
  $('batchCloseBtn').hidden = false;
  mostrarAviso(cancelado ? 'Extração em lote interrompida.' : 'Extração em lote finalizada!', cancelado ? 'warning' : 'success');
}

// Percorre os participantes do lote; com desduplicação, cada telefone visível entra uma vez só.
function participantesDoLote(desduplicar) {
  const vistos = new Set();
  const linhas = [];
  for (const g of resultadosLote()) {
    for (const p of (g.participants || [])) {
      const telefone = apenasDigitos(p.phone);
      if (desduplicar && telefone && !p.hidden) {
        if (vistos.has(telefone)) continue;
        vistos.add(telefone);
      }
      linhas.push({ participante: p, nomeGrupo: g.name });
    }
  }
  return linhas;
}

function copiarTelefonesLote() {
  const telefones = [];
  resultadosLote().forEach((g) => { (g.participants || []).forEach((p) => { if (p.phone && !p.hidden) telefones.push(apenasDigitos(p.phone)); }); });
  copiarTexto([...new Set(telefones)].join('\r\n'), `${new Set(telefones).size} telefones únicos copiados!`);
}

function baixarCsvLote() {
  const linhas = [['grupo_origem', 'nome_whatsapp', 'nome_agenda', 'telefone', 'admin', 'status', 'foto_perfil']];
  for (const { participante: p, nomeGrupo } of participantesDoLote($('batchDeduplicateCheck').checked)) {
    const telefone = apenasDigitos(p.phone);
    linhas.push([nomeGrupo, p.pushname || p.name || '', p.savedName || '', telefone ? '+' + telefone : '', p.admin ? 'sim' : 'não', p.hidden ? 'LID' : 'Normal', p.photoUrl || '']);
  }
  baixarArquivo(new Blob([gerarCsv(linhas)], { type: 'text/csv;charset=utf-8' }), `extracao_consolidada_${Date.now()}.csv`);
}

function baixarExcelLote() {
  const botao = $('batchDownloadExcelBtn');
  executarExportacaoExcel(botao, async () => {
    const linhas = participantesDoLote($('batchDeduplicateCheck').checked);
    const blob = await montarPlanilha('Consolidado', linhas, true);
    baixarArquivo(blob, `extracao_consolidada_${Date.now()}.xlsx`);
  });
}

export function iniciarDrawerLote() {
  $('batchCancelBtn').addEventListener('click', () => { cancelarLote(); $('batchCurrentGroupText').textContent = 'Cancelando...'; });
  $('batchCloseBtn').addEventListener('click', () => { $('batchDrawer').hidden = true; });
  $('batchCopyPhonesBtn').addEventListener('click', copiarTelefonesLote);
  $('batchDownloadCsvBtn').addEventListener('click', baixarCsvLote);
  $('batchDownloadExcelBtn').addEventListener('click', baixarExcelLote);
}
