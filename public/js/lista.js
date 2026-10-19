// Tabela de participantes do grupo aberto: filtro por abas, busca, ordenação, paginação e coluna Foto.
import { $, ICONES, copiarTexto, abrirPreviewFoto } from './ui.js';
import { aoMudar, atualizarVisao, obterEstado, visaoDoGrupo } from './estado.js';
import { obterGrupoAtivo } from './grupo.js';
import { apenasDigitos, formatarTelefone } from './logica/texto.js';
import { filtrarParticipantes, linhaExportacao, ordenarParticipantes } from './logica/filtros.js';

// Mesmas colunas do Excel, mais # e Foto
const COLUNAS_TABELA = 7;

const CHAVES_LISTA = ['abaAtiva', 'grupos', 'visoes'];

// Paginação é só desta tabela; filtro, busca e ordenação ficam na visão do grupo (estado.js).
let paginaAtual = 1;
let tamanhoPagina = 50;
// Grupo + filtro + busca da última renderização: se mudar, volta à primeira página
let ultimaConsulta = '';

function criarAvatarReserva(nome) {
  const el = document.createElement('span');
  el.className = 'avatar-fallback';
  const limpo = String(nome || '').trim();
  el.textContent = limpo ? limpo.charAt(0).toUpperCase() : '?';
  el.title = 'Foto não acessível ou privada';
  el.setAttribute('aria-label', `Avatar de ${limpo || 'usuário desconhecido'}`);
  return el;
}

function criarCelulaTexto(texto) {
  const td = document.createElement('td');
  td.textContent = texto || '—';
  return td;
}

function criarSelo(texto, variante) {
  const selo = document.createElement('span');
  selo.className = `tag-badge ${variante}`;
  selo.textContent = texto;
  return selo;
}

function membrosFiltradosEOrdenados(visao) {
  const grupo = obterGrupoAtivo();
  if (!grupo || !grupo.participants) return [];
  const filtrados = filtrarParticipantes(grupo.participants, { filtro: visao.filtro, busca: visao.busca });
  return ordenarParticipantes(filtrados, visao.ordenacao.coluna, visao.ordenacao.asc);
}

function criarCelulaFoto(p) {
  const td = document.createElement('td');
  td.className = 'photo-cell';
  if (p.photoUrl) {
    const nomeExibido = p.pushname || p.name || '';
    const img = document.createElement('img');
    img.src = p.photoUrl;
    img.className = 'member-avatar';
    img.alt = nomeExibido || 'Foto';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.title = 'Clique para ver a foto ampliada';
    img.addEventListener('click', (e) => { e.stopPropagation(); abrirPreviewFoto(p.photoUrl, nomeExibido); });
    img.addEventListener('error', () => { img.replaceWith(criarAvatarReserva(nomeExibido)); });
    td.appendChild(img);
  } else {
    td.appendChild(criarAvatarReserva(p.pushname || p.name));
  }
  return td;
}

function criarCelulaTelefone(p) {
  const td = document.createElement('td');
  const envoltorio = document.createElement('div');
  envoltorio.className = 'phone-cell';
  const texto = document.createElement('span');
  texto.textContent = p.phone ? formatarTelefone(p.phone) : '—';
  envoltorio.appendChild(texto);
  if (p.phone) {
    const botao = document.createElement('button');
    botao.className = 'copy-icon-btn';
    botao.title = 'Copiar telefone';
    botao.setAttribute('aria-label', `Copiar telefone ${formatarTelefone(p.phone)}`);
    botao.innerHTML = ICONES.copy;
    botao.addEventListener('click', (e) => { e.stopPropagation(); copiarTexto(apenasDigitos(p.phone), 'Telefone copiado!'); });
    envoltorio.appendChild(botao);
  }
  td.appendChild(envoltorio);
  return td;
}

// Abas de filtro, campo de busca e setas de ordenação refletem a visão do grupo aberto.
function sincronizarControles(visao) {
  document.querySelectorAll('.filter-tab').forEach((botao) => {
    const ativo = botao.dataset.filter === visao.filtro;
    botao.classList.toggle('active', ativo);
    botao.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
  const busca = $('memberSearch');
  if (busca.value.trim() !== visao.busca) busca.value = visao.busca;
  atualizarIconesOrdem(visao.ordenacao);
}

function renderizarLista({ primeiraPagina = false } = {}) {
  const { abaAtiva } = obterEstado();
  const visao = visaoDoGrupo(abaAtiva);
  const consulta = JSON.stringify([abaAtiva, visao.filtro, visao.busca]);
  if (primeiraPagina || consulta !== ultimaConsulta) paginaAtual = 1;
  ultimaConsulta = consulta;
  sincronizarControles(visao);
  const lista = membrosFiltradosEOrdenados(visao);
  const tbody = $('membersTbody');
  tbody.replaceChildren();
  const total = lista.length;
  $('pageTotalText').textContent = total;
  const limite = tamanhoPagina === 'all' ? total : parseInt(tamanhoPagina, 10);
  const totalPaginas = Math.max(1, Math.ceil(total / (limite || 1)));
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  const inicio = (paginaAtual - 1) * limite;
  const fim = Math.min(inicio + limite, total);
  $('pageShowingText').textContent = total === 0 ? '0-0' : `${inicio + 1}-${fim}`;
  $('pageCurrentLabel').textContent = `${paginaAtual} / ${totalPaginas}`;
  $('prevPageBtn').disabled = paginaAtual <= 1;
  $('nextPageBtn').disabled = paginaAtual >= totalPaginas;
  const itensPagina = lista.slice(inicio, fim);
  if (!itensPagina.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = COLUNAS_TABELA;
    td.style.textAlign = 'center';
    td.style.padding = 'var(--space-6)';
    td.style.color = 'hsl(var(--color-text-tertiary))';
    td.textContent = 'Nenhum contato corresponde aos filtros aplicados.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  itensPagina.forEach((p, idx) => {
    const tr = document.createElement('tr');
    const tdIndice = document.createElement('td');
    tdIndice.style.color = 'hsl(var(--color-text-tertiary))';
    tdIndice.textContent = inicio + idx + 1;
    const excel = linhaExportacao(p);
    const tdNomeWhatsapp = criarCelulaTexto(excel.nome_whatsapp);
    tdNomeWhatsapp.style.fontWeight = '500';
    const tdNomeAgenda = criarCelulaTexto(excel.nome_agenda);
    const tdAdmin = document.createElement('td');
    tdAdmin.appendChild(criarSelo(excel.admin, p.admin ? 'admin' : 'member'));
    const tdStatus = document.createElement('td');
    tdStatus.appendChild(criarSelo(excel.status, p.hidden ? 'lid' : 'member'));
    tr.append(tdIndice, criarCelulaFoto(p), tdNomeWhatsapp, tdNomeAgenda, criarCelulaTelefone(p), tdAdmin, tdStatus);
    tbody.appendChild(tr);
  });
}

function atualizarIconesOrdem({ coluna, asc }) {
  document.querySelectorAll('th.sortable').forEach((th) => {
    const ativa = th.dataset.sort === coluna;
    th.querySelector('.sort-icon').textContent = ativa ? (asc ? '▲' : '▼') : '';
    th.setAttribute('aria-sort', ativa ? (asc ? 'ascending' : 'descending') : 'none');
  });
}

function atualizarVisaoAtiva(patch) {
  const { abaAtiva } = obterEstado();
  if (abaAtiva) atualizarVisao(abaAtiva, patch);
}

export function iniciarLista() {
  aoMudar((_, chaves) => { if (chaves.some((c) => CHAVES_LISTA.includes(c))) renderizarLista(); });

  document.querySelectorAll('.filter-tab').forEach((botao) => {
    botao.addEventListener('click', () => atualizarVisaoAtiva({ filtro: botao.dataset.filter }));
  });

  $('memberSearch').addEventListener('input', (e) => atualizarVisaoAtiva({ busca: e.target.value.trim() }));

  document.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const coluna = th.dataset.sort;
      const atual = visaoDoGrupo(obterEstado().abaAtiva).ordenacao;
      // Crescente → decrescente → ordem original (a do Excel)
      let ordenacao;
      if (atual.coluna !== coluna) ordenacao = { coluna, asc: true };
      else if (atual.asc) ordenacao = { coluna, asc: false };
      else ordenacao = { coluna: null, asc: true };
      atualizarVisaoAtiva({ ordenacao });
    });
  });

  $('pageSizeSelect').addEventListener('change', (e) => { tamanhoPagina = e.target.value; renderizarLista({ primeiraPagina: true }); });
  $('prevPageBtn').addEventListener('click', () => { if (paginaAtual > 1) { paginaAtual--; renderizarLista(); } });
  $('nextPageBtn').addEventListener('click', () => { paginaAtual++; renderizarLista(); });
}

export function ativarRedimensionamentoFoto() {
  const alca = $('photoResizeHandle');
  const th = $('thPhoto');
  if (!alca || !th) return;
  const tabela = th.closest('table');
  const paddingCelula = 16; // padding-inline de td.photo-cell (2 × --space-2)
  const AVATAR_MINIMO = 28;
  alca.addEventListener('click', (e) => e.stopPropagation());
  alca.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const xInicial = e.pageX;
    const larguraInicial = th.offsetWidth;
    alca.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const aoMover = (ev) => {
      const avatar = Math.max(AVATAR_MINIMO, larguraInicial + ev.pageX - xInicial - paddingCelula);
      tabela.style.setProperty('--photo-avatar-size', `${avatar}px`);
    };
    const aoSoltar = () => {
      alca.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', aoMover);
      document.removeEventListener('mouseup', aoSoltar);
    };
    document.addEventListener('mousemove', aoMover);
    document.addEventListener('mouseup', aoSoltar);
  });
}
