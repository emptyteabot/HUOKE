export type PlanId = 'free' | 'pro' | 'max';

export type PricingPlan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  goodFor: string;
  features: string[];
  ctaLabel: string;
  paymentUrl: string;
};

export type PolicyCard = {
  title: string;
  description: string;
};

export type LegalSection = {
  title: string;
  items: string[];
};

export const CHATGPT_PLUS_PRICE_REFERENCE = 'not_used';
export const PRICING_CEILING_NOTE = '定价按三层结构设计：先看样本，再决定买软件，或者直接买人工代跑结果。';

export const TARGET_AUDIENCE_ONE_LINER =
  '面向高客单、短链路、急需稳定获客入口的小团队：留学咨询工作室、出海 SaaS 独立开发者、小型 agency、高净值知识服务操盘手。';

export const CREDITS_POLICY_CARDS: PolicyCard[] = [
  {
    title: 'Free / Pro / Max / DFY',
    description: 'Free 用于验资；Pro 卖软件使用权；Max / DFY 卖人工代跑、人工筛选与名单交付。',
  },
  {
    title: '交付边界',
    description: 'Pro 不含人工跑数、人工筛选和代发；Max / DFY 包含人工代跑、去重审查和首轮破冰动作。',
  },
  {
    title: 'Credits 只属于软件版',
    description: 'credits 只用于 Pro 内的搜索、筛选、导出和草稿消耗；DFY 服务按周期交付，不按 credits 计费。',
  },
  {
    title: '先验证再放大',
    description: '先拿样本，再决定自跑还是代跑，避免一上来买一堆用不起来的系统。',
  },
];

export const SUBSCRIPTION_POLICY = [
  'Free 只提供小规模样本验证，不收费。',
  'Pro 作为软件版交付，付款后开通，不承诺代跑。',
  'Max / DFY 为人工服务包，按约定周期交付，不走自动续费。',
];

export const CREDITS_POLICY = [
  'credits 只用于软件版的搜索、筛选、导出和消息草稿等能力消耗。',
  '每次导出会消耗 credits，并短时解锁主页与帖子链接。',
  'DFY 服务按人工交付结果计费，不按 credits 计量。',
];

export const REFERRAL_POLICY = [
  '当前默认不做公开邀请返利，涉及折扣、加量或联名合作时，以当次报价和书面确认内容为准。',
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '套餐与交付',
    items: [
      'Free：¥0 / 样本，展示 5-10 条真实样本线索，用于证明系统具有抓取能力，不开放完整大盘。',
      'Pro：¥299 / 月，属于纯软件订阅，交付线索控制台、筛选、导出和基础消息草稿，不包含人工跑数、人工审查和代发。',
      'Max / DFY：¥3999 / 周期，属于人工代跑服务包，包含人工系统代跑、名单清洗去重、每周交付和首轮破冰动作。',
      '付款前页面展示的是标准范围；若涉及定制脚本、私有数据源或额外交付，最终以当次报价和确认内容为准。',
    ],
  },
  {
    title: '平台风险与使用边界',
    items: [
      'Pro 用户自行承担平台账号环境、风控规则、发送频率和触达合规责任。',
      'LeadPulse 不承诺固定营收、固定回复率或固定成交结果；我们交付的是更高效率的高意图名单和更短的触达路径。',
      '若客户要求我们代发、代跑或代筛，默认进入 Max / DFY 边界，不再按纯软件版解释。',
    ],
  },
  {
    title: '付款、续期与取消',
    items: [
      'Free 无需付款；Pro 和 Max / DFY 付款后开通，不默认自动续费。',
      'Pro 续期时重新购买下一周期；Max / DFY 续做时重新确认交付范围和周期。',
      '已实际交付的软件权益、人工跑数、人工筛选和代发动作，通常不支持按天退款；异常重复收款或明确系统错误可人工复核。',
    ],
  },
  {
    title: '数据与导出',
    items: [
      '客户在 LeadPulse 中导出的线索、筛选结果和触达草稿，仅供其自身业务使用，不得公开转售或批量转卖。',
      '为保障稳定性与风控，平台会保留必要的运行日志、导出记录和账务记录。',
      '账号终止前，客户应自行导出关键名单和配置；超出保留期后，历史运行数据可能被清理。',
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '我们收集什么',
    items: [
      '你主动提交的姓名、邮箱、公司、网站、预约信息、付款信息和当前获客目标。',
      '与你的样本申请、导出、付款、开通、交付和后续沟通相关的必要记录。',
      '用于风控、限频、审计和通知的基础访问日志与事件记录。',
    ],
  },
  {
    title: '我们如何使用这些信息',
    items: [
      '用于开通 Free / Pro / Max 方案、处理预约、付款和交付。',
      '用于生成样本、筛选名单、安排 DFY 交付，并在必要时联系你确认范围与风险边界。',
      '用于改进筛选质量和控制误用风险，不会出售你的个人信息。',
    ],
  },
  {
    title: '导出与删除',
    items: [
      '你可以请求导出与你账户相关的关键记录和交付结果。',
      '你可以请求更正或删除部分个人数据；但出于结算、风控和审计需要，部分记录可能依法保留。',
    ],
  },
];

function paymentUrlFor(planId: PlanId) {
  if (planId === 'free') {
    return process.env.NEXT_PUBLIC_FREE_SIGNUP_URL || '/register?plan=free';
  }

  if (planId === 'max') {
    return process.env.NEXT_PUBLIC_MAX_PAYMENT_URL || '/book?plan=max';
  }

  return process.env.NEXT_PUBLIC_PRO_PAYMENT_URL || '/pay?plan=pro';
}

export function normalizePlanId(plan?: string): PlanId {
  if (!plan) return 'pro';

  const normalized = plan.toLowerCase();

  if (normalized === 'free') return 'free';
  if (normalized === 'pro') return 'pro';
  if (normalized === 'max') return 'max';

  if (['starter', 'trial', 'standard', 'core', 'software'].includes(normalized)) {
    return 'pro';
  }

  if (['ceremony', 'dfy', 'done-for-you', 'doneforyou'].includes(normalized)) {
    return 'max';
  }

  return 'pro';
}

export function getPricingPlans(): PricingPlan[] {
  return [
    {
      id: 'free',
      name: 'Free',
      price: '¥0',
      period: '/样本',
      goodFor: '适合先验证 LeadPulse 能不能抓出你真正想要的高意图名单。',
      features: [
        '展示 5-10 条真实样本线索',
        '证明抓取能力，不开放完整大盘',
        '不包含人工审查、代发和完整控制台',
        '适合做第一轮验资',
      ],
      ctaLabel: '先拿样本',
      paymentUrl: paymentUrlFor('free'),
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '¥299',
      period: '/月',
      goodFor: '适合想自己跑系统的小团队：你拿软件、拿筛选能力、自己执行触达。',
      features: [
        '150 credits / 月',
        'Leads / Messages / Tasks 基础控制台',
        '支持筛选、导出和基础消息草稿',
        '客户自行承担平台风控、账号环境和发送动作',
        '不含人工代跑、人工审查和首轮代发',
      ],
      ctaLabel: '开通软件版',
      paymentUrl: paymentUrlFor('pro'),
      highlight: true,
    },
    {
      id: 'max',
      name: 'Max / DFY',
      price: '¥3999',
      period: '/周期',
      goodFor: '适合高客单价业务：你不想自己配环境和跑脚本，而是直接拿人工清洗后的精准名单。',
      features: [
        '人工系统代跑',
        '人工审查、去重、筛选精准意向名单',
        '每周交付一轮高意图名单',
        '代发首轮破冰私信 / 邮件',
        '适合留学工作室、出海 SaaS、知识服务操盘手',
      ],
      ctaLabel: '预约 DFY',
      paymentUrl: paymentUrlFor('max'),
    },
  ];
}

export function getPaidPricingPlans() {
  return getPricingPlans().filter((item) => item.id !== 'free');
}

export function getPlanById(plan?: string) {
  const normalized = normalizePlanId(plan);
  return getPricingPlans().find((item) => item.id === normalized) || getPricingPlans()[1];
}
