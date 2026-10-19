// Tabela de participantes do grupo aberto: filtro por abas, busca, ordenação, paginação e coluna Foto.
import { $, ICONES, copiarTexto, abrirPreviewFoto } from './ui.js';
import { obterGrupoAtivo } from './grupo.js';
import { paraLinhaExcel } from './exportar.js';
import { apenasDigitos, formatarTelefone } from './logica/texto.js';

// Mesmas colunas do Excel, mais # e Foto
const COLUNAS_TABELA = 7;

let filtroAtivo = 'all';
let termoBusca = '';
// null = ordem original do grupo, a mesma do Excel
let colunaOrdem = null;
let ordemCrescente = true;
let paginaAtual = 1;
let tamanhoPagina = 50;

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

function membrosFiltradosEOrdenados() {
  const grupo = obterGrupoAtivo();
  if (!grupo || !grupo.participants) return [];
  let lista = [...grupo.participants];
  if (filtroAtivo === 'phones') lista = lista.filter((p) => p.phone && !p.hidden);
  else if (filtroAtivo === 'admins') lista = lista.filter((p) => p.admin);
  else if (filtroAtivo === 'hidden') lista = lista.filter((p) => p.hidden);
  const q = termoBusca.toLowerCase();
  if (q) lista = lista.filter((p) => [p.pushname, p.name, p.savedName].some((n) => (n || '').toLowerCase().includes(q)) || (p.phone || '').includes(q));
  if (!colunaOrdem) return lista;
  // Ordena pelos mesmos valores que vão para as colunas do Excel
  const comChave = lista.map((p) => ({ p, chave: paraLinhaExcel(p)[colunaOrdem] }));
  comChave.sort((a, b) => {
    const cmp = a.chave.localeCompare(b.chave, 'pt-BR', { numeric: true });
    return ordemCrescente ? cmp : -cmp;
  });
  return comChave.map(({ p }) => p);
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

export function renderizarLista({ primeiraPagina = false } = {}) {
  if (primeiraPagina) paginaAtual = 1;
  const lista = membrosFiltradosEOrdenados();
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
    const excel = paraLinhaExcel(p);
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

function atualizarIconesOrdem() {
  document.querySelectorAll('th.sortable').forEach((th) => {
    const ativa = th.dataset.sort === colunaOrdem;
    th.querySelector('.sort-icon').textContent = ativa ? (ordemCrescente ? '▲' : '▼') : '';
    th.setAttribute('aria-sort', ativa ? (ordemCrescente ? 'ascending' : 'descending') : 'none');
  });
}

export function iniciarLista() {
  document.querySelectorAll('.filter-tab').forEach((botao) => {
    botao.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      botao.classList.add('active');
      botao.setAttribute('aria-selected', 'true');
      filtroAtivo = botao.dataset.filter;
      renderizarLista({ primeiraPagina: true });
    });
  });

  $('memberSearch').addEventListener('input', (e) => { termoBusca = e.target.value.trim(); renderizarLista({ primeiraPagina: true }); });

  document.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const coluna = th.dataset.sort;
      // Crescente → decrescente → ordem original (a do Excel)
      if (colunaOrdem !== coluna) { colunaOrdem = coluna; ordemCrescente = true; }
      else if (ordemCrescente) ordemCrescente = false;
      else colunaOrdem = null;
      atualizarIconesOrdem();
      renderizarLista();
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
