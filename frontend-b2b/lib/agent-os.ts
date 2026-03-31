import {
  readComplianceLibrary,
  readCreativeLibrary,
  readExperimentPages,
  readLatestKeywordUniverse,
  type CreativeItem,
  type ExperimentPage,
} from './marketing';
import { readAgentRuntimeSnapshot, type AgentRuntimeSnapshot } from './agent-runtime';
import { readOpsDashboardData } from './ops';
import { buildOutreachPlans, type OutreachPlan } from './outreach';
import { readOutreachEvents } from './outreach-log';
import { readPipelineSnapshot, type PipelineContact } from './pipeline';
import { readSelfGrowthSummary } from './self-growth';
import { isTaskOverdue } from './task-automation';
import { readFollowUpTasks, type FollowUpTask } from './tasks';

export type AgentId = 'scout' | 'closer' | 'content' | 'ops';
export type AgentHealth = 'healthy' | 'watch' | 'blocked';
export type SkillStatus = 'ready' | 'watch' | 'blocked';
export type QueueStatus = 'ready' | 'watch' | 'blocked';
export type QueuePriority = 'high' | 'medium' | 'low';

export type AgentSkill = {
  id: string;
  agentId: AgentId;
  label: string;
  description: string;
  inputLabel: string;
  outputLabel: string;
  backlogCount: number;
  sourceLabel: string;
  status: SkillStatus;
};

export type AgentQueueItem = {
  id: string;
  agentId: AgentId;
  title: string;
  context: string;
  nextAction: string;
  sourceLabel: string;
  link: string;
  priority: QueuePriority;
  status: QueueStatus;
  dueAt?: string;
};

export type AgentUnit = {
  id: AgentId;
  name: string;
  role: string;
  modeLabel: string;
  summary: string;
  health: AgentHealth;
  focus: string;
  queueCount: number;
  readyCount: number;
  blockedCount: number;
  skills: AgentSkill[];
  metrics: string[];
};

export type AgentMemoryCard = {
  label: string;
  value: string;
  helper: string;
  status: QueueStatus | 'neutral';
};

export type AgentWorkspaceSummary = {
  activeAgents: number;
  totalSkills: number;
  readyQueue: number;
  watchQueue: number;
  blockedQueue: number;
  highPriorityQueue: number;
};

export type AgentWorkspace = {
  summary: AgentWorkspaceSummary;
  agents: AgentUnit[];
  queueByAgent: Record<AgentId, AgentQueueItem[]>;
  topDispatch: AgentQueueItem[];
  memory: AgentMemoryCard[];
  runtime: AgentRuntimeSnapshot | null;
  prompts: Array<{
    id: string;
    label: string;
    helper: string;
    value: string;
  }>;
};

function priorityScore(priority: QueuePriority) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function compareQueueItems(left: AgentQueueItem, right: AgentQueueItem) {
  const priorityDelta = priorityScore(right.priority) - priorityScore(left.priority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const statusOrder = { blocked: 3, ready: 2, watch: 1 };
  const statusDelta = statusOrder[right.status] - statusOrder[left.status];
  if (statusDelta !== 0) {
    return statusDelta;
  }

  const leftDueAt = left.dueAt ? new Date(left.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const rightDueAt = right.dueAt ? new Date(right.dueAt).getTime() : Number.POSITIVE_INFINITY;
  return leftDueAt - rightDueAt;
}

function sliceSortedQueue(items: AgentQueueItem[], limit = 5) {
  return [...items].sort(compareQueueItems).slice(0, limit);
}

function healthFromQueue(items: AgentQueueItem[]) {
  const blockedCount = items.filter((item) => item.status === 'blocked').length;
  const readyCount = items.filter((item) => item.status === 'ready').length;

  if (blockedCount > 0) return 'blocked' as const;
  if (readyCount === 0) return 'watch' as const;
  return 'healthy' as const;
}

function buildFounderPrompt(company: string, stageLabel: string, recommendedPlanLabel: string, nextAction: string) {
  return `你是 LeadPulse 的 founder-operator。现在请围绕这个联系人生成一封更短、更有信任感的触达邮件。\n\n联系人：${company}\n当前阶段：${stageLabel}\n推荐方案：${recommendedPlanLabel}\n下一步：${nextAction}\n\n要求：\n1. 不要夸张承诺；\n2. 强调更快上线、接入支付、导出代码、credits-first；\n3. 给出一个明确 CTA；\n4. 中文输出。`;
}

function buildLandingPagePrompt(topExperiment: ExperimentPage | undefined, topKeywords: string[]) {
  return `请基于以下信息，写一个面向 ${topExperiment?.persona || '独立开发者 / 微型 SaaS'} 的高转化销售页结构：\n\n标题：${topExperiment?.title || 'LeadPulse 销售页'}\n摘要：${topExperiment?.summary || '更快上线、支付、导出代码与增长'}\n核心交付：${topExperiment?.deliverables.join('、') || '目标池、触达文案、预约节奏'}\n高意图关键词：${topKeywords.join('、')}\n\n要求：\n1. 先痛点，后方案，再 CTA；\n2. 避免“保证”“稳赚”这类表达；\n3. 输出中文分节结构。`;
}

function buildContentPrompt(topKeywords: string[]) {
  return `请给 LeadPulse 生成 10 条创始人风格内容选题。\n\n目标受众：独立开发者、indie hacker、微型 SaaS 创业者、agency\n产品钩子：更快上线、Stripe 支付、一键部署、导出代码 / sync GitHub、credits-first\n可参考关键词：${topKeywords.join('、')}\n\n要求：\n1. 每条都要有痛点钩子；\n2. 适合发小红书 / X / 微信；\n3. 中文输出。`;
}

function contactLink(contact: Pick<PipelineContact, 'company'>) {
  return `/dashboard/leads?q=${encodeURIComponent(contact.company)}`;
}

function queueItemFromContact(
  agentId: AgentId,
  contact: PipelineContact,
  title: string,
  sourceLabel: string,
  priority: QueuePriority,
  status: QueueStatus,
  nextAction: string,
): AgentQueueItem {
  return {
    id: `${agentId}-${contact.key}-${title}`,
    agentId,
    title,
    context: `${contact.company} · ${contact.stageLabel}`,
    nextAction,
    sourceLabel,
    link: contactLink(contact),
    priority,
    status,
    dueAt: contact.latestPendingTaskDueAt,
  };
}

function queueItemFromTask(agentId: AgentId, task: FollowUpTask, status: QueueStatus): AgentQueueItem {
  return {
    id: `${agentId}-${task.id}`,
    agentId,
    title: task.title,
    context: `${task.company} · ${task.stage}`,
    nextAction: task.detail,
    sourceLabel: `${task.playbookId || task.sourceKind} · ${task.channel}`,
    link: `/dashboard/tasks?q=${encodeURIComponent(task.company)}`,
    priority: task.priority,
    status,
    dueAt: task.dueAt,
  };
}

function queueItemFromOutreach(plan: OutreachPlan): AgentQueueItem {
  const step = plan.readyStep || plan.nextStep;
  return {
    id: `closer-${plan.contact.key}-${step?.key || 'sequence'}`,
    agentId: 'closer',
    title: `${plan.contact.company} · ${step?.label || '序列推进'}`,
    context: `${plan.contact.name} · ${plan.primaryChannelLabel}`,
    nextAction: plan.immediateActionLabel,
    sourceLabel: `触达序列 · ${plan.stageBucket}`,
    link: `/dashboard/emails?contact=${encodeURIComponent(plan.contact.company)}`,
    priority: plan.stageBucket === 'payment' ? 'high' : plan.stageBucket === 'booking' ? 'medium' : 'low',
    status: plan.readyStep ? 'ready' : plan.scheduledCount > 0 ? 'watch' : 'blocked',
    dueAt: plan.readyStep?.readyAt || plan.nextStep?.readyAt,
  };
}

export async function readAgentWorkspace(): Promise<AgentWorkspace> {
  const [
    pipeline,
    creativeLibrary,
    complianceLibrary,
    experiments,
    keywordUniverse,
    ops,
    selfGrowth,
    tasks,
    outreachEvents,
    runtimeSnapshot,
  ] = await Promise.all([
    readPipelineSnapshot(),
    readCreativeLibrary(),
    readComplianceLibrary(),
    readExperimentPages(),
    readLatestKeywordUniverse(),
    readOpsDashboardData(),
    readSelfGrowthSummary(),
    readFollowUpTasks(),
    readOutreachEvents(),
    readAgentRuntimeSnapshot(),
  ]);

  const outreachPlans = buildOutreachPlans(
    pipeline.contacts,
    creativeLibrary.creatives,
    complianceLibrary.replacements,
    outreachEvents,
  );

  const pendingTasks = tasks.filter((item) => item.status !== 'completed');
  const overdueTasks = pendingTasks.filter((item) => isTaskOverdue(item));
  const qualificationContacts = pipeline.contacts.filter((item) => item.stageLabel.includes('待资格判断'));
  const bookingContacts = pipeline.contacts.filter((item) => item.stageLabel.includes('待确认诊断'));
  const paymentContacts = pipeline.contacts.filter((item) => item.stageLabel.includes('待确认收款'));
  const readyOutreachPlans = outreachPlans.filter((item) => item.readyStep);
  const scheduledOutreachPlans = outreachPlans.filter((item) =>
    item.sequence.some((step) => step.status === 'scheduled'),
  );
  const readyCreatives = creativeLibrary.creatives.filter((item) => item.status === 'ready');
  const draftCreatives = creativeLibrary.creatives.filter((item) => item.status !== 'ready');
  const topKeywords = keywordUniverse.keywords.slice(0, 6).map((item) => item.keyword);
  const topContact = pipeline.contacts[0];
  const topExperiment = experiments[0];

  const scoutSkills: AgentSkill[] = [
    {
      id: 'keyword-harvest',
      agentId: 'scout',
      label: 'Keyword Harvest',
      description: '持续抓高意图搜索词，避免靠感觉选赛道。',
      inputLabel: '关键词池 / 搜索数据',
      outputLabel: '方向优先级 / SEO 入口',
      backlogCount: keywordUniverse.total_keywords,
      sourceLabel: 'marketing/keyword_universe',
      status: keywordUniverse.total_keywords > 0 ? 'ready' : 'blocked',
    },
    {
      id: 'account-prioritizer',
      agentId: 'scout',
      label: 'Account Prioritizer',
      description: '把高分账号排进外联队列，先打最可能回款的目标。',
      inputLabel: 'self-growth summary',
      outputLabel: '目标池 / 下一步动作',
      backlogCount: selfGrowth.queued_accounts,
      sourceLabel: 'self_growth/summary',
      status: selfGrowth.queued_accounts > 0 ? 'ready' : 'watch',
    },
    {
      id: 'icp-qualification',
      agentId: 'scout',
      label: 'ICP Qualification',
      description: '把设计伙伴和未成交线索快速分成能约、能卖、先 nurture。',
      inputLabel: '线索 / 资格任务',
      outputLabel: '销售优先级',
      backlogCount: qualificationContacts.length,
      sourceLabel: 'pipeline + tasks',
      status: qualificationContacts.length > 0 ? 'ready' : 'watch',
    },
  ];

  const closerSkills: AgentSkill[] = [
    {
      id: 'sequence-personalizer',
      agentId: 'closer',
      label: 'Sequence Personalizer',
      description: '把每个联系人变成可直接发出的邮件 / 私信序列。',
      inputLabel: '线索 / 素材 / 合规词',
      outputLabel: 'ready 序列',
      backlogCount: outreachPlans.length,
      sourceLabel: 'outreach plans',
      status: outreachPlans.length > 0 ? 'ready' : 'blocked',
    },
    {
      id: 'booking-close',
      agentId: 'closer',
      label: 'Booking Close',
      description: '把有兴趣但未约上的联系人推进到真实通话。',
      inputLabel: '预约线索',
      outputLabel: '已锁定时间 / 已通话',
      backlogCount: bookingContacts.length,
      sourceLabel: 'pipeline booking queue',
      status: bookingContacts.length > 0 ? 'ready' : 'watch',
    },
    {
      id: 'payment-push',
      agentId: 'closer',
      label: 'Payment Push',
      description: '优先把已接近成交的人推进到账。',
      inputLabel: '付款意向 / 异议',
      outputLabel: '到账 / onboarding',
      backlogCount: paymentContacts.length,
      sourceLabel: 'pipeline payment queue',
      status: paymentContacts.length > 0 ? 'ready' : 'watch',
    },
  ];

  const contentSkills: AgentSkill[] = [
    {
      id: 'experiment-cloner',
      agentId: 'content',
      label: 'Experiment Cloner',
      description: '围绕不同 ICP 复制实验页，扩大自然搜索与定向入口。',
      inputLabel: '实验页模板',
      outputLabel: '新落地页 / 新钩子',
      backlogCount: experiments.length,
      sourceLabel: 'marketing/experiment_pages',
      status: experiments.length > 0 ? 'ready' : 'watch',
    },
    {
      id: 'creative-remix',
      agentId: 'content',
      label: 'Creative Remix',
      description: '把现有素材改造成更多平台可用的内容角度。',
      inputLabel: '广告素材库',
      outputLabel: 'ready creatives',
      backlogCount: draftCreatives.length,
      sourceLabel: 'creative_library',
      status: draftCreatives.length > 0 ? 'ready' : 'watch',
    },
    {
      id: 'compliance-rewrite',
      agentId: 'content',
      label: 'Compliance Rewrite',
      description: '把风险表达改成更稳的增长表述，降低误导和封禁风险。',
      inputLabel: '风险词库',
      outputLabel: '安全文案',
      backlogCount: complianceLibrary.replacements.length,
      sourceLabel: 'compliance_replacements',
      status: complianceLibrary.replacements.length > 0 ? 'ready' : 'blocked',
    },
  ];

  const opsSkills: AgentSkill[] = [
    {
      id: 'task-scheduler',
      agentId: 'ops',
      label: 'Task Scheduler',
      description: '确保跟进链路不断，逾期先被创始人看到。',
      inputLabel: 'follow_up_tasks',
      outputLabel: '下一步任务 / 逾期预警',
      backlogCount: pendingTasks.length,
      sourceLabel: 'ops/follow_up_tasks',
      status: pendingTasks.length > 0 ? 'ready' : 'watch',
    },
    {
      id: 'renewal-watch',
      agentId: 'ops',
      label: 'Renewal Watch',
      description: '盯住付款、onboarding、首周复盘和续费风险。',
      inputLabel: '付款任务 / retention',
      outputLabel: '续费提醒 / 扩容动作',
      backlogCount: pendingTasks.filter((item) => item.sourceKind === 'payment_intent').length,
      sourceLabel: 'payment playbook',
      status: paymentContacts.length > 0 ? 'ready' : 'watch',
    },
    {
      id: 'founder-digest',
      agentId: 'ops',
      label: 'Founder Digest',
      description: '把公开地址、任务、触达和经营指标汇总回飞书。',
      inputLabel: 'ops + outreach',
      outputLabel: 'daily digest',
      backlogCount: 1,
      sourceLabel: 'ops/automation',
      status: 'ready',
    },
  ];

  const scoutQueue: AgentQueueItem[] = [
    ...selfGrowth.top_accounts.slice(0, 3).map<AgentQueueItem>((account) => ({
      id: `scout-account-${account.account_id}`,
      agentId: 'scout' as const,
      title: `优先侦察 ${account.company_name}`,
      context: `${account.segment} · score ${account.blended_score}`,
      nextAction: account.next_action,
      sourceLabel: 'self growth account',
      link: `/dashboard/leads?q=${encodeURIComponent(account.company_name)}`,
      priority: account.priority === 'high' ? 'high' : 'medium',
      status: 'ready' as const,
    })),
    ...qualificationContacts.slice(0, 2).map((contact) =>
      queueItemFromContact(
        'scout',
        contact,
        '完成资格判断',
        '设计伙伴 / 资格任务',
        contact.overdueTaskCount > 0 ? 'high' : 'medium',
        contact.overdueTaskCount > 0 ? 'blocked' : 'ready',
        contact.nextAction,
      ),
    ),
  ];

  const closerQueue: AgentQueueItem[] = [
    ...readyOutreachPlans.slice(0, 3).map(queueItemFromOutreach),
    ...paymentContacts.slice(0, 2).map((contact) =>
      queueItemFromContact(
        'closer',
        contact,
        '推进收款确认',
        '付款优先队列',
        'high',
        contact.overdueTaskCount > 0 ? 'blocked' : 'ready',
        contact.nextAction,
      ),
    ),
    ...bookingContacts.slice(0, 2).map((contact) =>
      queueItemFromContact(
        'closer',
        contact,
        '锁定诊断时间',
        '预约推进队列',
        'medium',
        contact.overdueTaskCount > 0 ? 'blocked' : 'watch',
        contact.nextAction,
      ),
    ),
  ];

  const topDirections = Object.entries(keywordUniverse.directions)
    .sort((left, right) => right[1].top_keyword_count - left[1].top_keyword_count)
    .slice(0, 2);

  const contentQueue: AgentQueueItem[] = [
    ...topDirections.map(([key, item]) => ({
      id: `content-direction-${key}`,
      agentId: 'content' as const,
      title: `扩写 ${item.name} 方向`,
      context: `Top 词 ${item.top_keyword_count} · Seed ${item.seed_count}`,
      nextAction: `围绕 ${item.name} 再补 1 个实验页 + 3 条内容角度。`,
      sourceLabel: 'keyword direction',
      link: '/experiments',
      priority: 'medium' as const,
      status: 'ready' as const,
    })),
    ...experiments.slice(0, 2).map((item) => ({
      id: `content-experiment-${item.slug}`,
      agentId: 'content' as const,
      title: `继续打磨 ${item.title}`,
      context: item.persona,
      nextAction: `补充 ${item.keywords.slice(0, 3).join(' / ')} 对应的 SEO 与公域素材。`,
      sourceLabel: 'experiment page',
      link: `/experiments/${item.slug}`,
      priority: 'medium' as const,
      status: 'watch' as const,
    })),
    ...draftCreatives.slice(0, 2).map((item) => ({
      id: `content-creative-${item.id}`,
      agentId: 'content' as const,
      title: `把素材改成 ready：${item.hook}`,
      context: `${item.channel} · ${item.angle}`,
      nextAction: item.cta,
      sourceLabel: 'creative library',
      link: '/dashboard/emails',
      priority: 'low' as const,
      status: 'watch' as const,
    })),
  ];

  const opsQueue: AgentQueueItem[] = [
    ...overdueTasks.slice(0, 3).map((task) => queueItemFromTask('ops', task, 'blocked')),
    ...pendingTasks
      .filter((item) => item.sourceKind === 'payment_intent')
      .slice(0, 2)
      .map((task) => queueItemFromTask('ops', task, 'ready')),
    {
      id: 'ops-usdc-experiment',
      agentId: 'ops',
      title: '复盘 USDC 收款灰度',
      context: `状态：${ops.usdcExperiment.status}`,
      nextAction: ops.usdcExperiment.next_step || '把 USDC 与传统支付转化差异写进经营复盘。',
      sourceLabel: 'manual kpis',
      link: '/ops',
      priority: 'low' as const,
      status: ops.usdcExperiment.status === 'test-ready' ? 'watch' : 'ready',
    },
  ];

  const queueByAgent: Record<AgentId, AgentQueueItem[]> = {
    scout: sliceSortedQueue(scoutQueue),
    closer: sliceSortedQueue(closerQueue),
    content: sliceSortedQueue(contentQueue),
    ops: sliceSortedQueue(opsQueue),
  };

  const agentConfigs: Array<{
    id: AgentId;
    name: string;
    role: string;
    modeLabel: string;
    summary: string;
    focus: string;
    skills: AgentSkill[];
    metrics: string[];
  }> = [
    {
      id: 'scout',
      name: 'Scout Agent',
      role: '找方向 / 找账号 / 判断 ICP',
      modeLabel: 'Search / Enrich / Qualify',
      summary: '负责找到值得卖的人，而不是盲目扩量。',
      focus: qualificationContacts[0]?.company
        ? `今天优先看 ${qualificationContacts[0].company} 这类未成交线索。`
        : '先扩关键词池和高分账号，再补资格判断。',
      skills: scoutSkills,
      metrics: [
        `关键词 ${keywordUniverse.total_keywords}`,
        `待侦察账号 ${selfGrowth.queued_accounts}`,
        `待资格判断 ${qualificationContacts.length}`,
      ],
    },
    {
      id: 'closer',
      name: 'Closer Agent',
      role: '触达 / 跟进 / 预约 / 收款',
      modeLabel: 'Sequence / Follow-up / Close',
      summary: '负责把“有兴趣”变成“已预约 / 已付款”。',
      focus: readyOutreachPlans[0]?.contact.company
        ? `先把 ${readyOutreachPlans[0].contact.company} 的 ready 序列发掉。`
        : '先清付款和预约队列，再释放新的外联动作。',
      skills: closerSkills,
      metrics: [
        `ready 触达 ${readyOutreachPlans.length}`,
        `待确认诊断 ${bookingContacts.length}`,
        `待确认收款 ${paymentContacts.length}`,
      ],
    },
    {
      id: 'content',
      name: 'Content Agent',
      role: 'SEO / 实验页 / 素材 / 合规',
      modeLabel: 'SEO / Landing / Creative',
      summary: '负责持续产出能带来搜索和信任的资产。',
      focus: topExperiment?.title
        ? `优先把 ${topExperiment.title} 扩成更强的测试页入口。`
        : '先补关键词和实验页，再扩内容资产。',
      skills: contentSkills,
      metrics: [
        `实验页 ${experiments.length}`,
        `ready 素材 ${readyCreatives.length}`,
        `草稿素材 ${draftCreatives.length}`,
      ],
    },
    {
      id: 'ops',
      name: 'Ops Agent',
      role: '任务调度 / 续费 / 复盘 / 现金流',
      modeLabel: 'Onboarding / Retention / Review',
      summary: '负责让这家公司不会因为创始人分神就断链。',
      focus: overdueTasks[0]?.company
        ? `先清掉 ${overdueTasks[0].company} 的逾期动作。`
        : '保持日报、续费检查和经营指标同步。',
      skills: opsSkills,
      metrics: [
        `待办 ${pendingTasks.length}`,
        `逾期 ${overdueTasks.length}`,
        `跑道 ${ops.runwayMonths ? `${ops.runwayMonths} 月` : `目标 ${ops.targetRunwayMonths} 月`}`,
      ],
    },
  ];

  const agents: AgentUnit[] = agentConfigs.map((config) => {
    const queue = queueByAgent[config.id];
    const readyCount = queue.filter((item) => item.status === 'ready').length;
    const blockedCount = queue.filter((item) => item.status === 'blocked').length;
    const runtimeAgent = runtimeSnapshot?.agents.find((item) => item.id === config.id);
    const queueHealth = healthFromQueue(queue);
    const mergedHealth =
      runtimeAgent?.status === 'blocked'
        ? 'blocked'
        : runtimeAgent?.status === 'watch' && queueHealth === 'healthy'
          ? 'watch'
          : queueHealth;
    const runtimeMetrics = runtimeAgent
      ? [
          `RAG ${runtimeAgent.knowledgeFiles}`,
          `会话 ${runtimeAgent.sessions}`,
          runtimeAgent.browserProfile ? `Browser ${runtimeAgent.browserProfile}` : 'Browser 无',
        ]
      : [];

    return {
      ...config,
      health: mergedHealth,
      queueCount: queue.length,
      readyCount,
      blockedCount,
      metrics: [...config.metrics, ...runtimeMetrics],
    };
  });

  const allQueueItems = Object.values(queueByAgent).flat();
  const topDispatch = sliceSortedQueue(allQueueItems, 8);

  const summary: AgentWorkspaceSummary = {
    activeAgents: agents.length,
    totalSkills: agents.reduce((sum, agent) => sum + agent.skills.length, 0),
    readyQueue: allQueueItems.filter((item) => item.status === 'ready').length,
    watchQueue: allQueueItems.filter((item) => item.status === 'watch').length,
    blockedQueue: allQueueItems.filter((item) => item.status === 'blocked').length,
    highPriorityQueue: allQueueItems.filter((item) => item.priority === 'high').length,
  };

  const memory: AgentMemoryCard[] = [
    {
      label: '现金跑道',
      value: ops.runwayMonths ? `${ops.runwayMonths} 月` : `目标 ${ops.targetRunwayMonths} 月`,
      helper: 'Founder 至少看住 6-9 个月现金',
      status: ops.runwayMonths && ops.runwayMonths < 6 ? 'blocked' : 'neutral',
    },
    {
      label: 'Ready 触达',
      value: String(readyOutreachPlans.length),
      helper: '现在可以发出去的序列',
      status: readyOutreachPlans.length > 0 ? 'ready' : 'watch',
    },
    {
      label: '逾期任务',
      value: String(overdueTasks.length),
      helper: '先清逾期，再扩新动作',
      status: overdueTasks.length > 0 ? 'blocked' : 'ready',
    },
    {
      label: '内容库存',
      value: String(selfGrowth.content_backlog_items),
      helper: '可继续拆成 SEO / 社媒资产',
      status: selfGrowth.content_backlog_items > 0 ? 'ready' : 'watch',
    },
    {
      label: '高意图关键词',
      value: String(keywordUniverse.total_keywords),
      helper: topKeywords.slice(0, 3).join(' / ') || '等待更新',
      status: keywordUniverse.total_keywords > 0 ? 'ready' : 'watch',
    },
    {
      label: 'USDC 实验',
      value: ops.usdcExperiment.status,
      helper: ops.usdcExperiment.next_step || '等待下一步',
      status: ops.usdcExperiment.status === 'test-ready' ? 'watch' : 'neutral',
    },
    {
      label: 'OpenClaw Stack',
      value: runtimeSnapshot
        ? `${runtimeSnapshot.summary.readyLayers}/${runtimeSnapshot.summary.totalLayers}`
        : '未同步',
      helper: runtimeSnapshot?.openclaw.version || '先运行 runtime snapshot',
      status: runtimeSnapshot
        ? runtimeSnapshot.summary.blockedLayers > 0
          ? 'watch'
          : 'ready'
        : 'watch',
    },
    {
      label: 'RAG 记忆',
      value: runtimeSnapshot ? String(runtimeSnapshot.summary.knowledgeFiles) : '0',
      helper: runtimeSnapshot
        ? `${runtimeSnapshot.summary.agentsWithMemory} 个 agent 已有知识文件`
        : '等待同步 OpenClaw memory',
      status: runtimeSnapshot?.summary.agentsWithMemory ? 'ready' : 'watch',
    },
    {
      label: 'MCP Bridge',
      value: runtimeSnapshot?.summary.mcpReady ? 'Ready' : 'Blocked',
      helper: runtimeSnapshot?.summary.mcpReady ? 'mcporter 已就绪' : 'mcporter 还没装好',
      status: runtimeSnapshot
        ? runtimeSnapshot.summary.mcpReady
          ? 'ready'
          : 'blocked'
        : 'watch',
    },
  ];

  const prompts = [
    {
      id: 'founder',
      label: 'Founder 触达 Prompt',
      helper: topContact
        ? `${topContact.company} · ${topContact.stageLabel} · ${topContact.recommendedPlanLabel}`
        : '等待线索数据',
      value: topContact
        ? buildFounderPrompt(
            topContact.company,
            topContact.stageLabel,
            topContact.recommendedPlanLabel,
            topContact.nextAction,
          )
        : '先补充线索数据，再生成 founder 触达 prompt。',
    },
    {
      id: 'landing',
      label: '销售页生成 Prompt',
      helper: topExperiment ? `${topExperiment.title} · ${topExperiment.persona}` : '等待实验页数据',
      value: buildLandingPagePrompt(topExperiment, topKeywords),
    },
    {
      id: 'content',
      label: '内容生成 Prompt',
      helper: '适合小红书 / X / 微信',
      value: buildContentPrompt(topKeywords),
    },
  ];

  return {
    summary,
    agents,
    queueByAgent,
    topDispatch,
    memory,
    runtime: runtimeSnapshot,
    prompts,
  };
}
