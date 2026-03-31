import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

import type { ObservationEvent, ObservationStateVector } from './types';

const dataRoot = path.join(process.cwd(), '..', 'data', 'observations');

const highIntentPages = ['/demo', '/product', '/compare', '/platform', '/book', '/pay'];
const semanticKeywords = [
  '价格',
  '定价',
  '付款',
  '支付',
  '预约',
  '开通',
  '成交',
  '部署',
  '导出',
  '客户',
  '营收',
  '收入',
  '转化',
  '方案',
  'pro',
  'max',
  'stripe',
  'growth',
  'revenue',
  'pricing',
  'checkout',
  'book',
];

function normalizePath(input?: string) {
  if (!input) return '/';
  try {
    const url = new URL(input, 'https://leadpulse.cc.cd');
    return url.pathname || '/';
  } catch {
    return input.startsWith('/') ? input : `/${input}`;
  }
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function extractSemanticSignals(events: ObservationEvent[]) {
  const text = events
    .flatMap((event) => [event.label || '', event.value || '', String(event.metadata?.query || '')])
    .join(' ')
    .toLowerCase();

  return semanticKeywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

export function buildObservationStateVector(events: ObservationEvent[]): ObservationStateVector {
  const normalized = [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const paths = normalized.map((event) => normalizePath(event.path));
  const uniquePages = unique(paths);
  const clickLabels = normalized
    .filter((event) => event.type === 'click')
    .map((event) => (event.label || event.value || '').trim())
    .filter(Boolean);
  const clickSequence = clickLabels.slice(0, 12);
  const searchQueries = normalized
    .filter((event) => event.type === 'search_query')
    .map((event) => (event.value || '').trim())
    .filter(Boolean);
  const completedFields = unique(
    normalized
      .filter((event) => event.type === 'form_update')
      .map((event) => String(event.metadata?.field || '').trim())
      .filter(Boolean),
  );
  const explicitPlanInterest = unique(
    normalized
      .flatMap((event) => [event.label || '', event.value || ''])
      .map((item) => item.toLowerCase())
      .filter((item) => item.includes('pro') || item.includes('max') || item.includes('free')),
  );

  const highIntentPageVisits = paths.filter((page) => highIntentPages.some((prefix) => page.startsWith(prefix))).length;
  const pricingVisits = paths.filter((page) => page.startsWith('/pay')).length;
  const bookingVisits = paths.filter((page) => page.startsWith('/book')).length;
  const paymentVisits = paths.filter((page) => page.startsWith('/pay')).length;
  const scrollDepths = normalized
    .filter((event) => event.type === 'scroll_depth')
    .map((event) => Number(event.numericValue || 0));
  const hoverDwells = normalized
    .filter((event) => event.type === 'hover_dwell')
    .map((event) => Number(event.numericValue || 0));

  const maxScrollDepth = scrollDepths.length ? Math.max(...scrollDepths) : 0;
  const hoverDwellMsTotal = hoverDwells.reduce((sum, value) => sum + value, 0);
  const hoverDwellMsMax = hoverDwells.length ? Math.max(...hoverDwells) : 0;
  const semanticIntentSignals = extractSemanticSignals(normalized);

  const engagementScore = clamp(
    highIntentPageVisits * 0.12 +
      clamp(maxScrollDepth, 0, 100) / 100 * 0.28 +
      clamp(hoverDwellMsTotal, 0, 25000) / 25000 * 0.22 +
      clamp(clickLabels.length, 0, 8) / 8 * 0.2 +
      clamp(searchQueries.length, 0, 3) / 3 * 0.18,
    0,
    1,
  );

  const completionScore = clamp(
    clamp(completedFields.length, 0, 5) / 5 * 0.7 +
      clamp(explicitPlanInterest.length, 0, 2) / 2 * 0.3,
    0,
    1,
  );

  return {
    sessionId: normalized[0]?.sessionId || 'unknown-session',
    totalEvents: normalized.length,
    uniquePages,
    highIntentPageVisits,
    pricingVisits,
    bookingVisits,
    paymentVisits,
    maxScrollDepth,
    hoverDwellMsTotal,
    hoverDwellMsMax,
    clickLabels,
    clickSequence,
    searchQueries,
    semanticIntentSignals,
    explicitPlanInterest,
    completedFields,
    engagementScore,
    completionScore,
  };
}

export async function persistObservationEvents(events: ObservationEvent[]) {
  if (!events.length) return;

  await mkdir(dataRoot, { recursive: true });
  const dateKey = new Date().toISOString().slice(0, 10);
  const filePath = path.join(dataRoot, `${dateKey}.jsonl`);
  const payload = events.map((event) => JSON.stringify(event)).join('\n') + '\n';
  await appendFile(filePath, payload, 'utf-8');
}
