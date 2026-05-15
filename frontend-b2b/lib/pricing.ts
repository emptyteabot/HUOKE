export type CreditPackageId = 'trial' | 'icebreaker' | 'standard' | 'enterprise';

export type CreditPackage = {
  id: CreditPackageId;
  packageId: CreditPackageId;
  name: string;
  priceCny: number;
  credits: number;
  bonusCredits: number;
  requiresPayment: boolean;
  description: string;
  bestFor: string;
  ctaLabel: string;
  paymentUrl: string;
  highlight?: boolean;
};

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
export const PRICING_CEILING_NOTE =
  '国内 B 端不爱为软件订阅付费，但愿意为确定性线索充值。LeadPulse 只卖 LP Coin，不卖月费幻觉。';

export const TARGET_AUDIENCE_ONE_LINER =
  '适合已经有明确客单价、需要从公开讨论里筛出采购意向，并希望先小额验证再放量的服务团队、销售团队和工作室。';

export const CREDITS_POLICY_CARDS: PolicyCard[] = [
  {
    title: '先送体验额度',
    description:
      '新用户默认获得 60 LP Coin，并保留 3 次免费导出。先跑通筛选、导出、触达和回款判断，再决定是否充值。',
  },
  {
    title: '按结果扣费',
    description:
      '噪声线索只扣 1 LP Coin；高意向线索扣 50 LP Coin；被确认无效的高意向线索可退回 50 LP Coin。',
  },
  {
    title: '先充值，后调用',
    description: '1 LP Coin = 1 元人民币。账户余额不足时系统停止提取，避免人工催款和应收账款。',
  },
];

export const SUBSCRIPTION_POLICY = [
  'LeadPulse 不做默认自动续费。',
  '所有付费动作都转成 LP Coin 充值包。',
  '收银台服务端异步通知到账后才发放积分，浏览器跳转成功不作为发货凭证。',
];

export const CREDITS_POLICY = [
  '1 LP Coin = 1 元人民币。',
  '噪声拦截扣 1 LP Coin，高优线索提取扣 50 LP Coin。',
  '新账户默认赠送 60 LP Coin，前期先把增长和信任闭环跑起来。',
];

export const REFERRAL_POLICY = [
  '早期客户可以先用免费体验额度验证结果；后续优惠以实际充值包页面为准。',
];

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'trial',
    packageId: 'trial',
    name: '免费体验额度',
    priceCny: 0,
    credits: 60,
    bonusCredits: 60,
    requiresPayment: false,
    description: '新账户默认赠送，用来跑通一次过滤、扣费和导出闭环。',
    bestFor: '第一次验证 LeadPulse 是否能筛出有效采购意向。',
    ctaLabel: '领取体验额度',
    paymentUrl: '/register?plan=free',
  },
  {
    id: 'icebreaker',
    packageId: 'icebreaker',
    name: '破冰包',
    priceCny: 99,
    credits: 100,
    bonusCredits: 1,
    requiresPayment: true,
    description: '小额买断一轮算力，适合确认行业和关键词方向。',
    bestFor: '独立销售、创始人亲自验证、第一次付费试跑。',
    ctaLabel: '充值 100 LP Coin',
    paymentUrl: '/pay?package=icebreaker',
  },
  {
    id: 'standard',
    packageId: 'standard',
    name: '标准包',
    priceCny: 499,
    credits: 550,
    bonusCredits: 51,
    requiresPayment: true,
    description: '适合持续筛线索，把高意向结果推给销售或飞书。',
    bestFor: '微型团队、外包工作室、每周稳定跑一批线索。',
    ctaLabel: '充值 550 LP Coin',
    paymentUrl: '/pay?package=standard',
    highlight: true,
  },
  {
    id: 'enterprise',
    packageId: 'enterprise',
    name: '企业包',
    priceCny: 1999,
    credits: 2500,
    bonusCredits: 501,
    requiresPayment: true,
    description: '高频调用和多渠道筛选使用，适合把线索池作为销售前置系统。',
    bestFor: '外包团队、B2B 销售团队、需要每天稳定回收线索的业务。',
    ctaLabel: '充值 2500 LP Coin',
    paymentUrl: '/pay?package=enterprise',
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '计费说明',
    items: [
      '免费体验额度不收费，额度用完后需要充值 LP Coin。',
      '充值包为预付积分，不是软件订阅，不默认自动续费。',
      '高意向线索由系统结构化输出并推送后扣费，普通噪声只收基础过滤成本。',
    ],
  },
  {
    title: '交付边界',
    items: [
      'LeadPulse 交付的是线索筛选、意图判断和结构化结果，不承诺替客户完成最终成交。',
      '客户使用线索触达时，应自行遵守平台规则、发送频率和当地合规要求。',
      '如果线索因 AI 误判被确认为无效，可按规则退回对应高优线索提取积分。',
    ],
  },
  {
    title: '付款与发货',
    items: [
      '支付到账以服务端异步通知为准，浏览器跳转成功不等于到账。',
      '到账后系统自动为对应用户增加 LP Coin 余额。',
      '涉及财务、风控和售后所需的记录会被保留。',
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '我们收集什么',
    items: [
      '你主动提交的姓名、邮箱、公司、充值订单和使用记录。',
      '系统运行所必需的线索筛选、导出、扣费和售后记录。',
    ],
  },
  {
    title: '我们怎么使用',
    items: [
      '用于创建充值订单、发放 LP Coin、处理线索提取和余额扣减。',
      '用于风控、售后和必要的账务核对。',
    ],
  },
  {
    title: '导出与删除',
    items: [
      '你可以请求导出与你有关的关键记录。',
      '财务和风控相关记录可能需要依法或按服务规则保留。',
    ],
  },
];

export function getCreditPackages(): CreditPackage[] {
  return CREDIT_PACKAGES;
}

export function getPaidCreditPackages(): CreditPackage[] {
  return CREDIT_PACKAGES.filter((item) => item.requiresPayment);
}

export function normalizeCreditPackageId(value?: string): CreditPackageId {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'trial' || normalized === 'free') return 'trial';
  if (normalized === 'icebreaker' || normalized === 'starter') return 'icebreaker';
  if (normalized === 'standard' || normalized === 'pro' || normalized === 'core' || normalized === 'software') return 'standard';
  if (normalized === 'enterprise' || normalized === 'max' || normalized === 'dfy' || normalized === 'done-for-you') return 'enterprise';
  return 'standard';
}

export function getCreditPackageById(value?: string): CreditPackage {
  const normalized = normalizeCreditPackageId(value);
  return CREDIT_PACKAGES.find((item) => item.id === normalized) || CREDIT_PACKAGES[2];
}

function paymentUrlFor(planId: PlanId) {
  if (planId === 'free') return '/register?plan=free';
  if (planId === 'max') return '/pay?package=enterprise';
  return '/pay?package=standard';
}

export function normalizePlanId(plan?: string): PlanId {
  const normalized = String(plan || '').trim().toLowerCase();
  if (normalized === 'free' || normalized === 'trial') return 'free';
  if (normalized === 'max' || normalized === 'enterprise') return 'max';
  return 'pro';
}

export function getPricingPlans(): PricingPlan[] {
  const trial = getCreditPackageById('trial');
  const standard = getCreditPackageById('standard');
  const enterprise = getCreditPackageById('enterprise');
  return [
    {
      id: 'free',
      name: trial.name,
      price: '￥0',
      period: '/体验',
      goodFor: trial.bestFor,
      features: ['赠送 60 LP Coin', '3 次免费导出', '先验证线索质量', '不需要先付款'],
      ctaLabel: trial.ctaLabel,
      paymentUrl: paymentUrlFor('free'),
    },
    {
      id: 'pro',
      name: standard.name,
      price: `￥${standard.priceCny}`,
      period: '/包',
      goodFor: standard.bestFor,
      features: ['获得 550 LP Coin', '噪声线索扣 1', '高优线索扣 50', '适合每周稳定试跑'],
      ctaLabel: standard.ctaLabel,
      paymentUrl: paymentUrlFor('pro'),
      highlight: true,
    },
    {
      id: 'max',
      name: enterprise.name,
      price: `￥${enterprise.priceCny}`,
      period: '/包',
      goodFor: enterprise.bestFor,
      features: ['获得 2500 LP Coin', '适合高频筛选', '支持多渠道线索池', '配合销售团队持续回收'],
      ctaLabel: enterprise.ctaLabel,
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
