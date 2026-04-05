import { randomUUID } from 'crypto';

import { getPlanById, normalizePlanId } from './pricing';
import { readNamespace, upsertNamespaceRecord } from './storage';
import { createFollowUpTask, dueAtFromNow, type FollowUpTask } from './tasks';

type SourceKind = 'payment_intent';

export type FulfillmentPackage = {
  id: string;
  createdAt: string;
  sourceKind: SourceKind;
  sourceId: string;
  company: string;
  email: string;
  planId: string;
  planName: string;
  productUrl: string;
  workspaceId: string;
  accessCode: string;
  status: 'provisioned';
  snapshot: {
    url: string;
    hostname: string;
    title: string;
    description: string;
  };
  signals: {
    language: string;
    headline: string;
    subhead: string;
    forms: number;
    hasPricing: boolean;
    hasBooking: boolean;
    hasPayment: boolean;
    hasLogin: boolean;
    hasDashboard: boolean;
    score: number;
    headings: string[];
    ctas: string[];
  };
  workflow: {
    currentNode: string;
    nodes: Array<{
      id: string;
      label: string;
      status: 'done';
      detail: string;
      output: string;
    }>;
  };
  executionPlan: {
    summary: string;
    steps: Array<{
      id: string;
      label: string;
      status: 'ready';
      owner: 'Founder' | 'Agent' | 'Design';
      surface: string;
      instruction: string;
      expectedResult: string;
      actionUrl: string;
      actionLabel: string;
      successHint: string;
      browserSteps: string[];
      verifyChecks: string[];
    }>;
  };
  narrative: {
    oneLiner: string;
    whoFor: string;
    whyNow: string;
  };
  deliveryItems: string[];
  firstActions: string[];
  outreachAngles: string[];
};

const packagesPath = `${process.cwd()}\\..\\data\\ops\\fulfillment_packages.json`;
const FULFILLMENT_NAMESPACE = 'ops:fulfillment_packages';

function safeText(value: string, fallback: string) {
  return String(value || '').trim() || fallback;
}

function normalizeUrl(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(normalized).toString();
  } catch {
    return '';
  }
}

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

function buildAccessCode(company: string) {
  const prefix = slugify(company).replace(/-/g, '').toUpperCase().slice(0, 6) || 'LP';
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function readPackages(): Promise<FulfillmentPackage[]> {
  const items = await readNamespace<Array<Partial<FulfillmentPackage> & Record<string, unknown>>[number]>(
    FULFILLMENT_NAMESPACE,
    { legacyFilePath: packagesPath },
  );
  return items.map((item) => normalizePackage(item));
}

export async function readFulfillmentPackages(limit = 50) {
  const items = await readPackages();
  return items
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, Math.max(1, limit));
}

export async function getFulfillmentPackageByAccessCode(accessCode: string) {
  const normalizedCode = String(accessCode || '').trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const items = await readPackages();
  return (
    items.find((item) => String(item.accessCode || '').trim().toUpperCase() === normalizedCode) || null
  );
}

function normalizePackage(item: Partial<FulfillmentPackage> & Record<string, unknown>): FulfillmentPackage {
  const snapshot = {
    url: String(item.snapshot && typeof item.snapshot === 'object' ? (item.snapshot as Record<string, unknown>).url || item.productUrl || '' : item.productUrl || ''),
    hostname: String(item.snapshot && typeof item.snapshot === 'object' ? (item.snapshot as Record<string, unknown>).hostname || '' : ''),
    title: String(item.snapshot && typeof item.snapshot === 'object' ? (item.snapshot as Record<string, unknown>).title || item.company || '' : item.company || ''),
    description: String(item.snapshot && typeof item.snapshot === 'object' ? (item.snapshot as Record<string, unknown>).description || '' : ''),
  };
  const rawSignals = item.signals && typeof item.signals === 'object' ? (item.signals as Record<string, unknown>) : {};
  const rawWorkflow = item.workflow && typeof item.workflow === 'object' ? (item.workflow as Record<string, unknown>) : {};
  const rawExecutionPlan =
    item.executionPlan && typeof item.executionPlan === 'object'
      ? (item.executionPlan as Record<string, unknown>)
      : {};

  const signals = {
    language: String(rawSignals.language || ''),
    headline: String(rawSignals.headline || snapshot.title || ''),
    subhead: String(rawSignals.subhead || snapshot.description || ''),
    forms: Number(rawSignals.forms || 0),
    hasPricing: Boolean(rawSignals.hasPricing),
    hasBooking: Boolean(rawSignals.hasBooking),
    hasPayment: Boolean(rawSignals.hasPayment),
    hasLogin: Boolean(rawSignals.hasLogin),
    hasDashboard: Boolean(rawSignals.hasDashboard),
    score: Number(rawSignals.score || (snapshot.title ? 20 : 0) + (snapshot.description ? 20 : 0)),
    headings: Array.isArray(rawSignals.headings) ? rawSignals.headings.map((value) => String(value)) : [],
    ctas: Array.isArray(rawSignals.ctas) ? rawSignals.ctas.map((value) => String(value)) : [],
  };

  const workflowNodes =
    Array.isArray(rawWorkflow.nodes) && rawWorkflow.nodes.length
      ? rawWorkflow.nodes.map((node) => {
          const record = node as Record<string, unknown>;
          return {
            id: String(record.id || ''),
            label: String(record.label || ''),
            status: 'done' as const,
            detail: String(record.detail || ''),
            output: String(record.output || ''),
          };
        })
      : [
          {
            id: 'capture',
            label: 'Capture',
            status: 'done' as const,
            detail: '已抓取页面基础信息。',
            output: snapshot.title || '未命名产品',
          },
        ];

  const executionSteps =
    Array.isArray(rawExecutionPlan.steps) && rawExecutionPlan.steps.length
      ? rawExecutionPlan.steps.map((step) => {
          const record = step as Record<string, unknown>;
          return {
            id: String(record.id || ''),
            label: String(record.label || ''),
            status: 'ready' as const,
            owner: (String(record.owner || 'Founder') as 'Founder' | 'Agent' | 'Design'),
            surface: String(record.surface || ''),
            instruction: String(record.instruction || ''),
            expectedResult: String(record.expectedResult || ''),
            actionUrl: String(record.actionUrl || ''),
            actionLabel: String(record.actionLabel || '打开页面'),
            successHint: String(record.successHint || ''),
            browserSteps: Array.isArray(record.browserSteps) ? record.browserSteps.map((value) => String(value)) : [],
            verifyChecks: Array.isArray(record.verifyChecks) ? record.verifyChecks.map((value) => String(value)) : [],
          };
        })
      : [
          {
            id: 'positioning',
            label: '重写首屏定位',
            status: 'ready' as const,
            owner: 'Founder' as const,
            surface: '首页 Hero',
            instruction: '先把“这是给谁的、解决什么问题、下一步去哪”三句话写清楚。',
            expectedResult: '陌生人 5 秒内知道这是什么产品。',
            actionUrl: snapshot.url || '',
            actionLabel: '打开原页面',
            successHint: '首屏出现明确定位和唯一主 CTA。',
            browserSteps: ['打开首页', '只看首屏 5 秒', '判断是否能立刻知道给谁用、解决什么、下一步去哪'],
            verifyChecks: ['首屏只有一个主 CTA', '标题不是功能清单', '副标题不是大段说明书'],
          },
        ];

  return {
    id: String(item.id || randomUUID()),
    createdAt: String(item.createdAt || new Date().toISOString()),
    sourceKind: 'payment_intent',
    sourceId: String(item.sourceId || ''),
    company: String(item.company || snapshot.title || '未命名产品'),
    email: String(item.email || ''),
    planId: String(item.planId || 'pro'),
    planName: String(item.planName || getPlanById('pro').name),
    productUrl: String(item.productUrl || snapshot.url || ''),
    workspaceId: String(item.workspaceId || ''),
    accessCode: String(item.accessCode || ''),
    status: 'provisioned',
    snapshot,
    signals,
    workflow: {
      currentNode: String(rawWorkflow.currentNode || workflowNodes[workflowNodes.length - 1]?.id || 'capture'),
      nodes: workflowNodes,
    },
    executionPlan: {
      summary: String(rawExecutionPlan.summary || '先修成交路径，再扩大流量。'),
      steps: executionSteps,
    },
    narrative: {
      oneLiner: String(item.narrative && typeof item.narrative === 'object' ? (item.narrative as Record<string, unknown>).oneLiner || `${snapshot.title || item.company || '当前产品'} 已接入 LeadPulse。` : `${snapshot.title || item.company || '当前产品'} 已接入 LeadPulse。`),
      whoFor: String(item.narrative && typeof item.narrative === 'object' ? (item.narrative as Record<string, unknown>).whoFor || '优先面向已经有产品、但缺第一批稳定客户的人。' : '优先面向已经有产品、但缺第一批稳定客户的人。'),
      whyNow: String(item.narrative && typeof item.narrative === 'object' ? (item.narrative as Record<string, unknown>).whyNow || '先把获客、预约和收款接起来。' : '先把获客、预约和收款接起来。'),
    },
    deliveryItems: Array.isArray(item.deliveryItems) ? item.deliveryItems.map((value) => String(value)) : [],
    firstActions: Array.isArray(item.firstActions) ? item.firstActions.map((value) => String(value)) : [],
    outreachAngles: Array.isArray(item.outreachAngles) ? item.outreachAngles.map((value) => String(value)) : [],
  };
}

function extractMatch(pattern: RegExp, html: string) {
  const matched = html.match(pattern);
  return matched?.[1]?.trim() || '';
}

function stripTags(value: string) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMany(pattern: RegExp, html: string, limit = 6) {
  const output: string[] = [];
  for (const match of html.matchAll(pattern)) {
    const value = stripTags(match[1] || '');
    if (!value) continue;
    if (output.includes(value)) continue;
    output.push(value);
    if (output.length >= limit) break;
  }
  return output;
}

async function captureSnapshot(productUrl: string) {
  const normalizedUrl = normalizeUrl(productUrl);
  if (!normalizedUrl) {
    return {
      url: '',
      hostname: '',
      title: '',
      description: '',
      language: '',
      headline: '',
      subhead: '',
      forms: 0,
      hasPricing: false,
      hasBooking: false,
      hasPayment: false,
      hasLogin: false,
      hasDashboard: false,
      score: 0,
      headings: [] as string[],
      ctas: [] as string[],
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
      },
      cache: 'no-store',
    });
    clearTimeout(timeout);
    const html = await response.text();
    const title = extractMatch(/<title[^>]*>([^<]+)<\/title>/i, html);
    const description =
      extractMatch(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i, html) ||
      extractMatch(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i, html);
    const language = extractMatch(/<html[^>]+lang=["']([^"']+)["']/i, html).toLowerCase();
    const headline = stripTags(extractMatch(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html));
    const headings = extractMany(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi, html, 6);
    const ctas = [
      ...extractMany(/<a[^>]*>([\s\S]*?)<\/a>/gi, html, 12),
      ...extractMany(/<button[^>]*>([\s\S]*?)<\/button>/gi, html, 12),
    ]
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter((item) => item.length > 1)
      .filter((item, index, array) => array.indexOf(item) === index)
      .slice(0, 8);
    const forms = (html.match(/<form\b/gi) || []).length;
    const lower = html.toLowerCase();
    const hasPricing = /(price|pricing|¥|￥|\$|plan|套餐|定价|价格)/i.test(html);
    const hasBooking = /(book|booking|schedule|calendly|预约|诊断)/i.test(html);
    const hasPayment = /(pay|payment|checkout|stripe|微信支付|支付宝|收款)/i.test(html);
    const hasLogin = /(login|sign in|登录|访问码)/i.test(html);
    const hasDashboard = /(dashboard|console|workspace|工作台|控制台)/i.test(html);
    const subhead = headings[0] || description;
    const score =
      (title ? 20 : 0) +
      (description ? 20 : 0) +
      (headline ? 15 : 0) +
      Math.min(forms, 2) * 10 +
      (ctas.length >= 2 ? 15 : ctas.length ? 8 : 0) +
      (hasPricing ? 5 : 0) +
      (hasBooking ? 5 : 0) +
      (hasPayment ? 5 : 0) +
      (hasDashboard ? 5 : 0);
    const url = new URL(normalizedUrl);
    return {
      url: normalizedUrl,
      hostname: url.hostname,
      title,
      description,
      language,
      headline,
      subhead,
      forms,
      hasPricing,
      hasBooking,
      hasPayment,
      hasLogin,
      hasDashboard,
      score,
      headings,
      ctas,
    };
  } catch {
    try {
      const url = new URL(normalizedUrl);
      return {
        url: normalizedUrl,
        hostname: url.hostname,
        title: '',
        description: '',
        language: '',
        headline: '',
        subhead: '',
        forms: 0,
        hasPricing: false,
        hasBooking: false,
        hasPayment: false,
        hasLogin: false,
        hasDashboard: false,
        score: 0,
        headings: [] as string[],
        ctas: [] as string[],
      };
    } catch {
      return {
        url: '',
        hostname: '',
        title: '',
        description: '',
        language: '',
        headline: '',
        subhead: '',
        forms: 0,
        hasPricing: false,
        hasBooking: false,
        hasPayment: false,
        hasLogin: false,
        hasDashboard: false,
        score: 0,
        headings: [] as string[],
        ctas: [] as string[],
      };
    }
  }
}

function buildNarrative(args: {
  company: string;
  snapshot: FulfillmentPackage['snapshot'] & FulfillmentPackage['signals'];
  planName: string;
}) {
  const productName = safeText(args.snapshot.title || args.snapshot.headline, args.company);
  const description = safeText(
    args.snapshot.description || args.snapshot.subhead,
    '已经有产品，但还没有稳定客户、预约和收款信号。',
  );

  return {
    oneLiner: `${productName} 已接入 LeadPulse，目标是把产品访问转成回复、预约和收款。`,
    whoFor: `优先面向已经有产品、但缺第一批稳定客户的 founder / 小团队。`,
    whyNow: `${args.planName} 会先围绕“${description}”建立首批线索、触达和转化动作。`,
  };
}

function buildDeliveryItems(args: {
  snapshot: FulfillmentPackage['snapshot'] & FulfillmentPackage['signals'];
  planName: string;
}) {
  const title = safeText(args.snapshot.title || args.snapshot.headline, '当前产品');
  return [
    `${args.planName} workspace 与访问码`,
    `${title} 的一页式价值主张`,
    `首批 ICP 假设与线索优先级`,
    `首轮触达角度与预约推进动作`,
    `收款前后的 onboarding 节奏`,
  ];
}

function buildFirstActions(args: {
  company: string;
  productUrl: string;
  snapshot: FulfillmentPackage['snapshot'] & FulfillmentPackage['signals'];
}) {
  const base = args.productUrl || '当前产品链接';
  return [
    `抓取并解析 ${base} 的标题、描述、CTA 和表单结构，生成对外一句话定位。`,
    `围绕 ${args.company} 先产出一组高意向触达角度和首批跟进行动。`,
    `把产品页、${args.snapshot.hasBooking ? '预约入口' : '诊断入口'} 和 ${args.snapshot.hasPayment ? '支付动作' : '收款动作'} 串成一条可执行的成交路径。`,
  ];
}

function buildOutreachAngles(args: {
  company: string;
  snapshot: FulfillmentPackage['snapshot'] & FulfillmentPackage['signals'];
}) {
  const hostname = safeText(args.snapshot.hostname, '现有站点');
  const productName = safeText(args.snapshot.title || args.snapshot.headline, args.company);
  return [
    `你已经把 ${productName} 做出来了，但 ${hostname} 还没有稳定把访问变成客户。`,
    `先不讲复杂 AI，先把谁会买、为什么买、下一步去哪一步讲清楚。`,
    `目标不是更多流量，而是更快拿到第一批回复、预约和收款。`,
  ];
}

function buildWorkflow(args: {
  snapshot: FulfillmentPackage['snapshot'] & FulfillmentPackage['signals'];
  company: string;
}) {
  const bookingOutput = args.snapshot.hasBooking ? '已识别预约/诊断入口' : '未识别预约入口，需要补一条 CTA';
  const paymentOutput = args.snapshot.hasPayment ? '已识别支付/收款信号' : '未识别支付信号，需要补收款动作';

  return {
    currentNode: 'outreach',
    nodes: [
      {
        id: 'capture',
        label: 'Capture',
        status: 'done' as const,
        detail: '抓取网页标题、描述、H1、CTA、表单和页面语言。',
        output: `${args.snapshot.title || args.company} · score ${args.snapshot.score}`,
      },
      {
        id: 'structure',
        label: 'Structure',
        status: 'done' as const,
        detail: '把网页内容转成可执行信号，而不是只留一张截图。',
        output: `${args.snapshot.forms} 个表单 · ${args.snapshot.ctas.length} 个 CTA`,
      },
      {
        id: 'diagnose',
        label: 'Diagnose',
        status: 'done' as const,
        detail: '判断这个产品是否已经具备预约、支付和工作台能力。',
        output: `${bookingOutput} · ${paymentOutput}`,
      },
      {
        id: 'package',
        label: 'Package',
        status: 'done' as const,
        detail: '自动生成 workspace、访问码、交付内容和首批动作。',
        output: `workspace ${slugify(args.company) || 'leadpulse'} ready`,
      },
      {
        id: 'outreach',
        label: 'Outreach',
        status: 'done' as const,
        detail: '生成首轮触达角度，把 URL 变成可以推进成交的外联输入。',
        output: `${args.snapshot.ctas.slice(0, 2).join(' / ') || '等待补 CTA'}`,
      },
    ],
  };
}

function buildExecutionPlan(args: {
  snapshot: FulfillmentPackage['snapshot'] & FulfillmentPackage['signals'];
  company: string;
  planName: string;
}) {
  const steps: FulfillmentPackage['executionPlan']['steps'] = [];
  const productUrl = args.snapshot.url || '';

  steps.push({
    id: 'positioning',
    label: '重写首页首屏',
    status: 'ready',
    owner: 'Founder',
    surface: '首页 Hero',
    instruction: `把 ${args.company} 的一句话定位改成“给谁用 + 解决什么 + 下一步去哪”，不要只讲功能。`,
    expectedResult: '陌生人 5 秒内知道产品是什么、帮谁、下一步点哪里。',
    actionUrl: productUrl,
    actionLabel: '打开首页',
    successHint: '首屏 5 秒内能回答：给谁、解决什么、下一步去哪。',
    browserSteps: ['打开首页', '停留在首屏 5 秒', '只看主标题、副标题和第一个按钮', '删掉多余解释，保留一个主动作'],
    verifyChecks: ['主标题像结果，不像功能列表', '副标题能说清楚给谁用', '首屏只有一个主要按钮'],
  });

  if (!args.snapshot.hasBooking) {
    steps.push({
      id: 'booking-cta',
      label: '补预约入口',
      status: 'ready',
      owner: 'Design',
      surface: '首页 / 产品页',
      instruction: '加一个明确的预约或诊断 CTA，不要让用户只看到介绍页却没有下一步。',
      expectedResult: '页面里出现一个清晰的预约动作，能把高意向用户推进到对话。',
      actionUrl: productUrl,
      actionLabel: '检查预约入口',
      successHint: '页面里至少有一个“预约 / 诊断 / 咨询” CTA。',
      browserSteps: ['打开首页或产品页', '滚到首屏和中段 CTA 区', '确认有预约/咨询入口', '如果没有，补一个主按钮'],
      verifyChecks: ['CTA 文案直白', '按钮不埋在一堆卡片里', '点击后能到表单或预约页'],
    });
  }

  if (!args.snapshot.hasPayment) {
    steps.push({
      id: 'payment-cta',
      label: '补收款动作',
      status: 'ready',
      owner: 'Founder',
      surface: '产品页 / 开通页',
      instruction: `补上 ${args.planName} 的收款入口、支付说明或付款确认动作，让用户知道怎么买。`,
      expectedResult: '用户能直接完成付款或看到明确的付款步骤。',
      actionUrl: productUrl,
      actionLabel: '检查收款动作',
      successHint: '产品页或开通页能看到明确的付款方式和购买路径。',
      browserSteps: ['打开产品页或开通页', '确认是否能找到付款入口', '检查价格、收款码或购买说明是否同屏可见', '把收款路径压缩到最短'],
      verifyChecks: ['用户不用问就知道怎么买', '价格和付款路径没有冲突', '收款动作不会跳太多层'],
    });
  }

  if (args.snapshot.forms < 1) {
    steps.push({
      id: 'lead-capture',
      label: '补线索表单',
      status: 'ready',
      owner: 'Design',
      surface: '首页 / 预约页',
      instruction: '加一个最小表单，只收姓名、邮箱、产品链接，不要一上来问太多。',
      expectedResult: '用户能先留下联系方式，再进入后续跟进。',
      actionUrl: productUrl,
      actionLabel: '检查表单区',
      successHint: '用户 30 秒内能提交联系方式，不需要跳太多页面。',
      browserSteps: ['打开首页或预约页', '寻找最短表单', '确认字段是否只有必要信息', '删掉会挡住提交的多余字段'],
      verifyChecks: ['字段少', '表单提交路径清楚', '移动端也不费劲'],
    });
  }

  steps.push({
    id: 'trust-proof',
    label: '补结果证明',
    status: 'ready',
    owner: 'Agent',
    surface: '首页中段 / 案例页',
    instruction: '补一组 before/after 结果卡，说明原来卡在哪、接入后推进到哪一步。',
    expectedResult: '用户相信你卖的是结果，不是概念。',
    actionUrl: productUrl,
    actionLabel: '检查证明区',
    successHint: '页面中出现案例、数据或前后对比，不再只有抽象描述。',
    browserSteps: ['打开首页中段或案例页', '找是否有案例、结果、前后对比', '如果没有，补 1-3 个结果卡片', '把抽象描述换成结果描述'],
    verifyChecks: ['至少有一个真实结果', '不是只写“智能/自动化”', '案例区能降低不信任感'],
  });

  return {
    summary: `先修 ${steps[0]?.surface || '首页'}，再补预约/收款，再上案例证明。`,
    steps,
  };
}

export async function provisionFulfillmentPackage(args: {
  sourceId: string;
  sourceKind: SourceKind;
  company: string;
  email: string;
  plan?: string;
  productUrl?: string;
}) {
  const planId = normalizePlanId(args.plan);
  const plan = getPlanById(planId);
  const snapshot = await captureSnapshot(args.productUrl || '');
  const company = safeText(args.company, snapshot.title || '未命名产品');
  const workspaceId = `ws_${slugify(company) || 'leadpulse'}_${randomUUID().slice(0, 8)}`;

  const item: FulfillmentPackage = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    sourceKind: args.sourceKind,
    sourceId: args.sourceId,
    company,
    email: String(args.email || '').trim(),
    planId,
    planName: plan.name,
    productUrl: snapshot.url,
    workspaceId,
    accessCode: buildAccessCode(company),
    status: 'provisioned',
    snapshot,
    signals: {
      language: snapshot.language,
      headline: snapshot.headline,
      subhead: snapshot.subhead,
      forms: snapshot.forms,
      hasPricing: snapshot.hasPricing,
      hasBooking: snapshot.hasBooking,
      hasPayment: snapshot.hasPayment,
      hasLogin: snapshot.hasLogin,
      hasDashboard: snapshot.hasDashboard,
      score: snapshot.score,
      headings: snapshot.headings,
      ctas: snapshot.ctas,
    },
    workflow: buildWorkflow({
      snapshot,
      company,
    }),
    executionPlan: buildExecutionPlan({
      snapshot,
      company,
      planName: plan.name,
    }),
    narrative: buildNarrative({
      company,
      snapshot,
      planName: plan.name,
    }),
    deliveryItems: buildDeliveryItems({
      snapshot,
      planName: plan.name,
    }),
    firstActions: buildFirstActions({
      company,
      productUrl: snapshot.url,
      snapshot,
    }),
    outreachAngles: buildOutreachAngles({
      company,
      snapshot,
    }),
  };

  await upsertNamespaceRecord(FULFILLMENT_NAMESPACE, item, { legacyFilePath: packagesPath });
  return item;
}

export async function getFulfillmentPackage(packageId: string) {
  const normalizedId = String(packageId || '').trim();
  if (!normalizedId) return null;
  const items = await readPackages();
  return items.find((item) => item.id === normalizedId) || null;
}

export async function getFulfillmentPackageBySourceId(sourceId: string) {
  const normalizedId = String(sourceId || '').trim();
  if (!normalizedId) return null;
  const items = await readPackages();
  return items.find((item) => item.sourceId === normalizedId) || null;
}

export function buildExecutionTasksFromFulfillment(pkg: FulfillmentPackage): FollowUpTask[] {
  return pkg.executionPlan.steps.map((step, index) =>
    createFollowUpTask({
      sourceKind: 'payment_intent',
      sourceId: pkg.sourceId,
      key: String(pkg.email || pkg.company || pkg.id).trim().toLowerCase(),
      company: pkg.company,
      contactName: pkg.company,
      email: pkg.email,
      stage: '交付执行中',
      priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
      channel: 'dashboard',
      owner: step.owner,
      title: step.label,
      actionUrl: step.actionUrl,
      actionLabel: step.actionLabel,
      successHint: step.successHint,
      detail: `${step.surface}：${step.instruction} 预期结果：${step.expectedResult} 操作：${step.browserSteps.join(' -> ')}`,
      dueAt: dueAtFromNow(index === 0 ? 6 : index === 1 ? 12 : 24),
      playbookId: 'payment_intent',
      stepKey: `fulfillment-${step.id}`,
      stepOrder: index + 1,
      stepLabel: '交付执行',
    }),
  );
}
