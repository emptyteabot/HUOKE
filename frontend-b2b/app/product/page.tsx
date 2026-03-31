import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CreditCard, FileCode2, MessageSquareQuote, Radar, ShieldCheck } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '产品',
  description: 'LeadPulse 产品页：把发现、转化、收款和复用沉淀成一套可卖的产品系统。',
};

const pillars = [
  {
    title: '发现',
    description: '先识别更高价值的线索，而不是把所有流量一视同仁。',
    icon: Radar,
  },
  {
    title: '转化',
    description: '把演示、预约、付款和消息接成一条更短的路径。',
    icon: CreditCard,
  },
  {
    title: '交付',
    description: '成交后继续推进 credits、onboarding 和后续动作。',
    icon: MessageSquareQuote,
  },
  {
    title: '复用',
    description: '把有效路径沉淀成可复用资产，而不是留在聊天记录里。',
    icon: FileCode2,
  },
];

const outputs = [
  '公开产品页、演示页、预约页、付款页',
  '高意向识别、排序提升、Closer 推进',
  '成交草稿、收款确认、任务回流',
  '代码、页面、流程和经营数据沉淀',
];

export default function ProductPage() {
  return (
    <MarketingPageShell
      eyebrow="产品"
      title="一套从线索到收款的产品系统"
      description="LeadPulse 不是再加一个 AI 功能，而是把发现、转化、收款和复用做成统一产品。"
      primaryCta={{ href: '/demo', label: '先看演示' }}
      secondaryCta={{ href: '/pay?plan=pro', label: '开通 Pro' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3 w-fit">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-12 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">What you buy</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">你买到的不是页面，而是一条完整路径</h2>
            <div className="mt-6 space-y-3">
              {outputs.map((item) => (
                <div
                  key={item}
                  className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                <ShieldCheck className="h-5 w-5 text-slate-800" />
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Next</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">继续往下看</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {[
                { href: '/compare', label: '看对比', detail: '为什么它不是普通 AI 工具。' },
                { href: '/platform', label: '看平台', detail: '支付、credits 和资产如何统一。' },
                { href: '/security', label: '看安全', detail: '自动化边界和风控如何设计。' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="interactive-button rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 hover:border-black/10 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                      <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </MarketingPageShell>
  );
}
