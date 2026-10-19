const { test } = require('node:test');
const assert = require('node:assert/strict');
const { urlLocal } = require('../../lib/url-local');

test('urlLocal trata barras iniciais repetidas como caminho local', () => {
  for (const alvo of ['//', '///', '//evil.com/x', '//[', '//evil.com:99999/x']) {
    const url = urlLocal(alvo);
    assert.ok(url, alvo);
    assert.equal(url.hostname, 'localhost', alvo);
    assert.notEqual(url.pathname, '/', alvo);
  }
});

test('urlLocal preserva caminho e query de requisições normais', () => {
  const url = urlLocal('/api/group/123?photos=1');
  assert.equal(url.pathname, '/api/group/123');
  assert.equal(url.searchParams.get('photos'), '1');
  assert.equal(urlLocal('/').pathname, '/');
});

test('urlLocal devolve null para alvo que não é caminho', () => {
  for (const alvo of ['*', 'http://evil.com/x', '', undefined]) assert.equal(urlLocal(alvo), null, String(alvo));
});
