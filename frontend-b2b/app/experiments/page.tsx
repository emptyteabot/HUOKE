import Link from 'next/link';
import { ArrowRight, Search, Sparkles } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { readExperimentPages, readLatestKeywordUniverse } from '../../lib/marketing';

export default async function ExperimentsPage() {
  const [experiments, keywordUniverse] = await Promise.all([readExperimentPages(), readLatestKeywordUniverse()]);

  const directionCards = Object.entries(keywordUniverse.directions).slice(0, 3);

  return (
    <MarketingPageShell
      eyebrow="实验页"
      title="实验页只服务一件事：验证真实需求。"
      description={`关键词池里已经整理了 ${keywordUniverse.total_keywords} 个候选词。先看公开讨论里的需求密度，再决定是否投入充值包放量。`}
      primaryCta={{ href: '/book', label: '预约诊断' }}
      secondaryCta={{ href: '/pricing', label: '查看充值包' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {directionCards.map(([key, direction]) => (
            <div key={key} className="lead-card p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                <Search className="h-4 w-4" />
                搜索方向
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-950">{direction.name}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Top keywords {direction.top_keyword_count} · Seed queries {direction.seed_count}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {experiments.map((experiment) => (
            <article key={experiment.slug} className="lead-card p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                <Sparkles className="h-4 w-4" />
                垂直测试页
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-950">{experiment.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{experiment.summary}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {experiment.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-700">
                {experiment.pain_points.slice(0, 2).map((item) => (
                  <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    {item}
                  </div>
                ))}
              </div>

              <Link href={`/experiments/${experiment.slug}`} className="lead-button lead-button-secondary mt-6 text-sm">
                打开测试页
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
