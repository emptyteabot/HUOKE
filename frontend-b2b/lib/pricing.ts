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
export const PRICING_CEILING_NOTE = '现在先走更轻的早期试用价，目的是先验证有没有人愿意为结果付钱。';

export const TARGET_AUDIENCE_ONE_LINER =
  '更适合想先低成本试一轮的人：服务工作室、小团队、独立开发者，以及需要自己找客户的业务。';

export const CREDITS_POLICY_CARDS: PolicyCard[] = [
  {
    title: '免费样本',
    description: '先看一小批真实样本，确认方向对不对。',
  },
  {
    title: '软件版',
    description: '适合你自己动手筛名单、导名单、自己联系。',
  },
  {
    title: '代跑版',
    description: '适合你没时间折腾，想先拿一轮整理好的名单。',
  },
];

export const SUBSCRIPTION_POLICY = [
  '免费样本不收费。',
  '软件版按月开通，目前按付款后手动开通处理。',
  '代跑版按首轮交付收费，不默认自动续费。',
];

export const CREDITS_POLICY = [
  '软件版内部会有使用额度，但公开页不按复杂计费单位讲给客户听。',
  '客户更关心能不能先看到样本、能不能拿到名单、能不能继续联系。',
];

export const REFERRAL_POLICY = [
  '当前没有公开邀请返利，若有活动或优惠，以当时页面说明为准。',
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '套餐说明',
    items: [
      '免费样本：¥0，给你看一小批真实样本，先确认方向。',
      '软件版：¥99 / 月，适合自己动手筛名单、导名单、自己联系。',
      '代跑版：¥999 / 首轮，适合想先拿一轮整理好名单的人。',
    ],
  },
  {
    title: '交付边界',
    items: [
      '软件版主要交付筛选、导出和基础参考，不代你完成所有触达动作。',
      '代跑版以首轮名单整理和沟通建议为主，超出部分按实际需求另行确认。',
      '我们不会把人工确认包装成完全自动化服务。',
    ],
  },
  {
    title: '付款与续做',
    items: [
      '软件版和代跑版都不默认自动续费。',
      '如果你要继续做，下一轮按当时确认的范围和价格处理。',
      '已实际交付的样本、名单整理或人工服务，通常不支持按天退款。',
    ],
  },
  {
    title: '使用与合规',
    items: [
      '客户拿到的名单和文案建议，仅供自身业务使用，不得公开转售。',
      '客户自己做触达时，应自行遵守平台规则、发送频率和当地合规要求。',
      '平台会保留必要的运行与账务记录，用于风控和售后。',
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '我们收集什么',
    items: [
      '你主动提交的姓名、邮箱、公司、预约信息和付款信息。',
      '与你申请样本、购买方案和售后沟通相关的必要记录。',
    ],
  },
  {
    title: '我们怎么使用',
    items: [
      '用于给你样本、开通方案、安排沟通和处理交付。',
      '用于风控、售后和必要的账务处理。',
    ],
  },
  {
    title: '导出与删除',
    items: [
      '你可以请求导出与你有关的关键记录。',
      '你也可以请求删除部分个人信息，但账务和风控相关记录可能需要依法保留。',
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
      name: '免费样本',
      price: '¥0',
      period: '/次',
      goodFor: '适合先看一轮样本，判断这是不是你现在需要的方向。',
      features: [
        '先看 5 条左右真实样本',
        '重点看客户在问什么',
        '不需要先付费',
        '适合先做判断',
      ],
      ctaLabel: '先看样本',
      paymentUrl: paymentUrlFor('free'),
    },
    {
      id: 'pro',
      name: '软件版',
      price: '¥99',
      period: '/月',
      goodFor: '适合自己动手筛名单、导名单、自己联系的团队。',
      features: [
        '查看和筛选名单',
        '导出可继续联系的结果',
        '提供基础私信参考',
        '适合自己动手跑第一轮',
      ],
      ctaLabel: '开通软件版',
      paymentUrl: paymentUrlFor('pro'),
      highlight: true,
    },
    {
      id: 'max',
      name: '代跑版',
      price: '¥999',
      period: '/首轮',
      goodFor: '适合先想拿一轮整理好的结果，不想自己花时间折腾的人。',
      features: [
        '我们帮你跑一轮',
        '尽量筛掉明显噪声',
        '交付一版可继续联系的名单',
        '附一版首轮沟通建议',
      ],
      ctaLabel: '预约代跑',
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
