import Link from 'next/link';
import { ArrowRight, Search, Sparkles } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { readExperimentPages, readLatestKeywordUniverse } from '../../lib/marketing';

export default async function ExperimentsPage() {
  const [experiments, keywordUniverse] = await Promise.all([
    readExperimentPages(),
    readLatestKeywordUniverse(),
  ]);

  const directionCards = Object.entries(keywordUniverse.directions).slice(0, 3);

  return (
    <MarketingPageShell
      eyebrow="Experiments"
      title="实验页，用真实需求说话"
      description={`关键词池里已经整理了 ${keywordUniverse.total_keywords} 个候选词。先做页，再看预约、付款意向和跟进质量。`}
      primaryCta={{ href: '/book', label: '预约诊断' }}
      secondaryCta={{ href: '/pay?plan=pro', label: '开通 Pro' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {directionCards.map(([key, direction]) => (
            <div
              key={key}
              className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-center gap-2 text-sm text-[#0071e3]">
                <Search className="h-4 w-4" />
                搜索方向
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">{direction.name}</h2>
              <p className="mt-3 text-sm leading-6 text-[#86868b]">
                Top keywords {direction.top_keyword_count} · Seed queries {direction.seed_count}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {experiments.map((experiment) => (
            <article
              key={experiment.slug}
              className="interactive-panel rounded-[32px] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-center gap-2 text-sm text-[#0071e3]">
                <Sparkles className="h-4 w-4" />
                垂直测试页
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">{experiment.title}</h2>
              <p className="mt-4 text-sm leading-6 text-[#86868b]">{experiment.summary}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {experiment.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-black/10 bg-[#eef5ff] px-3 py-1 text-xs text-[#0071e3]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-700">
                {experiment.pain_points.slice(0, 2).map((item) => (
                  <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Link
                  href={`/experiments/${experiment.slug}`}
                  className="interactive-button inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                >
                  打开测试页
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
