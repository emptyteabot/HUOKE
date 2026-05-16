import type { Metadata } from 'next';
import {
  CheckCircle2,
  Cpu,
  Filter,
  Globe,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Rss,
  Send,
  Target,
  Twitter,
} from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '产品',
  description: 'LeadPulse 把公开讨论里的采购信号先筛出来，再把能直接跟进的样本交给销售。',
};

type LeadRow = {
  source: string;
  company: string;
  signal: string;
  analysis: string;
  score: number;
  stage: string;
  owner: string;
};

const sourcePills = [
  { icon: Twitter, name: 'X / Twitter' },
  { icon: MessagesSquare, name: 'Reddit 讨论区' },
  { icon: Rss, name: '行业论坛' },
  { icon: MessageSquare, name: '小红书 / 评论区' },
];

const flowCards = [
  {
    icon: Rss,
    step: '1',
    title: '原始讨论流',
    detail: '先看公开讨论里谁在问报价、找方案、找代运营，再决定要不要继续看下去。',
  },
  {
    icon: Filter,
    step: '2',
    title: 'AI 动态打分',
    detail: '抛弃关键词硬匹配，改成长上下文理解。预算、权限、紧迫度都要一起看。',
  },
  {
    icon: CheckCircle2,
    step: '3',
    title: '合格会议',
    detail: '通过预算和意图校验后，才进入可约时间和发现电话，不浪费销售时间。',
  },
];

const leadRows: LeadRow[] = [
  {
    source: 'Reddit / r/SaaS',
    company: 'RemoteOps AI',
    signal: 'We need a partner that can qualify intent before any sales call.',
    analysis: '对方明确在找“先筛选意图”的合作方，属于典型采购前信号。',
    score: 96,
    stage: '预算核对',
    owner: 'B2B SaaS',
  },
  {
    source: '小红书评论',
    company: '杭州独立站品牌',
    signal: '有没有能先看样本，再决定要不要约时间的人？',
    analysis: '先看样本、再决定，说明已经到了评估工具和服务的阶段。',
    score: 93,
    stage: '样本评估',
    owner: '跨境电商',
  },
  {
    source: '知乎问答',
    company: '广州工厂官网',
    signal: '我们现在最缺的是能快速判断预算和意图的办法。',
    analysis: '预算和意图同时出现，说明问题已经从“有没有线索”变成“筛选质量”。',
    score: 91,
    stage: '方案比较',
    owner: '工厂外贸',
  },
  {
    source: '行业论坛',
    company: '宁波汽配出口',
    signal: '想找一个能直接看出客户是不是准备买的人。',
    analysis: '对关键词方案已经不满意，正在找更接近成交的判断方式。',
    score: 94,
    stage: '替换方案',
    owner: '外贸团队',
  },
  {
    source: 'X / Twitter',
    company: 'Brooklyn Agency',
    signal: 'Looking for a lead gen partner that can deliver qualified meetings.',
    analysis: '要的是合格会议，不是名单堆积，属于高质量服务需求。',
    score: 95,
    stage: '会议质量',
    owner: 'Agency',
  },
  {
    source: '微信群留言',
    company: '上海增长团队',
    signal: '老板要的是能直接推进成交的线索，不是再来一堆表格。',
    analysis: '团队已经在用成交结果反推工具需求，采购链路在变短。',
    score: 90,
    stage: '结果导向',
    owner: '增长团队',
  },
  {
    source: 'Reddit / r/Entrepreneur',
    company: 'Austin Startup',
    signal: 'We have budget. We just need real buyers.',
    analysis: '预算存在，问题变成找真实买家，适合直接推进样本和报价。',
    score: 92,
    stage: '真实买家',
    owner: 'Startup',
  },
  {
    source: 'Facebook Group',
    company: 'Miami Ecommerce',
    signal: 'Anyone know a team that can qualify leads instead of dumping names?',
    analysis: '对“名单”本身不感兴趣，说明已经在看筛选结果。',
    score: 89,
    stage: '筛选',
    owner: 'DTC',
  },
  {
    source: '公众号留言',
    company: '深圳教育机构',
    signal: '可以先给我看两条能直接跟进的样本吗？',
    analysis: '对样本有明确要求，已经进入评估阶段，不是泛泛咨询。',
    score: 87,
    stage: '样本确认',
    owner: '教育团队',
  },
  {
    source: '行业社群',
    company: '青岛机械出口',
    signal: '我们想要能写进日历的客户，不想再看噪音。',
    analysis: '目标说得很直白，已经在寻找能直接落地的高意向线索。',
    score: 95,
    stage: '结果交付',
    owner: '外贸销售',
  },
];

const capabilityCards = [
  {
    icon: Filter,
    title: '剔除噪音',
    detail: '把水军、软文、闲聊和低预算内容先挡掉，只留和采购有关的内容。',
  },
  {
    icon: Target,
    title: '看懂意图',
    detail: '自动判断求推荐、找代运营、寻报价这些真实交易信号，并标记阶段。',
  },
  {
    icon: Send,
    title: '推给销售',
    detail: '结果可以直接进企业微信、飞书或 CRM，原文和判断一起送到销售面前。',
  },
];

export default function ProductPage() {
  return (
    <MarketingPageShell
      eyebrow="工作流"
      title="把公开讨论里正在表态的客户，筛成销售能直接跟进的线索。"
      description="LeadPulse 持续看留言区、评论区、论坛和社群，把谁在找方案、找报价、找代运营先分出来。"
      typeLine="我们不爬数据，我们提取真相。"
      primaryCta={{ href: '/book', label: '申请免费样本' }}
      secondaryCta={{ href: '/demo', label: '查看工作流演示' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="lead-glass rounded-[24px] border border-white/80 p-6 shadow-xl shadow-slate-200/20 md:p-8">
          <div className="flex flex-col items-stretch justify-between gap-8 lg:flex-row lg:items-center">
            <div className="flex-1">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">1</span>
                原始讨论流
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sourcePills.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/65 p-3 shadow-sm">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hidden h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white text-center leading-8 text-slate-300 lg:block">
              →
            </div>

            <div className="group relative flex-1">
              <div className="absolute inset-0 -m-4 rounded-[24px] bg-blue-500/5 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
              <div className="relative mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700">2</span>
                AI 动态打分
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="flex items-center gap-2 text-xs text-slate-600">
                      <Cpu className="h-3.5 w-3.5 text-blue-500" />
                      长上下文理解
                    </span>
                    <span className="font-mono text-xs text-slate-500">预算 / 意图 / 权限</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="flex items-center gap-2 text-xs text-slate-600">
                      <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      噪音过滤
                    </span>
                    <span className="font-mono text-xs text-slate-500">只留高意向内容</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white text-center leading-8 text-slate-300 lg:block">
              →
            </div>

            <div className="flex-1">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">3</span>
                合格会议
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/3 bg-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="h-2 w-24 rounded bg-slate-200" />
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="h-2 w-32 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="rounded-md bg-slate-950 px-3 py-1.5 text-[10px] font-medium text-white">写入日历</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="lead-glass overflow-hidden rounded-lg border border-white/80 shadow-xl shadow-slate-200/20">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-white/65 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="lead-pill w-fit">只读样本</div>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">10 条脱敏样本</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                每一条都保留来源、信号、AI 判断、阶段和负责人，方便销售直接看见要不要跟。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-2xl font-extrabold text-slate-950">10</div>
                <div className="text-xs text-slate-500">脱敏样本</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-2xl font-extrabold text-slate-950">91</div>
                <div className="text-xs text-slate-500">平均分</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-2xl font-extrabold text-slate-950">6</div>
                <div className="text-xs text-slate-500">可直约</div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200/70 bg-slate-50/55 p-4 md:hidden">
            <div className="grid gap-3">
              {leadRows.map((lead) => (
                <article key={`${lead.source}-${lead.company}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">{lead.source}</div>
                      <div className="mt-1 text-base font-bold text-slate-950">{lead.company}</div>
                    </div>
                    <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                      {lead.score}
                    </span>
                  </div>

                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">购买信号</div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{lead.signal}</p>
                  </div>

                  <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-3">
                    <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">AI 分析</div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{lead.analysis}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
                      {lead.stage}
                    </span>
                    <span>{lead.owner}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="hidden overflow-x-auto bg-slate-50/55 p-4 md:block">
            <table className="lp-table min-w-[1080px]">
              <thead>
                <tr>
                  <th>来源</th>
                  <th>对象</th>
                  <th>购买信号</th>
                  <th>AI 判断</th>
                  <th>阶段</th>
                  <th>评分</th>
                  <th>负责人</th>
                </tr>
              </thead>
              <tbody>
                {leadRows.map((lead) => (
                  <tr key={`${lead.source}-${lead.company}`} className="align-top">
                    <td className="font-semibold text-slate-700">{lead.source}</td>
                    <td className="font-bold text-slate-950">{lead.company}</td>
                    <td className="max-w-[270px] leading-7 text-slate-700">{lead.signal}</td>
                    <td className="max-w-[300px] leading-7 text-slate-600">{lead.analysis}</td>
                    <td>
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {lead.stage}
                      </span>
                    </td>
                    <td>
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                        {lead.score}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-700">{lead.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {capabilityCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="lead-glass rounded-[24px] p-8">
                <Icon className="mb-5 h-8 w-8 text-slate-800" />
                <h2 className="text-xl font-bold text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm font-light leading-7 text-slate-600">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>
    </MarketingPageShell>
  );
}
