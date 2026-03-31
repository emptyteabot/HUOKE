export const SITE_NAME = 'LeadPulse';

export const SITE_DESCRIPTION =
  'LeadPulse 是一个由多 Agent 驱动的 AI 获客系统，帮你打通从产品到商业的最后一公里：找线索、写触达、推预约、推收款，让每一个产品值得被看见。';

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://leadpulse.cc.cd').replace(
  /\/$/,
  '',
);

export const SITE_ORIGIN = new URL(SITE_URL).origin;

export const SITE_KEYWORDS = [
  'LeadPulse',
  'AI 获客',
  'AI 获客系统',
  '多 Agent',
  '独立开发者',
  '微型 SaaS',
  'agency growth',
  '线索',
  '触达',
  '预约',
  '收款',
];
