// Fotos dos grupos: só pede ao servidor as que aparecem na tela, juntando os ids visíveis em lotes.
// O resultado (URL ou null) fica em `estado.fotosGrupos`; falha (inclusive 503 ou id fora da resposta) deixa as iniciais e libera nova tentativa depois de uma espera.
import { buscarFotosGrupos } from './api.js';
import { atualizarEstado, obterEstado } from './estado.js';
import { criarAgrupador } from './logica/agrupador.js';

const idDoElemento = new WeakMap();
const observados = new Set();
let observador = null;
// A sidebar redesenha a lista; itens que saíram do DOM sem nunca aparecer são soltos de tempos em tempos.
const PODA_MINIMA = 200;
let limitePoda = PODA_MINIMA;

const agrupador = criarAgrupador({ enviar: pedirFotos });

// Depois de uma falha, os ids só voltam a ser pedidos depois dessa espera (a sidebar redesenha a cada evento SSE).
export const ESPERA_APOS_FALHA_MS = 8000;

function liberarDepoisDaEspera(ids) {
  if (!ids.length) return;
  setTimeout(() => { for (const id of ids) agrupador.esquecer(id); }, ESPERA_APOS_FALHA_MS);
}

// O servidor devolve só o que conseguiu consultar: URL, ou null para "grupo sem foto".
// Id ausente da resposta é falha de consulta; não é guardado (nunca vira "sem foto") e é liberado após a espera.
function pedirFotos(ids) {
  buscarFotosGrupos(ids)
    .then((resposta) => {
      const fotosGrupos = new Map(obterEstado().fotosGrupos);
      const falhos = [];
      for (const id of ids) {
        if (!Object.hasOwn(resposta, id)) {
          falhos.push(id);
          continue;
        }
        fotosGrupos.set(id, typeof resposta[id] === 'string' && resposta[id] ? resposta[id] : null);
      }
      if (falhos.length < ids.length) atualizarEstado({ fotosGrupos });
      liberarDepoisDaEspera(falhos);
    })
    .catch(() => liberarDepoisDaEspera(ids));
}

function aoCruzarTela(entradas) {
  for (const entrada of entradas) {
    if (!entrada.isIntersecting) continue;
    const id = idDoElemento.get(entrada.target);
    pararDeObservar(entrada.target);
    if (id && !obterEstado().fotosGrupos.has(id)) agrupador.adicionar(id);
  }
}

function pararDeObservar(elemento) {
  observador.unobserve(elemento);
  observados.delete(elemento);
}

function podarDesconectados() {
  for (const elemento of observados) if (!elemento.isConnected) pararDeObservar(elemento);
  limitePoda = Math.max(PODA_MINIMA, observados.size * 2);
}

// Cada elemento é observado até aparecer uma vez. Se a consulta falhar, a próxima renderização observa de novo.
export function observarFotoGrupo(elemento, id) {
  if (!id || obterEstado().fotosGrupos.has(id) || typeof IntersectionObserver !== 'function') return;
  if (!observador) observador = new IntersectionObserver(aoCruzarTela, { rootMargin: '120px 0px' });
  if (observados.size >= limitePoda) podarDesconectados();
  idDoElemento.set(elemento, id);
  observados.add(elemento);
  observador.observe(elemento);
}
