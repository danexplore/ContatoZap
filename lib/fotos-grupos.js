// Fotos dos grupos: cache em memória por 1h (guardando também o null) e fila de consultas ao WhatsApp.

const TTL_FOTO_MS = 3_600_000;
const MAX_SIMULTANEAS = 3;
const MAX_IDS = 50;

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

function criarCacheFotos({ buscar, ttlMs = TTL_FOTO_MS, maxSimultaneas = MAX_SIMULTANEAS, agora = Date.now }) {
  const enfileirar = criarFila(maxSimultaneas);
  let entradas = new Map(); // id -> { url, timestamp }
  let emAndamento = new Map(); // id -> Promise<string|null>

  const valida = (entrada) => entrada && agora() - entrada.timestamp < ttlMs;

  function consultar(id) {
    const destino = entradas;
    const andamento = emAndamento;
    const promessa = enfileirar(() => buscar(id))
      .then(
        (url) => {
          const valor = typeof url === 'string' && url ? url : null;
          // Depois de limpar(), `destino` é o Map antigo e o resultado não entra no cache novo.
          destino.set(id, { url: valor, timestamp: agora() });
          return valor;
        },
        () => null
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
    return emAndamento.get(id) || consultar(id);
  }

  async function obter(ids) {
    const urls = await Promise.all(ids.map(obterUm));
    const resposta = {};
    ids.forEach((id, i) => { resposta[id] = urls[i]; });
    return resposta;
  }

  function limpar() {
    entradas = new Map();
    emAndamento = new Map();
  }

  return { obter, limpar };
}

function lerIdsFotos(param) {
  const ids = [...new Set(String(param ?? '').split(',').map((id) => id.trim()).filter(Boolean))];
  if (ids.length > MAX_IDS) return { erro: `Máximo de ${MAX_IDS} ids por chamada.` };
  return { ids };
}

module.exports = { TTL_FOTO_MS, MAX_SIMULTANEAS, MAX_IDS, criarCacheFotos, lerIdsFotos };
