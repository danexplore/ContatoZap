// Grupo da aba ativa: carregamento (com cache no navegador), cabeçalho, métricas, avisos e ações de exportação.
import { $, mostrarAviso } from './ui.js';
import { buscarGrupo } from './api.js';
import { aoMudar, atualizarEstado, obterEstado, FOTO_EXCEL_MIN, FOTO_EXCEL_MAX } from './estado.js';
import { atualizarTamanhoGrupo } from './sidebar.js';
import { abrirGrupo, fecharAba } from './abas.js';
import { copiarTelefones, exportarCsv, exportarExcel, exportarJson } from './exportar.js';
import { contarFiltros, separarSecoes } from './logica/filtros.js';
import { textoMembros } from './logica/texto.js';
import { criarAvatar } from './componentes/avatar.js';
import { observarFotoGrupo } from './fotos-grupos.js';

// conexao: a lista de grupos decide o "Grupo não encontrado"
const CHAVES_GRUPO = ['abaAtiva', 'grupos', 'conexao'];
const CHAVES_TELA_INICIAL = ['abaAtiva', 'conexao', 'fixados', 'fotosGrupos'];
const TAMANHO_AVATAR_ATALHO = 40;

// `${id}:basic|with_photos` -> GrupoExtraido (memória das respostas da API, não é estado de tela)
const cacheCliente = new Map();

// Dados do grupo ativo já carregado, ou null enquanto carrega / sem grupo / com erro.
export function obterGrupoAtivo() {
  const { abaAtiva, grupos } = obterEstado();
  const entrada = abaAtiva ? grupos.get(abaAtiva) : null;
  return entrada && entrada.status === 'pronto' ? entrada.dados : null;
}

const grupoDoServidor = (id) => (obterEstado().conexao.groups || []).find((g) => g.id === id) || null;

function nomeDoGrupo(id) {
  const g = grupoDoServidor(id);
  if (g && g.name) return g.name;
  const recente = obterEstado().recentes.find((r) => r.id === id);
  return recente ? recente.name : '';
}

// Com a lista de grupos já carregada, o id da aba não está nela (saiu do grupo, grupo apagado…)
function grupoSumiu(id) {
  const grupos = obterEstado().conexao.groups || [];
  return grupos.length > 0 && !grupoDoServidor(id);
}

function comEntrada(id, entrada) {
  const grupos = new Map(obterEstado().grupos);
  grupos.set(id, entrada);
  return grupos;
}

// A aba pode ter sido fechada enquanto a resposta não chegava: aí o resultado não volta para o estado.
const abaAberta = (id) => obterEstado().recentes.some((r) => r.id === id);

export async function carregarGrupo(id, { atualizar = false } = {}) {
  const fotos = obterEstado().buscarFotos;
  const chave = `${id}:${fotos ? 'with_photos' : 'basic'}`;
  if (!atualizar) {
    const emCache = cacheCliente.get(chave) || (!fotos && cacheCliente.get(`${id}:with_photos`));
    if (emCache) {
      atualizarEstado({ grupos: comEntrada(id, { status: 'pronto', dados: emCache }) });
      return;
    }
  }
  atualizarEstado({ grupos: comEntrada(id, { status: 'carregando' }) });
  try {
    const data = await buscarGrupo(id, { atualizar, fotos });
    cacheCliente.set(chave, data);
    if (fotos) cacheCliente.set(`${id}:basic`, data);
    if (abaAberta(id)) atualizarEstado({ grupos: comEntrada(id, { status: 'pronto', dados: data }) });
    atualizarTamanhoGrupo(id, data.participants.length);
  } catch (err) {
    if (!abaAberta(id)) return;
    atualizarEstado({ grupos: comEntrada(id, { status: 'erro', erro: err.message }) });
    mostrarAviso(`Erro ao extrair grupo: ${err.message}`, 'error', 4500);
  }
}

// Uma área da tela por vez: inicial (sem aba), carregando, aviso (erro / não encontrado) ou o grupo.
const AREAS = ['emptyDetail', 'loadingDetail', 'avisoGrupo', 'activeGroupView'];
let acaoDoAviso = null;

function mostrarSomente(area) {
  for (const id of AREAS) $(id).hidden = id !== area;
  $('painelGrupo').hidden = area === 'emptyDetail';
}

function mostrarCarregando(id) {
  mostrarSomente('loadingDetail');
  const nome = nomeDoGrupo(id);
  $('loadingDetailMsg').textContent = obterEstado().buscarFotos
    ? `Carregando membros e fotos de "${nome}"...`
    : `Carregando membros de "${nome}"...`;
}

function mostrarAvisoDoGrupo({ titulo, detalhe, botao, acao }) {
  mostrarSomente('avisoGrupo');
  $('avisoGrupoTitulo').textContent = titulo;
  $('avisoGrupoDetalhe').textContent = detalhe;
  $('avisoGrupoBtn').textContent = botao;
  acaoDoAviso = acao;
}

function mostrarGrupo(grupo) {
  mostrarSomente('activeGroupView');
  $('activeGroupName').textContent = grupo.name;
  const lista = grupo.participants || [];
  const comFoto = lista.filter((p) => Boolean(p.photoUrl)).length;
  $('activeGroupCount').textContent = comFoto > 0 ? `${lista.length} participante(s) · ${comFoto} com foto` : `${lista.length} participante(s)`;
  $('activeGroupDuration').textContent = grupo.durationSec ? `${grupo.durationSec}s` : 'Cache';
  const contagem = contarFiltros(lista);
  $('metricTotal').textContent = contagem.todos;
  $('metricPhones').textContent = contagem.telefone;
  $('metricAdmins').textContent = contagem.admins;
  $('metricHidden').textContent = contagem.privados;
  $('tabCountAll').textContent = contagem.todos;
  $('tabCountPhones').textContent = contagem.telefone;
  $('tabCountAdmins').textContent = contagem.admins;
  $('tabCountHidden').textContent = contagem.privados;
}

function renderizarGrupo() {
  const { abaAtiva, grupos } = obterEstado();
  if (!abaAtiva) {
    mostrarSomente('emptyDetail');
    return;
  }
  const entrada = grupos.get(abaAtiva);
  if (entrada && entrada.status === 'pronto') {
    mostrarGrupo(entrada.dados);
  } else if (entrada && entrada.status === 'erro') {
    mostrarAvisoDoGrupo({
      titulo: 'Não foi possível carregar este grupo.',
      detalhe: entrada.erro || '',
      botao: 'Tentar novamente',
      acao: () => carregarGrupo(abaAtiva, { atualizar: true }),
    });
  } else if (!entrada && grupoSumiu(abaAtiva)) {
    mostrarAvisoDoGrupo({
      titulo: 'Grupo não encontrado',
      detalhe: 'Ele não está mais na sua lista de grupos do WhatsApp.',
      botao: 'Fechar aba',
      acao: () => fecharAba(abaAtiva),
    });
  } else {
    mostrarCarregando(abaAtiva);
  }
}

/* ========== TELA INICIAL (nenhuma aba aberta) ========== */
const ehMac = () => /Mac/i.test((globalThis.navigator && globalThis.navigator.platform) || '');

function criarAtalho(g, foto) {
  const nome = g.name || '(Sem nome)';
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'atalho-grupo';
  botao.dataset.atalho = g.id;
  const textos = document.createElement('span');
  textos.className = 'atalho-textos';
  const nomeEl = document.createElement('span');
  nomeEl.className = 'atalho-nome';
  nomeEl.textContent = nome;
  nomeEl.title = nome;
  const sub = document.createElement('span');
  sub.className = 'atalho-sub';
  sub.textContent = textoMembros(g.size);
  textos.append(nomeEl, sub);
  botao.append(criarAvatar({ id: g.id, nome: g.name, foto, tamanho: TAMANHO_AVATAR_ATALHO }), textos);
  botao.addEventListener('click', () => abrirGrupo(g));
  observarFotoGrupo(botao, g.id);
  const item = document.createElement('li');
  item.appendChild(botao);
  return item;
}

function criarDicaBusca() {
  const tecla = (texto) => {
    const kbd = document.createElement('kbd');
    kbd.textContent = texto;
    return kbd;
  };
  const dica = document.createElement('p');
  dica.className = 'tela-inicial-dica';
  dica.append('Pressione ', tecla(ehMac() ? '⌘' : 'Ctrl'), ' ', tecla('K'), ' para buscar um grupo');
  return dica;
}

// Fixados como atalhos e a dica do Ctrl+K. Só redesenha quando os atalhos mudam (o SSE chega a todo momento).
export function renderizarTelaInicial(conteiner) {
  const { fixados, conexao, fotosGrupos } = obterEstado();
  const atalhos = separarSecoes(conexao.groups || [], fixados).fixados;
  const assinatura = JSON.stringify(atalhos.map((g) => [g.id, g.name, g.size, fotosGrupos.get(g.id) || null]));
  if (conteiner.dataset.assinatura === assinatura) return;
  conteiner.dataset.assinatura = assinatura;
  const ativo = document.activeElement;
  const focado = ativo && conteiner.contains(ativo) && ativo.dataset ? ativo.dataset.atalho : null;

  const titulo = document.createElement('h2');
  titulo.className = 'tela-inicial-titulo';
  titulo.textContent = 'Escolha um grupo';

  let corpo;
  if (atalhos.length) {
    corpo = document.createElement('ul');
    corpo.className = 'tela-inicial-atalhos';
    corpo.setAttribute('aria-label', 'Grupos fixados');
    corpo.append(...atalhos.map((g) => criarAtalho(g, fotosGrupos.get(g.id) || null)));
  } else {
    corpo = document.createElement('p');
    corpo.textContent = 'Fixe grupos na barra lateral para vê-los aqui.';
  }
  conteiner.replaceChildren(titulo, corpo, criarDicaBusca());

  if (focado) {
    const alvo = conteiner.querySelector(`[data-atalho="${CSS.escape(focado)}"]`);
    if (alvo) alvo.focus({ preventScroll: true });
  }
}

function comParticipantes(acao) {
  return () => { const grupo = obterGrupoAtivo(); if (grupo && grupo.participants) acao(grupo); };
}

function recarregarAtivo() {
  const { abaAtiva } = obterEstado();
  if (abaAtiva) carregarGrupo(abaAtiva, { atualizar: true });
}

function iniciarPreferenciasDoGrupo() {
  const caixaFotos = $('fetchPhotosCheckbox');
  if (caixaFotos) {
    caixaFotos.checked = obterEstado().buscarFotos;
    caixaFotos.addEventListener('change', (e) => {
      // As outras abas carregadas ficaram com o modo antigo: recarregam (do cache, se der) ao serem ativadas
      const { abaAtiva, grupos } = obterEstado();
      const soAtiva = new Map(abaAtiva && grupos.has(abaAtiva) ? [[abaAtiva, grupos.get(abaAtiva)]] : []);
      atualizarEstado({ buscarFotos: e.target.checked, grupos: soAtiva });
      recarregarAtivo();
    });
  }

  const campoFotoExcel = $('imageSizeInput');
  if (campoFotoExcel) {
    campoFotoExcel.value = obterEstado().tamanhoFotoExcel;
    campoFotoExcel.addEventListener('change', () => {
      const tamanho = parseInt(campoFotoExcel.value, 10);
      const valido = Number.isFinite(tamanho) ? Math.min(FOTO_EXCEL_MAX, Math.max(FOTO_EXCEL_MIN, tamanho)) : obterEstado().tamanhoFotoExcel;
      campoFotoExcel.value = valido;
      atualizarEstado({ tamanhoFotoExcel: valido });
    });
  }
}

export function iniciarGrupo() {
  aoMudar((estado, chaves) => {
    if (chaves.some((c) => CHAVES_GRUPO.includes(c))) renderizarGrupo();
    if (!estado.abaAtiva && chaves.some((c) => CHAVES_TELA_INICIAL.includes(c))) renderizarTelaInicial($('emptyDetail'));
  });
  $('refreshActiveGroupBtn').addEventListener('click', recarregarAtivo);
  $('avisoGrupoBtn').addEventListener('click', () => { if (acaoDoAviso) acaoDoAviso(); });
  $('copyPhonesBtn').addEventListener('click', comParticipantes(copiarTelefones));
  $('exportCsvBtn').addEventListener('click', comParticipantes(exportarCsv));
  $('exportExcelBtn').addEventListener('click', comParticipantes((g) => exportarExcel(g, $('exportExcelBtn'))));
  $('exportJsonBtn').addEventListener('click', () => { const grupo = obterGrupoAtivo(); if (grupo) exportarJson(grupo); });
  iniciarPreferenciasDoGrupo();
  renderizarGrupo();
  renderizarTelaInicial($('emptyDetail'));
}
