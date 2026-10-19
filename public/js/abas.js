// Abas de grupos recentes: único ponto de entrada para abrir um grupo (sidebar, Ctrl+K, tela inicial…),
// faixa de abas acima do conteúdo e rolagem da lista guardada por aba.
import { $ } from './ui.js';
import { aoMudar, atualizarEstado, obterEstado, visaoDoGrupo } from './estado.js';
import { carregarGrupo } from './grupo.js';
import { abrirRecente, fecharRecente } from './logica/recentes.js';
import { criarAba } from './componentes/aba.js';
import { observarFotoGrupo } from './fotos-grupos.js';

const CHAVES_ABAS = ['recentes', 'abaAtiva', 'fotosGrupos', 'conexao'];

// Rolagem a devolver quando a aba ativada estiver pronta: { id, valor }
let rolagemPendente = null;
// Conteúdo da última renderização da faixa: sem mudança, não redesenha (o SSE `state` chega a todo momento)
let ultimaAssinatura = '';
let ultimaAtiva;

const grupoDoServidor = (id) => (obterEstado().conexao.groups || []).find((g) => g.id === id) || null;

function nomeConhecido(id) {
  const grupo = grupoDoServidor(id);
  if (grupo && grupo.name) return grupo.name;
  const recente = obterEstado().recentes.find((r) => r.id === id);
  return recente ? recente.name : '';
}

const nomeDaAba = (id) => nomeConhecido(id) || '(Sem nome)';

// Área que rola na tela do grupo (a tabela de participantes). No Node (testes) não há document.
function areaDeRolagem() {
  return globalThis.document ? document.getElementById('areaParticipantes') : null;
}

function semIds(mapa, ids) {
  if (!ids.some((id) => mapa.has(id))) return mapa;
  const novo = new Map(mapa);
  for (const id of ids) novo.delete(id);
  return novo;
}

function visoesComRolagemSalva(visoes, id) {
  const area = areaDeRolagem();
  if (!id || !area) return visoes;
  const novas = new Map(visoes);
  novas.set(id, { ...visaoDoGrupo(id), rolagem: area.scrollTop });
  return novas;
}

// Só carrega com o WhatsApp pronto e o grupo na lista; sem a lista, a aba espera ela chegar.
function garantirCarga() {
  const { abaAtiva, conexao, grupos } = obterEstado();
  if (!abaAtiva || conexao.status !== 'ready' || grupos.has(abaAtiva) || !grupoDoServidor(abaAtiva)) return;
  carregarGrupo(abaAtiva);
}

function aplicarRolagem() {
  if (!rolagemPendente) return;
  const { abaAtiva, grupos } = obterEstado();
  if (rolagemPendente.id !== abaAtiva) {
    rolagemPendente = null;
    return;
  }
  const entrada = grupos.get(abaAtiva);
  if (!entrada || entrada.status !== 'pronto') return;
  const area = areaDeRolagem();
  if (area) area.scrollTop = rolagemPendente.valor;
  rolagemPendente = null;
}

function trocarAba(patch, proximaAtiva) {
  rolagemPendente = proximaAtiva ? { id: proximaAtiva, valor: visaoDoGrupo(proximaAtiva).rolagem } : null;
  patch.abaAtiva = proximaAtiva;
}

export function abrirGrupo({ id, name }) {
  if (!id) return;
  const { recentes, abaAtiva, grupos, visoes } = obterEstado();
  const lista = abrirRecente(recentes, { id, name: name || nomeConhecido(id) }, Date.now());
  // Aba que saiu pelo limite leva junto os dados e a visão dela
  const sairam = recentes.filter((r) => !lista.some((n) => n.id === r.id)).map((r) => r.id);
  const patch = { recentes: lista };
  const gruposRestantes = semIds(grupos, sairam);
  if (gruposRestantes !== grupos) patch.grupos = gruposRestantes;
  let visoesNovas = semIds(visoes, sairam);
  if (abaAtiva !== id) {
    visoesNovas = visoesComRolagemSalva(visoesNovas, abaAtiva);
    trocarAba(patch, id);
  }
  if (visoesNovas !== visoes) patch.visoes = visoesNovas;
  atualizarEstado(patch);
  garantirCarga();
  aplicarRolagem();
}

export function fecharAba(id) {
  const { recentes, abaAtiva, grupos, visoes } = obterEstado();
  const { lista, proximaAtiva } = fecharRecente(recentes, id, abaAtiva);
  if (lista === recentes) return;
  const patch = { recentes: lista, grupos: semIds(grupos, [id]), visoes: semIds(visoes, [id]) };
  if (proximaAtiva !== abaAtiva) trocarAba(patch, proximaAtiva);
  atualizarEstado(patch);
  garantirCarga();
  aplicarRolagem();
}

// Ao recarregar a página, as abas voltam de `recentes`: a primeira fica ativa e só ela carrega.
function restaurarAbaAtiva() {
  const { conexao, abaAtiva, recentes } = obterEstado();
  if (conexao.status !== 'ready' || abaAtiva || !recentes.length) return;
  const id = recentes[0].id;
  rolagemPendente = null;
  atualizarEstado({ abaAtiva: id });
}

const botaoDaAba = (faixa, id) => (id ? faixa.querySelector(`[role="tab"][data-aba="${CSS.escape(id)}"]`) : null);

// Rola só a faixa (na horizontal) até a aba ativa; scrollIntoView mexeria também na rolagem da página.
function mostrarAbaAtiva(faixa, botao) {
  const aba = botao.parentElement;
  const inicio = aba.offsetLeft;
  const fim = inicio + aba.offsetWidth;
  if (inicio < faixa.scrollLeft) faixa.scrollLeft = inicio;
  else if (fim > faixa.scrollLeft + faixa.clientWidth) faixa.scrollLeft = fim - faixa.clientWidth;
}

export function renderizarAbas() {
  const faixa = $('abasFaixa');
  const { recentes, abaAtiva, fotosGrupos } = obterEstado();
  const abas = recentes.map((r) => ({ id: r.id, nome: nomeDaAba(r.id), foto: fotosGrupos.get(r.id) || null }));
  const assinatura = JSON.stringify([abaAtiva, abas]);
  if (assinatura === ultimaAssinatura) return;
  const ativaMudou = abaAtiva !== ultimaAtiva || faixa.childElementCount !== abas.length;
  ultimaAssinatura = assinatura;
  ultimaAtiva = abaAtiva;

  const focado = faixa.contains(document.activeElement) ? document.activeElement.closest('[data-aba]') : null;
  const idFocado = focado ? focado.dataset.aba : null;
  const rolagem = faixa.scrollLeft;

  faixa.hidden = abas.length === 0;
  faixa.replaceChildren(...abas.map((a, i) => {
    const aba = criarAba({
      ...a,
      ativa: a.id === abaAtiva,
      aoAtivar: () => abrirGrupo({ id: a.id }),
      aoFechar: () => fecharAba(a.id),
    });
    const botao = aba.querySelector('[role="tab"]');
    botao.id = `aba-${i}`;
    botao.setAttribute('aria-controls', 'painelGrupo');
    observarFotoGrupo(aba, a.id);
    return aba;
  }));
  faixa.scrollLeft = rolagem;

  const botaoAtivo = botaoDaAba(faixa, abaAtiva);
  const painel = $('painelGrupo');
  if (botaoAtivo) painel.setAttribute('aria-labelledby', botaoAtivo.id);
  else painel.removeAttribute('aria-labelledby');
  if (botaoAtivo && ativaMudou) mostrarAbaAtiva(faixa, botaoAtivo);

  // O foco estava numa aba que foi redesenhada (ou fechada): volta para ela, para a ativa ou para o conteúdo
  if (idFocado !== null) {
    const alvo = botaoDaAba(faixa, idFocado) || botaoAtivo;
    if (alvo) alvo.focus({ preventScroll: true });
    else $('main-content').focus({ preventScroll: true });
  }
}

// Setas, Home e End movem o foco entre as abas; Enter/Espaço ativa (o próprio botão).
function navegarComTeclado(e) {
  const botoes = [...$('abasFaixa').querySelectorAll('[role="tab"]')];
  const atual = botoes.indexOf(document.activeElement);
  if (atual === -1) return;
  const destinos = { ArrowLeft: atual - 1, ArrowRight: atual + 1, Home: 0, End: botoes.length - 1 };
  if (!(e.key in destinos)) return;
  e.preventDefault();
  const alvo = botoes[Math.min(botoes.length - 1, Math.max(0, destinos[e.key]))];
  alvo.focus();
  mostrarAbaAtiva($('abasFaixa'), alvo);
}

export function iniciarAbas() {
  aoMudar((_, chaves) => {
    if (chaves.includes('conexao')) restaurarAbaAtiva();
    if (chaves.includes('conexao') || chaves.includes('abaAtiva')) garantirCarga();
    if (chaves.some((c) => CHAVES_ABAS.includes(c))) renderizarAbas();
    if (chaves.includes('grupos') || chaves.includes('abaAtiva')) aplicarRolagem();
  });
  $('abasFaixa').addEventListener('keydown', navegarComTeclado);
  restaurarAbaAtiva();
  renderizarAbas();
}
