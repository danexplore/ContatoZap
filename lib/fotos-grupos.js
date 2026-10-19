// Fotos dos grupos: cache em memória por 1h e fila de consultas ao WhatsApp.
// `buscar(id)` devolve a URL, ou null quando o grupo não tem foto (isso entra no cache por 1h).
// Se `buscar` lançar (não deu para consultar), o id NÃO é cacheado e fica FORA da resposta de `obter`:
// o front não recebe nada para ele e tenta de novo mais tarde, em vez de gravar "sem foto".

const TTL_FOTO_MS = 3_600_000;
const MAX_SIMULTANEAS = 3;
const MAX_IDS = 50;
const MAX_ENTRADAS_CACHE = 2000;
const TAMANHO_MAX_ID = 64;
const FORMATO_ID_GRUPO = /^[0-9]+(-[0-9]+)?@g\.us$/;
const FALHOU = Symbol('falhou');

// Fila simples: no máximo `limite` tarefas rodando; as demais esperam na ordem de chegada.
function criarFila(limite) {
  const espera = [];
  let ativos = 0;

  const proxima = () => {
    if (ativos >= limite || espera.length === 0) return;
    const { tarefa, resolver, rejeitar } = espera.shift();
    ativos += 1;
    Promise.resolve()
      .then(tarefa)
      .then(resolver, rejeitar)
      .finally(() => {
        ativos -= 1;
        proxima();
      });
  };

  return (tarefa) =>
    new Promise((resolver, rejeitar) => {
      espera.push({ tarefa, resolver, rejeitar });
      proxima();
    });
}

function criarCacheFotos({ buscar, ttlMs = TTL_FOTO_MS, maxSimultaneas = MAX_SIMULTANEAS, agora = Date.now, maxEntradas = MAX_ENTRADAS_CACHE }) {
  const enfileirar = criarFila(maxSimultaneas);
  let entradas = new Map(); // id -> { url, timestamp }
  let emAndamento = new Map(); // id -> Promise<string|null|FALHOU>

  const valida = (entrada) => entrada && agora() - entrada.timestamp < ttlMs;

  function consultar(id) {
    const destino = entradas;
    const andamento = emAndamento;
    const promessa = enfileirar(() => buscar(id))
      .then(
        (url) => {
          const valor = typeof url === 'string' && url ? url : null;
          // Depois de limpar(), `destino` é o Map antigo e o resultado não entra no cache novo.
          destino.delete(id); // reinsere no fim: a ordem do Map é a ordem de gravação
          destino.set(id, { url: valor, timestamp: agora() });
          while (destino.size > maxEntradas) destino.delete(destino.keys().next().value);
          return valor;
        },
        () => FALHOU
      )
      .finally(() => {
        if (andamento.get(id) === promessa) andamento.delete(id);
      });
    andamento.set(id, promessa);
    return promessa;
  }

  function obterUm(id) {
    const entrada = entradas.get(id);
    if (valida(entrada)) return Promise.resolve(entrada.url);
    if (entrada) entradas.delete(id);
    return emAndamento.get(id) || consultar(id);
  }

  async function obter(ids) {
    const urls = await Promise.all(ids.map(obterUm));
    const resposta = {};
    ids.forEach((id, i) => { if (urls[i] !== FALHOU) resposta[id] = urls[i]; });
    return resposta;
  }

  function limpar() {
    entradas = new Map();
    emAndamento = new Map();
  }

  return { obter, limpar };
}

// Só ids de grupo (`123-456@g.us`, até 64 caracteres) são consultados; os demais são descartados em silêncio.
// Se vieram ids e nenhum é válido, é erro (a rota responde 400). Mais de 50 ids válidos também é erro.
function lerIdsFotos(param) {
  const recebidos = String(param ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const ids = [...new Set(recebidos.filter((id) => id.length <= TAMANHO_MAX_ID && FORMATO_ID_GRUPO.test(id)))];
  if (recebidos.length > 0 && ids.length === 0) return { erro: 'Nenhum id de grupo válido.' };
  if (ids.length > MAX_IDS) return { erro: `Máximo de ${MAX_IDS} ids por chamada.` };
  return { ids };
}

module.exports = {
  TTL_FOTO_MS, MAX_SIMULTANEAS, MAX_IDS, MAX_ENTRADAS_CACHE, TAMANHO_MAX_ID, criarCacheFotos, lerIdsFotos,
};
