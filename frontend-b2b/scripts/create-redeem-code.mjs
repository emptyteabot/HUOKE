import { randomUUID } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';

const repoRoot = path.resolve(process.cwd());
const dataDir = path.join(repoRoot, '..', 'data');
const dbPath = path.join(dataDir, 'leadpulse_state.sqlite');
const namespace = 'commerce:redeem_codes';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function nowIso() {
  return new Date().toISOString();
}

function generateCode(length = 12) {
  let output = '';
  while (output.length < length) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)] || 'X';
  }
  return output;
}

function newPrintableCode() {
  return `${generateCode(4)}-${generateCode(4)}-${generateCode(4)}`;
}

function parseArgs() {
  const args = {
    plan: 'pro',
    count: 1,
    note: '',
    email: '',
    name: '',
    by: 'Founder',
  };

  for (const raw of process.argv.slice(2)) {
    const [key, value = ''] = raw.split('=');
    switch (key) {
      case '--plan':
        args.plan = value || 'pro';
        break;
      case '--count':
        args.count = Math.max(1, Number(value || 1));
        break;
      case '--note':
        args.note = value;
        break;
      case '--email':
        args.email = value.toLowerCase();
        break;
      case '--name':
        args.name = value;
        break;
      case '--by':
        args.by = value || 'Founder';
        break;
      default:
        break;
    }
  }

  return args;
}

function ensureDb(db) {
  db.exec(`
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
}

function existingCodes(db) {
  const rows = db.prepare('SELECT payload FROM documents WHERE namespace = ?').all(namespace);
  return new Set(
    rows
      .map((row) => {
        try {
          const payload = JSON.parse(String(row.payload || '{}'));
          return String(payload.code || '').trim().toUpperCase();
        } catch {
          return '';
        }
      })
      .filter(Boolean),
  );
}

const args = parseArgs();
const db = new DatabaseSync(dbPath);
ensureDb(db);
const insert = db.prepare(`
  INSERT INTO documents (namespace, id, payload, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);
const seen = existingCodes(db);
const created = [];

for (let index = 0; index < args.count; index += 1) {
  let code = newPrintableCode();
  while (seen.has(code)) {
    code = newPrintableCode();
  }
  seen.add(code);

  const now = nowIso();
  const payload = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    code,
    planId: args.plan,
    planName: args.plan === 'max' ? 'Max' : 'Pro',
    status: 'issued',
    maxUses: 1,
    usedCount: 0,
    expiresAt: '',
    issuedToName: args.name,
    issuedToEmail: args.email,
    issuedBy: args.by,
    note: args.note,
    lastRedeemedAt: '',
    lastRedeemedByEmail: '',
    lastRedeemedByCompany: '',
    lastRedeemedProductUrl: '',
    fulfillmentPackageId: '',
    fulfillmentSourceId: `redeem_${randomUUID().slice(0, 8)}`,
  };

  insert.run(namespace, payload.id, JSON.stringify(payload), now, now);
  created.push(payload);
}

console.log(JSON.stringify({ created }, null, 2));
