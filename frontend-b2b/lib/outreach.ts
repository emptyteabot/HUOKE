import type { ComplianceReplacement, CreativeItem } from './marketing';
import type { OutreachEvent } from './outreach-log';
import type { PipelineContact } from './pipeline';

export type OutreachStageBucket = 'payment' | 'booking' | 'qualification' | 'completed';
export type OutreachSequenceStatus = 'ready' | 'scheduled' | 'sent' | 'locked';
export type OutreachChannelBucket = 'all' | 'email' | 'dm' | 'hybrid';

export type OutreachSequenceStep = {
  key: string;
  order: number;
  label: string;
  whenLabel: string;
  channel: string;
  objective: string;
  subject: string;
  body: string;
  delayHours: number;
};

export type OutreachSequenceStepView = OutreachSequenceStep & {
  status: OutreachSequenceStatus;
  sentAt?: string;
  readyAt?: string;
};

export type OutreachPlan = {
  contact: PipelineContact;
  stageBucket: OutreachStageBucket;
  priorityScore: number;
  immediateActionLabel: string;
  primaryChannelLabel: string;
  recommendedHook: CreativeItem | null;
  recommendedHookLine: string;
  sequence: OutreachSequenceStepView[];
  readyStep: OutreachSequenceStepView | null;
  nextStep: OutreachSequenceStepView | null;
  sentCount: number;
  readyCount: number;
  scheduledCount: number;
  lastSentAt?: string;
  batchSubject: string;
  batchEmail: string;
  batchDm: string;
  batchSequence: string;
};

export type OutreachBatchBundle = {
  queueSummary: string;
  emailBundle: string;
  dmBundle: string;
  sequenceBundle: string;
};

export type OutreachFilters = {
  stage?: string;
  channel?: string;
  contact?: string;
  q?: string;
};

function stageBucketForContact(contact: PipelineContact): OutreachStageBucket {
  if (contact.stageLabel.includes('待确认收款') || contact.stageLabel.includes('高意向待成交')) return 'payment';
  if (
    contact.stageLabel.includes('待确认诊断') ||
    contact.stageLabel.includes('高意向待推荐') ||
    contact.stageLabel.includes('信息补全中')
  )
    return 'booking';
  if (contact.stageLabel.includes('待资格判断')) return 'qualification';
  return 'completed';
}

function touchPriorityScore(contact: PipelineContact, bucket: OutreachStageBucket) {
  const bucketScore =
    bucket === 'payment' ? 400 : bucket === 'booking' ? 300 : bucket === 'qualification' ? 200 : 100;
  const overdueScore = contact.overdueTaskCount * 50;
  const pendingScore = contact.pendingTaskCount * 10;
  const intelligenceBoost =
    contact.intelligenceAction === 'handoff_to_closer'
      ? 180
      : contact.intelligenceAction === 'rerank_catalog'
        ? 120
        : contact.intelligenceAction === 'open_micro_prompt'
          ? 60
          : 0;
  const rerankBoost = Math.min(contact.rerankBoost || 0, 100);
  const probabilityBoost = Math.round((contact.intelligenceProbability || 0) * 100);
  const dueWeight = contact.latestPendingTaskDueAt ? -new Date(contact.latestPendingTaskDueAt).getTime() / 1000000000 : 0;
  return bucketScore + overdueScore + pendingScore + intelligenceBoost + rerankBoost + probabilityBoost + dueWeight;
}

function firstName(contact: PipelineContact) {
  return contact.name.split(/\s+/).filter(Boolean)[0] || contact.name || '你好';
}

function trimLine(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function contactPain(contact: PipelineContact) {
  return trimLine(contact.notes[0] || contact.summary, '把获客、预约和收款链路跑起来');
}

function inferPrimaryChannel(contact: PipelineContact, bucket: OutreachStageBucket) {
  const preferred = contact.preferredChannel;
  if (bucket === 'booking') {
    if (preferred.includes('微信') || preferred.includes('飞书')) {
      return '微信 / 飞书';
    }
    return preferred.includes('邮件') ? '邮件 + 日历' : '邮件';
  }

  if (bucket === 'payment') {
    if (preferred.includes('微信') || preferred.includes('飞书')) {
      return '邮件 + 微信 / 飞书';
    }
    return '邮件';
  }

  if (preferred.includes('X')) {
    return 'X / 邮件';
  }
  if (preferred.includes('微信') || preferred.includes('飞书')) {
    return '邮件 + 微信 / 飞书';
  }
  return '邮件';
}

function pickHook(bucket: OutreachStageBucket, creativeLibrary: CreativeItem[]) {
  const readyItems = creativeLibrary.filter((item) => item.status === 'ready');
  const orderedAngles =
    bucket === 'payment'
      ? ['异议击破', '前后对比', '创始人亲历']
      : bucket === 'booking'
        ? ['前后对比', '创始人亲历', '痛点反转']
        : bucket === 'qualification'
          ? ['痛点反转', '反工具堆砌', '垂直切口']
          : ['创始人亲历', '前后对比', '异议击破'];

  for (const angle of orderedAngles) {
    const matched = readyItems.find((item) => item.angle.includes(angle));
    if (matched) {
      return matched;
    }
  }

  return readyItems[0] || creativeLibrary[0] || null;
}

function applyCompliance(text: string, replacements: ComplianceReplacement[]) {
  return replacements.reduce((current, item) => {
    if (!item.risky || !item.safe) {
      return current;
    }
    return current.split(item.risky).join(item.safe);
  }, text);
}

function buildPaymentSequence(
  contact: PipelineContact,
  hookLine: string,
  replacements: ComplianceReplacement[],
) {
  const name = firstName(contact);
  const pain = contactPain(contact);
  const plan = contact.recommendedPlanLabel;

  const rawSteps: OutreachSequenceStep[] = [
    {
      key: 'payment-now',
      order: 1,
      label: '现在发',
      whenLabel: '现在',
      channel: '邮件',
      objective: '确认到账并把开通动作一次接上',
      subject: `今天把 ${plan} 开通、credits 发放和 onboarding 接起来`,
      body: `Hi ${name}，\n\n我看到你已经提交了 ${plan} 开通意向。建议我们今天直接把三件事接好：\n1. 确认首笔款项到账；\n2. 发放首批 credits 和订阅配置；\n3. 约一个 15 分钟 onboarding，把部署、支付和增长动作一次跑通。\n\n你现在最需要解决的是：${pain}。\n\n${hookLine}\n\n下一步我建议按这个节奏推进：${contact.nextAction}\n\n如果你今天方便，我这边可以直接把收款确认后的开通清单发给你。\n\n— LeadPulse`,
      delayHours: 0,
    },
    {
      key: 'payment-24h',
      order: 2,
      label: '24h 跟进',
      whenLabel: '+24h',
      channel: '微信 / 飞书',
      objective: '别让付款意向冷掉',
      subject: `${plan} 开通跟进：确认到账后今天就能开跑`,
      body: `${name}，我跟进一下 ${plan} 开通这件事。只要确认到账，我这边今天就能把 credits、部署和 onboarding 接好。你现在卡住的是 ${pain}，这一步越快接上，越快能看到第一轮反馈。`,
      delayHours: 24,
    },
    {
      key: 'payment-72h',
      order: 3,
      label: '72h 最后推进',
      whenLabel: '+72h',
      channel: '邮件',
      objective: '锁定决策或明确延后原因',
      subject: `把 ${plan} 开通这件事定下来，或者告诉我你现在卡在哪`,
      body: `Hi ${name}，\n\n我最后跟进一次 ${plan} 开通。如果这周还不方便推进，也没关系，你直接告诉我现在最卡的是预算、优先级还是内部执行，我会按真实情况帮你重排顺序。\n\n如果能推进，我就按这条线继续：${contact.nextAction}\n\n— LeadPulse`,
      delayHours: 72,
    },
  ];

  return rawSteps.map((step) => ({
    ...step,
    subject: applyCompliance(step.subject, replacements),
    body: applyCompliance(step.body, replacements),
  }));
}

function buildBookingSequence(
  contact: PipelineContact,
  hookLine: string,
  replacements: ComplianceReplacement[],
) {
  const name = firstName(contact);
  const pain = contactPain(contact);
  const plan = contact.recommendedPlanLabel;

  const rawSteps: OutreachSequenceStep[] = [
    {
      key: 'booking-now',
      order: 1,
      label: '现在发',
      whenLabel: '现在',
      channel: inferPrimaryChannel(contact, 'booking'),
      objective: '尽快锁定诊断时间，别让线索降温',
      subject: '收到你的诊断预约：把这 15 分钟直接聊成决策',
      body: `Hi ${name}，\n\n看到你提交了诊断预约。我不想把这 15 分钟聊成泛泛的产品介绍，我更想直接围绕这件事展开：${pain}。\n\n如果我们时间锁定下来，我会在通话里直接判断你更适合 Free、${plan}，还是需要直接走 Max。\n\n${hookLine}\n\n下一步建议：${contact.nextAction}\n\n你回我一个方便的时间段，我这边就把会前准备同步给你。\n\n— LeadPulse`,
      delayHours: 0,
    },
    {
      key: 'booking-24h',
      order: 2,
      label: '24h 提醒',
      whenLabel: '+24h',
      channel: '邮件 / 私信',
      objective: '把诊断从“有兴趣”推进到“确认时间”',
      subject: '跟进一下诊断预约，把时间定下来就开跑',
      body: `${name}，我跟进一下你的诊断预约。你现在最值得先聊清楚的是：${pain}。时间一旦定下来，我会直接把建议方案和回款优先级给你，不浪费这 15 分钟。`,
      delayHours: 24,
    },
    {
      key: 'booking-48h',
      order: 3,
      label: '48h 最后提醒',
      whenLabel: '+48h',
      channel: '私信',
      objective: '明确还约不约，避免无限搁置',
      subject: '最后确认一次诊断时间',
      body: `${name}，我最后确认一次这周要不要把诊断约上。如果你现在优先级变了，直接告诉我也可以；如果继续推进，我就按 ${contact.nextAction} 帮你把下一步接上。`,
      delayHours: 48,
    },
  ];

  return rawSteps.map((step) => ({
    ...step,
    subject: applyCompliance(step.subject, replacements),
    body: applyCompliance(step.body, replacements),
  }));
}

function buildQualificationSequence(
  contact: PipelineContact,
  hookLine: string,
  replacements: ComplianceReplacement[],
) {
  const name = firstName(contact);
  const pain = contactPain(contact);
  const plan = contact.recommendedPlanLabel;

  const rawSteps: OutreachSequenceStep[] = [
    {
      key: 'qualification-now',
      order: 1,
      label: '现在发',
      whenLabel: '现在',
      channel: '邮件',
      objective: '先完成资格判断，再决定推预约还是直接推方案',
      subject: '看了你的申请：先判断这是不是你现在最该补的环节',
      body: `Hi ${name}，\n\n我看了你的申请。相比继续加功能，我更关心你现在是不是缺一个真正能把线索、触达和收款接起来的工作流。\n\n你目前最明显的瓶颈是：${pain}。\n\n${hookLine}\n\n如果你愿意，我会先用很短一轮资格判断，帮你决定是先约诊断，还是直接给你 ${plan} 方案。\n\n— LeadPulse`,
      delayHours: 0,
    },
    {
      key: 'qualification-24h',
      order: 2,
      label: '24h 跟进',
      whenLabel: '+24h',
      channel: '私信 / 邮件',
      objective: '拿到回复并确认是否继续推进',
      subject: '跟进一下：你现在最想先解决的是线索、预约还是收款？',
      body: `${name}，我补一句最直接的话：如果你现在最卡的是 ${pain}，那我们要先把获客节奏和推进顺序排清楚，而不是再加一个工具。你回我一句现阶段最卡的点，我就能判断是推诊断还是直接给方案。`,
      delayHours: 24,
    },
    {
      key: 'qualification-72h',
      order: 3,
      label: '72h 二次跟进',
      whenLabel: '+72h',
      channel: '邮件',
      objective: '做最后一轮筛选，留下高现金概率联系人',
      subject: '最后跟进一次：如果继续推进，我建议直接进入下一步',
      body: `Hi ${name}，\n\n我最后跟进一次。如果你还想推进，我建议直接按这条线走：${contact.nextAction}\n\n如果这件事暂时不急，也没关系，等你准备好再回我一句，我会按你当时的阶段给更稳的一种打法。\n\n— LeadPulse`,
      delayHours: 72,
    },
  ];

  return rawSteps.map((step) => ({
    ...step,
    subject: applyCompliance(step.subject, replacements),
    body: applyCompliance(step.body, replacements),
  }));
}

function buildCompletedSequence(
  contact: PipelineContact,
  hookLine: string,
  replacements: ComplianceReplacement[],
) {
  const name = firstName(contact);
  const pain = contactPain(contact);
  const plan = contact.recommendedPlanLabel;

  const rawSteps: OutreachSequenceStep[] = [
    {
      key: 'completed-now',
      order: 1,
      label: '复盘触达',
      whenLabel: '本周',
      channel: '邮件',
      objective: '争取续费、扩容或转介绍',
      subject: `复盘一下 ${plan} 的使用结果，看要不要继续放大`,
      body: `Hi ${name}，\n\n想和你复盘一下最近这段时间的使用情况：有没有真正帮你缩短从触达到预约、再到收款的反馈周期。\n\n如果现在最值得继续放大的还是 ${pain}，我建议我们顺手把下一阶段动作也排出来。\n\n${hookLine}\n\n— LeadPulse`,
      delayHours: 0,
    },
    {
      key: 'completed-3d',
      order: 2,
      label: '扩容提醒',
      whenLabel: '+3d',
      channel: '私信 / 邮件',
      objective: '确认是否需要扩容或升级',
      subject: '如果你准备继续放大，我可以帮你把下一轮动作接上',
      body: `${name}，如果你已经开始看到一部分反馈，我建议别停在“试过了”，而是继续把最有效的线索来源和推进动作复制出来。`,
      delayHours: 72,
    },
    {
      key: 'completed-7d',
      order: 3,
      label: '转介绍 / 案例',
      whenLabel: '+7d',
      channel: '邮件',
      objective: '争取转介绍和社会证明',
      subject: '如果这轮对你有帮助，我想顺手要一个转介绍或案例反馈',
      body: `Hi ${name}，\n\n如果这轮合作对你有帮助，我想顺手要两样东西里的一个：\n1. 一个可能也有类似问题的朋友；\n2. 一段简短反馈，帮助我把案例讲清楚。\n\n这会比任何广告都更真实。\n\n— LeadPulse`,
      delayHours: 168,
    },
  ];

  return rawSteps.map((step) => ({
    ...step,
    subject: applyCompliance(step.subject, replacements),
    body: applyCompliance(step.body, replacements),
  }));
}

function latestEventMap(contactKey: string, events: OutreachEvent[]) {
  const map = new Map<string, OutreachEvent>();
  events
    .filter((item) => item.contactKey === contactKey)
    .sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime())
    .forEach((item) => {
      if (!map.has(item.stepKey)) {
        map.set(item.stepKey, item);
      }
    });
  return map;
}

function addHours(value: string, hours: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function buildSequenceView(
  contactKey: string,
  sequence: OutreachSequenceStep[],
  events: OutreachEvent[],
  now: Date,
) {
  const eventMap = latestEventMap(contactKey, events);
  const built: OutreachSequenceStepView[] = [];

  sequence.forEach((step, index) => {
    const event = eventMap.get(step.key);
    if (event) {
      built.push({
        ...step,
        status: 'sent',
        sentAt: event.sentAt,
        readyAt: index === 0 ? event.sentAt : built[index - 1]?.sentAt,
      });
      return;
    }

    if (index === 0) {
      built.push({
        ...step,
        status: 'ready',
        readyAt: now.toISOString(),
      });
      return;
    }

    const previous = built[index - 1];
    if (previous?.status === 'sent' && previous.sentAt) {
      const readyAt = addHours(previous.sentAt, step.delayHours);
      const readyTime = readyAt ? new Date(readyAt).getTime() : Number.POSITIVE_INFINITY;
      built.push({
        ...step,
        status: readyTime <= now.getTime() ? 'ready' : 'scheduled',
        readyAt,
      });
      return;
    }

    built.push({
      ...step,
      status: 'locked',
    });
  });

  return built;
}

export function buildOutreachPlans(
  contacts: PipelineContact[],
  creativeLibrary: CreativeItem[],
  replacements: ComplianceReplacement[],
  outreachEvents: OutreachEvent[] = [],
) {
  const now = new Date();

  return contacts
    .map((contact) => {
      const stageBucket = stageBucketForContact(contact);
      const priorityScore = touchPriorityScore(contact, stageBucket);
      const recommendedHook = pickHook(stageBucket, creativeLibrary);
      const hookLine = recommendedHook
        ? `我最近反复看到一句话：${recommendedHook.hook} ${recommendedHook.cta}`
        : '我更关心的是把你现在最接近现金回流的动作排出来。';

      const rawSequence =
        stageBucket === 'payment'
          ? buildPaymentSequence(contact, hookLine, replacements)
          : stageBucket === 'booking'
            ? buildBookingSequence(contact, hookLine, replacements)
            : stageBucket === 'qualification'
              ? buildQualificationSequence(contact, hookLine, replacements)
              : buildCompletedSequence(contact, hookLine, replacements);

      const sequence = buildSequenceView(contact.key, rawSequence, outreachEvents, now);

      const immediateActionLabel =
        contact.intelligenceAction === 'handoff_to_closer'
          ? '优先走 closer 成交链路'
          : contact.intelligenceAction === 'rerank_catalog'
            ? '优先执行推荐重排'
            : contact.intelligenceAction === 'open_micro_prompt'
              ? '先补关键信息'
              : stageBucket === 'payment'
                ? '先确认到账，再开通 credits 和 onboarding'
                : stageBucket === 'booking'
                  ? '先锁定诊断时间，再会后推进成交'
                  : stageBucket === 'qualification'
                    ? '先完成资格判断，再推预约或 Pro / Max'
                    : '先做复盘，再争取续费、扩容或转介绍';

      const primaryChannelLabel = inferPrimaryChannel(contact, stageBucket);
      const readyStep = sequence.find((step) => step.status === 'ready') || null;
      const nextStep = readyStep || sequence.find((step) => step.status === 'scheduled') || null;
      const sentSteps = sequence.filter((step) => step.status === 'sent');
      const scheduledSteps = sequence.filter((step) => step.status === 'scheduled');
      const readySteps = sequence.filter((step) => step.status === 'ready');
      const lastSentAt = sentSteps
        .map((step) => step.sentAt)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
        .at(0);

      return {
        contact,
        stageBucket,
        priorityScore,
        immediateActionLabel,
        primaryChannelLabel,
        recommendedHook,
        recommendedHookLine: hookLine,
        sequence,
        readyStep,
        nextStep,
        sentCount: sentSteps.length,
        readyCount: readySteps.length,
        scheduledCount: scheduledSteps.length,
        lastSentAt,
        batchSubject: readyStep?.subject || sequence[0]?.subject || '',
        batchEmail: readyStep?.body || sequence[0]?.body || '',
        batchDm: readyStep?.body || sequence[1]?.body || sequence[0]?.body || '',
        batchSequence: sequence
          .map((step, index) => {
            const statusLabel =
              step.status === 'sent'
                ? `已发 ${step.sentAt || ''}`
                : step.status === 'ready'
                  ? '现在可发'
                  : step.status === 'scheduled'
                    ? `待跟进 ${step.readyAt || ''}`
                    : '未解锁';
            return `${index + 1}. ${step.whenLabel} | ${step.channel} | ${step.label} | ${statusLabel}\nSubject: ${step.subject}\n${step.body}`;
          })
          .join('\n\n'),
      } satisfies OutreachPlan;
    })
    .sort((left, right) => {
      if (Boolean(left.readyStep) !== Boolean(right.readyStep)) {
        return left.readyStep ? -1 : 1;
      }
      return right.priorityScore - left.priorityScore;
    });
}

export function channelBucketForOutreachLabel(label: string): OutreachChannelBucket {
  const normalized = label.toLowerCase();
  if (normalized.includes('邮件') && (normalized.includes('微信') || normalized.includes('飞书') || normalized.includes('x'))) {
    return 'hybrid';
  }
  if (normalized.includes('邮件')) {
    return 'email';
  }
  return 'dm';
}

export function filterOutreachPlans(plans: OutreachPlan[], filters: OutreachFilters) {
  const stageFilter =
    filters.stage === 'payment' ||
    filters.stage === 'booking' ||
    filters.stage === 'qualification' ||
    filters.stage === 'completed'
      ? filters.stage
      : 'all';
  const channelFilter =
    filters.channel === 'email' || filters.channel === 'dm' || filters.channel === 'hybrid'
      ? filters.channel
      : 'all';
  const contactFilter = String(filters.contact || '').trim().toLowerCase();
  const query = String(filters.q || '').trim().toLowerCase();

  return plans.filter((plan) => {
    const stageMatches = stageFilter === 'all' ? true : plan.stageBucket === stageFilter;
    const channelMatches =
      channelFilter === 'all'
        ? true
        : channelBucketForOutreachLabel(plan.primaryChannelLabel) === channelFilter;
    const contactMatches = contactFilter
      ? `${plan.contact.key} ${plan.contact.company} ${plan.contact.email} ${plan.contact.name}`
          .toLowerCase()
          .includes(contactFilter)
      : true;
    const text = [
      plan.contact.company,
      plan.contact.name,
      plan.contact.email,
      plan.contact.summary,
      plan.contact.nextAction,
      plan.contact.taskPlaybookLabel,
      plan.contact.taskStepLabel,
      plan.immediateActionLabel,
      plan.recommendedHook?.hook || '',
      plan.recommendedHook?.body || '',
      ...plan.sequence.map((item) => `${item.subject} ${item.body}`),
    ]
      .join(' ')
      .toLowerCase();
    const queryMatches = query ? text.includes(query) : true;
    return stageMatches && channelMatches && contactMatches && queryMatches;
  });
}

function csvEscape(value: string | number) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildOutreachCsv(plans: OutreachPlan[]) {
  const headers = [
    'company',
    'contact_name',
    'email',
    'stage',
    'primary_channel',
    'immediate_action',
    'ready_status',
    'ready_step',
    'ready_at',
    'last_sent_at',
    'subject',
  ];

  const rows = plans.map((plan) => [
    plan.contact.company,
    plan.contact.name,
    plan.contact.email,
    plan.contact.stageLabel,
    plan.primaryChannelLabel,
    plan.immediateActionLabel,
    plan.readyStep ? 'ready' : plan.nextStep ? 'scheduled' : 'completed',
    plan.readyStep?.label || plan.nextStep?.label || '',
    plan.readyStep?.readyAt || plan.nextStep?.readyAt || '',
    plan.lastSentAt || '',
    plan.readyStep?.subject || plan.nextStep?.subject || '',
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function buildOutreachBatchBundle(plans: OutreachPlan[]): OutreachBatchBundle {
  const readyPlans = plans.filter((plan) => plan.readyStep).slice(0, 5);
  const scheduledPlans = plans.filter((plan) => !plan.readyStep && plan.nextStep).slice(0, 3);

  const summaryLines: string[] = [];

  if (readyPlans.length) {
    summaryLines.push('今日可直接发送：');
    summaryLines.push(
      ...readyPlans.map(
        (plan, index) =>
          `${index + 1}. ${plan.contact.company} | ${plan.contact.stageLabel} | ${plan.readyStep?.label || '当前步骤'} | ${plan.immediateActionLabel}`,
      ),
    );
  }

  if (scheduledPlans.length) {
    summaryLines.push('');
    summaryLines.push('排队中的下一步：');
    summaryLines.push(
      ...scheduledPlans.map(
        (plan, index) =>
          `${index + 1}. ${plan.contact.company} | ${plan.nextStep?.label || '下一步'} | 预计 ${plan.nextStep?.readyAt || '待上一步完成'} 可发`,
      ),
    );
  }

  return {
    queueSummary: summaryLines.filter(Boolean).join('\n') || '当前没有可触达联系人。',
    emailBundle: readyPlans.length
      ? readyPlans
          .map(
            (plan) =>
              `## ${plan.contact.company}\nSubject: ${plan.readyStep?.subject || plan.batchSubject}\n${plan.readyStep?.body || plan.batchEmail}`,
          )
          .join('\n\n')
      : '当前没有可批量发送的邮件。',
    dmBundle: readyPlans.length
      ? readyPlans
          .map((plan) => `## ${plan.contact.company}\n${plan.readyStep?.body || plan.batchDm}`)
          .join('\n\n')
      : '当前没有可批量发送的私信。',
    sequenceBundle: readyPlans.length
      ? readyPlans
          .map((plan) => `## ${plan.contact.company}\n${plan.batchSequence}`)
          .join('\n\n')
      : '当前没有可复制的序列。',
  };
}
