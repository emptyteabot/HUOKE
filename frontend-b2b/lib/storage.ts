import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import path from 'path';

type LegacyImportOptions = {
  legacyFilePath?: string;
  legacyIdResolver?: (item: Record<string, unknown>) => string;
  syncLegacyOnChange?: boolean;
};

type StoredDocument = {
  namespace: string;
  id: string;
  payload: string;
  created_at: string;
  updated_at: string;
};

type StateFile = {
  meta: Record<string, string>;
  documents: StoredDocument[];
};

const dataDir = path.join(process.cwd(), '..', 'data');
const statePath = path.join(dataDir, 'leadpulse_state.json');

let stateInstance: StateFile | null = null;

function nowIso() {
  return new Date().toISOString();
}

function emptyState(): StateFile {
  return {
    meta: {},
    documents: [],
  };
}

function readStateFromDisk(): StateFile {
  if (!existsSync(statePath)) {
    return emptyState();
  }

  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf-8')) as Partial<StateFile>;
    return {
      meta: parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {},
      documents: Array.isArray(parsed.documents)
        ? parsed.documents.filter(
            (item): item is StoredDocument =>
              Boolean(item) &&
              typeof item.namespace === 'string' &&
              typeof item.id === 'string' &&
              typeof item.payload === 'string',
          )
        : [],
    };
  } catch {
    return emptyState();
  }
}

function getState() {
  if (stateInstance) {
    return stateInstance;
  }

  mkdirSync(dataDir, { recursive: true });
  stateInstance = readStateFromDisk();
  return stateInstance;
}

function persistState() {
  if (!stateInstance) {
    return;
  }

  mkdirSync(dataDir, { recursive: true });
  const tmpPath = `${statePath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(stateInstance, null, 2)}\n`, 'utf-8');
  renameSync(tmpPath, statePath);
}

function getMeta(key: string) {
  const state = getState();
  return state.meta[key] || '';
}

function setMeta(key: string, value: string) {
  const state = getState();
  state.meta[key] = value;
  persistState();
}

function clearNamespace(namespace: string) {
  const state = getState();
  state.documents = state.documents.filter((item) => item.namespace !== namespace);
  persistState();
}

function upsertStoredDocument(document: StoredDocument) {
  const state = getState();
  const existingIndex = state.documents.findIndex(
    (item) => item.namespace === document.namespace && item.id === document.id,
  );

  if (existingIndex >= 0) {
    state.documents[existingIndex] = {
      ...state.documents[existingIndex],
      ...document,
      created_at: state.documents[existingIndex].created_at || document.created_at,
    };
  } else {
    state.documents.push(document);
  }
}

function importLegacyCollection(namespace: string, options: LegacyImportOptions = {}) {
  const { legacyFilePath, legacyIdResolver } = options;
  if (!legacyFilePath || !existsSync(legacyFilePath)) {
    return;
  }

  try {
    const raw = readFileSync(legacyFilePath, 'utf-8');
    const upsertOne = (item: Record<string, unknown>) => {
      const id = String(item.id || legacyIdResolver?.(item) || '').trim();
      if (!id) {
        return;
      }

      const createdAt = String(item.createdAt || nowIso());
      const updatedAt = String(item.updatedAt || item.createdAt || nowIso());
      upsertStoredDocument({
        namespace,
        id,
        payload: JSON.stringify(item),
        created_at: createdAt,
        updated_at: updatedAt,
      });
    };

    const parsed = JSON.parse(raw) as Record<string, unknown> | Array<Record<string, unknown>>;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        upsertOne(item);
      }
      return;
    }

    if (parsed && typeof parsed === 'object') {
      upsertOne(parsed);
    }
  } catch {
    // Legacy files are best-effort imports. Runtime writes still continue.
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
  persistState();
}

export async function readNamespace<T>(namespace: string, options: LegacyImportOptions = {}) {
  await ensureNamespace(namespace, options);
  const state = getState();
  return state.documents
    .filter((item) => item.namespace === namespace)
    .sort((left, right) => {
      const timeDiff = left.created_at.localeCompare(right.created_at);
      return timeDiff || left.id.localeCompare(right.id);
    })
    .map((item) => JSON.parse(item.payload) as T);
}

export async function getNamespaceRecordById<T>(
  namespace: string,
  id: string,
  options: LegacyImportOptions = {},
) {
  await ensureNamespace(namespace, options);
  const state = getState();
  const row = state.documents.find((item) => item.namespace === namespace && item.id === id);
  return row ? (JSON.parse(row.payload) as T) : null;
}

export async function upsertNamespaceRecord<T extends { id: string }>(
  namespace: string,
  record: T,
  options: LegacyImportOptions = {},
) {
  await ensureNamespace(namespace, options);
  const state = getState();
  const existing = state.documents.find((item) => item.namespace === namespace && item.id === record.id);
  const createdAt = String((record as Record<string, unknown>).createdAt || existing?.created_at || nowIso());
  const updatedAt = String((record as Record<string, unknown>).updatedAt || nowIso());

  upsertStoredDocument({
    namespace,
    id: record.id,
    payload: JSON.stringify(record),
    created_at: createdAt,
    updated_at: updatedAt,
  });
  persistState();

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
