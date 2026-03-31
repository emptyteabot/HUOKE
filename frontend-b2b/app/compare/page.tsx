import type { Metadata } from 'next';
import { CheckCircle2, Layers3, ShieldCheck, Sparkles, XCircle } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '对比',
  description: 'LeadPulse 对比页：和手工拼工具、纯服务、通用 AI 工具的差异。',
};

const topCards = [
  {
    title: 'LeadPulse',
    points: ['更像产品', '更接近收款', '更适合长期复用'],
    icon: Sparkles,
    badge: '更完整',
  },
  {
    title: '手工拼工具',
    points: ['早期能跑', '后期会散', 'Founder 变成系统本身'],
    icon: Layers3,
    badge: '更零散',
  },
  {
    title: '纯服务',
    points: ['短期能出结果', '难产品化', '资产沉淀有限'],
    icon: ShieldCheck,
    badge: '更依赖人',
  },
];

const rows = [
  {
    label: '从线索到收款',
    leadpulse: '公开页、预约、付款、消息和任务都在同一条链路里。',
    manual: '路径分散在多个工具里。',
    service: '流程主要留在服务商手里。',
  },
  {
    label: '自动化边界',
    leadpulse: '有 Guardrails、日志、节流和人工接管。',
    manual: '大多靠手动习惯。',
    service: '通常不可见。',
  },
  {
    label: '资产所有权',
    leadpulse: '页面、代码、话术和路径都能沉淀。',
    manual: '内容散落，难复用。',
    service: '交付常常不够结构化。',
  },
];

export default function ComparePage() {
  return (
    <MarketingPageShell
      eyebrow="对比"
      title="不是做得更快，而是离收款更近"
      description="LeadPulse 的区别不在于功能更多，而在于把分散动作收成一条可复用、可经营的路径。"
      primaryCta={{ href: '/pay?plan=pro', label: '看定价' }}
      secondaryCta={{ href: '/product', label: '看产品' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {topCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                    <Icon className="h-5 w-5 text-slate-800" />
                  </div>
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    {card.badge}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{card.title}</h2>
                <div className="mt-5 space-y-3">
                  {card.points.map((point) => (
                    <div key={point} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Compare</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">你买的是系统，不是临时拼装</h2>
          <div className="mt-6 space-y-4">
            {rows.map((row) => (
              <article key={row.label} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <h3 className="text-lg font-semibold text-slate-950">{row.label}</h3>
                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      LeadPulse
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{row.leadpulse}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <XCircle className="h-4 w-4 text-slate-400" />
                      手工拼工具
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{row.manual}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <XCircle className="h-4 w-4 text-slate-400" />
                      纯服务
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
