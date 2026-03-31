import { randomUUID } from 'crypto';
import path from 'path';

import { readIntakeRecords, segmentLabels } from './intake';
import { getPlanById, normalizePlanId } from './pricing';
import { SITE_URL } from './site';
import { readNamespace, upsertNamespaceRecord } from './storage';

type SourceKind = 'design_partner' | 'booking_request' | 'payment_intent';
type DraftPriority = 'high' | 'medium' | 'low';

export type CommunicationDraft = {
  id: string;
  sourceKind: SourceKind;
  sourceId: string;
  key: string;
  company: string;
  contactName: string;
  email: string;
  stage: string;
  priority: DraftPriority;
  channel: 'email' | 'dm';
  templateKey: string;
  templateLabel: string;
  objective: string;
  subject: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  readyAt: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'sent';
  sentAt?: string;
};

type RecordBase = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  stage?: string;
  priority?: string;
};

type PaymentRecord = RecordBase & {
  plan?: string;
  amount?: string;
  paymentMethod?: string;
  notes?: string;
};

type BookingRecord = RecordBase & {
  preferredTime?: string;
  timezone?: string;
  channel?: string;
  context?: string;
};

type DesignPartnerRecord = RecordBase & {
  segment?: string;
  monthlyRevenue?: string;
  website?: string;
  bottleneck?: string;
};

const draftsPath = path.join(process.cwd(), '..', 'data', 'ops', 'communication_drafts.json');
const DRAFT_NAMESPACE = 'ops:communication_drafts';

function nowIso() {
  return new Date().toISOString();
}

function uniqueDraftKey(args: Pick<CommunicationDraft, 'sourceKind' | 'sourceId' | 'templateKey' | 'channel'>) {
  return `${args.sourceKind}:${args.sourceId}:${args.templateKey}:${args.channel}`;
}

function withSiteUrl(target: string) {
  if (!target) return SITE_URL;
  if (/^https?:\/\//i.test(target)) return target;
  return `${SITE_URL}${target.startsWith('/') ? target : `/${target}`}`;
}

function dueFromNow(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function createCommunicationDraft(
  args: Omit<CommunicationDraft, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: CommunicationDraft['status'];
  },
): CommunicationDraft {
  const timestamp = nowIso();

  return {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    status: args.status || 'draft',
    ...args,
  };
}

export async function readCommunicationDrafts(): Promise<CommunicationDraft[]> {
  const parsed = await readNamespace<CommunicationDraft>(DRAFT_NAMESPACE, {
    legacyFilePath: draftsPath,
  });
  if (parsed.length > 0) {
    return parsed;
  }
  return await seedCommunicationDraftsFromIntake();
}

async function readIntakeFile<T>(fileName: string): Promise<T[]> {
  return readIntakeRecords<T>(fileName);
}

export async function persistCommunicationDraft(draft: CommunicationDraft) {
  const existing = await readCommunicationDrafts();
  const matchIndex = existing.findIndex(
    (item) => uniqueDraftKey(item) === uniqueDraftKey(draft),
  );

  if (matchIndex >= 0) {
    existing[matchIndex] = {
      ...existing[matchIndex],
      ...draft,
      id: existing[matchIndex].id,
      createdAt: existing[matchIndex].createdAt,
      sentAt: existing[matchIndex].sentAt,
      status: existing[matchIndex].status,
      updatedAt: nowIso(),
    };
  } else {
    existing.push(draft);
  }

  await upsertNamespaceRecord(DRAFT_NAMESPACE, existing[matchIndex >= 0 ? matchIndex : existing.length - 1] || draft, {
    legacyFilePath: draftsPath,
  });
}

export async function persistCommunicationDrafts(drafts: CommunicationDraft[]) {
  for (const draft of drafts) {
    await persistCommunicationDraft(draft);
  }
}

export async function getCommunicationDraftById(draftId: string) {
  const drafts = await readCommunicationDrafts();
  return drafts.find((item) => item.id === draftId) || null;
}

async function seedCommunicationDraftsFromIntake() {
  const [designPartners, bookings, payments] = await Promise.all([
    readIntakeFile<Record<string, string>>('design_partner_applications.json'),
    readIntakeFile<Record<string, string>>('booking_requests.json'),
    readIntakeFile<Record<string, string>>('payment_intents.json'),
  ]);

  const drafts = [
    ...designPartners.flatMap((record) =>
      buildCommunicationDraftsForIntake({ sourceKind: 'design_partner', record }),
    ),
    ...bookings.flatMap((record) =>
      buildCommunicationDraftsForIntake({ sourceKind: 'booking_request', record }),
    ),
    ...payments.flatMap((record) =>
      buildCommunicationDraftsForIntake({ sourceKind: 'payment_intent', record }),
    ),
  ];

  if (drafts.length > 0) {
    await persistCommunicationDrafts(drafts);
  }

  return drafts;
}

export async function markCommunicationDraftSent(draftId: string) {
  const existing = await readCommunicationDrafts();
  const target = existing.find((item) => item.id === draftId) || null;
  if (!target) {
    return null;
  }

  const updated = {
    ...target,
    status: 'sent' as const,
    sentAt: nowIso(),
    updatedAt: nowIso(),
  };

  await upsertNamespaceRecord(DRAFT_NAMESPACE, updated, { legacyFilePath: draftsPath });
  return updated;
}

export async function readReadyEmailDrafts(limit = 10) {
  const drafts = await readCommunicationDrafts();
  return drafts
    .filter((item) => item.channel === 'email')
    .filter((item) => communicationDeliveryState(item) === 'ready')
    .sort((left, right) => {
      const leftCloser =
        left.templateKey === 'intelligence-closer-email' ||
        left.templateKey === 'intelligence-closer-dm' ||
        left.templateKey === 'intelligence-payment-collect-email' ||
        left.templateKey === 'intelligence-payment-collect-dm'
          ? 1
          : 0;
      const rightCloser =
        right.templateKey === 'intelligence-closer-email' ||
        right.templateKey === 'intelligence-closer-dm' ||
        right.templateKey === 'intelligence-payment-collect-email' ||
        right.templateKey === 'intelligence-payment-collect-dm'
          ? 1
          : 0;
      if (leftCloser !== rightCloser) {
        return rightCloser - leftCloser;
      }

      const leftPriority = left.priority === 'high' ? 3 : left.priority === 'medium' ? 2 : 1;
      const rightPriority = right.priority === 'high' ? 3 : right.priority === 'medium' ? 2 : 1;
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return new Date(left.readyAt).getTime() - new Date(right.readyAt).getTime();
    })
    .slice(0, limit);
}

export function communicationDeliveryState(draft: Pick<CommunicationDraft, 'status' | 'readyAt'>) {
  if (draft.status === 'sent') {
    return 'sent' as const;
  }

  const readyAt = new Date(draft.readyAt);
  if (!Number.isNaN(readyAt.getTime()) && readyAt.getTime() > Date.now()) {
    return 'scheduled' as const;
  }

  return 'ready' as const;
}

function baseFields(record: RecordBase, sourceKind: SourceKind, priorityFallback: DraftPriority) {
  const email = String(record.email || '').trim();
  const company = String(record.company || '').trim() || '未填写公司';
  const contactName = String(record.name || '').trim() || '你好';
  const key = String(email || company || record.id).trim().toLowerCase();
  const priority =
    record.priority === 'high' || record.priority === 'medium' || record.priority === 'low'
      ? record.priority
      : priorityFallback;

  return {
    sourceKind,
    sourceId: record.id,
    key,
    company,
    contactName,
    email,
    stage: String(record.stage || '').trim() || '待跟进',
    priority,
  };
}

function paymentStartUrl(record: PaymentRecord) {
  const params = new URLSearchParams({
    plan: normalizePlanId(record.plan),
  });

  if (record.company) {
    params.set('company', String(record.company).trim());
  }

  if (record.email) {
    params.set('email', String(record.email).trim());
  }

  return `/start?${params.toString()}`;
}

function buildPaymentDrafts(record: PaymentRecord) {
  const plan = getPlanById(record.plan);
  const startUrl = withSiteUrl(paymentStartUrl(record));
  const bookingUrl = withSiteUrl('/book');
  const detailsUrl = withSiteUrl('/compare');
  const fields = baseFields(record, 'payment_intent', 'high');
  const pain = String(record.notes || '').trim() || '把上线、支付和增长链路尽快跑通';

  return [
    createCommunicationDraft({
      ...fields,
      channel: 'email',
      templateKey: 'payment-confirm-email',
      templateLabel: '付款确认欢迎信',
      objective: '确认到账并推动 onboarding 启动',
      subject: `收到你的 ${plan.name} 开通意向：下一步这样走`,
      body: [
        `Hi ${fields.contactName}，`,
        '',
        `已经收到你为 ${fields.company} 提交的 ${plan.name} 开通意向。现在最值钱的是直接把 onboarding 启动，而不是继续来回沟通。`,
        '',
        '建议按这个顺序推进：',
        '1. 回复这封邮件确认首笔款项已经打出；',
        `2. 打开启动页，把 onboarding 信息一次发齐：${startUrl}`,
        `3. 如果想更快接通，直接预约 15 分钟 onboarding：${bookingUrl}`,
        '',
        `我会优先帮你解决：${pain}。`,
        `产品详情：${detailsUrl}`,
        '',
        '— LeadPulse',
      ].join('\n'),
      ctaUrl: startUrl,
      ctaLabel: '打开启动页',
      readyAt: nowIso(),
    }),
    createCommunicationDraft({
      ...fields,
      channel: 'dm',
      templateKey: 'payment-confirm-dm',
      templateLabel: '付款确认私信',
      objective: '尽快确认到账并把对方拉进启动流程',
      subject: `收到你的 ${plan.name} 开通意向`,
      body: `${fields.contactName}，我已经看到你为 ${fields.company} 提交 ${plan.name} 开通意向了。最省时间的做法是：先确认到账，再直接按启动页把 onboarding 信息发齐：${startUrl}。如果你想更快推进，我们也可以直接约 15 分钟把支付、部署和首周动作一次接好：${bookingUrl}`,
      ctaUrl: startUrl,
      ctaLabel: '启动页',
      readyAt: nowIso(),
    }),
    createCommunicationDraft({
      ...fields,
      channel: 'email',
      templateKey: 'payment-followup-email',
      templateLabel: '付款后 24h 跟进',
      objective: '催启动，不让已付费线索冷掉',
      subject: `${plan.name} onboarding 还差最后一步：把信息一次发齐`,
      body: [
        `Hi ${fields.contactName}，`,
        '',
        `昨天已经收到 ${fields.company} 的 ${plan.name} 开通意向。为了不把这笔预算浪费在等待上，我建议你今天直接把 onboarding 模板填完发我。`,
        '',
        `启动页：${startUrl}`,
        `如果你想直接过一遍，我这边也可以安排一个 15 分钟 onboarding：${bookingUrl}`,
        '',
        '— LeadPulse',
      ].join('\n'),
      ctaUrl: startUrl,
      ctaLabel: '补齐 onboarding',
      readyAt: dueFromNow(24),
    }),
  ];
}

function buildBookingDrafts(record: BookingRecord) {
  const bookingUrl = withSiteUrl('/book');
  const paymentUrl = withSiteUrl('/pay?plan=pro');
  const detailsUrl = withSiteUrl('/product');
  const fields = baseFields(record, 'booking_request', 'medium');
  const context = String(record.context || '').trim() || '把当前瓶颈和最短回款路径判断清楚';
  const preferredTime = String(record.preferredTime || '').trim() || '待确认';
  const channel = String(record.channel || '').trim() || '邮件 / 微信';

  return [
    createCommunicationDraft({
      ...fields,
      channel: 'email',
      templateKey: 'booking-confirm-email',
      templateLabel: '预约确认邮件',
      objective: '确认时间并提高到会质量',
      subject: '收到你的 15 分钟诊断预约：先把这次通话准备好',
      body: [
        `Hi ${fields.contactName}，`,
        '',
        `已经收到你为 ${fields.company} 提交的 15 分钟诊断预约。你当前最想解决的是：${context}。`,
        '',
        `我先按这个时间理解：${preferredTime}。`,
        `偏好渠道：${channel}。`,
        '',
        '建议你会前准备三样东西：',
        '1. 一句话说清楚你卖什么、卖给谁；',
        '2. 最近 1-2 个成交或丢单案例；',
        '3. 当前支付方式、上线流程和主要流量入口。',
        '',
        `如果你已经判断清楚，也可以直接开通 Pro：${paymentUrl}`,
        `产品详情：${detailsUrl}`,
        '',
        '— LeadPulse',
      ].join('\n'),
      ctaUrl: bookingUrl,
      ctaLabel: '查看预约页',
      readyAt: nowIso(),
    }),
    createCommunicationDraft({
      ...fields,
      channel: 'dm',
      templateKey: 'booking-confirm-dm',
      templateLabel: '预约确认私信',
      objective: '缩短来回确认时间',
      subject: '预约确认',
      body: `${fields.contactName}，已经看到你为 ${fields.company} 提交的预约了。我先按 ${preferredTime} 来理解。你会前只要准备好一句话卖点、近 1-2 个成交/丢单案例，以及当前支付和流量入口，这 15 分钟就不会白聊。`,
      ctaUrl: detailsUrl,
      ctaLabel: '看产品详情',
      readyAt: nowIso(),
    }),
    createCommunicationDraft({
      ...fields,
      channel: 'email',
      templateKey: 'booking-followup-email',
      templateLabel: '预约后 48h 跟进',
      objective: '避免预约线索失温',
      subject: '如果你还在犹豫，先把最短回款路径判断清楚',
      body: [
        `Hi ${fields.contactName}，`,
        '',
        `我这边还在等 ${fields.company} 确认最终时间。`,
        '如果你现在最关心的其实不是聊天，而是更快上线、接支付、拿到第一批线索，那也可以直接从 Pro 开始。',
        '',
        `开通 Pro：${paymentUrl}`,
        `产品详情：${detailsUrl}`,
        '',
        '— LeadPulse',
      ].join('\n'),
      ctaUrl: paymentUrl,
      ctaLabel: '直接开通 Pro',
      readyAt: dueFromNow(48),
    }),
  ];
}

function buildDesignPartnerDrafts(record: DesignPartnerRecord) {
  const bookingUrl = withSiteUrl('/book');
  const paymentUrl = withSiteUrl('/pay?plan=pro');
  const detailsUrl = withSiteUrl('/compare');
  const fields = baseFields(
    record,
    'design_partner',
    record.monthlyRevenue === '10w-30w' || record.monthlyRevenue === '30w+' ? 'high' : 'medium',
  );
  const segment = segmentLabels[String(record.segment || '').trim()] || String(record.segment || '').trim() || '当前业务';
  const bottleneck = String(record.bottleneck || '').trim() || '获客和转化链路';

  return [
    createCommunicationDraft({
      ...fields,
      channel: 'email',
      templateKey: 'design-partner-qualify-email',
      templateLabel: '设计伙伴资格判断邮件',
      objective: '确认 ICP、支付准备度和推进路径',
      subject: '收到你的 Design Partner 申请：先判断是否适合一起做',
      body: [
        `Hi ${fields.contactName}，`,
        '',
        `已经收到你为 ${fields.company} 提交的 Design Partner 申请。`,
        `我会先看三件事：1）${segment} 的 ICP 是否够清楚；2）支付是否能接；3）当前瓶颈 ${bottleneck} 是否适合用 credits-first 方案来解。`,
        '',
        `如果判断合适，我建议先约 15 分钟诊断：${bookingUrl}`,
        `如果你已经明确要主力方案，也可以直接开 Pro：${paymentUrl}`,
        `产品详情：${detailsUrl}`,
        '',
        '— LeadPulse',
      ].join('\n'),
      ctaUrl: bookingUrl,
      ctaLabel: '预约 15 分钟',
      readyAt: nowIso(),
    }),
    createCommunicationDraft({
      ...fields,
      channel: 'dm',
      templateKey: 'design-partner-qualify-dm',
      templateLabel: '设计伙伴资格判断私信',
      objective: '先拿到回复，再决定走预约还是直接付款',
      subject: 'Design Partner 申请已收到',
      body: `${fields.contactName}，我已经看到 ${fields.company} 的 Design Partner 申请了。你的核心瓶颈我记下来了：${bottleneck}。下一步我会先判断 ICP、客单价和支付准备度；如果合适，先约 15 分钟把推进路径定掉：${bookingUrl}`,
      ctaUrl: bookingUrl,
      ctaLabel: '预约诊断',
      readyAt: nowIso(),
    }),
    createCommunicationDraft({
      ...fields,
      channel: 'email',
      templateKey: 'design-partner-followup-email',
      templateLabel: '设计伙伴 72h 跟进',
      objective: '对高意向申请做二次推进',
      subject: '如果你还在考虑，先用 15 分钟把这件事判断清楚',
      body: [
        `Hi ${fields.contactName}，`,
        '',
        `如果 ${fields.company} 还在看 Design Partner 是否适合，我建议不要继续空想，直接用 15 分钟把是否值得做判断清楚。`,
        '',
        `预约：${bookingUrl}`,
        `或者直接开 Pro：${paymentUrl}`,
        `产品详情：${detailsUrl}`,
        '',
        '— LeadPulse',
      ].join('\n'),
      ctaUrl: bookingUrl,
      ctaLabel: '去预约',
      readyAt: dueFromNow(72),
    }),
  ];
}

export function buildCommunicationDraftsForIntake(args: {
  sourceKind: SourceKind;
  record: Record<string, string>;
}) {
  if (args.sourceKind === 'payment_intent') {
    return buildPaymentDrafts(args.record as unknown as PaymentRecord);
  }

  if (args.sourceKind === 'booking_request') {
    return buildBookingDrafts(args.record as unknown as BookingRecord);
  }

  return buildDesignPartnerDrafts(args.record as unknown as DesignPartnerRecord);
}
