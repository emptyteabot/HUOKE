export const SITE_NAME = 'LeadPulse';

export const SITE_DESCRIPTION =
  '自动捕获小红书、抖音、X 等平台上的高意图线索，一键转成可触达名单。';

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://leadpulse.cc.cd').replace(
  /\/$/,
  '',
);

export const SITE_ORIGIN = new URL(SITE_URL).origin;

export const SITE_KEYWORDS = [
  'LeadPulse',
  'AI 获客',
  '高意图线索',
  '线索提取',
  '可触达名单',
  '评论区线索',
  '社媒线索',
  '线索',
  '触达',
  '转化',
];
