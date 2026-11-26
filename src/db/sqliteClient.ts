import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import {
  clearDatabaseBytes,
  loadDatabaseBytes,
  requestPersistentStorage,
  saveDatabaseBytes,
} from './storage';

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'return_visit',
  address TEXT NOT NULL DEFAULT '',
  apartment TEXT NOT NULL DEFAULT '',
  gps_lat REAL,
  gps_lng REAL,
  territory TEXT NOT NULL DEFAULT '',
  best_time TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  publication TEXT NOT NULL DEFAULT '',
  current_lesson TEXT NOT NULL DEFAULT '',
  lesson_progress INTEGER NOT NULL DEFAULT 0,
  lesson_total INTEGER NOT NULL DEFAULT 60,
  visited_date TEXT,
  next_visit_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'spoke',
  scriptures TEXT NOT NULL DEFAULT '',
  publication_placed TEXT NOT NULL DEFAULT '',
  next_question TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visits_contact_date ON visits(contact_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_next_visit ON contacts(next_visit_date);
`;

function applySchemaAndMigrations(db: Database): void {
  db.run(SCHEMA_SQL);
  const info = db.exec('PRAGMA table_info(contacts);');
  const columns = new Set<string>(
    (info[0]?.values ?? []).map((row) => String(row[1] ?? ''))
  );
  if (!columns.has('visited_date')) {
    db.run('ALTER TABLE contacts ADD COLUMN visited_date TEXT;');
  }
  if (!columns.has('gps_lat')) {
    db.run('ALTER TABLE contacts ADD COLUMN gps_lat REAL;');
  }
  if (!columns.has('gps_lng')) {
    db.run('ALTER TABLE contacts ADD COLUMN gps_lng REAL;');
  }
}

export class SQLiteClient {
  private sql: SqlJsStatic | null = null;
  private db: Database | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private listenersBound = false;

  async init(wasmPath = '/sql-wasm.wasm'): Promise<Database> {
    if (this.db) return this.db;

    const embeddedBase64 =
      typeof window !== 'undefined'
        ? (window as unknown as { __SQL_WASM_BASE64__?: string }).__SQL_WASM_BASE64__
        : undefined;

    if (embeddedBase64) {
      const binaryStr = atob(embeddedBase64);
      const wasmBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        wasmBytes[i] = binaryStr.charCodeAt(i);
      }
      this.sql = await initSqlJs({ wasmBinary: wasmBytes.buffer });
    } else {
      this.sql = await initSqlJs({
        locateFile: () => wasmPath,
      });
    }

    const existingBytes = await loadDatabaseBytes();
    if (existingBytes && existingBytes.byteLength > 0) {
      try {
        this.db = new this.sql.Database(existingBytes);
        applySchemaAndMigrations(this.db);
      } catch (err) {
        console.warn('Stored SQLite binary could not be loaded, initializing fresh DB:', err);
        this.db = new this.sql.Database();
        applySchemaAndMigrations(this.db);
      }
    } else {
      this.db = new this.sql.Database();
      applySchemaAndMigrations(this.db);
      await this.flushNow();
    }

    await requestPersistentStorage();
    this.bindLifecycleFlush();
    return this.db;
  }

  /** Used in unit tests to inject a fresh in-memory database without IndexedDB */
  initWithDatabase(sql: SqlJsStatic, db?: Database): Database {
    this.sql = sql;
    this.db = db ?? new sql.Database();
    applySchemaAndMigrations(this.db);
    return this.db;
  }

  getDatabase(): Database {
    if (!this.db) {
      throw new Error('SQLite database has not been initialized yet.');
    }
    return this.db;
  }

  scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      void this.flushNow();
    }, 150);
  }

  async flushNow(): Promise<void> {
    if (!this.db) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const bytes = this.db.export();
    this.dirty = false;
    await saveDatabaseBytes(bytes);
  }

  exportBinary(): Uint8Array {
    return this.getDatabase().export();
  }

  async importBinary(bytes: Uint8Array): Promise<void> {
    if (!this.sql) {
      throw new Error('SQLite engine is not initialized.');
    }
    // Validate that the binary is a valid SQLite database and has/can apply our schema
    const candidate = new this.sql.Database(bytes);
    try {
      // Quick integrity check
      const check = candidate.exec('PRAGMA quick_check;');
      const status = check[0]?.values?.[0]?.[0];
      if (status !== 'ok') {
        throw new Error('SQLite integrity check failed.');
      }
      applySchemaAndMigrations(candidate);
    } catch (err) {
      candidate.close();
      throw new Error(
        err instanceof Error
          ? `Invalid SQLite database file: ${err.message}`
          : 'Invalid SQLite database file.'
      );
    }

    if (this.db) {
      this.db.close();
    }
    this.db = candidate;
    await this.flushNow();
  }

  async resetDatabase(): Promise<void> {
    if (!this.sql) {
      throw new Error('SQLite engine is not initialized.');
    }
    if (this.db) {
      this.db.close();
    }
    await clearDatabaseBytes();
    this.db = new this.sql.Database();
    applySchemaAndMigrations(this.db);
    await this.flushNow();
  }

  private bindLifecycleFlush(): void {
    if (this.listenersBound || typeof window === 'undefined') return;
    this.listenersBound = true;

    const flushIfDirty = () => {
      if (this.dirty) {
        void this.flushNow();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushIfDirty();
      }
    });
    window.addEventListener('pagehide', flushIfDirty);
  }
}

export const sqliteClient = new SQLiteClient();
export { SCHEMA_SQL };
