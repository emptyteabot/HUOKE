import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail, Radar, Search, Target } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { readExperimentPages, readLatestKeywordUniverse } from '../../lib/marketing';
import { readOutreachEvents } from '../../lib/outreach-log';
import { readPipelineSnapshot } from '../../lib/pipeline';
import { PROOF_CASES } from '../../lib/proof';
import { readSelfGrowthSummary } from '../../lib/self-growth';

export const metadata: Metadata = {
  title: 'Cases',
  description: 'LeadPulse 内部案例页：实验页、真实触达、目标池和排序提升反馈。',
};

export const dynamic = 'force-dynamic';

export default async function CasesPage() {
  const [summary, experiments, outreachEvents, keywords, pipeline] = await Promise.all([
    readSelfGrowthSummary(),
    readExperimentPages(),
    readOutreachEvents(),
    readLatestKeywordUniverse(),
    readPipelineSnapshot(),
  ]);

  const boostedContacts = pipeline.contacts.filter((item) => (item.rerankBoost || 0) > 0).slice(0, 3);

  return (
    <MarketingPageShell
      eyebrow="Cases"
      title="看真实案例，不看包装"
      description="这里放的是已经在跑的实验页、触达样本和被提升的高优先目标，不是概念页。"
      primaryCta={{ href: '/proof', label: '看执行证明' }}
      secondaryCta={{ href: '/experiments', label: '看实验页' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: '关键词池', value: keywords.total_keywords, icon: Search },
            { label: '目标账户', value: summary.total_accounts, icon: Target },
            { label: '待触达', value: summary.queued_accounts, icon: Mail },
            { label: '实验页', value: experiments.length, icon: Radar },
          ].map((card) => {
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
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Live cases</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">真实触达样本</h2>
            <div className="mt-6 space-y-4">
              {PROOF_CASES.map((item) => (
                <article key={item.company} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="text-sm font-medium text-slate-500">{item.channel}</div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.company}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">结果：{item.result}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">角度：{item.angle}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Experiments</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">当前实验页</h2>
              </div>
              <Link href="/experiments" className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
                打开全部
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {experiments.slice(0, 4).map((item) => (
                <Link
                  key={item.slug}
                  href={`/experiments/${item.slug}`}
                  className="interactive-button block rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 hover:border-black/10 hover:bg-white"
                >
                  <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Rerank feedback</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">被提升的高优先目标</h2>
            <div className="mt-6 space-y-4">
              {boostedContacts.length ? (
                boostedContacts.map((item) => (
                  <article key={item.key} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold text-slate-950">{item.company}</h3>
                      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                        排序提升 +{item.rerankBoost}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      {item.stageLabel} · 推荐 {item.recommendedPlanLabel}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.nextAction}</p>
                    {item.rerankReason ? <p className="mt-3 text-xs leading-6 text-slate-500">{item.rerankReason}</p> : null}
                  </article>
                ))
              ) : (
                <div className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-600">
                  当前还没有被手动提升的高优先目标。
                </div>
              )}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Recent signals</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">最近的公开触达记录</h2>
            <div className="mt-6 space-y-4">
              {outreachEvents.slice(0, 4).map((item) => (
                <article key={item.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-slate-950">{item.company}</h3>
                    <span className="text-xs text-slate-500">{item.channel}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </MarketingPageShell>
  );
}
