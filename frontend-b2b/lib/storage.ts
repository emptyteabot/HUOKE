import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

type LegacyImportOptions = {
  legacyFilePath?: string;
  legacyIdResolver?: (item: Record<string, unknown>) => string;
  syncLegacyOnChange?: boolean;
};

const dataDir = path.join(process.cwd(), '..', 'data');
const dbPath = path.join(dataDir, 'leadpulse_state.sqlite');

let dbInstance: DatabaseSync | null = null;

function nowIso() {
  return new Date().toISOString();
}

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  mkdirSync(dataDir, { recursive: true });
  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS documents (
      namespace TEXT NOT NULL,
      id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (namespace, id)
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return dbInstance;
}

function getMeta(key: string) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || '';
}

function setMeta(key: string, value: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function clearNamespace(namespace: string) {
  const db = getDb();
  db.prepare('DELETE FROM documents WHERE namespace = ?').run(namespace);
}

function importLegacyCollection(namespace: string, options: LegacyImportOptions = {}) {
  const { legacyFilePath, legacyIdResolver } = options;
  if (!legacyFilePath || !existsSync(legacyFilePath)) {
    return;
  }

  try {
    const raw = readFileSync(legacyFilePath, 'utf-8');
    const db = getDb();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO documents (namespace, id, payload, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const upsertOne = (item: Record<string, unknown>) => {
      const id = String(item.id || legacyIdResolver?.(item) || '').trim();
      if (!id) {
        return;
      }
      const createdAt = String(item.createdAt || nowIso());
      const updatedAt = String(item.updatedAt || item.createdAt || nowIso());
      insert.run(namespace, id, JSON.stringify(item), createdAt, updatedAt);
    };

    const parsed = JSON.parse(raw) as Record<string, unknown> | Array<Record<string, unknown>>;
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return;
      }
      for (const item of parsed) {
        upsertOne(item);
      }
      return;
    }

    if (parsed && typeof parsed === 'object') {
      upsertOne(parsed);
    }
  } catch {
    // If legacy import fails, keep the namespace empty and let callers continue.
  }
}

export async function ensureNamespace(namespace: string, options: LegacyImportOptions = {}) {
  const metaKey = `import:${namespace}`;
  const importedAt = getMeta(metaKey);
  const legacyMtimeKey = `legacy-mtime:${namespace}`;
  const lastImportedLegacyMtime = getMeta(legacyMtimeKey);
  const legacyMtime =
    options.legacyFilePath && existsSync(options.legacyFilePath)
      ? statSync(options.legacyFilePath).mtimeMs.toString()
      : '';
  const shouldSyncLegacy =
    Boolean(options.syncLegacyOnChange) &&
    Boolean(legacyMtime) &&
    legacyMtime !== lastImportedLegacyMtime;

  if (importedAt && !shouldSyncLegacy) {
    return;
  }

  if (shouldSyncLegacy) {
    clearNamespace(namespace);
  }
  importLegacyCollection(namespace, options);
  setMeta(metaKey, nowIso());
  if (legacyMtime) {
    setMeta(legacyMtimeKey, legacyMtime);
  }
}

export async function readNamespace<T>(namespace: string, options: LegacyImportOptions = {}) {
  await ensureNamespace(namespace, options);
  const db = getDb();
  const rows = db
    .prepare('SELECT payload FROM documents WHERE namespace = ? ORDER BY created_at ASC, id ASC')
    .all(namespace) as Array<{ payload: string }>;
  return rows.map((row) => JSON.parse(row.payload) as T);
}

export async function getNamespaceRecordById<T>(
  namespace: string,
  id: string,
  options: LegacyImportOptions = {},
) {
  await ensureNamespace(namespace, options);
  const db = getDb();
  const row = db
    .prepare('SELECT payload FROM documents WHERE namespace = ? AND id = ?')
    .get(namespace, id) as { payload: string } | undefined;
  return row ? (JSON.parse(row.payload) as T) : null;
}

export async function upsertNamespaceRecord<T extends { id: string }>(
  namespace: string,
  record: T,
  options: LegacyImportOptions = {},
) {
  await ensureNamespace(namespace, options);
  const db = getDb();
  const existing = db
    .prepare('SELECT created_at FROM documents WHERE namespace = ? AND id = ?')
    .get(namespace, record.id) as { created_at: string } | undefined;

  const createdAt = String((record as Record<string, unknown>).createdAt || existing?.created_at || nowIso());
  const updatedAt = String((record as Record<string, unknown>).updatedAt || nowIso());

  db.prepare(`
    INSERT INTO documents (namespace, id, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(namespace, id) DO UPDATE SET
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `).run(namespace, record.id, JSON.stringify(record), createdAt, updatedAt);

  return record;
}

export async function upsertNamespaceRecords<T extends { id: string }>(
  namespace: string,
  records: T[],
  options: LegacyImportOptions = {},
) {
  await ensureNamespace(namespace, options);
  for (const record of records) {
    await upsertNamespaceRecord(namespace, record, options);
  }
  return records;
}
