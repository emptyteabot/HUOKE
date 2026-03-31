import { readFile } from 'fs/promises';
import path from 'path';

import { readIntakeRecords } from './intake';
import { readSelfGrowthSummary } from './self-growth';
import { readNamespace } from './storage';

type IntakeRecord = {
  createdAt?: string;
};

type ManualMetric = {
  date: string;
  payback_rate: number;
  retention_rate: number;
  refund_rate: number;
};

type ManualKpis = {
  updated_at: string;
  sample_mode: boolean;
  cash_on_hand_cny: number | null;
  monthly_burn_cny: number | null;
  target_runway_months: number;
  daily_metrics: ManualMetric[];
  usdc_experiment: {
    status: string;
    hypothesis: string;
    next_step: string;
    owner: string;
  };
};

export type OpsSeriesPoint = {
  date: string;
  newLeads: number;
  designPartners: number;
  bookings: number;
  paymentIntents: number;
  paybackRate: number;
  retentionRate: number;
  refundRate: number;
};

export type OpsDashboardData = {
  updatedAt: string;
  sampleMode: boolean;
  runwayMonths: number | null;
  targetRunwayMonths: number;
  cashOnHandCny: number | null;
  monthlyBurnCny: number | null;
  series: OpsSeriesPoint[];
  summary: {
    newLeads7d: number;
    bookings7d: number;
    paymentIntents7d: number;
    paybackRate: number;
    retentionRate: number;
    refundRate: number;
  };
  livePipeline: {
    designPartnersTotal: number;
    bookingsTotal: number;
    paymentIntentsTotal: number;
    selfGrowthAccounts: number;
    outboundReadyAccounts: number;
    contentBacklogItems: number;
  };
  usdcExperiment: ManualKpis['usdc_experiment'];
};

const dataRoot = path.join(process.cwd(), '..', 'data');

async function readJsonFile<T>(relativeSegments: string[], fallback: T): Promise<T> {
  try {
    const filePath = path.join(dataRoot, ...relativeSegments);
    const namespace = `ops:${relativeSegments.join(':')}`;
    const records = await readNamespace<T & { id?: string }>(namespace, {
      legacyFilePath: filePath,
      syncLegacyOnChange: true,
      legacyIdResolver: () => relativeSegments.join(':'),
    });
    return (records[0] as T) || fallback;
  } catch {
    return fallback;
  }
}

function isoDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function lastDays(days: number) {
  const output: string[] = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    output.push(isoDateString(date));
  }

  return output;
}

function countByDate(records: IntakeRecord[]) {
  return records.reduce<Record<string, number>>((accumulator, record) => {
    const date = String(record.createdAt || '').slice(0, 10);
    if (!date) {
      return accumulator;
    }
    accumulator[date] = (accumulator[date] || 0) + 1;
    return accumulator;
  }, {});
}

export async function readOpsDashboardData(): Promise<OpsDashboardData> {
  const [manualKpis, designPartners, bookings, paymentIntents, selfGrowthSummary] =
    await Promise.all([
      readJsonFile<ManualKpis>(
        ['ops', 'manual_kpis.json'],
        {
          updated_at: '',
          sample_mode: true,
          cash_on_hand_cny: null,
          monthly_burn_cny: null,
          target_runway_months: 9,
          daily_metrics: [],
          usdc_experiment: {
            status: 'not-configured',
            hypothesis: '',
            next_step: '',
            owner: 'Founder',
          },
        },
      ),
      readIntakeRecords<IntakeRecord>('design_partner_applications.json'),
      readIntakeRecords<IntakeRecord>('booking_requests.json'),
      readIntakeRecords<IntakeRecord>('payment_intents.json'),
      readSelfGrowthSummary(),
    ]);

  const dates = lastDays(7);
  const designPartnerCounts = countByDate(designPartners);
  const bookingCounts = countByDate(bookings);
  const paymentCounts = countByDate(paymentIntents);
  const manualMap = new Map(manualKpis.daily_metrics.map((item) => [item.date, item]));

  const series = dates.map((date) => {
    const designPartnerCount = designPartnerCounts[date] || 0;
    const bookingCount = bookingCounts[date] || 0;
    const paymentCount = paymentCounts[date] || 0;
    const manualMetric = manualMap.get(date);

    return {
      date,
      newLeads: designPartnerCount + bookingCount + paymentCount,
      designPartners: designPartnerCount,
      bookings: bookingCount,
      paymentIntents: paymentCount,
      paybackRate: manualMetric?.payback_rate || 0,
      retentionRate: manualMetric?.retention_rate || 0,
      refundRate: manualMetric?.refund_rate || 0,
    };
  });

  const latest = series.at(-1) || {
    date: '',
    newLeads: 0,
    designPartners: 0,
    bookings: 0,
    paymentIntents: 0,
    paybackRate: 0,
    retentionRate: 0,
    refundRate: 0,
  };

  const runwayMonths =
    manualKpis.cash_on_hand_cny && manualKpis.monthly_burn_cny
      ? Number((manualKpis.cash_on_hand_cny / manualKpis.monthly_burn_cny).toFixed(1))
      : null;

  return {
    updatedAt: manualKpis.updated_at,
    sampleMode: manualKpis.sample_mode,
    runwayMonths,
    targetRunwayMonths: manualKpis.target_runway_months,
    cashOnHandCny: manualKpis.cash_on_hand_cny,
    monthlyBurnCny: manualKpis.monthly_burn_cny,
    series,
    summary: {
      newLeads7d: series.reduce((sum, item) => sum + item.newLeads, 0),
      bookings7d: series.reduce((sum, item) => sum + item.bookings, 0),
      paymentIntents7d: series.reduce((sum, item) => sum + item.paymentIntents, 0),
      paybackRate: latest.paybackRate,
      retentionRate: latest.retentionRate,
      refundRate: latest.refundRate,
    },
    livePipeline: {
      designPartnersTotal: designPartners.length,
      bookingsTotal: bookings.length,
      paymentIntentsTotal: paymentIntents.length,
      selfGrowthAccounts: selfGrowthSummary.total_accounts,
      outboundReadyAccounts: selfGrowthSummary.queued_accounts,
      contentBacklogItems: selfGrowthSummary.content_backlog_items,
    },
    usdcExperiment: manualKpis.usdc_experiment,
  };
}
