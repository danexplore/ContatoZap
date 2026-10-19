const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getGroupPhoto } = require('../../whatsapp-extractor');
const { criarCacheFotos } = require('../../lib/fotos-grupos');

// Cliente falso: `_patchesInjected` pula o ensureInjectedPatches; o evaluate devolve o que o cenário define.
function criarCliente({ evaluate, getProfilePicUrl }) {
  const cliente = { _patchesInjected: true, pupPage: { evaluate } };
  if (getProfilePicUrl) cliente.getProfilePicUrl = getProfilePicUrl;
  return cliente;
}

test('URL do evaluate é devolvida', async () => {
  const c = criarCliente({ evaluate: async () => ({ url: 'https://foto/a', incerto: false }) });
  assert.equal(await getGroupPhoto(c, '1@g.us'), 'https://foto/a');
});

test('sem URL, sem incerteza e sem fallback: null (grupo sem foto)', async () => {
  const c = criarCliente({ evaluate: async () => ({ url: '', incerto: false }) });
  assert.equal(await getGroupPhoto(c, '1@g.us'), null);
});

test('fallback que responde sem foto é resposta definitiva: null', async () => {
  const c = criarCliente({
    evaluate: async () => ({ url: '', incerto: true }),
    getProfilePicUrl: async () => undefined,
  });
  assert.equal(await getGroupPhoto(c, '1@g.us'), null);
});

test('fallback que acha a foto devolve a URL', async () => {
  const c = criarCliente({
    evaluate: async () => ({ url: '', incerto: true }),
    getProfilePicUrl: async () => 'https://foto/fallback',
  });
  assert.equal(await getGroupPhoto(c, '1@g.us'), 'https://foto/fallback');
});

test('evaluate que rejeita (página recarregando) lança', async () => {
  const c = criarCliente({ evaluate: async () => { throw new Error('Execution context was destroyed'); } });
  await assert.rejects(getGroupPhoto(c, '1@g.us'), /Execution context/);
});

test('passo com prazo estourado e sem fallback lança', async () => {
  const c = criarCliente({ evaluate: async () => ({ url: '', incerto: true }) });
  await assert.rejects(getGroupPhoto(c, '1@g.us'));
});

test('fallback que rejeita lança', async () => {
  const c = criarCliente({
    evaluate: async () => ({ url: '', incerto: false }),
    getProfilePicUrl: async () => { throw new Error('boom'); },
  });
  await assert.rejects(getGroupPhoto(c, '1@g.us'), /boom/);
});

test('cliente sem página lança; id vazio dá null', async () => {
  await assert.rejects(getGroupPhoto(null, '1@g.us'));
  await assert.rejects(getGroupPhoto({}, '1@g.us'));
  assert.equal(await getGroupPhoto(null, ''), null);
});

test('com o cache: falha não é guardada e a próxima chamada consulta de novo; null explícito é guardado', async () => {
  let chamadas = 0;
  let falhando = true;
  const c = criarCliente({
    evaluate: async () => {
      chamadas += 1;
      if (falhando) throw new Error('recarregando');
      return { url: '', incerto: false };
    },
  });
  const cache = criarCacheFotos({ buscar: (id) => getGroupPhoto(c, id) });
  assert.deepEqual(await cache.obter(['1@g.us']), {});
  falhando = false;
  assert.deepEqual(await cache.obter(['1@g.us']), { '1@g.us': null });
  assert.deepEqual(await cache.obter(['1@g.us']), { '1@g.us': null });
  assert.equal(chamadas, 2);
});
