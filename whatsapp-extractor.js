/**
 * Motor de extração de grupos e participantes do WhatsApp Web.
 * Compatível com versões recentes do WhatsApp Web, lidando com:
 * 1. Minificação de propriedades de WID (como _serialized)
 * 2. Ausência de window.Store (utiliza window.require('WAWebCollections'))
 * 3. Migração para IDs de privacidade (LID)
 * 4. Evita o erro "Evaluation failed: r" ao não usar o Promise.all massivo de getChats()
 */

const fs = require('fs');
const path = require('path');
const log = require('./logger');

function sanitizeFilename(name) {
  return (
    String(name || 'grupo')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'grupo'
  );
}

/**
 * Aplica correções na página do WhatsApp Web para garantir que classes internas e WIDs funcionem.
 */
async function ensureInjectedPatches(client) {
  if (!client || !client.pupPage || client._patchesInjected) return;
  try {
    await client.pupPage.evaluate(() => {
      const getModule = (name) => {
        try {
          return window.require ? window.require(name) : null;
        } catch (_) {
          return null;
        }
      };

      const collections = getModule('WAWebCollections');
      if (collections && !window.Store) {
        window.Store = collections;
      }

      // Garante que o protótipo de Wid tenha o getter _serialized caso a Meta tenha minificado
      const widFactory = getModule('WAWebWidFactory');
      if (widFactory && widFactory.createWid) {
        try {
          const sample = widFactory.createWid('0@c.us');
          const proto = sample ? Object.getPrototypeOf(sample) : null;
          if (proto && !proto._serialized) {
            Object.defineProperty(proto, '_serialized', {
              configurable: true,
              enumerable: false,
              get() {
                if (this.user && this.server) return `${this.user}@${this.server}`;
                for (const v of Object.values(this)) {
                  if (typeof v === 'string' && /^[^@\s]+@[a-z0-9._]+$/.test(v)) return v;
                }
                return '';
              },
            });
          }
        } catch (_) {}
      }
    });
    client._patchesInjected = true;
  } catch (_) {}
}

/**
 * Extrai a representação string de um WID / JID
 */
function resolveWid(wid) {
  if (!wid) return '';
  if (typeof wid === 'string') return wid;
  if (typeof wid._serialized === 'string') return wid._serialized;
  if (wid.user && wid.server) return `${wid.user}@${wid.server}`;
  for (const v of Object.values(wid)) {
    if (typeof v === 'string' && /^[^@\s]+@[a-z0-9._]+$/.test(v)) return v;
  }
  return '';
}

/**
 * Lista todos os grupos diretamente do cache do WhatsApp Web
 */
async function listGroups(client) {
  if (!client || !client.pupPage) {
    throw new Error('Cliente WhatsApp ainda não está pronto.');
  }

  log.info('EXTRACT', 'Escaneando conversas para listar grupos...');
  await ensureInjectedPatches(client);

  const groups = await client.pupPage.evaluate(async () => {
    const getModule = (name) => {
      try {
        return window.require ? window.require(name) : null;
      } catch (_) {
        return null;
      }
    };

    const ser = (w) => {
      if (!w) return '';
      if (typeof w === 'string') return w;
      if (typeof w._serialized === 'string') return w._serialized;
      if (w.user && w.server) return `${w.user}@${w.server}`;
      for (const v of Object.values(w)) {
        if (typeof v === 'string' && /^[^@\s]+@[a-z0-9._]+$/.test(v)) return v;
      }
      return '';
    };

    const collections = getModule('WAWebCollections') || window.Store;
    const chatCollection = collections && collections.Chat ? collections.Chat : null;

    if (!chatCollection) {
      throw new Error('Coleção de conversas do WhatsApp ainda está carregando.');
    }

    const groupMetadataCollection =
      collections.GroupMetadata || collections.WAWebGroupMetadataCollection;
    const widFactory = getModule('WAWebWidFactory');

    const allChats = chatCollection.getModelsArray
      ? chatCollection.getModelsArray()
      : Array.from(chatCollection.models || chatCollection._models || []);

    const groupsList = [];

    const getCount = (parts) => {
      if (!parts) return 0;
      if (typeof parts.length === 'number') return parts.length;
      if (parts.getModelsArray) return parts.getModelsArray().length;
      if (parts._models) return parts._models.length;
      if (parts.models) return parts.models.length;
      return 0;
    };

    for (const c of allChats) {
      const id = ser(c.id);
      if (!id || !id.endsWith('@g.us')) continue;

      let count = 0;
      if (c.groupMetadata && c.groupMetadata.participants) {
        count = getCount(c.groupMetadata.participants);
      }

      if (count === 0 && groupMetadataCollection && widFactory) {
        try {
          const wid = widFactory.createWid(id);
          const meta = groupMetadataCollection.get(wid);
          if (meta && meta.participants) {
            count = getCount(meta.participants);
          }
        } catch (_) {}
      }

      const name =
        c.formattedTitle ||
        c.name ||
        (c.groupMetadata && (c.groupMetadata.subject || c.groupMetadata.name)) ||
        (c.contact && (c.contact.name || c.contact.pushname)) ||
        id;

      groupsList.push({
        id,
        name: String(name).trim(),
        size: count,
      });
    }

    groupsList.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return groupsList;
  });

  log.success('EXTRACT', `${groups.length} grupos encontrados no WhatsApp Web`);
  return groups;
}

/**
 * Obtém os participantes de um grupo específico, lidando com contatos e IDs de privacidade (LID)
 */
async function getGroupParticipants(client, groupId) {
  if (!client || !client.pupPage) {
    throw new Error('Cliente WhatsApp ainda não está pronto.');
  }

  const startTime = Date.now();
  log.info('EXTRACT', `Iniciando extração do grupo ID: ${groupId}`);
  await ensureInjectedPatches(client);

  const result = await client.pupPage.evaluate(async (gid) => {
    const getModule = (name) => {
      try {
        return window.require ? window.require(name) : null;
      } catch (_) {
        return null;
      }
    };

    const ser = (w) => {
      if (!w) return '';
      if (typeof w === 'string') return w;
      if (typeof w._serialized === 'string') return w._serialized;
      if (w.user && w.server) return `${w.user}@${w.server}`;
      for (const v of Object.values(w)) {
        if (typeof v === 'string' && /^[^@\s]+@[a-z0-9._]+$/.test(v)) return v;
      }
      return '';
    };

    const extractList = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (raw.getModelsArray) return raw.getModelsArray();
      if (raw._models) return Array.from(raw._models);
      if (raw.models) return Array.from(raw.models);
      return Array.from(raw);
    };

    const widFactory = getModule('WAWebWidFactory');
    const groupWid = widFactory ? widFactory.createWid(gid) : null;
    const collections = getModule('WAWebCollections') || window.Store;
    const groupMetadataCollection = collections
      ? collections.GroupMetadata || collections.WAWebGroupMetadataCollection
      : null;
    const chatCollection = collections ? collections.Chat : null;

    let chat = null;
    if (chatCollection) {
      if (chatCollection.get) {
        chat = chatCollection.get(gid) || (groupWid ? chatCollection.get(groupWid) : null);
      }
      if (!chat) {
        const allChats = chatCollection.getModelsArray
          ? chatCollection.getModelsArray()
          : Array.from(chatCollection.models || chatCollection._models || []);
        chat = allChats.find((ch) => ser(ch.id) === gid) || null;
      }
    }

    // 1. Tenta pegar metadados do cache em memória (imediato, 0ms)
    let metadata = groupMetadataCollection && groupWid ? groupMetadataCollection.get(groupWid) : null;
    let list = extractList(
      (metadata && metadata.participants) ||
      (chat && chat.groupMetadata && chat.groupMetadata.participants)
    );

    // 2. Se não estiver em memória, tenta atualizar com timeout seguro de 4s
    if (list.length === 0) {
      const withTimeout = (promise, ms = 4000) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
        ]).catch(() => null);

      if (groupMetadataCollection && groupMetadataCollection.update && groupWid) {
        await withTimeout(groupMetadataCollection.update(groupWid), 4000);
        metadata = groupMetadataCollection.get(groupWid);
        list = extractList(metadata && metadata.participants);
      }

      if (list.length === 0) {
        const groupQueryJob = getModule('WAWebGroupQueryJob');
        if (groupQueryJob && groupQueryJob.queryAndUpdateGroupMetadataById) {
          await withTimeout(groupQueryJob.queryAndUpdateGroupMetadataById({ id: gid }), 4000);
          metadata = groupMetadataCollection && groupWid ? groupMetadataCollection.get(groupWid) : null;
          list = extractList(
            (metadata && metadata.participants) ||
            (chat && chat.groupMetadata && chat.groupMetadata.participants)
          );
        }
      }

      if (list.length === 0 && chatCollection && chatCollection.find && groupWid) {
        chat = await withTimeout(chatCollection.find(groupWid), 4000);
        list = extractList(chat && chat.groupMetadata && chat.groupMetadata.participants);
      }
    }

    const groupName =
      (chat && (chat.formattedTitle || chat.name)) ||
      (metadata && (metadata.subject || metadata.name)) ||
      gid;

    if (list.length === 0) {
      throw new Error(`Nenhum participante encontrado no grupo "${groupName}".`);
    }

    const contactCollection = collections ? collections.Contact : null;
    const contactGetters = getModule('WAWebContactGetters');
    const apiContact = getModule('WAWebApiContact');
    const lidMigration = getModule('WAWebLidMigrationUtils');

    const participants = [];

    // Loop 100% síncrono em memória (zero chamadas assíncronas / rede no loop)
    for (const p of list) {
      const wid = p.id || p;
      const serializedId = ser(wid);
      const isServerLid = serializedId.endsWith('@lid') || (wid && wid.server === 'lid');
      const isAdmin = Boolean(p.isAdmin || p.isSuperAdmin);

      // Busca contato APENAS no cache local em memória (síncrono, 0ms)
      // NUNCA chamar contactCollection.find() que dispara requisições remotas em loop
      let contact = null;
      if (contactCollection && contactCollection.get) {
        contact = contactCollection.get(wid) || contactCollection.get(serializedId);
      }

      // 1. Telefone e resolução rápida de LID (100% cache em memória)
      let phone = '';
      let hidden = false;

      if (!isServerLid && serializedId.includes('@')) {
        phone = serializedId.split('@')[0];
      } else if (isServerLid) {
        hidden = true;

        // Tenta WAWebLidMigrationUtils.toPn (mapeamento oficial em memória da Meta)
        if (lidMigration && lidMigration.toPn) {
          try {
            const pnWid = lidMigration.toPn(wid);
            if (pnWid) {
              const pnStr = ser(pnWid);
              const extracted = pnStr.includes('@') ? pnStr.split('@')[0] : pnStr;
              if (extracted && !extracted.endsWith('@lid') && extracted !== serializedId.split('@')[0]) {
                phone = extracted;
                hidden = false;
              }
            }
          } catch (_) {}
        }

        // Tenta recuperar número pelo objeto de contato salvo
        if ((!phone || hidden) && contact && contact.phoneNumber) {
          const pn = ser(contact.phoneNumber);
          const extracted = pn.includes('@') ? pn.split('@')[0] : pn;
          if (extracted && extracted !== serializedId.split('@')[0]) {
            phone = extracted;
            hidden = false;
          }
        }

        // Tenta WAWebApiContact.getPhoneNumber (cache local em memória)
        if ((!phone || hidden) && apiContact && apiContact.getPhoneNumber) {
          try {
            const pn = apiContact.getPhoneNumber(wid);
            if (pn) {
              const resPhone = ser(pn);
              const extracted = resPhone.includes('@') ? resPhone.split('@')[0] : resPhone;
              if (extracted && !extracted.endsWith('@lid')) {
                phone = extracted;
                hidden = false;
              }
            }
          } catch (_) {}
        }

        // Fallback para identificador LID caso o WhatsApp oculte o número real
        if (!phone) {
          phone = serializedId.split('@')[0];
        }
      } else {
        phone = serializedId.split('@')[0];
      }

      const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';

      // 2. Busca objeto de contato tanto por LID quanto por telefone @c.us
      let phoneContact = null;
      if (cleanPhone && contactCollection) {
        try {
          phoneContact = contactCollection.get(`${cleanPhone}@c.us`);
          if (!phoneContact && widFactory) {
            const cWid = widFactory.createWid(`${cleanPhone}@c.us`);
            phoneContact = contactCollection.get(cWid);
          }
        } catch (_) {}
      }

      // 3. Extração do Pushname (nome que a pessoa colocou no perfil do WhatsApp)
      const getPush = (ct) => {
        if (!ct) return '';
        let res = '';
        if (contactGetters && contactGetters.getPushname) {
          try { res = contactGetters.getPushname(ct); } catch (_) {}
        }
        return (
          res ||
          ct.pushname ||
          ct.notifyName ||
          ct.__x_pushname ||
          ct.__x_notifyName ||
          ct.verifiedName ||
          ''
        );
      };

      // 4. Extração do Nome Salvo na Agenda (pelo próprio usuário)
      const getSaved = (ct) => {
        if (!ct) return '';
        let res = '';
        if (contactGetters && contactGetters.getName) {
          try { res = contactGetters.getName(ct); } catch (_) {}
        }
        return res || ct.name || '';
      };

      let pushname = getPush(contact) || getPush(phoneContact);
      let savedName = getSaved(contact) || getSaved(phoneContact);

      // Checa também se o objeto do participante tem os dados
      if (!pushname && p) {
        pushname = p.pushname || p.notifyName || (p.contact && (p.contact.pushname || p.contact.notifyName)) || '';
      }
      if (!savedName && p) {
        savedName = p.name || (p.contact && p.contact.name) || '';
      }

      pushname = String(pushname || '').trim();
      savedName = String(savedName || '').trim();

      // Se o nome salvo for apenas o número formatado ou idêntico ao pushname, limpa
      if (savedName && (savedName === pushname || savedName.replace(/\D/g, '') === cleanPhone)) {
        savedName = '';
      }

      // Nome de exibição principal: prioriza o que a pessoa definiu no WhatsApp, depois o da agenda
      const displayName = pushname || savedName || '';

      participants.push({
        name: displayName,
        pushname: pushname,
        savedName: savedName,
        phone: cleanPhone,
        admin: isAdmin,
        hidden: hidden,
      });
    }

    return {
      id: gid,
      name: String(groupName).trim(),
      participants,
    };
  }, groupId);

  const durationMs = Date.now() - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);
  result.durationMs = durationMs;
  result.durationSec = durationSec;

  const hiddenCount = result.participants.filter((p) => p.hidden).length;
  const normalCount = result.participants.length - hiddenCount;
  log.success(
    'EXTRACT',
    `Grupo "${result.name}": ${result.participants.length} participantes extraídos em ${durationSec}s (${normalCount} normais, ${hiddenCount} com LID/privacidade)`
  );

  return result;
}

/**
 * Gera string CSV com BOM UTF-8 e formato compatível com Excel no Brasil
 */
function generateCsv(participants) {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const header = ['nome_whatsapp', 'nome_agenda', 'telefone', 'admin', 'status_numero'].map(esc).join(';');
  const lines = [header];

  for (const p of participants) {
    const telefone = p.phone ? '+' + p.phone : '';
    const admin = p.admin ? 'sim' : 'não';
    const status = p.hidden ? 'ID de privacidade (LID)' : 'Normal';
    const nomeWhats = p.pushname || p.name || '';
    const nomeAgenda = p.savedName || '';
    lines.push([esc(nomeWhats), esc(nomeAgenda), esc(telefone), esc(admin), esc(status)].join(';'));
  }

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Salva os participantes de um grupo em arquivo CSV no disco
 */
function saveGroupCsv(groupName, participants, outputDir = process.cwd()) {
  const filename = `contatos_${sanitizeFilename(groupName)}.csv`;
  const fullPath = path.join(outputDir, filename);
  const csvContent = generateCsv(participants);
  fs.writeFileSync(fullPath, csvContent, 'utf8');
  const kb = (csvContent.length / 1024).toFixed(1);
  log.success('CSV', `Arquivo salvo: "${filename}" (${kb} KB, ${participants.length} contatos)`);
  return { filename, fullPath };
}

module.exports = {
  listGroups,
  getGroupParticipants,
  generateCsv,
  saveGroupCsv,
  sanitizeFilename,
  resolveWid,
};
