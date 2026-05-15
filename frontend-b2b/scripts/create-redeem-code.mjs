import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(process.cwd());
const dataDir = path.join(repoRoot, '..', 'data');
const statePath = path.join(dataDir, 'leadpulse_state.json');
const namespace = 'commerce:redeem_codes';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function nowIso() {
  return new Date().toISOString();
}

function readState() {
  if (!existsSync(statePath)) {
    return { meta: {}, documents: [] };
  }

  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf-8'));
    return {
      meta: parsed && typeof parsed.meta === 'object' ? parsed.meta : {},
      documents: Array.isArray(parsed?.documents) ? parsed.documents : [],
    };
  } catch {
    return { meta: {}, documents: [] };
  }
}

function writeState(state) {
  mkdirSync(dataDir, { recursive: true });
  const tmpPath = `${statePath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
  renameSync(tmpPath, statePath);
}

function upsertDocument(state, document) {
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

function existingCodes(state) {
  return new Set(
    state.documents
      .filter((item) => item.namespace === namespace)
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
const state = readState();
const seen = existingCodes(state);
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

  upsertDocument(state, {
    namespace,
    id: payload.id,
    payload: JSON.stringify(payload),
    created_at: now,
    updated_at: now,
  });
  created.push(payload);
}

writeState(state);
console.log(JSON.stringify({ created }, null, 2));
