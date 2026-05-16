export const SITE_NAME = 'LeadPulse';

export const SITE_DESCRIPTION =
  'LeadPulse 通过 AI 语义网络筛选公开讨论里的高意向商机，只把准备买的人送到销售面前。';

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://leadpulseagi.com').replace(/\/$/, '');

export const SITE_ORIGIN = new URL(SITE_URL).origin;

export const SITE_KEYWORDS = ['LeadPulse', '精准获客', '高意向线索', '购买信号', '发现电话', '合格会议'];
