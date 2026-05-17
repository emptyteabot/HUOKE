export const SITE_NAME = 'LeadPulse';

export const SITE_DESCRIPTION =
  'LeadPulse 是 AI 驱动的线索供应商，只交付能跟进的高意向客户，当前只盯小红书、抖音、推特和 Reddit。';

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://leadpulseagi.com').replace(/\/$/, '');

export const SITE_ORIGIN = new URL(SITE_URL).origin;

export const SITE_KEYWORDS = [
  'LeadPulse',
  'AI 线索供应商',
  '小红书获客',
  '抖音获客',
  '推特获客',
  'Reddit 获客',
  '雅思招生',
  '留学中介获客',
  '跨境出海获客',
  'AI 初创获客',
  '独立开发者获客',
  '高意向线索',
];
