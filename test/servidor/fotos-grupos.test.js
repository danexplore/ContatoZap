const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  criarCacheFotos,
  lerIdsFotos,
  TTL_FOTO_MS,
  MAX_SIMULTANEAS,
  MAX_IDS,
  MAX_ENTRADAS_CACHE,
  TAMANHO_MAX_ID,
} = require('../../lib/fotos-grupos');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// `buscar` falso: conta chamadas por id, devolve a URL configurada e pode falhar de propósito.
function criarCenario({ atrasoMs = 0 } = {}) {
  const chamadas = {};
  const buscarRetorna = {};
  const falha = {};
  let ativos = 0;
  let picoSimultaneo = 0;
  let relogio = 1_000_000;

  const buscar = async (id) => {
    chamadas[id] = (chamadas[id] || 0) + 1;
    ativos += 1;
    picoSimultaneo = Math.max(picoSimultaneo, ativos);
    try {
      await esperar(atrasoMs);
      if (falha[id]) throw new Error(`falha em ${id}`);
      return id in buscarRetorna ? buscarRetorna[id] : `https://foto/${id}`;
    } finally {
      ativos -= 1;
    }
  };

  const cache = criarCacheFotos({ buscar, agora: () => relogio });
  return {
    cache,
    chamadas,
    buscarRetorna,
    falha,
    pico: () => picoSimultaneo,
    avancar: (ms) => { relogio += ms; },
  };
}

test('constantes do cache de fotos', () => {
  assert.equal(TTL_FOTO_MS, 3_600_000);
  assert.equal(MAX_SIMULTANEAS, 3);
  assert.equal(MAX_IDS, 50);
});

test('acerto no cache não chama buscar de novo', async () => {
  const { cache, chamadas } = criarCenario();
  assert.deepEqual(await cache.obter(['a']), { a: 'https://foto/a' });
  assert.deepEqual(await cache.obter(['a']), { a: 'https://foto/a' });
  assert.equal(chamadas.a, 1);
});

test('null também fica guardado no cache', async () => {
  const { cache, chamadas, buscarRetorna } = criarCenario();
  buscarRetorna.b = null;
  assert.deepEqual(await cache.obter(['b']), { b: null });
  assert.deepEqual(await cache.obter(['b']), { b: null });
  assert.equal(chamadas.b, 1);
});

test('entrada expira depois de 1h', async () => {
  const { cache, chamadas, avancar } = criarCenario();
  await cache.obter(['a']);
  avancar(3_600_000 - 1);
  await cache.obter(['a']);
  assert.equal(chamadas.a, 1);
  avancar(1);
  await cache.obter(['a']);
  assert.equal(chamadas.a, 2);
});

test('no máximo 3 consultas em andamento ao mesmo tempo', async () => {
  const { cache, chamadas, pico } = criarCenario({ atrasoMs: 5 });
  const ids = Array.from({ length: 10 }, (_, i) => `g${i}`);
  const resposta = await cache.obter(ids);
  assert.equal(pico(), 3);
  assert.equal(Object.keys(resposta).length, 10);
  for (const id of ids) {
    assert.equal(chamadas[id], 1);
    assert.equal(resposta[id], `https://foto/${id}`);
  }
});

test('limite de concorrência vale entre chamadas diferentes de obter', async () => {
  const { cache, pico } = criarCenario({ atrasoMs: 5 });
  await Promise.all([cache.obter(['a', 'b']), cache.obter(['c', 'd']), cache.obter(['e', 'f'])]);
  assert.equal(pico(), 3);
});

test('mesmo id em andamento reaproveita a mesma consulta', async () => {
  const { cache, chamadas } = criarCenario({ atrasoMs: 5 });
  const [r1, r2] = await Promise.all([cache.obter(['c']), cache.obter(['c'])]);
  assert.equal(chamadas.c, 1);
  assert.deepEqual(r1, { c: 'https://foto/c' });
  assert.deepEqual(r2, { c: 'https://foto/c' });
});

test('falha na consulta fica fora da resposta, não é guardada e a próxima chamada consulta de novo', async () => {
  const { cache, chamadas, falha } = criarCenario();
  falha.d = true;
  assert.deepEqual(await cache.obter(['d']), {});
  assert.deepEqual(await cache.obter(['d']), {});
  assert.equal(chamadas.d, 2);
  falha.d = false;
  assert.deepEqual(await cache.obter(['d']), { d: 'https://foto/d' });
  assert.equal(chamadas.d, 3);
});

test('na mesma chamada, o que falhou sai e o que deu certo (inclusive null) fica', async () => {
  const { cache, falha, buscarRetorna } = criarCenario();
  falha.a = true;
  buscarRetorna.b = null;
  assert.deepEqual(await cache.obter(['a', 'b', 'c']), { b: null, c: 'https://foto/c' });
});

test('buscar que lança de forma síncrona sai da resposta sem travar a fila', async () => {
  let chamadas = 0;
  const cache = criarCacheFotos({
    buscar: (id) => {
      chamadas += 1;
      if (id === 'x') throw new Error('síncrono');
      return Promise.resolve(`u-${id}`);
    },
    maxSimultaneas: 1,
  });
  assert.deepEqual(await cache.obter(['x', 'y']), { y: 'u-y' });
  assert.equal(chamadas, 2);
});

test('limpar descarta o cache', async () => {
  const { cache, chamadas } = criarCenario();
  await cache.obter(['a']);
  cache.limpar();
  await cache.obter(['a']);
  assert.equal(chamadas.a, 2);
});

test('consulta em andamento durante limpar não grava no cache novo', async () => {
  const { cache, chamadas } = criarCenario({ atrasoMs: 5 });
  const pendente = cache.obter(['a']);
  cache.limpar();
  await pendente;
  await cache.obter(['a']);
  assert.equal(chamadas.a, 2);
});

test('obter sem ids responde objeto vazio', async () => {
  const { cache } = criarCenario();
  assert.deepEqual(await cache.obter([]), {});
});

const idGrupo = (n) => `${n}@g.us`;

test('cache tem teto de entradas e remove as mais antigas', async () => {
  const chamadas = {};
  const cache = criarCacheFotos({
    buscar: async (id) => { chamadas[id] = (chamadas[id] || 0) + 1; return `u-${id}`; },
    maxEntradas: 3,
  });
  await cache.obter(['a', 'b', 'c', 'd']);
  await cache.obter(['b', 'c', 'd']);
  assert.deepEqual([chamadas.b, chamadas.c, chamadas.d], [1, 1, 1]);
  await cache.obter(['a']);
  assert.equal(chamadas.a, 2);
});

test('teto padrão do cache é 2000 entradas', () => {
  assert.equal(MAX_ENTRADAS_CACHE, 2000);
});

test('lerIdsFotos separa, apara, descarta vazios e repetidos', () => {
  assert.deepEqual(lerIdsFotos(' 1@g.us, 2-3@g.us,,1@g.us '), { ids: ['1@g.us', '2-3@g.us'] });
  assert.deepEqual(lerIdsFotos(''), { ids: [] });
  assert.deepEqual(lerIdsFotos(null), { ids: [] });
});

test('lerIdsFotos descarta o que não é id de grupo', () => {
  assert.deepEqual(lerIdsFotos('x@c.us,<script>,123@g.us,5511999999999@c.us,@g.us,1-@g.us'), { ids: ['123@g.us'] });
});

test('lerIdsFotos descarta id grande demais', () => {
  const grande = `${'1'.repeat(TAMANHO_MAX_ID)}@g.us`;
  const limite = `${'1'.repeat(TAMANHO_MAX_ID - '@g.us'.length)}@g.us`;
  assert.deepEqual(lerIdsFotos(`${grande},${limite}`), { ids: [limite] });
});

test('lerIdsFotos dá erro quando há ids e nenhum é de grupo', () => {
  assert.deepEqual(lerIdsFotos('x@c.us,abc'), { erro: 'Nenhum id de grupo válido.' });
});

test('lerIdsFotos aceita até 50 ids e recusa 51', () => {
  const cinquenta = Array.from({ length: 50 }, (_, i) => idGrupo(i)).join(',');
  const cinquentaEUm = Array.from({ length: 51 }, (_, i) => idGrupo(i)).join(',');
  assert.equal(lerIdsFotos(cinquenta).ids.length, 50);
  assert.deepEqual(lerIdsFotos(cinquentaEUm), { erro: 'Máximo de 50 ids por chamada.' });
});

test('lerIdsFotos conta ids distintos para o limite', () => {
  const repetidos = Array.from({ length: 60 }, () => '1@g.us').join(',');
  assert.deepEqual(lerIdsFotos(repetidos), { ids: ['1@g.us'] });
});
