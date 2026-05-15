import { createSign, createVerify } from 'crypto';

import { getPlanById } from './pricing';
import { SITE_URL } from './site';

export type AlipayNotifyFields = Record<string, string>;

type PaymentUrlArgs = {
  sourceId: string;
  plan: string;
  amount: string;
  userId: string;
  subject?: string;
};

const ALIPAY_GATEWAY = 'https://openapi.alipay.com/gateway.do';
const DEFAULT_SUBJECT = 'LeadPulse B2B 线索报告 (个人版)';

function stripPemEnvelope(value: string) {
  return String(value || '')
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function publicKeyPem(raw: string) {
  const value = String(raw || '').trim().replace(/\\n/g, '\n');
  if (value.includes('BEGIN PUBLIC KEY')) {
    return value;
  }

  const body = stripPemEnvelope(value).match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

function privateKeyPem(raw: string) {
  const value = String(raw || '').trim().replace(/\\n/g, '\n');
  if (value.includes('BEGIN')) {
    return value;
  }

  const body = stripPemEnvelope(value).match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
}

function requiredEnv(name: string) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`${name} missing`);
  }
  return value;
}

function sortedQuery(params: Record<string, string>, exclude = new Set<string>()) {
  return Object.entries(params)
    .filter(([key, value]) => key && value !== undefined && value !== null && value !== '' && !exclude.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function signParams(params: Record<string, string>) {
  const content = sortedQuery(params);
  const signer = createSign('RSA-SHA256');
  signer.update(content, 'utf8');
  signer.end();
  return signer.sign(privateKeyPem(requiredEnv('ALIPAY_APP_PRIVATE_KEY')), 'base64');
}

function normalizeAmount(value: string, planId: string) {
  const plan = getPlanById(planId);
  const numeric = Number(String(value || plan.price || '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`invalid alipay amount: ${value || plan.price}`);
  }
  return numeric.toFixed(2);
}

export function alipayConfigured() {
  return Boolean(
    String(process.env.ALIPAY_APP_ID || '').trim() &&
      String(process.env.ALIPAY_APP_PRIVATE_KEY || '').trim() &&
      String(process.env.ALIPAY_PUBLIC_KEY || '').trim(),
  );
}

export function createAlipayPagePayUrl(args: PaymentUrlArgs) {
  const appId = requiredEnv('ALIPAY_APP_ID');
  const outTradeNo = String(args.sourceId || '').trim();
  if (!outTradeNo) {
    throw new Error('alipay sourceId missing');
  }

  const bizContent = {
    out_trade_no: outTradeNo,
    product_code: 'FAST_INSTANT_TRADE_PAY',
    total_amount: normalizeAmount(args.amount, args.plan),
    subject: String(args.subject || process.env.ALIPAY_ORDER_SUBJECT || DEFAULT_SUBJECT).trim(),
    passback_params: encodeURIComponent(String(args.userId || outTradeNo).trim()),
  };

  const params: Record<string, string> = {
    app_id: appId,
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    version: '1.0',
    return_url: `${SITE_URL}/api/v1/alipay/callback`,
    notify_url: `${SITE_URL}/api/v1/alipay/notify`,
    biz_content: JSON.stringify(bizContent),
  };

  const sign = signParams(params);
  const query = new URLSearchParams({ ...params, sign });
  return {
    outTradeNo,
    payUrl: `${ALIPAY_GATEWAY}?${query.toString()}`,
    amount: bizContent.total_amount,
  };
}

export function verifyAlipaySignature(fields: AlipayNotifyFields) {
  const signature = String(fields.sign || '').trim();
  if (!signature) {
    return false;
  }

  const content = sortedQuery(fields, new Set(['sign', 'sign_type']));
  const verifier = createVerify('RSA-SHA256');
  verifier.update(content, 'utf8');
  verifier.end();
  return verifier.verify(publicKeyPem(requiredEnv('ALIPAY_PUBLIC_KEY')), signature, 'base64');
}

export async function parseAlipayForm(request: Request) {
  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const output: AlipayNotifyFields = {};
  params.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

export function isPaidTradeStatus(status: string) {
  return status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED';
}

export function decodePassbackParams(value: string) {
  try {
    return decodeURIComponent(String(value || '').trim());
  } catch {
    return String(value || '').trim();
  }
}
