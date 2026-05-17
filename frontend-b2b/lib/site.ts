export const SITE_NAME = 'LeadPulse';

export const SITE_DESCRIPTION =
  'LeadPulse 是 AI 驱动的线索供应商，优先从小红书和抖音里筛出最新、最痛、能手动跟进的高意向客户。';

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://leadpulseagi.com').replace(/\/$/, '');

export const SITE_ORIGIN = new URL(SITE_URL).origin;

export const SITE_KEYWORDS = [
  'LeadPulse',
  'AI 线索供应商',
  '小红书获客',
  '抖音获客',
  '雅思招生',
  '留学中介获客',
  '跨境出海获客',
  '高意向线索',
];
