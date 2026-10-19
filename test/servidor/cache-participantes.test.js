'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lerCacheParticipantes, TTL_PARTICIPANTES_MS } = require('../../lib/cache-participantes');

describe('lerCacheParticipantes', () => {
  it('devolve cópia com extractedAt quando dentro do TTL', () => {
    const cache = new Map();
    cache.set('g1:basic', { data: { id: 'g1', name: 'G', participants: [] }, timestamp: 1000 });
    const resultado = lerCacheParticipantes(cache, 'g1', false, 1000 + 299_999);
    assert.equal(resultado.extractedAt, 1000);
    assert.equal(resultado.id, 'g1');
  });

  it('devolve null quando vencido (>= TTL)', () => {
    const cache = new Map();
    cache.set('g1:basic', { data: { id: 'g1', name: 'G', participants: [] }, timestamp: 1000 });
    assert.equal(lerCacheParticipantes(cache, 'g1', false, 1000 + TTL_PARTICIPANTES_MS), null);
  });

  it('sem fotos aceita entrada with_photos como fallback', () => {
    const cache = new Map();
    cache.set('g2:with_photos', { data: { id: 'g2', participants: [] }, timestamp: 5 });
    const resultado = lerCacheParticipantes(cache, 'g2', false, 10);
    assert.equal(resultado.extractedAt, 5);
    assert.equal(resultado.id, 'g2');
  });

  it('com fotos não aceita entrada basic', () => {
    const cache = new Map();
    cache.set('g1:basic', { data: { id: 'g1', participants: [] }, timestamp: 1000 });
    assert.equal(lerCacheParticipantes(cache, 'g1', true, 1001), null);
  });

  it('não muta o objeto do cache', () => {
    const cache = new Map();
    cache.set('g1:basic', { data: { id: 'g1', participants: [] }, timestamp: 1000 });
    const copia = lerCacheParticipantes(cache, 'g1', false, 1001);
    copia.durationSec = 'x';
    copia.participants.push({ id: 'intruso' });
    assert.equal(cache.get('g1:basic').data.durationSec, undefined);
    assert.equal(cache.get('g1:basic').data.participants.length, 0);
  });

  it('devolve null quando a chave não existe', () => {
    const cache = new Map();
    assert.equal(lerCacheParticipantes(cache, 'inexistente', false, Date.now()), null);
  });
});