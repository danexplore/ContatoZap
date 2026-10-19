// Ficha do participante: painel lateral (≥1280px) ou gaveta (<1280px) com foto, nomes, telefone,
// botões Copiar/Abrir no WhatsApp e "Também está em". Navegação ↑/↓ e Esc fecha.
import { $, ICONES, copiarTexto, abrirPreviewFoto } from './ui.js';
import { buscarGruposDoContato } from './api.js';
import { obterEstado, atualizarEstado, aoMudar } from './estado.js';
import { apenasDigitos, formatarTelefone } from './logica/texto.js';
import { filtrarParticipantes, ordenarParticipantes, vizinhoNaLista } from './logica/filtros.js';
import { criarAvatar } from './componentes/avatar.js';
import { criarPainel } from './componentes/painel.js';
import { abrirGrupo } from './abas.js';

const TAMANHO_FOTO_FICHA = 160;
let origemFoco = null; // elemento que abriu a ficha, para devolver o foco ao fechar
let idEmBusca = null;
let participanteRenderizado = null; // id do participante cuja busca de grupos está em andamento

function participantePorId(id) {
  const { abaAtiva, grupos } = obterEstado();
  if (!abaAtiva) return null;
  const entrada = grupos.get(abaAtiva);
  if (!entrada || entrada.status !== 'pronto') return null;
  return (entrada.dados.participants || []).find((p) => p.id === id) || null;
}

function listaFiltradaAtual() {
  const { abaAtiva, grupos, visoes } = obterEstado();
  if (!abaAtiva) return [];
  const entrada = grupos.get(abaAtiva);
  if (!entrada || entrada.status !== 'pronto') return [];
  const visao = visoes.get(abaAtiva);
  const filtro = visao?.filtro || 'todos';
  const busca = visao?.busca || '';
  const ordenacao = visao?.ordenacao || { coluna: null, asc: true };
  const filtrados = filtrarParticipantes(entrada.dados.participants || [], { filtro, busca });
  return ordenarParticipantes(filtrados, ordenacao.coluna, ordenacao.asc);
}

function navegarFicha(direcao) {
  const { fichaAberta } = obterEstado();
  if (!fichaAberta) return;
  const lista = listaFiltradaAtual();
  const proximo = vizinhoNaLista(lista, fichaAberta, direcao);
  if (proximo) {
    atualizarEstado({ fichaAberta: proximo });
    rolarParaParticipante(proximo);
  }
}

function rolarParaParticipante(id) {
  const alvo = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (alvo) alvo.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

export function fecharFicha() {
  atualizarEstado({ fichaAberta: null });
  if (origemFoco && typeof origemFoco.focus === 'function') {
    // O card/linha pode ter sido re-renderizado; procura pelo data-id se necessário
    let alvo = origemFoco;
    if (!document.contains(origemFoco)) {
      const id = origemFoco.dataset?.id;
      alvo = id ? document.querySelector(`[data-id="${CSS.escape(id)}"]`) : null;
    }
    if (alvo && typeof alvo.focus === 'function') alvo.focus({ preventScroll: true });
  }
  origemFoco = null;
}

export function abrirFicha(participanteId, origem) {
  if (!participanteId) return;
  origemFoco = origem || null;
  atualizarEstado({ fichaAberta: participanteId });
}

function criarEtiqueta(texto, classe) {
  const span = document.createElement('span');
  span.className = `ficha-etiqueta ${classe}`;
  span.textContent = texto;
  return span;
}

function criarEsqueletoLinhas(n) {
  const container = document.createElement('div');
  container.className = 'ficha-grupos-lista';
  for (let i = 0; i < n; i++) {
    const linha = document.createElement('div');
    linha.className = 'ficha-grupo-item esqueleto';
    const avatar = document.createElement('span');
    avatar.className = 'avatar avatar--circulo';
    avatar.style.width = '32px';
    avatar.style.height = '32px';
    const nome = document.createElement('span');
    nome.className = 'esqueleto-linha';
    linha.append(avatar, nome);
    container.appendChild(linha);
  }
  return container;
}

async function carregarGruposEmComum(participante, container) {
  const idPedido = participante.id;
  const pedido = {};
  idEmBusca = pedido;
  container.replaceChildren(criarEsqueletoLinhas(3));

  try {
    const phone = participante.hidden ? '' : apenasDigitos(participante.phone);
    const { abaAtiva } = obterEstado();
    const grupos = await buscarGruposDoContato({
      phone,
      id: participante.id,
      exclude: abaAtiva,
    });

    // Resposta atrasada de outra pessoa: descarta
    if (idEmBusca !== pedido) return;
    if (obterEstado().fichaAberta !== idPedido) return;

    container.replaceChildren();
    if (!grupos.length) {
      const vazio = document.createElement('p');
      vazio.className = 'ficha-grupos-vazio';
      vazio.textContent = 'Nenhum outro grupo extraído com essa pessoa.';
      container.appendChild(vazio);
      return;
    }

    const lista = document.createElement('div');
    lista.className = 'ficha-grupos-lista';
    for (const g of grupos) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'ficha-grupo-item';
      item.dataset.grupoId = g.id;
      item.setAttribute('aria-label', `Abrir grupo ${g.name}`);

      const avatar = criarAvatar({ id: g.id, nome: g.name, tamanho: 32 });
      const nome = document.createElement('span');
      nome.className = 'ficha-grupo-nome';
      nome.textContent = g.name;

      item.append(avatar, nome);
      item.addEventListener('click', () => {
        fecharFicha();
        abrirGrupo({ id: g.id, name: g.name });
      });
      lista.appendChild(item);
    }
    container.appendChild(lista);
  } catch {
    if (idEmBusca !== pedido) return;
    if (obterEstado().fichaAberta !== idPedido) return;
    container.replaceChildren();
    const erro = document.createElement('p');
    erro.className = 'ficha-grupos-vazio';
    erro.textContent = 'Nenhum outro grupo extraído com essa pessoa.';
    container.appendChild(erro);
  }
}

function renderizarConteudoFicha(participante) {
  const conteudo = document.createElement('div');
  conteudo.className = 'ficha-conteudo';

  // Foto grande (clicável quando há foto)
  const fotoWrap = document.createElement('div');
  fotoWrap.className = 'ficha-foto-wrap';
  const avatar = criarAvatar({
    id: participante.id,
    nome: participante.pushname || participante.name || '',
    foto: participante.photoUrl || null,
    tamanho: TAMANHO_FOTO_FICHA,
  });
  if (participante.photoUrl) {
    avatar.removeAttribute('aria-hidden');
    avatar.style.cursor = 'pointer';
    avatar.setAttribute('role', 'button');
    avatar.setAttribute('tabindex', '0');
    avatar.setAttribute('aria-label', 'Ver foto em tamanho original');
    const abrir = () => abrirPreviewFoto(participante.photoUrl, participante.pushname || participante.name || '');
    avatar.addEventListener('click', abrir);
    avatar.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
  }
  fotoWrap.appendChild(avatar);

  // Nomes
  const nomes = document.createElement('div');
  nomes.className = 'ficha-nomes';
  const nomeWhatsapp = document.createElement('h3');
  nomeWhatsapp.className = 'ficha-nome-whatsapp';
  nomeWhatsapp.textContent = participante.pushname || participante.name || '(Sem nome)';
  nomes.appendChild(nomeWhatsapp);

  if (participante.savedName && participante.savedName !== (participante.pushname || participante.name)) {
    const nomeAgenda = document.createElement('p');
    nomeAgenda.className = 'ficha-nome-agenda';
    nomeAgenda.textContent = participante.savedName;
    nomes.appendChild(nomeAgenda);
  }

  // Telefone
  const telefoneEl = document.createElement('p');
  telefoneEl.className = 'ficha-telefone';
  const digitos = apenasDigitos(participante.phone);
  telefoneEl.textContent = formatarTelefone(participante.phone);

  // Etiquetas Admin / Privado
  const etiquetas = document.createElement('div');
  etiquetas.className = 'ficha-etiquetas';
  if (participante.admin) etiquetas.appendChild(criarEtiqueta('Admin', 'admin'));
  if (participante.hidden) etiquetas.appendChild(criarEtiqueta('Privado', 'privado'));

  // Botões de ação
  const acoes = document.createElement('div');
  acoes.className = 'ficha-acoes';

  const btnCopiar = document.createElement('button');
  btnCopiar.type = 'button';
  btnCopiar.className = 'btn sm';
  btnCopiar.innerHTML = ICONES.copy;
  const spanCopiar = document.createElement('span');
  spanCopiar.textContent = 'Copiar';
  btnCopiar.append(spanCopiar);
  if (digitos) {
    btnCopiar.addEventListener('click', () => copiarTexto('+' + digitos, 'Telefone copiado!'));
  } else {
    btnCopiar.disabled = true;
    btnCopiar.title = 'Sem telefone visível';
  }

  const btnWhatsapp = document.createElement(digitos ? 'a' : 'button');
  btnWhatsapp.className = 'btn primary sm';
  btnWhatsapp.target = '_blank';
  btnWhatsapp.rel = 'noopener';
  const spanWpp = document.createElement('span');
  spanWpp.textContent = 'Abrir no WhatsApp';
  btnWhatsapp.appendChild(spanWpp);
  if (digitos) {
    btnWhatsapp.href = `https://wa.me/${digitos}`;
  } else {
    btnWhatsapp.type = 'button';
    btnWhatsapp.disabled = true;
    btnWhatsapp.classList.add('disabled');
    btnWhatsapp.setAttribute('aria-disabled', 'true');
    btnWhatsapp.title = 'Sem telefone visível';
    btnWhatsapp.addEventListener('click', (e) => e.preventDefault());
  }

  acoes.append(btnCopiar, btnWhatsapp);

  // Seção "Também está em"
  const secaoGrupos = document.createElement('div');
  secaoGrupos.className = 'ficha-grupos-secao';
  const tituloGrupos = document.createElement('h4');
  tituloGrupos.className = 'ficha-grupos-titulo';
  tituloGrupos.textContent = 'Também está em';
  const containerGrupos = document.createElement('div');
  containerGrupos.className = 'ficha-grupos-container';
  secaoGrupos.append(tituloGrupos, containerGrupos);

  conteudo.append(fotoWrap, nomes, telefoneEl, etiquetas, acoes, secaoGrupos);

  // Carrega os grupos em comum de forma assíncrona
  carregarGruposEmComum(participante, containerGrupos);

  return conteudo;
}

export function renderizarFicha() {
  const container = $('fichaContainer');
  if (!container) return;

  const { fichaAberta } = obterEstado();
  const participante = fichaAberta ? participantePorId(fichaAberta) : null;
  $('mainView').classList.toggle('com-ficha', Boolean(participante));
  if (!participante) {
    participanteRenderizado = null;
    idEmBusca = null;
    container.replaceChildren();
    container.hidden = true;
    return;
  }

  if (participanteRenderizado === participante && !container.hidden) return;
  participanteRenderizado = participante;
  container.hidden = false;
  const conteudo = renderizarConteudoFicha(participante);
  const painel = criarPainel({
    titulo: 'Detalhes do contato',
    conteudo,
    aoFechar: fecharFicha,
  });
  container.replaceChildren(painel);

  // Foca no botão de fechar para acessibilidade
  const btnFechar = painel.querySelector('.painel-fechar');
  if (btnFechar) btnFechar.focus({ preventScroll: true });
  sincronizarModalidade();
}

// Navegação por teclado global (↑/↓ fora de campos de texto)
function teclaGlobal(e) {
  const { fichaAberta } = obterEstado();
  if (!fichaAberta || e.defaultPrevented || document.querySelector('.photo-modal-overlay') || document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape') { e.preventDefault(); fecharFicha(); return; }
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    navegarFicha(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    navegarFicha(-1);
  }
}

function sincronizarModalidade() {
  const container = $('fichaContainer');
  const modal = !container.hidden && matchMedia('(max-width: 1279px)').matches;
  const painel = container.querySelector('.painel');
  painel?.setAttribute('aria-modal', String(modal));
  if (modal && painel && !painel.contains(document.activeElement)) painel.querySelector('.painel-fechar')?.focus({ preventScroll: true });
  for (const seletor of ['.app-header', '#sidebar', '#main-content']) {
    const alvo = document.querySelector(seletor);
    if (alvo) alvo.inert = modal;
  }
}

export function iniciarFicha() {
  aoMudar((_, chaves) => {
    // Trocar de aba fecha a ficha
    if (chaves.includes('abaAtiva')) {
      const { fichaAberta } = obterEstado();
      if (fichaAberta) {
        origemFoco = null;
        atualizarEstado({ fichaAberta: null });
        return;
      }
    }
    if (chaves.includes('fichaAberta') || chaves.includes('grupos')) {
      renderizarFicha();
      sincronizarModalidade();
    }
  });
  matchMedia('(max-width: 1279px)').addEventListener('change', sincronizarModalidade);
  document.addEventListener('keydown', teclaGlobal);
  renderizarFicha();
}
