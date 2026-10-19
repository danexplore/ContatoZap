'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lerCacheParticipantes, TTL_PARTICIPANTES_MS, gruposDoContato } = require('../../lib/cache-participantes');

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

describe('gruposDoContato', () => {
  function montarCache() {
    const cache = new Map();
    // g1: tem participante com telefone 5511999 e LID x@lid sem telefone
    cache.set('g1:basic', {
      data: {
        id: 'g1',
        name: 'A',
        participants: [
          { id: '5511999@c.us', name: 'P1', phone: '5511999' },
          { id: 'x@lid', name: 'LID-X' },
        ],
      },
      timestamp: 1000,
    });
    // g1:with_photos (mesmo grupo, não deve duplicar no resultado)
    cache.set('g1:with_photos', {
      data: {
        id: 'g1',
        name: 'A',
        participants: [
          { id: '5511999@c.us', name: 'P1', phone: '5511999' },
          { id: 'x@lid', name: 'LID-X' },
        ],
      },
      timestamp: 1000,
    });
    // g2: tem participante com telefone formatado +55 11 999 e LID y@lid sem telefone
    cache.set('g2:basic', {
      data: {
        id: 'g2',
        name: 'B',
        participants: [
          { id: '5511998@c.us', name: 'P2', phone: '+55 11 999' },
          { id: 'y@lid', name: 'LID-Y' },
        ],
      },
      timestamp: 2000,
    });
    // g3: entrada velha (timestamp 0), mas gruposDoContato ignora TTL
    cache.set('g3:basic', {
      data: {
        id: 'g3',
        name: 'C',
        participants: [{ id: '5511997@c.us', name: 'P3', phone: '5511999' }],
      },
      timestamp: 0,
    });
    return cache;
  }

  it('encontra por telefone ignorando TTL e sem repetir basic/with_photos', () => {
    const cache = montarCache();
    const resultado = gruposDoContato(cache, { phone: '5511999' });
    assert.deepEqual(resultado.map((g) => g.id), ['g1', 'g2', 'g3']);
  });

  it('exclui o grupo de origem via exclude', () => {
    const cache = montarCache();
    const resultado = gruposDoContato(cache, { phone: '5511999', exclude: 'g1' });
    assert.deepEqual(resultado.map((g) => g.id), ['g2', 'g3']);
  });

  it('encontra por id serializado (LID sem telefone)', () => {
    const cache = montarCache();
    const resultado = gruposDoContato(cache, { id: 'x@lid' });
    assert.deepEqual(resultado.map((g) => g.id), ['g1']);
  });

  it('telefone vazio não casa com outros sem telefone; usa id como fallback', () => {
    const cache = montarCache();
    const resultado = gruposDoContato(cache, { phone: '', id: 'x@lid' });
    assert.deepEqual(resultado.map((g) => g.id), ['g1']);
  });

  it('telefone vazio sem id devolve lista vazia', () => {
    const cache = montarCache();
    const resultado = gruposDoContato(cache, { phone: '' });
    assert.deepEqual(resultado, []);
  });

  it('cache vazio devolve lista vazia', () => {
    const resultado = gruposDoContato(new Map(), { phone: '5511999' });
    assert.deepEqual(resultado, []);
  });

  it('resultado é ordenado por nome em pt-BR', () => {
    const cache = montarCache();
    const resultado = gruposDoContato(cache, { phone: '5511999' });
    assert.deepEqual(resultado.map((g) => g.name), ['A', 'B', 'C']);
  });
});