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

export const CHATGPT_PLUS_PRICE_REFERENCE = '$20/月';
export const PRICING_CEILING_NOTE = `最高付费档控制在不高于 ChatGPT Plus 当前 ${CHATGPT_PLUS_PRICE_REFERENCE} 的区间内。`;

export const TARGET_AUDIENCE_ONE_LINER =
  '面向独立开发者、indie hacker、微型 SaaS 创业者和 agency：更快上线、接入支付、导出代码，并把获客、转化和交付放进同一套 credits-first 系统。';

export const CREDITS_POLICY_CARDS: PolicyCard[] = [
  {
    title: 'Free / Pro / Max',
    description:
      'Free 用来先试跑；Pro 是主力方案；Max 给多产品、批量执行和更高吞吐的团队。',
  },
  {
    title: '自动续费与取消',
    description:
      'Pro / Max 默认按月自动续费，可在下一个账单日前取消，取消后从下一账期停止；Free 不自动续费。',
  },
  {
    title: 'Credits 使用顺序',
    description:
      '系统按最早到期优先扣减；若到期时间相同，先扣 referral / promo，再扣 rollover，最后扣当期发放的 paid credits。',
  },
  {
    title: 'Rollover 与邀请奖励',
    description:
      'Pro 最多 rollover 1 个账期，上限 150；Max 最多 rollover 2 个账期，上限 600；成功邀请新付费用户默认奖励 30 bonus credits。',
  },
];

export const SUBSCRIPTION_POLICY = [
  'Pro / Max 默认按月自动续费；你可以在下一个账单日前取消，取消后从下一账期停止。',
  'Free 不自动续费，也不会产生扣费。',
  '当前账期已经生效的订阅通常不做按天退款；若出现异常重复扣费，会人工核实并处理。',
];

export const CREDITS_POLICY = [
  'LeadPulse 以 credits 为核心计量单位，用于搜索、打分、生成文案、导出结果、部署动作与自动化执行。',
  '系统遵循“最早到期优先”原则扣减 credits。',
  '若多个 credits 到期时间相同，默认先扣 referral / promo credits，再扣 rollover credits，最后扣当期新发放的 paid credits。',
  'Free 不支持 rollover；Pro 的 paid credits 可 rollover 1 个账期，上限 150；Max 可 rollover 2 个账期，上限 600。',
];

export const REFERRAL_POLICY = [
  '被邀请的新用户在 30 天内成为有效付费客户后，邀请人默认可获得 30 bonus credits。',
  '奖励 credits 不可提现、不可转售、不可兑换现金或线下服务。',
  '奖励 credits 默认 90 天有效；若存在自购、刷量、重复账号或异常邀请，平台保留审核与撤销权。',
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '套餐与计费',
    items: [
      'Free：¥0 / 月，20 credits / 月，不自动续费，不支持 rollover，适合先验证产品、支付和导出代码链路。',
      'Pro：¥79 / 月，150 credits / 月，默认自动续费，可随时取消，下个账期停止；paid credits 可 rollover 1 个账期，上限 150。',
      'Max：¥129 / 月，300 credits / 月，默认自动续费，可随时取消，下个账期停止；paid credits 可 rollover 2 个账期，上限 600。',
      `所有付费档价格上限都控制在 ChatGPT Plus 当前 ${CHATGPT_PLUS_PRICE_REFERENCE} 以内。`,
    ],
  },
  {
    title: '自动续费与取消',
    items: [
      'Pro 和 Max 属于订阅方案；除非你在下一个账单日前取消，否则系统会按当前账期自动续费。',
      '取消不会影响当前账期已经发放的有效权益，但从下一账期开始停止续费与新 credits 发放。',
      '当前账期已生效的订阅通常不做按天退款；异常重复扣费、错误计费或明显系统问题可人工复核。',
    ],
  },
  {
    title: 'Credits 使用与顺序',
    items: [
      'LeadPulse 以 credits 为核心计量单位，用于搜索、评分、内容生成、导出结果、自动化动作等能力消耗。',
      '系统遵循“最早到期优先”原则扣减 credits。',
      '若多个 credits 到期时间相同，默认先扣 referral / promo credits，再扣 rollover credits，最后扣当期新发放的 paid credits。',
    ],
  },
  {
    title: 'Rollover 规则',
    items: [
      '只有付费订阅方案的 paid credits 支持 rollover；Free 不支持 rollover。',
      'Pro 的 rollover credits 最多保留 1 个账期，单 rollover 池上限 150 credits。',
      'Max 的 rollover credits 最多保留 2 个账期，单 rollover 池上限 600 credits。',
      'Referral / promo credits 默认不参与 rollover，除非活动页另有明确说明。',
    ],
  },
  {
    title: '邀请奖励',
    items: [
      '你邀请的新用户在 30 天内成为有效付费订阅后，邀请人默认可获得 30 bonus credits。',
      '邀请奖励以 credits 形式发放，不可提现、不可转售、不可兑换成现金或线下服务。',
      '若存在自购、刷量、重复账号、异常邀请或团队判定为作弊的情况，LeadPulse 有权取消奖励。',
    ],
  },
  {
    title: '产品与交付边界',
    items: [
      'LeadPulse 面向独立开发者、indie hacker、微型 SaaS 和 agency，核心卖点包括更快上线、接入支付、导出代码和可复用增长链路。',
      '平台会持续演进，但不承诺绝对结果，不承诺固定营收，不承诺 100% 转化或回本。',
      '若涉及定制开发、代运营、私有部署或人工服务，最终范围以当次报价、支付页说明和双方确认内容为准。',
    ],
  },
  {
    title: '数据、导出与终止',
    items: [
      '用户生成的数据、配置、内容和导出代码归用户或其授权主体所有；平台保留运行、安全、风控所需的必要日志。',
      '若你使用导出代码、GitHub 同步或部署模板，应自行确认仓库权限、第三方服务账单和环境变量安全。',
      '账号终止或订阅结束后，平台可按内部保留策略处理历史数据；建议你在终止前自行导出关键配置与结果。',
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '我们收集什么',
    items: [
      '你主动提交的姓名、邮箱、公司、网站、预约时间、付款意向、订阅方案和当前增长瓶颈。',
      '与你的 credits 消耗、rollover、邀请奖励、支付状态、导出代码和部署动作相关的必要运行记录。',
      '用于风控、审计、反作弊和通知的基础访问日志与事件记录。',
    ],
  },
  {
    title: '我们如何使用这些信息',
    items: [
      '用于开通 Free / Pro / Max 方案、发放 credits、记录消耗和处理续费或取消。',
      '用于联系你、安排预约、确认支付、交付模板、导出代码和同步 GitHub 等能力。',
      '用于改进产品漏斗、增长回路和反作弊策略，但不会出售你的个人信息。',
    ],
  },
  {
    title: '邀请与奖励数据',
    items: [
      '如果你参与邀请奖励计划，我们会记录邀请关系、被邀请用户的转化状态和奖励 credits 发放情况。',
      '邀请奖励数据仅用于核验增长回路和结算 bonus credits，不会被用于公开展示你的私人联系人数据。',
    ],
  },
  {
    title: '数据导出与删除',
    items: [
      '你可以请求导出与你账户相关的关键数据、表单记录、导出代码或配置结果。',
      '你可以请求更正、删除部分个人数据；但出于结算、风控、审计和合规需要，部分记录可能需要依法保留。',
    ],
  },
];

function paymentUrlFor(planId: PlanId) {
  if (planId === 'free') {
    return process.env.NEXT_PUBLIC_FREE_SIGNUP_URL || '/register?plan=free';
  }

  if (planId === 'max') {
    return process.env.NEXT_PUBLIC_MAX_PAYMENT_URL || '/pay?plan=max';
  }

  return process.env.NEXT_PUBLIC_PRO_PAYMENT_URL || '/pay?plan=pro';
}

export function normalizePlanId(plan?: string): PlanId {
  if (!plan) return 'pro';

  const normalized = plan.toLowerCase();

  if (normalized === 'free') return 'free';
  if (normalized === 'pro') return 'pro';
  if (normalized === 'max') return 'max';

  if (['starter', 'trial', 'standard', 'core'].includes(normalized)) {
    return 'pro';
  }

  if (['ceremony', 'dfy'].includes(normalized)) {
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
      period: '/月',
      goodFor: '适合先把产品上线、接入支付、验证第一条漏斗，适合独立开发者先试跑。',
      features: [
        '20 credits / 月',
        '适合 1 个产品、1 个 workspace',
        '可导出代码，可同步 GitHub',
        '包含基础支付与一键部署模板',
        '不自动续费，不支持 rollover',
      ],
      ctaLabel: '先开 Free',
      paymentUrl: paymentUrlFor('free'),
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '¥79',
      period: '/月',
      goodFor: '适合大多数独立开发者、微型 SaaS 和小团队，先把线索、预约和付款跑成稳定闭环。',
      features: [
        '150 credits / 月',
        '内置 Stripe 支付能力与部署链路',
        '导出代码 / sync to GitHub',
        '默认自动续费，可随时取消，下个账期停止',
        'paid credits 可 rollover 1 个账期，上限 150',
      ],
      ctaLabel: '开通 Pro',
      paymentUrl: paymentUrlFor('pro'),
      highlight: true,
    },
    {
      id: 'max',
      name: 'Max',
      price: '¥129',
      period: '/月',
      goodFor: '适合 agency、多产品工作室和高频执行团队，在更低价格上限内拿到更高吞吐与更多自动化动作。',
      features: [
        '300 credits / 月',
        '更高吞吐、更多自动化动作与协作空间',
        '优先支持 webhook、批量执行与团队协作',
        '默认自动续费，可随时取消，下个账期停止',
        'paid credits 可 rollover 2 个账期，上限 600',
      ],
      ctaLabel: '开通 Max',
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
