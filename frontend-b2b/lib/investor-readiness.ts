import { readAgentWorkspace } from './agent-os';
import { readExperimentPages, readLatestKeywordUniverse } from './marketing';
import { readOpsDashboardData } from './ops';
import { readOutreachEvents } from './outreach-log';
import { getPricingPlans } from './pricing';
import { readSelfGrowthSummary } from './self-growth';
import { SITE_URL } from './site';
import { MARKETING_PAGE_LINKS } from './site-marketing';

export type ReadinessStatus = 'strong' | 'watch' | 'gap';

export type ReadinessDimension = {
  id: string;
  label: string;
  score: number;
  status: ReadinessStatus;
  detail: string;
  evidence: string[];
};

export type InvestorReadiness = {
  overallScore: number;
  stageLabel: string;
  stageNote: string;
  dimensions: ReadinessDimension[];
  blockers: string[];
  milestones: string[];
  strengths: string[];
  narrative: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreStatus(score: number): ReadinessStatus {
  if (score >= 75) return 'strong';
  if (score >= 45) return 'watch';
  return 'gap';
}

function ratioScore(current: number, target: number, weight: number) {
  if (target <= 0) return 0;
  return Math.min(weight, (current / target) * weight);
}

function pageCountScore() {
  const publicPageCount = MARKETING_PAGE_LINKS.length + 5;
  return Math.min(20, publicPageCount * 2);
}

export async function readInvestorReadiness(): Promise<InvestorReadiness> {
  const [ops, selfGrowth, workspace, outreachEvents, experiments, keywords] = await Promise.all([
    readOpsDashboardData(),
    readSelfGrowthSummary(),
    readAgentWorkspace(),
    readOutreachEvents(),
    readExperimentPages(),
    readLatestKeywordUniverse(),
  ]);

  const runtime = workspace.runtime;
  const pricingPlans = getPricingPlans();

  const productScore = clamp(
    pageCountScore() +
      ratioScore(experiments.length, 4, 20) +
      ratioScore(pricingPlans.length, 3, 15) +
      (runtime ? ratioScore(runtime.summary.readyLayers, runtime.summary.totalLayers || 1, 25) : 0) +
      (ops.livePipeline.contentBacklogItems > 0 ? 20 : 8),
  );

  const distributionScore = clamp(
    ratioScore(selfGrowth.total_accounts, 50, 30) +
      ratioScore(selfGrowth.queued_accounts, 15, 25) +
      ratioScore(outreachEvents.length, 10, 20) +
      ratioScore(ops.summary.bookings7d, 5, 15) +
      ratioScore(keywords.total_keywords, 1000, 10),
  );

  const revenueScore = clamp(
    ratioScore(ops.summary.paymentIntents7d, 3, 35) +
      ratioScore(ops.summary.bookings7d, 5, 25) +
      ratioScore(ops.summary.paybackRate, 0.6, 20) +
      ratioScore(ops.summary.retentionRate, 0.5, 10) +
      ratioScore(Math.max(0, 0.1 - ops.summary.refundRate), 0.1, 10),
  );

  const automationScore = clamp(
    (runtime ? ratioScore(runtime.summary.readyLayers, runtime.summary.totalLayers || 1, 35) : 0) +
      (runtime?.summary.mcpReady ? 20 : 0) +
      (runtime?.summary.browserReady ? 15 : 0) +
      ratioScore(runtime?.summary.cronJobs || 0, 4, 15) +
      ratioScore(runtime?.summary.agentsWithMemory || 0, 4, 15),
  );

  const capitalScore = clamp(
    (ops.sampleMode ? 0 : 15) +
      (ops.cashOnHandCny ? ratioScore(ops.cashOnHandCny, 300000, 20) : 0) +
      (ops.monthlyBurnCny ? ratioScore(Math.max(0, 100000 - ops.monthlyBurnCny), 100000, 20) : 0) +
      (ops.runwayMonths ? ratioScore(ops.runwayMonths, 9, 30) : 0) +
      ratioScore(ops.targetRunwayMonths, 9, 15),
  );

  const dimensions: ReadinessDimension[] = [
    {
      id: 'product',
      label: 'Product',
      score: Math.round(productScore),
      status: scoreStatus(productScore),
      detail: '产品站、定价、实验页和内部执行层已经成型，但还需要更多真实客户反馈反哺页面。',
      evidence: [
        `${MARKETING_PAGE_LINKS.length + 5} 个公开页面节点`,
        `${experiments.length} 个实验页`,
        `${pricingPlans.length} 档价格`,
      ],
    },
    {
      id: 'distribution',
      label: 'Distribution',
      score: Math.round(distributionScore),
      status: scoreStatus(distributionScore),
      detail: '目标池、搜索数据、外联与预约已经开始闭环，但分发强度和回复量还不够大。',
      evidence: [
        `${selfGrowth.total_accounts} 个目标账户`,
        `${selfGrowth.queued_accounts} 个待外联`,
        `${outreachEvents.length} 条外联记录`,
      ],
    },
    {
      id: 'revenue',
      label: 'Revenue',
      score: Math.round(revenueScore),
      status: scoreStatus(revenueScore),
      detail: '现在更接近“开始收钱”的状态，还没到能用稳定 MRR 和留存说服投资人的程度。',
      evidence: [
        `7 天预约 ${ops.summary.bookings7d}`,
        `7 天付款意向 ${ops.summary.paymentIntents7d}`,
        `回本率 ${Math.round(ops.summary.paybackRate * 100)}%`,
      ],
    },
    {
      id: 'automation',
      label: 'Automation',
      score: Math.round(automationScore),
      status: scoreStatus(automationScore),
      detail: '多-agent、MCP、browser fallback、cron loop 已具备差异化，但还需要更稳定的实战跑数。',
      evidence: [
        runtime ? `${runtime.summary.readyLayers}/${runtime.summary.totalLayers} runtime layers ready` : 'runtime 未同步',
        runtime?.summary.mcpReady ? 'MCP ready' : 'MCP not ready',
        `${runtime?.summary.cronJobs || 0} 个自动循环`,
      ],
    },
    {
      id: 'capital',
      label: 'Capital',
      score: Math.round(capitalScore),
      status: scoreStatus(capitalScore),
      detail: '资本准备目前是最弱的一层：还需要更真实的现金、burn、runway 和客户收入数据。',
      evidence: [
        ops.runwayMonths ? `当前跑道 ${ops.runwayMonths} 月` : `目标跑道 ${ops.targetRunwayMonths} 月`,
        ops.cashOnHandCny ? `账上现金 ¥${ops.cashOnHandCny}` : '现金数据未录入',
        ops.sampleMode ? '当前仍有 sample mode 数据' : '已切到真实经营数据',
      ],
    },
  ];

  const overallScore = Math.round(
    productScore * 0.22 +
      distributionScore * 0.24 +
      revenueScore * 0.26 +
      automationScore * 0.18 +
      capitalScore * 0.1,
  );

  let stageLabel = 'Too Early';
  let stageNote = '现在更适合继续拿真实收入和案例，而不是急着大讲融资。';

  if (overallScore >= 70) {
    stageLabel = 'Pre-seed Ready';
    stageNote = '已经具备讲 pre-seed 的基础，但仍然需要更多真实收入和客户曲线支撑。';
  } else if (overallScore >= 55) {
    stageLabel = 'Angel Story';
    stageNote = '现在可以开始和天使聊，但最强动作仍然是先把收入和案例做厚。';
  } else if (overallScore >= 40) {
    stageLabel = 'Design Partner First';
    stageNote = '更应该优先卖设计伙伴和高客单服务，用真钱把故事压实。';
  }

  const blockers = [
    ...(revenueScore < 55 ? ['缺少稳定 MRR / 回款曲线，投资人会质疑只是“会做 demo”。'] : []),
    ...(capitalScore < 45 ? ['现金、burn、runway 数据还不够真实完整，资本准备不足。'] : []),
    ...(ops.sampleMode ? ['经营数据里仍有 sample mode，必须尽快切成真实数据。'] : []),
    ...(outreachEvents.length < 10 ? ['外联样本还不够多，缺少更硬的转化证据。'] : []),
  ];

  const milestones = [
    '拿下 3-5 个高质量付费客户，形成可展示的前后对比案例。',
    '把 booking -> payment intent -> paid conversion 的漏斗跑出连续两周数据。',
    '关闭 sample mode，把现金、burn、runway 和退款数据切成真实经营数据。',
    '把公开站和内部系统继续区分：客户看价值，Founder 看执行。',
    '把高客单服务收入逐步产品化成可复用套餐和平台能力。',
  ];

  const strengths = [
    '公开站已经成型，且结构比普通 AI 工具更像正式产品公司。',
    '多-agent、MCP、browser fallback、RAG 和 cron loop 已形成差异化执行层。',
    '产品已经在用自己给自己获客，这是极强的叙事基础。',
  ];

  const narrative = [
    'AI 时代做产品更便宜，但获客与成交更稀缺；LeadPulse 正在切这个稀缺层。',
    '它不是只卖功能，而是卖一套从目标池到回款的 Revenue Operating System。',
    '先用高客单服务验证，再逐步产品化，是最现实也最容易拿到真钱的路径。',
  ];

  return {
    overallScore,
    stageLabel,
    stageNote,
    dimensions,
    blockers,
    milestones,
    strengths,
    narrative,
  };
}
