// Grupo da aba ativa: carregamento (com cache no navegador), cabeçalho, métricas, avisos e ações de exportação.
import { $, mostrarAviso } from './ui.js';
import { buscarGrupo } from './api.js';
import { aoMudar, atualizarEstado, atualizarVisao, obterEstado, FOTO_EXCEL_MIN, FOTO_EXCEL_MAX } from './estado.js';
import { atualizarTamanhoGrupo } from './sidebar.js';
import { abrirGrupo, fecharAba } from './abas.js';
import { copiarTelefones, exportarCsv, exportarExcel, exportarJson } from './exportar.js';
import { contarFiltros, separarSecoes } from './logica/filtros.js';
import { textoMembros, tempoRelativo } from './logica/texto.js';
import { criarAvatar } from './componentes/avatar.js';
import { criarMenu } from './componentes/menu.js';
import { criarListaParticipantes } from './componentes/lista-participantes.js';
import { renderizarGrade, renderizarEsqueleto } from './grade.js';
import { observarFotoGrupo } from './fotos-grupos.js';
import { debounce } from './logica/debounce.js';
import { filtrarParticipantes, ordenarParticipantes } from './logica/filtros.js';

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
  const conteiner = $('loadingDetail');
  if (!conteiner) return;
  const { modo } = obterEstado();
  // Limpa conteúdo anterior (mensagem de texto) e renderiza o esqueleto
  const total = grupoDoServidor(id)?.size || 0;
  renderizarEsqueleto(conteiner, modo, { total });
}

function mostrarAvisoDoGrupo({ titulo, detalhe, botao, acao }) {
  mostrarSomente('avisoGrupo');
  $('avisoGrupoTitulo').textContent = titulo;
  $('avisoGrupoDetalhe').textContent = detalhe;
  $('avisoGrupoBtn').textContent = botao;
  acaoDoAviso = acao;
}

function criarChipFiltro(filtro, rotulo, contagem, ativo, aoClicar) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chip-filtro' + (ativo ? ' ativo' : '');
  btn.dataset.filtro = filtro;
  btn.setAttribute('aria-pressed', String(ativo));
  const texto = document.createElement('span');
  texto.className = 'chip-rotulo';
  texto.textContent = rotulo;
  const badge = document.createElement('span');
  badge.className = 'chip-contagem';
  badge.textContent = String(contagem);
  btn.append(texto, badge);
  btn.addEventListener('click', aoClicar);
  return btn;
}

function renderizarChipsDeFiltro(lista) {
  const conteiner = $('groupFilterChips');
  if (!conteiner) return;
  const { abaAtiva } = obterEstado();
  const visao = abaAtiva ? obterEstado().visoes.get(abaAtiva) : null;
  const filtroAtual = visao?.filtro || 'todos';
  const contagem = contarFiltros(lista);
  const itens = [
    { filtro: 'todos', rotulo: 'Todos' },
    { filtro: 'telefone', rotulo: 'Com telefone' },
    { filtro: 'admins', rotulo: 'Admins' },
    { filtro: 'privados', rotulo: 'Privados' },
  ];
  conteiner.replaceChildren(
    ...itens.map(({ filtro, rotulo }) =>
      criarChipFiltro(filtro, rotulo, contagem[filtro], filtroAtual === filtro, () => {
        if (abaAtiva) atualizarVisao(abaAtiva, { filtro });
      })
    )
  );
}

function renderizarListaDeParticipantes(grupo) {
  const conteiner = $('areaParticipantes');
  if (!conteiner) return;
  const { abaAtiva, modo, tamanhoGrade } = obterEstado();
  const visao = abaAtiva ? obterEstado().visoes.get(abaAtiva) : null;
  const filtro = visao?.filtro || 'todos';
  const busca = visao?.busca || '';
  const ordenacao = visao?.ordenacao || { coluna: null, asc: true };
  const fichaAberta = obterEstado().fichaAberta || null;

  const filtrados = filtrarParticipantes(grupo.participants || [], { filtro, busca });
  const ordenados = ordenarParticipantes(filtrados, ordenacao.coluna, ordenacao.asc);

  const aoAbrir = (id) => {
    atualizarEstado({ fichaAberta: id === obterEstado().fichaAberta ? null : id });
  };

  if (modo === 'grade') {
    renderizarGrade(conteiner, ordenados, { tamanho: tamanhoGrade, aoAbrir, fichaAberta });
  } else {
    const lista = criarListaParticipantes({
      participantes: ordenados,
      ordenacao,
      aoOrdenar: (coluna) => {
        if (!abaAtiva) return;
        const atual = obterEstado().visoes.get(abaAtiva)?.ordenacao || { coluna: null, asc: true };
        let nova;
        if (atual.coluna !== coluna) {
          nova = { coluna, asc: true };
        } else if (atual.asc) {
          nova = { coluna, asc: false };
        } else {
          nova = { coluna: null, asc: true };
        }
        atualizarVisao(abaAtiva, { ordenacao: nova });
      },
      aoAbrir,
      fichaAberta,
    });
    conteiner.replaceChildren(lista);
  }
}

function mostrarGrupo(grupo) {
  mostrarSomente('activeGroupView');
  $('activeGroupName').textContent = grupo.name;
  const lista = grupo.participants || [];
  const comFoto = lista.filter((p) => Boolean(p.photoUrl)).length;
  $('activeGroupCount').textContent = comFoto > 0 ? `${lista.length} participante(s) · ${comFoto} com foto` : `${lista.length} participante(s)`;
  const extracaoEl = $('activeGroupExtractedAt');
  if (extracaoEl) {
    extracaoEl.textContent = grupo.extractedAt ? tempoRelativo(grupo.extractedAt, Date.now()) : '';
  }
  const duracaoEl = $('activeGroupDuration');
  if (duracaoEl) {
    duracaoEl.textContent = grupo.durationSec ? `${grupo.durationSec}s` : 'Cache';
  }
  renderizarChipsDeFiltro(lista);
  renderizarListaDeParticipantes(grupo);
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

function montarMenuExportar() {
  const conteiner = $('menuExportar');
  if (!conteiner) return;
  const estado = obterEstado();
  const campoFoto = document.createElement('label');
  campoFoto.className = 'menu-campo';
  const rotulo = document.createElement('span');
  rotulo.textContent = 'Foto no Excel (px)';
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(FOTO_EXCEL_MIN);
  input.max = String(FOTO_EXCEL_MAX);
  input.step = '10';
  input.value = String(estado.tamanhoFotoExcel);
  input.setAttribute('aria-label', 'Tamanho da foto no Excel, em pixels');
  input.addEventListener('change', () => {
    const tamanho = parseInt(input.value, 10);
    const valido = Number.isFinite(tamanho) ? Math.min(FOTO_EXCEL_MAX, Math.max(FOTO_EXCEL_MIN, tamanho)) : estado.tamanhoFotoExcel;
    input.value = String(valido);
    atualizarEstado({ tamanhoFotoExcel: valido });
  });
  // Impede que o clique no input feche o menu
  input.addEventListener('click', (e) => e.stopPropagation());
  campoFoto.append(rotulo, input);

  const menu = criarMenu({
    rotulo: 'Exportar',
    principal: true,
    itens: [
      { rotulo: 'CSV', aoEscolher: comParticipantes(exportarCsv) },
      { rotulo: 'Excel (.xlsx)', aoEscolher: comParticipantes((g) => exportarExcel(g, null)) },
      { rotulo: 'JSON', aoEscolher: () => { const grupo = obterGrupoAtivo(); if (grupo) exportarJson(grupo); } },
      { elemento: campoFoto },
    ],
  });
  conteiner.replaceChildren(menu);
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
  montarMenuExportar();
}

export function iniciarGrupo() {
  aoMudar((estado, chaves) => {
    if (chaves.some((c) => CHAVES_GRUPO.includes(c))) renderizarGrupo();
    if (!estado.abaAtiva && chaves.some((c) => CHAVES_TELA_INICIAL.includes(c))) renderizarTelaInicial($('emptyDetail'));
  });
  $('refreshActiveGroupBtn').addEventListener('click', recarregarAtivo);
  $('avisoGrupoBtn').addEventListener('click', () => { if (acaoDoAviso) acaoDoAviso(); });
  $('copyPhonesBtn').addEventListener('click', comParticipantes(copiarTelefones));

  const campoBusca = $('memberSearch');
  if (campoBusca) {
    const buscaDebounce = debounce((valor) => {
      const { abaAtiva } = obterEstado();
      if (abaAtiva) atualizarVisao(abaAtiva, { busca: valor });
    }, 200);
    campoBusca.addEventListener('input', (e) => buscaDebounce.chamar(e.target.value));
  }

  iniciarPreferenciasDoGrupo();
  renderizarGrupo();
  renderizarTelaInicial($('emptyDetail'));
}
