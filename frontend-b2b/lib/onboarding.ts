import { getPlanById, normalizePlanId, type PlanId } from './pricing';

export type OnboardingInput = {
  title: string;
  detail: string;
};

export type OnboardingTrack = {
  planId: PlanId;
  planName: string;
  primaryOutcome: string;
  timeToValue: string;
  founderInputs: OnboardingInput[];
  first24Hours: string[];
  deliverables: string[];
  weekOneMilestones: string[];
  successChecks: string[];
};

const SHARED_INPUTS: OnboardingInput[] = [
  {
    title: '一句话卖点',
    detail: '你卖什么、卖给谁、为什么现在就要买，用一句话说清楚。',
  },
  {
    title: '目标客户画像',
    detail: '给出最想成交的 1-2 类客户、客单价、常见痛点和购买触发条件。',
  },
  {
    title: '当前入口',
    detail: '提供现有官网、落地页、社媒主页、预约链接或支付方式，方便串成闭环。',
  },
  {
    title: '支付与交付方式',
    detail: '说明你现在如何收款、是否需要发票、以及客户付款后要交付什么结果。',
  },
  {
    title: '内容素材',
    detail: '提供过往成交案例、用户评价、演示截图、FAQ 或 founder 观点，拿来做信任层。',
  },
  {
    title: '工具权限',
    detail: '如果需要更快上线，请准备域名、收款信息、通知入口和团队联系人。',
  },
];

const PLAN_TRACKS: Record<PlanId, Omit<OnboardingTrack, 'planId' | 'planName' | 'founderInputs'>> = {
  free: {
    primaryOutcome: '先把第一条线索、支付和交付链路跑通。',
    timeToValue: '24 小时内拿到可用页面和一条可测试入口。',
    first24Hours: [
      '确认产品定位、主力卖点和首个实验方向。',
      '开通交付包，接好基础支付和线索导出能力。',
      '上线一个可分享的测试页，开始收第一批反馈。',
    ],
    deliverables: [
      '1 个可用交付包',
      '基础支付 / 线索导出入口',
      '首个实验页与 CTA 入口',
      '免费体验额度分配建议',
    ],
    weekOneMilestones: [
      '发出第一轮种子触达或内容分发。',
      '记录首批点击、预约或回复信号。',
      '判断是否值得升级到标准包跑稳定闭环。',
    ],
    successChecks: [
      '已经有可发出去的链接',
      '支付与表单链路可自测',
      '知道下一步是继续试跑还是继续充值放量',
    ],
  },
  pro: {
    primaryOutcome: '把上线、支付、获客和转化串成一条可复用的主力漏斗。',
    timeToValue: '24 小时内完成开通，7 天内跑出首批真实触达和回款信号。',
    first24Hours: [
      '确认首笔款项并发放 LP Coin。',
      '接好支付、线索导出、通知链路和首个主力 CTA。',
      '把 ICP、外联角度、实验页和跟进动作接进同一条 funnel。',
    ],
    deliverables: [
      'LP Coin 配置与使用建议',
      '主力 landing page / 预约 / 支付闭环',
      '首批 ICP、外联角度与跟进节奏',
      '经营看板与首周复盘框架',
    ],
    weekOneMilestones: [
      '发出第一轮高意向触达并记录日志。',
      '拿到首批预约、付款意向或明确拒绝理由。',
      '复盘 credits 消耗、渠道效率和最短回款路径。',
    ],
    successChecks: [
      '至少 1 条漏斗能重复执行',
      '知道哪些动作该自动化，哪些保留 founder 亲自做',
      '能判断续费风险和升级企业包的时机',
    ],
  },
  max: {
    primaryOutcome: '把多产品、多序列、多 agent 的增长动作提速到可规模化经营。',
    timeToValue: '24 小时内完成高配开通，7 天内形成多线程执行和复盘节奏。',
    first24Hours: [
      '确认首笔款项并发放 LP Coin。',
      '接好批量执行、通知推送、协作空间与高频自动化动作。',
      '为多产品或多客户建立独立队列、内容库和转化动作。',
    ],
    deliverables: [
      'LP Coin 与多队列分配方案',
      '批量执行 / 通知推送 / 团队协作配置',
      '多产品实验页和分渠道外联框架',
      '续费、扩容、转介绍经营节奏',
    ],
    weekOneMilestones: [
      '跑出多线程外联与跟进记录。',
      '拿到首批跨产品或跨客户的成交信号。',
      '建立周度运营复盘和扩容决策机制。',
    ],
    successChecks: [
      '至少 2 条队列同时推进',
      '有明确的扩容、续费或转介绍动作',
      'Founder 不再被重复执行拖住',
    ],
  },
};

export function getOnboardingTrack(plan?: string): OnboardingTrack {
  const planId = normalizePlanId(plan);
  const pricingPlan = getPlanById(planId);
  const track = PLAN_TRACKS[planId];

  return {
    planId,
    planName: pricingPlan.name,
    founderInputs: SHARED_INPUTS,
    ...track,
  };
}

export function buildOnboardingIntakeTemplate(args: {
  plan?: string;
  company?: string;
  email?: string;
}) {
  const track = getOnboardingTrack(args.plan);

  return [
    'LeadPulse 启动资料',
    `- 方案：${track.planName}`,
    `- 公司 / 项目：${args.company || '待填写'}`,
    `- 联系邮箱：${args.email || '待填写'}`,
    '- 一句话卖点：',
    '- 目标客户画像：',
    '- 当前流量 / 内容入口：',
    '- 当前支付方式：',
    '- 计划交付什么：',
    '- 当前最大瓶颈：',
    '- 需要接入的域名、部署或通知方式：',
  ].join('\n');
}
