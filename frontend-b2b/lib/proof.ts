export type ProofCase = {
  company: string;
  channel: string;
  result: string;
  angle: string;
};

export const PROOF_CASES: ProofCase[] = [
  {
    company: 'The AI Automation Agency',
    channel: '官网联系表单',
    result: '提交成功，页面返回感谢确认。',
    angle: '把 LeadPulse 作为其内部获客系统，也可转成 white-label 客户方案。',
  },
  {
    company: 'Agensy AI',
    channel: '官网联系表单',
    result: '提交成功，页面返回 “Message sent successfully!”',
    angle: '对方本身卖 lead generation / marketing automation，属于高度相关目标。',
  },
  {
    company: 'LeadRush AI',
    channel: '官网联系表单',
    result: '已提交进入观察，等待二次确认送达。',
    angle: '验证 AI lead gen 类目标的接单话术和触达路径。',
  },
];

export const EXECUTION_RULES = [
  '单轮只发 3-5 个目标，控制风险，不做暴力群发。',
  '同域先发 1 个入口，等打开、回复或线索变化再扩。',
  '先读官网卖点和客户类型，再写定制开场，不发模板垃圾话。',
  '每轮结束都更新战报、队列和后续动作，保证漏斗可复盘。',
];

export const PRODUCT_PROOF_POINTS = [
  'LeadPulse 不是只会做页面，而是把搜索词、实验页、触达、预约和付款意向接成一条线。',
  '产品自己的获客，已经开始反哺产品本身：哪里卡、哪里脏、哪里不转化，都会直接暴露。',
  '当前最稳定的真实动作是官网表单外联 + 预约页承接 + 支付页确认，而不是空谈自动化。',
];
