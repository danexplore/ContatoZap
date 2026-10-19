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

/**
 * Extrai apenas os dígitos de um valor (telefone, id etc.).
 * Cópia local para evitar dependência do módulo ESM do front.
 */
function apenasDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

/**
 * Busca todos os grupos já extraídos que contêm um determinado contato,
 * ignorando o TTL de 5 minutos (os dados valem como retrato da extração).
 * @param {Map} cache - participantsCache (id:suffix -> { data, timestamp })
 * @param {{ phone?: string, id?: string, exclude?: string }} params
 * @returns {Array<{ id: string, name: string }>} lista sem repetidos, sem exclude, ordenada por nome pt-BR
 */
function gruposDoContato(cache, { phone, id, exclude } = {}) {
  const digitosAlvo = apenasDigitos(phone);
  const idAlvo = id ? String(id) : '';
  if (!digitosAlvo && !idAlvo) return [];

  const vistos = new Set();
  const resultado = [];

  for (const [chave, entry] of cache) {
    // Ignora entradas duplicadas (basic e with_photos do mesmo grupo)
    const idGrupo = entry.data && entry.data.id;
    if (!idGrupo || vistos.has(idGrupo)) continue;
    if (exclude && idGrupo === exclude) continue;

    const participantes = Array.isArray(entry.data.participants) ? entry.data.participants : [];
    let encontrou = false;

    if (digitosAlvo) {
      for (const p of participantes) {
        if (apenasDigitos(p.phone) === digitosAlvo) {
          encontrou = true;
          break;
        }
      }
    }

    if (!encontrou && idAlvo) {
      for (const p of participantes) {
        if (p.id === idAlvo) {
          encontrou = true;
          break;
        }
      }
    }

    if (encontrou) {
      vistos.add(idGrupo);
      resultado.push({ id: idGrupo, name: entry.data.name ?? '' });
    }
  }

  resultado.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return resultado;
}

module.exports = { TTL_PARTICIPANTES_MS, lerCacheParticipantes, gruposDoContato };