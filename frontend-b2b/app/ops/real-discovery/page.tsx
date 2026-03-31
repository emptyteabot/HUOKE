import Link from 'next/link';
import { ArrowRight, Globe, Search, Target, TrendingUp } from 'lucide-react';

import { SiteHeader } from '../../../components/site-header';
import { readLiveTargets } from '../../../lib/self-growth';

export const dynamic = 'force-dynamic';

function priorityTone(priority: string) {
  if (priority === 'S') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'A') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (priority === 'B') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-600';
}

export default async function RealDiscoveryPage() {
  const targets = await readLiveTargets();
  const topTargets = targets.filter((item) => item.priority === 'A');

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref="/ops/self-growth" ctaLabel="看样例池" />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="max-w-4xl fade-up">
          <div className="apple-pill breathing-pill px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
            Real Discovery
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            LeadPulse 真实联网发现结果
          </h1>
          <p className="mt-4 text-base leading-8 text-[#86868b]">
            这页不是种子样例池，而是我刚通过联网搜索抓到的真实目标站点。先看真实发现，再决定要不要打。
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#86868b]">真实目标</div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{targets.length}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-3 text-slate-900">
                <Globe className="h-5 w-5" />
              </div>
            </div>
          </article>
          <article className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#86868b]">A 级目标</div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{topTargets.length}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-3 text-slate-900">
                <Target className="h-5 w-5" />
              </div>
            </div>
          </article>
          <article className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#86868b]">搜索来源</div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Web</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-3 text-slate-900">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </article>
          <article className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#86868b]">下一步</div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">触达</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-3 text-slate-900">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </article>
        </div>

        <div className="mt-10 space-y-4">
          {targets.map((target) => (
            <article key={target.url} className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap gap-2">
                    <div className={`rounded-full border px-3 py-1 text-xs font-medium ${priorityTone(target.priority)}`}>
                      {target.priority} · {target.score}
                    </div>
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                      {target.segment}
                    </div>
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                      {target.channel}
                    </div>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{target.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{target.reason}</p>
                  <div className="mt-4 rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                    为什么适合：{target.pain_fit}
                  </div>
                  <div className="mt-3 rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                    下一步：{target.next_action}
                  </div>
                  <p className="mt-3 text-xs text-[#86868b]">搜索词：{target.query} · 发现时间：{target.found_at}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={target.url}
                    target="_blank"
                    rel="noreferrer"
                    className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                  >
                    打开站点
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/ops/self-growth"
            className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
          >
            回到样例池 / 内容 backlog
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
