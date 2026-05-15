export const SITE_NAME = 'LeadPulse';

export const SITE_DESCRIPTION =
  'LeadPulse 通过 AI 语义网络过滤公开讨论里的噪音，只把带有明确采购意向的高价值线索送到销售面前。';

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://leadpulseagi.com').replace(/\/$/, '');

export const SITE_ORIGIN = new URL(SITE_URL).origin;

export const SITE_KEYWORDS = ['LeadPulse', '精准获客', '高意向线索', '购买意图', 'LP Coin', 'Discovery Call'];
