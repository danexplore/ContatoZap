'use strict';

const TTL_PARTICIPANTES_MS = 300_000; // 5 minutos

/**
 * Lê uma entrada do cache de participantes sem mutar o objeto armazenado.
 * @param {Map} cache - participantsCache (id:suffix -> { data, timestamp })
 * @param {string} id - ID do grupo
 * @param {boolean} comFotos - se true, exige entrada with_photos; se false, aceita basic ou with_photos
 * @param {number} agora - timestamp atual (Date.now())
 * @returns {(object & { extractedAt: number }) | null} cópia rasa de data com extractedAt, ou null se vencido/ausente
 */
function lerCacheParticipantes(cache, id, comFotos, agora) {
  const chaveExata = `${id}:${comFotos ? 'with_photos' : 'basic'}`;
  let entry = cache.get(chaveExata);

  // Sem fotos aceita a entrada with_photos como fallback
  if (!entry && !comFotos) {
    entry = cache.get(`${id}:with_photos`);
  }

  if (!entry) return null;
  if (agora - entry.timestamp >= TTL_PARTICIPANTES_MS) return null;

  // Cópia rasa + clone do array participants para não mutar o cache quando o caller modifica
  const copia = { ...entry.data, extractedAt: entry.timestamp };
  if (Array.isArray(copia.participants)) copia.participants = [...copia.participants];
  return copia;
}

module.exports = { TTL_PARTICIPANTES_MS, lerCacheParticipantes };