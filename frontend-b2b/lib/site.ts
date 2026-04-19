export const SITE_NAME = 'LeadPulse';

export const SITE_DESCRIPTION =
  'LeadPulse 是一套 AI Lead Capture & Conversion OS：从公开平台上的高意图需求表达开始，帮你筛线索、推预约、推付款，并把启动交付接起来。';

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://leadpulse.cc.cd').replace(
  /\/$/,
  '',
);

export const SITE_ORIGIN = new URL(SITE_URL).origin;

export const SITE_KEYWORDS = [
  'LeadPulse',
  'AI Lead Capture',
  'Lead Capture OS',
  'AI 获客',
  '获客系统',
  '独立开发者',
  '微型 SaaS',
  'agency',
  'agency growth',
  '线索',
  '触达',
  '预约',
  '收款',
  'GTM',
  'RevOps',
];
