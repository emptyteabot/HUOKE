import type { Metadata } from 'next';
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, CircleDollarSign, Clock3, Radar, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { readAgentWorkspace } from '../../lib/agent-os';
import { readInvestorReadiness } from '../../lib/investor-readiness';
import { readOpsDashboardData } from '../../lib/ops';
import { readSelfGrowthSummary } from '../../lib/self-growth';

export const metadata: Metadata = {
  title: 'Investors',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

function tone(status: 'strong' | 'watch' | 'gap') {
  if (status === 'strong') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'watch') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

export default async function InvestorsPage() {
  const [readiness, ops, growth, workspace] = await Promise.all([
    readInvestorReadiness(),
    readOpsDashboardData(),
    readSelfGrowthSummary(),
    readAgentWorkspace(),
  ]);

  const summaryCards = [
    { label: 'Readiness Score', value: readiness.overallScore, helper: readiness.stageLabel, icon: TrendingUp },
    { label: '目标账户', value: growth.total_accounts, helper: `${growth.queued_accounts} 待外联`, icon: Target },
    { label: '7 天预约', value: ops.summary.bookings7d, helper: `${ops.summary.paymentIntents7d} 个付款意向`, icon: CircleDollarSign },
    { label: 'Agent Ready', value: workspace.summary.readyQueue, helper: `${workspace.summary.activeAgents} 个 agent 在线`, icon: Bot },
  ];

  return (
    <MarketingPageShell
      eyebrow="Investor Readiness"
      title="先判断能不能融，再讲故事"
      description="这页不是包装页，而是内部判断：现在该继续卖、补案例，还是可以开始聊融资。"
      primaryCta={{ href: '/dashboard/ai', label: '看 Agent OS' }}
      secondaryCta={{ href: '/ops', label: '看经营看板' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">{card.label}</div>
                    <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</div>
                    <div className="mt-2 text-sm text-slate-600">{card.helper}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                    <Icon className="h-5 w-5 text-slate-800" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 py-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Stage</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{readiness.stageLabel}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{readiness.stageNote}</p>

            <div className="mt-6 space-y-4">
              {readiness.narrative.map((item) => (
                <article key={item} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-600">
                  {item}
                </article>
              ))}
            </div>

            <div className="mt-6 interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-slate-700" />
                <h3 className="text-lg font-semibold text-slate-950">现在最该做什么</h3>
              </div>
              <div className="mt-4 space-y-3">
                {readiness.milestones.map((item) => (
                  <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm leading-7 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Readiness Map</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">五个维度决定现在该做什么</h2>
            <div className="mt-6 space-y-4">
              {readiness.dimensions.map((dimension) => (
                <article key={dimension.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{dimension.label}</div>
                      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{dimension.score}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone(dimension.status)}`}>
                      {dimension.status === 'strong' ? 'Strong' : dimension.status === 'watch' ? 'Watch' : 'Gap'}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{dimension.detail}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {dimension.evidence.map((item) => (
                      <span key={item} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold text-slate-950">当前最强的地方</h2>
            </div>
            <div className="mt-6 space-y-4">
              {readiness.strengths.map((item) => (
                <article key={item} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-600">
                  {item}
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold text-slate-950">当前 blocker</h2>
            </div>
            <div className="mt-6 space-y-4">
              {readiness.blockers.map((item) => (
                <article key={item} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-600">
                  {item}
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-8 interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Suggested next actions</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">下一步应该补什么</h2>
            </div>
            <Radar className="h-8 w-8 text-slate-700" />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <Link href="/dashboard/ai" className="interactive-button rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 hover:border-black/10 hover:bg-white">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Automation</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">继续把 agent 执行层跑起来</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">不是再加概念，而是继续拉出连续数据。</p>
              <div className="mt-5 inline-flex items-center text-sm font-semibold text-slate-700">
                打开 Agent OS
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>

            <Link href="/ops" className="interactive-button rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 hover:border-black/10 hover:bg-white">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Metrics</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">把样本模式继续换成真实数据</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">没有真实现金流和转化数据，融资页再漂亮也只是包装。</p>
              <div className="mt-5 inline-flex items-center text-sm font-semibold text-slate-700">
                打开经营看板
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>

            <Link href="/compare" className="interactive-button rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 hover:border-black/10 hover:bg-white">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Narrative</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">继续把叙事压缩到收入结果</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">公开叙事应该继续离收入更近，离模型名词更远。</p>
              <div className="mt-5 inline-flex items-center text-sm font-semibold text-slate-700">
                看公开叙事
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
