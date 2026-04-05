import { randomUUID } from 'crypto';
import path from 'path';

import { provisionFulfillmentPackage, getFulfillmentPackage, type FulfillmentPackage } from './fulfillment';
import { getPlanById, normalizePlanId } from './pricing';
import { SITE_URL } from './site';
import { readNamespace, upsertNamespaceRecord } from './storage';

export type RedeemCodeRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  code: string;
  planId: string;
  planName: string;
  status: 'issued' | 'redeemed' | 'disabled';
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  issuedToName: string;
  issuedToEmail: string;
  issuedBy: string;
  note: string;
  lastRedeemedAt: string;
  lastRedeemedByEmail: string;
  lastRedeemedByCompany: string;
  lastRedeemedProductUrl: string;
  fulfillmentPackageId: string;
  fulfillmentSourceId: string;
};

const REDEEM_CODE_NAMESPACE = 'commerce:redeem_codes';
const redeemCodesPath = path.join(process.cwd(), '..', 'data', 'commerce', 'redeem_codes.json');
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function nowIso() {
  return new Date().toISOString();
}

function normalizeCode(raw: string) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

function buildStartUrl(pkg: FulfillmentPackage) {
  const params = new URLSearchParams({
    plan: pkg.planId,
    delivery: pkg.id,
    redeem: 'success',
  });

  if (pkg.company) params.set('company', pkg.company);
  if (pkg.email) params.set('email', pkg.email);

  return `${SITE_URL}/start?${params.toString()}`;
}

function normalizeRecord(record: Partial<RedeemCodeRecord> & Record<string, unknown>): RedeemCodeRecord {
  const planId = normalizePlanId(String(record.planId || 'pro'));
  const plan = getPlanById(planId);

  return {
    id: String(record.id || randomUUID()),
    createdAt: String(record.createdAt || nowIso()),
    updatedAt: String(record.updatedAt || record.createdAt || nowIso()),
    code: normalizeCode(String(record.code || '')),
    planId,
    planName: String(record.planName || plan.name),
    status:
      String(record.status || 'issued') === 'disabled'
        ? 'disabled'
        : String(record.status || 'issued') === 'redeemed'
          ? 'redeemed'
          : 'issued',
    maxUses: Math.max(1, Number(record.maxUses || 1)),
    usedCount: Math.max(0, Number(record.usedCount || 0)),
    expiresAt: String(record.expiresAt || ''),
    issuedToName: String(record.issuedToName || ''),
    issuedToEmail: String(record.issuedToEmail || ''),
    issuedBy: String(record.issuedBy || ''),
    note: String(record.note || ''),
    lastRedeemedAt: String(record.lastRedeemedAt || ''),
    lastRedeemedByEmail: String(record.lastRedeemedByEmail || ''),
    lastRedeemedByCompany: String(record.lastRedeemedByCompany || ''),
    lastRedeemedProductUrl: String(record.lastRedeemedProductUrl || ''),
    fulfillmentPackageId: String(record.fulfillmentPackageId || ''),
    fulfillmentSourceId: String(record.fulfillmentSourceId || ''),
  };
}

async function readRedeemCodes() {
  const items = await readNamespace<Partial<RedeemCodeRecord> & Record<string, unknown>>(REDEEM_CODE_NAMESPACE, {
    legacyFilePath: redeemCodesPath,
  });

  return items.map((item) => normalizeRecord(item));
}

function generateCode(length = 12) {
  let out = '';
  while (out.length < length) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)] || 'X';
  }
  return out;
}

async function uniqueCode() {
  const existing = new Set((await readRedeemCodes()).map((item) => item.code));

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `${generateCode(4)}-${generateCode(4)}-${generateCode(4)}`;
    if (!existing.has(candidate)) return candidate;
  }

  throw new Error('code_generation_failed');
}

export async function listRedeemCodes(limit = 100) {
  const items = await readRedeemCodes();
  return items
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, Math.max(1, limit));
}

export async function getRedeemCodeByCode(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const items = await readRedeemCodes();
  return items.find((item) => item.code === normalized) || null;
}

export async function createRedeemCode(args: {
  plan?: string;
  expiresAt?: string;
  maxUses?: number;
  issuedToName?: string;
  issuedToEmail?: string;
  issuedBy?: string;
  note?: string;
}) {
  const planId = normalizePlanId(args.plan);
  const plan = getPlanById(planId);
  const now = nowIso();

  const record: RedeemCodeRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    code: await uniqueCode(),
    planId,
    planName: plan.name,
    status: 'issued',
    maxUses: Math.max(1, Number(args.maxUses || 1)),
    usedCount: 0,
    expiresAt: String(args.expiresAt || ''),
    issuedToName: String(args.issuedToName || '').trim(),
    issuedToEmail: String(args.issuedToEmail || '').trim().toLowerCase(),
    issuedBy: String(args.issuedBy || '').trim(),
    note: String(args.note || '').trim(),
    lastRedeemedAt: '',
    lastRedeemedByEmail: '',
    lastRedeemedByCompany: '',
    lastRedeemedProductUrl: '',
    fulfillmentPackageId: '',
    fulfillmentSourceId: `redeem_${randomUUID().slice(0, 8)}`,
  };

  await upsertNamespaceRecord(REDEEM_CODE_NAMESPACE, record, {
    legacyFilePath: redeemCodesPath,
  });

  return record;
}

function ensureUsableCode(record: RedeemCodeRecord) {
  if (!record.code) throw new Error('code_not_found');
  if (record.status === 'disabled') throw new Error('code_disabled');
  if (record.expiresAt && record.expiresAt < nowIso()) throw new Error('code_expired');
  if (record.usedCount >= record.maxUses) throw new Error('code_uses_exceeded');
}

async function packageForCode(
  record: RedeemCodeRecord,
  args: {
    email: string;
    company: string;
    productUrl?: string;
  },
) {
  if (record.fulfillmentPackageId) {
    const existing = await getFulfillmentPackage(record.fulfillmentPackageId);
    if (existing) return existing;
  }

  const pkg = await provisionFulfillmentPackage({
    sourceId: record.fulfillmentSourceId || `redeem_${record.id}`,
    sourceKind: 'payment_intent',
    company: args.company,
    email: args.email,
    plan: record.planId,
    productUrl: args.productUrl,
  });

  return pkg;
}

export async function redeemCode(args: {
  code: string;
  email: string;
  company: string;
  productUrl?: string;
}) {
  const code = normalizeCode(args.code);
  const email = String(args.email || '').trim().toLowerCase();
  const company = String(args.company || '').trim();
  const productUrl = String(args.productUrl || '').trim();

  if (!code) throw new Error('code_required');
  if (!email) throw new Error('email_required');
  if (!company) throw new Error('company_required');

  const record = await getRedeemCodeByCode(code);
  if (!record) throw new Error('code_not_found');

  ensureUsableCode(record);

  const pkg = await packageForCode(record, {
    email,
    company,
    productUrl,
  });

  const nextUsedCount = record.usedCount + 1;
  const updated: RedeemCodeRecord = {
    ...record,
    updatedAt: nowIso(),
    usedCount: nextUsedCount,
    status: nextUsedCount >= record.maxUses ? 'redeemed' : 'issued',
    lastRedeemedAt: nowIso(),
    lastRedeemedByEmail: email,
    lastRedeemedByCompany: company,
    lastRedeemedProductUrl: productUrl,
    fulfillmentPackageId: pkg.id,
    fulfillmentSourceId: record.fulfillmentSourceId || `redeem_${record.id}`,
  };

  await upsertNamespaceRecord(REDEEM_CODE_NAMESPACE, updated, {
    legacyFilePath: redeemCodesPath,
  });

  return {
    record: updated,
    package: pkg,
    startUrl: buildStartUrl(pkg),
  };
}
