import Link from 'next/link';
import { ArrowRight, CheckCircle2, Search, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';

import { DesignPartnerForm } from '../../../components/design-partner-form';
import { MarketingPageShell } from '../../../components/marketing-page-shell';
import { readExperimentPages, readLatestKeywordUniverse } from '../../../lib/marketing';
import { getPlanById } from '../../../lib/pricing';

type Params = Promise<{
  slug: string;
}>;

const sprintSteps = [
  'Day 1-2：明确 ICP、痛点和价格钩子',
  'Day 3-5：搭好预约页、支付页和跟进节奏',
  'Day 6-10：开始跑搜索词、内容和手动触达',
  'Day 11-14：复盘线索质量、预约转化和付款意向',
];

export async function generateStaticParams() {
  const experiments = await readExperimentPages();
  return experiments.map((item) => ({ slug: item.slug }));
}

export default async function ExperimentDetailPage({
  params,
}: {
  params: Params;
}) {
  const resolved = await params;
  const [experiments, keywordUniverse] = await Promise.all([
    readExperimentPages(),
    readLatestKeywordUniverse(),
  ]);
  const experiment = experiments.find((item) => item.slug === resolved.slug);

  if (!experiment) {
    notFound();
  }

  const primaryPlan = getPlanById('pro');
  const relatedKeywords = keywordUniverse.keywords
    .filter((item) => item.directions.includes(experiment.slug))
    .slice(0, 6);
  const direction = keywordUniverse.directions[experiment.slug];

  return (
    <MarketingPageShell
      eyebrow="Vertical Test"
      title={experiment.title}
      description={experiment.summary}
      primaryCta={{ href: '/book', label: '预约诊断' }}
      secondaryCta={{ href: primaryPlan.paymentUrl, label: `开通 ${primaryPlan.name}` }}
    >
      <section className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          {experiment.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-black/10 bg-[#eef5ff] px-4 py-2 text-sm text-[#0071e3]"
            >
              {keyword}
            </span>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <section className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-semibold text-slate-950">这页是给谁的</h2>
              <p className="mt-4 text-base leading-7 text-[#86868b]">{experiment.persona}</p>
            </section>

            <section className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-semibold text-slate-950">典型痛点</h2>
              <div className="mt-6 space-y-4">
                {experiment.pain_points.map((item) => (
                  <div
                    key={item}
                    className="interactive-panel flex gap-3 rounded-2xl border border-black/5 bg-[#f8f8f4] p-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#0071e3]" />
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#0071e3]" />
                <h2 className="text-2xl font-semibold text-slate-950">14 天怎么跑</h2>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {sprintSteps.map((item) => (
                  <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] p-4 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-[#0071e3]" />
                <h2 className="text-2xl font-semibold text-slate-950">搜索需求证明</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#86868b]">
                {direction
                  ? `${direction.name} 当前整理到 Top keywords ${direction.top_keyword_count} 个。`
                  : '当前方向已进入关键词测试。'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {relatedKeywords.map((item) => (
                  <div key={item.keyword} className="rounded-full border border-black/10 bg-[#f8f8f4] px-4 py-2 text-sm text-slate-700">
                    {item.keyword}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-semibold text-slate-950">现在最适合怎么开始</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
                <div className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                  先约 15 分钟，确认你卡在定位、触达、信任还是收款。
                </div>
                <div className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                  如果你已经能卖，只差系统化，直接开通 {primaryPlan.name} 更快。
                </div>
                <div className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                  目标不是做更多功能，而是更快拿到预约、付款意向和回款。
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="interactive-button inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                >
                  预约诊断
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={primaryPlan.paymentUrl}
                  className="interactive-button inline-flex rounded-full border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                >
                  开通 {primaryPlan.name}
                </Link>
              </div>
            </div>

            <DesignPartnerForm variant="page" />
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
