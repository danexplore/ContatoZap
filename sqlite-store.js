// SQLite-backed session store for whatsapp-web.js RemoteAuth.
// Uses Node's built-in "node:sqlite" (Node 22.13+ / 24), so there is nothing extra to install.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const log = require('./logger');

class SqliteStore {
  constructor({ dbPath = 'session.db' } = {}) {
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        name       TEXT PRIMARY KEY,
        data       BLOB NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    log.info('STORE', `Banco SQLite de sessão pronto (${path.basename(dbPath)})`);
  }

  // --- interface expected by RemoteAuth ---

  async sessionExists({ session }) {
    try {
      const row = this.db.prepare('SELECT 1 AS found FROM sessions WHERE name = ?').get(session);
      const exists = Boolean(row);
      log.info('STORE', `Verificando sessão "${session}" no SQLite: ${exists ? 'Encontrada' : 'Não encontrada'}`);
      return exists;
    } catch (err) {
      log.error('STORE', `Erro ao verificar sessão "${session}": ${err.message}`);
      return false;
    }
  }

  // RemoteAuth zips the session to ".wwebjs_auth/<session>.zip" or "./<session>.zip", then calls save()
  async save({ session }) {
    const candidatePaths = [
      path.join(__dirname, '.wwebjs_auth', `${session}.zip`),
      path.join(process.cwd(), '.wwebjs_auth', `${session}.zip`),
      path.join(__dirname, `${session}.zip`),
      path.join(process.cwd(), `${session}.zip`),
    ];

    const zipPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!zipPath) {
      log.warn('STORE', `Arquivo zip da sessão "${session}" não foi encontrado para salvar.`);
      return;
    }

    try {
      const data = fs.readFileSync(zipPath);
      this.db
        .prepare(
          `INSERT INTO sessions (name, data, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
        )
        .run(session, data, new Date().toISOString());
      const mb = (data.length / (1024 * 1024)).toFixed(2);
      log.success('STORE', `Sessão "${session}" salva com sucesso no SQLite (${mb} MB)`);
    } catch (err) {
      log.error('STORE', `Erro ao gravar sessão "${session}" no banco: ${err.message}`);
    }
  }

  // RemoteAuth asks for the zip to be written to "path" and unzips it itself
  async extract({ session, path: outPath }) {
    const row = this.db.prepare('SELECT data FROM sessions WHERE name = ?').get(session);
    if (!row) {
      log.error('STORE', `Sessão "${session}" não encontrada no SQLite para extração`);
      throw new Error(`Session "${session}" not found in SQLite`);
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, row.data);
    const mb = (row.data.length / (1024 * 1024)).toFixed(2);
    log.success('STORE', `Sessão "${session}" restaurada do SQLite (${mb} MB) para ${path.basename(outPath)}`);
  }

  async delete({ session }) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE name = ?').run(session);
      log.info('STORE', `Sessão "${session}" removida do SQLite`);
    } catch (err) {
      log.error('STORE', `Erro ao remover sessão "${session}": ${err.message}`);
    }
  }

  close() {
    try {
      this.db.close();
      log.info('STORE', 'Conexão com SQLite fechada');
    } catch (_) {
      /* already closed */
    }
  }
}

module.exports = { SqliteStore };
