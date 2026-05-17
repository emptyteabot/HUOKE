import type { Metadata } from 'next';
import { CheckCircle2, Layers3, ShieldCheck, Sparkles, XCircle } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '对比',
  description: 'LeadPulse 和传统舆情工具、手工搜索、泛表单工具的差异。',
};

const topCards = [
  {
    title: 'LeadPulse',
    points: ['只看购买意图', '按结果扣费', '推进到沟通和线索池'],
    icon: Sparkles,
    badge: '更接近成交',
  },
  {
    title: '传统舆情工具',
    points: ['关键词链接很多', '噪音需要人工看', '离销售动作很远'],
    icon: Layers3,
    badge: '更吵',
  },
  {
    title: '泛表单工具',
    points: ['等客户主动填', '功能很多但不聚焦', '无法捕捉公开讨论里的需求'],
    icon: ShieldCheck,
    badge: '更被动',
  },
];

const rows = [
  {
    label: '从讨论到线索',
    leadpulse: '逐条分析购买意图、预算信号和下一步动作。',
    manual: '靠人肉搜索和人工判断。',
    service: '等客户填表或靠广告引流。',
  },
  {
    label: '噪音处理',
    leadpulse: '先过滤水军、软文、吐槽和同行自卖自夸。',
    manual: '噪音直接进入表格。',
    service: '几乎无法处理公开讨论噪音。',
  },
  {
    label: '商业闭环',
    leadpulse: '预算达标后进入沟通、充值和线索池。',
    manual: '后续动作散落在不同工具里。',
    service: '只承接主动提交的人。',
  },
];

export default function ComparePage() {
  return (
    <MarketingPageShell
      eyebrow="对比"
      title="不是链接更多，而是离成交更近。"
      description="LeadPulse 的区别不在功能数量，而在于只保留一条获客闭环：发现购买意图、过滤噪音、推进销售动作。"
      primaryCta={{ href: '/pricing', label: '查看充值包' }}
      secondaryCta={{ href: '/product', label: '看产品' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {topCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="lead-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Icon className="h-5 w-5 text-slate-800" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">{card.badge}</span>
                </div>
                <h2 className="mt-5 text-xl font-extrabold tracking-tight text-slate-950">{card.title}</h2>
                <div className="mt-5 space-y-3">
                  {card.points.map((point) => (
                    <div key={point} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="lead-card p-6">
          <div className="lead-pill">Compare</div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">你买的是筛选结果，不是另一堆工具。</h2>
          <div className="mt-6 space-y-4">
            {rows.map((row) => (
              <article key={row.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-extrabold text-slate-950">{row.label}</h3>
                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                  <div className="rounded-lg border border-emerald-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      LeadPulse
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{row.leadpulse}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                      <XCircle className="h-4 w-4 text-slate-400" />
                      手工搜索
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{row.manual}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                      <XCircle className="h-4 w-4 text-slate-400" />
                      泛表单
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{row.service}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
