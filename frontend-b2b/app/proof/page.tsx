import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, Mail, Radar, Search, Send, Sparkles, Target } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { readExperimentPages, readLatestKeywordUniverse } from '../../lib/marketing';
import { readOpsDashboardData } from '../../lib/ops';
import { readOutreachEvents } from '../../lib/outreach-log';
import { readPipelineSnapshot } from '../../lib/pipeline';
import { EXECUTION_RULES, PRODUCT_PROOF_POINTS, PROOF_CASES } from '../../lib/proof';
import { readSelfGrowthSummary } from '../../lib/self-growth';

export const dynamic = 'force-dynamic';

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function formatDateLabel(value?: string) {
  if (!value) return '暂无时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function ProofPage() {
  const [ops, selfGrowth, keywordUniverse, experiments, outreachEvents, pipeline] = await Promise.all([
    readOpsDashboardData(),
    readSelfGrowthSummary(),
    readLatestKeywordUniverse(),
    readExperimentPages(),
    readOutreachEvents(),
    readPipelineSnapshot(),
  ]);

  const boostedPipelineContacts = pipeline.contacts.filter((item) => (item.rerankBoost || 0) > 0).slice(0, 4);

  const metricCards = [
    { label: '关键词池', value: formatNumber(keywordUniverse.total_keywords), icon: Search },
    { label: '可分析账户', value: formatNumber(selfGrowth.total_accounts), icon: Target },
    { label: '待外联账户', value: formatNumber(selfGrowth.queued_accounts), icon: Send },
    { label: '7 天新线索', value: formatNumber(ops.summary.newLeads7d), icon: BarChart3 },
    { label: '7 天预约', value: formatNumber(ops.summary.bookings7d), icon: Mail },
    { label: '付款意向', value: formatNumber(ops.summary.paymentIntents7d), icon: CheckCircle2 },
  ];

  return (
    <MarketingPageShell
      eyebrow="Proof"
      title="执行证明，不是包装页"
      description="这里放的是已经跑起来的关键词池、目标队列、实验页、预约、付款意向和真实触达动作。"
      primaryCta={{ href: '/cases', label: '看案例' }}
      secondaryCta={{ href: '/dashboard', label: '看总览' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-500">{card.label}</div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white p-3">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold text-slate-950">为什么这页存在</h2>
            </div>
            <div className="mt-6 space-y-3">
              {PRODUCT_PROOF_POINTS.map((item) => (
                <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Radar className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold text-slate-950">当前执行纪律</h2>
            </div>
            <div className="mt-6 space-y-3">
              {EXECUTION_RULES.map((item) => (
                <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-10 interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-slate-700" />
            <h2 className="text-2xl font-semibold text-slate-950">真实触达样本</h2>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {PROOF_CASES.map((item) => (
              <article key={item.company} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="text-sm font-medium text-slate-500">{item.channel}</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{item.company}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">结果：{item.result}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">角度：{item.angle}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.96fr_1.04fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold text-slate-950">当前高优先目标</h2>
            </div>
            <div className="mt-6 space-y-4">
              {boostedPipelineContacts.map((item) => (
                <article key={item.key} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-950">{item.company}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {item.urgency}
                      </span>
                      {item.rerankBoost ? (
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                          排序提升 +{item.rerankBoost}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    {item.stageLabel} · 推荐 {item.recommendedPlanLabel}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.nextAction}</p>
                  {item.rerankReason ? <p className="mt-3 text-xs leading-6 text-slate-500">{item.rerankReason}</p> : null}
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold text-slate-950">最近触达记录</h2>
            </div>
            <div className="mt-6 space-y-4">
              {outreachEvents.length > 0 ? (
                outreachEvents.slice(0, 4).map((item) => (
                  <article key={item.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold text-slate-950">{item.company}</h3>
                      <span className="text-xs text-slate-500">{formatDateLabel(item.sentAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.channel} · {item.stepLabel}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                  </article>
                ))
              ) : (
                <div className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-600">
                  当前还没有公开展示的发送日志，说明系统仍在控制量级。
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-10 interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Experiment pages</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">已开跑的实验页</h2>
            </div>
            <Link
              href="/experiments"
              className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
            >
              看全部实验页
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {experiments.slice(0, 3).map((item) => (
              <Link
                key={item.slug}
                href={`/experiments/${item.slug}`}
                className="interactive-button rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 hover:border-black/10 hover:bg-white"
              >
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </MarketingPageShell>
  );
}
