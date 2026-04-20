export const SITE_NAME = 'LeadPulse';

export const SITE_DESCRIPTION =
  '帮服务团队和小型业务从公开平台里找到正在找方案的人。';

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://leadpulse.cc.cd').replace(
  /\/$/,
  '',
);

export const SITE_ORIGIN = new URL(SITE_URL).origin;

export const SITE_KEYWORDS = [
  'LeadPulse',
  '获客',
  '找客户',
  '线索筛选',
  '评论区客户',
  '社媒找客户',
  '服务团队获客',
  '意向客户',
];
