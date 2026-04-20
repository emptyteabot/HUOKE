import { readFile } from 'fs/promises';
import path from 'path';

import { readRerankOverrides } from './intelligence/rerank-store';
import { SITE_URL } from './site';
import { readNamespace } from './storage';

type SummaryTopAccount = {
  account_id: string;
  company_name: string;
  segment: string;
  priority: string;
  blended_score: number;
  next_action: string;
};

export type SelfGrowthSummary = {
  generated_at: string;
  total_accounts: number;
  queued_accounts: number;
  content_backlog_items: number;
  priority_counts: Record<string, number>;
  status_counts: Record<string, number>;
  top_accounts: SummaryTopAccount[];
};

export type SelfGrowthAccount = {
  account_id: string;
  company_name: string;
  segment: string;
  priority: string;
  blended_score: number;
  next_action: string;
  primary_channel: string;
  pain_statement: string;
  status: string;
  recommended_offer: string;
  founder_name?: string;
};

export type SelfGrowthQueueItem = {
  queue_id: string;
  account_id: string;
  company_name: string;
  priority: string;
  channel: string;
  recommended_offer: string;
  scheduled_at: string;
  status: string;
  sequence: Array<{
    step: number;
    day_offset: number;
    channel: string;
    message: string;
  }>;
};

export type SelfGrowthContentItem = {
  content_id: string;
  title: string;
  hook: string;
  angle: string;
  cta: string;
  proof_source: string[];
  priority: number;
};

export type LiveTarget = {
  name: string;
  segment: string;
  channel: string;
  priority: string;
  score: number;
  url: string;
  source_type: string;
  found_at: string;
  reason: string;
  pain_fit: string;
  next_action: string;
  query: string;
};

const fallbackSummary: SelfGrowthSummary = {
  generated_at: '',
  total_accounts: 0,
  queued_accounts: 0,
  content_backlog_items: 0,
  priority_counts: {},
  status_counts: {},
  top_accounts: [],
};

const selfGrowthRoots = [
  path.join(process.cwd(), 'data', 'self_growth'),
  path.join(process.cwd(), '..', 'data', 'self_growth'),
];
const reportRoots = [
  path.join(process.cwd(), 'data', 'reports'),
  path.join(process.cwd(), '..', 'data', 'reports'),
];
const liveTargetPaths = [
  path.join(process.cwd(), 'data', 'live_targets', 'leadpulse_real_targets_latest.json'),
  path.join(process.cwd(), '..', 'data', 'live_targets', 'leadpulse_real_targets_latest.json'),
  path.join(process.cwd(), '..', 'data', 'live_targets', 'leadpulse_real_targets_20260317.json'),
];

function replaceUtmLink(value: string) {
  return String(value || '').replaceAll('[UTM_LINK]', SITE_URL);
}

export async function readSelfGrowthSummary(): Promise<SelfGrowthSummary> {
  for (const root of selfGrowthRoots) {
    const summaryPath = path.join(root, 'summary.json');

    try {
      const [raw, rerankOverrides] = await Promise.all([
        readFile(summaryPath, 'utf-8'),
        readRerankOverrides(),
      ]);
      const parsed = JSON.parse(raw) as SelfGrowthSummary;
      const rerankMap = new Map(
        rerankOverrides
          .filter((item) => item.company)
          .map((item) => [String(item.company).trim().toLowerCase(), item]),
      );

      return {
        ...parsed,
        top_accounts: [...parsed.top_accounts].sort((left, right) => {
          const leftBoost = rerankMap.get(String(left.company_name).trim().toLowerCase())?.boost || 0;
          const rightBoost = rerankMap.get(String(right.company_name).trim().toLowerCase())?.boost || 0;
          if (leftBoost !== rightBoost) {
            return rightBoost - leftBoost;
          }
          return right.blended_score - left.blended_score;
        }),
      };
    } catch {
      continue;
    }
  }
  return fallbackSummary;
}

async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  const namespace = `self-growth:${fileName}`;
  for (const root of selfGrowthRoots) {
    try {
      const filePath = path.join(root, fileName);
      const records = await readNamespace<T & { id?: string }>(namespace, {
        legacyFilePath: filePath,
        syncLegacyOnChange: true,
        legacyIdResolver: () => fileName,
      });
      return (records[0] as T) || fallback;
    } catch {
      continue;
    }
  }
  return fallback;
}

export async function readSelfGrowthAccounts(): Promise<SelfGrowthAccount[]> {
  return readJsonFile<SelfGrowthAccount[]>('accounts.json', []);
}

export async function readSelfGrowthQueue(): Promise<SelfGrowthQueueItem[]> {
  const queue = await readJsonFile<SelfGrowthQueueItem[]>('outreach_queue.json', []);
  return queue.map((item) => ({
    ...item,
    sequence: item.sequence.map((step) => ({
      ...step,
      message: replaceUtmLink(step.message),
    })),
  }));
}

export async function readSelfGrowthContentBacklog(): Promise<SelfGrowthContentItem[]> {
  const backlog = await readJsonFile<SelfGrowthContentItem[]>('content_backlog.json', []);
  return backlog.map((item) => ({
    ...item,
    cta: replaceUtmLink(item.cta),
  }));
}

export async function readSelfGrowthReport(): Promise<string> {
  for (const root of reportRoots) {
    try {
      const raw = await readFile(path.join(root, 'leadpulse_self_growth_report.md'), 'utf-8');
      return replaceUtmLink(raw);
    } catch {
      continue;
    }
  }
  return '';
}

export async function readLiveTargets(): Promise<LiveTarget[]> {
  for (const candidatePath of liveTargetPaths) {
    try {
      const raw = await readFile(candidatePath, 'utf-8');
      return JSON.parse(raw) as LiveTarget[];
    } catch {
      continue;
    }
  }
  return [];
}
