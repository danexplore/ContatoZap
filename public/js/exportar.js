// Exportação do grupo inteiro (CSV, Excel com fotos, JSON) e cópia de telefones.
import { $, baixarArquivo, copiarTexto, mostrarAviso } from './ui.js';
import { estaSincronizando, BOTOES_EXPORTACAO } from './conexao.js';
import { apenasDigitos } from './logica/texto.js';

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PX_PARA_PONTOS = 0.75;
const PX_POR_CARACTERE_EXCEL = 7;

export function paraLinhaExcel(p) {
  const telefone = apenasDigitos(p.phone);
  return {
    preview: '',
    nome_whatsapp: p.pushname || p.name || '',
    nome_agenda: p.savedName || '',
    telefone: telefone ? '+' + telefone : '',
    admin: p.admin ? 'sim' : 'não',
    status: p.hidden ? 'ID de privacidade (LID)' : 'Normal',
  };
}

const escaparCsv = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

// BOM + ';' como separador + CRLF, como o Excel em português espera
export function gerarCsv(linhas) {
  return '﻿' + linhas.map((r) => r.map(escaparCsv).join(';')).join('\r\n');
}

function nomeArquivo(grupo, extensao) {
  return `contatos_${(grupo.name || 'grupo').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_')}.${extensao}`;
}

export function copiarTelefones(grupo) {
  const telefones = grupo.participants.filter((p) => p.phone && !p.hidden).map((p) => apenasDigitos(p.phone));
  copiarTexto([...new Set(telefones)].join('\r\n'), `${new Set(telefones).size} números copiados!`);
}

export function exportarCsv(grupo) {
  const linhas = [['nome_whatsapp', 'nome_agenda', 'telefone', 'admin', 'status', 'foto_perfil']].concat(
    grupo.participants.map((p) => [p.pushname || p.name || '', p.savedName || '', p.phone ? '+' + apenasDigitos(p.phone) : '', p.admin ? 'sim' : 'não', p.hidden ? 'LID' : 'Normal', p.photoUrl || ''])
  );
  baixarArquivo(new Blob([gerarCsv(linhas)], { type: 'text/csv;charset=utf-8' }), nomeArquivo(grupo, 'csv'));
}

export function exportarJson(grupo) {
  baixarArquivo(new Blob([JSON.stringify(grupo, null, 2)], { type: 'application/json;charset=utf-8' }), nomeArquivo(grupo, 'json'));
}

export function exportarExcel(grupo, botao) {
  return executarExportacaoExcel(botao, async () => {
    const linhas = grupo.participants.map((participante) => ({ participante }));
    const blob = await montarPlanilha(grupo.name || 'Grupo', linhas, false);
    baixarArquivo(blob, nomeArquivo(grupo, 'xlsx'));
  });
}

/* ========== EXCEL (.xlsx com fotos embutidas) ========== */
function tamanhoFotoExcel() {
  const tamanho = parseInt($('imageSizeInput').value, 10);
  return Number.isFinite(tamanho) ? Math.min(500, Math.max(20, tamanho)) : 100;
}

async function embutirFoto(planilha, aba, linha, urlFoto, tamanho) {
  if (!urlFoto) return;
  try {
    const resposta = await fetch(urlFoto);
    const buffer = await resposta.arrayBuffer();
    const idImagem = planilha.addImage({ buffer, extension: 'jpeg' });
    aba.addImage(idImagem, { tl: { col: 0, row: linha.number - 1 }, ext: { width: tamanho, height: tamanho } });
  } catch (e) {
    console.warn('Falha ao carregar imagem:', e);
  }
}

// linhas: { participante, nomeGrupo? }[]
export async function montarPlanilha(nomeAba, linhas, comColunaGrupo) {
  const tamanho = tamanhoFotoExcel();
  const planilha = new ExcelJS.Workbook();
  const aba = planilha.addWorksheet(nomeAba.substring(0, 31) || 'Contatos');
  aba.columns = [
    { header: 'Preview', key: 'preview', width: Math.max(10, Math.round(tamanho / PX_POR_CARACTERE_EXCEL)) },
    ...(comColunaGrupo ? [{ header: 'Grupo Origem', key: 'grupo_origem', width: 25 }] : []),
    { header: 'Nome WhatsApp', key: 'nome_whatsapp', width: 25 },
    { header: 'Nome Agenda', key: 'nome_agenda', width: 25 },
    { header: 'Telefone', key: 'telefone', width: 18 },
    { header: 'Admin', key: 'admin', width: 8 },
    { header: 'Status', key: 'status', width: 20 },
  ];
  for (const { participante, nomeGrupo } of linhas) {
    const valores = paraLinhaExcel(participante);
    if (comColunaGrupo) valores.grupo_origem = nomeGrupo || '';
    const linha = aba.addRow(valores);
    linha.height = Math.round(tamanho * PX_PARA_PONTOS) + 4;
    await embutirFoto(planilha, aba, linha, participante.photoUrl, tamanho);
  }
  return new Blob([await planilha.xlsx.writeBuffer()], { type: EXCEL_MIME });
}

export async function executarExportacaoExcel(botao, montar) {
  if (typeof ExcelJS === 'undefined') { mostrarAviso('Biblioteca do Excel não carregou. Recarregue a página.', 'error'); return; }
  const rotulo = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Gerando...';
  try {
    await montar();
  } catch (err) {
    mostrarAviso(`Erro ao gerar Excel: ${err.message}`, 'error');
  } finally {
    botao.textContent = rotulo;
    botao.disabled = estaSincronizando() && BOTOES_EXPORTACAO.includes(botao.id);
  }
}
