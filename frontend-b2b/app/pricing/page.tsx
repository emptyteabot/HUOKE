import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ShieldCheck } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import {
  CREDITS_POLICY_CARDS,
  PRICING_CEILING_NOTE,
  TARGET_AUDIENCE_ONE_LINER,
  getPricingPlans,
} from '../../lib/pricing';

export const metadata: Metadata = {
  title: '收费方式',
  description: '先看免费样本，再决定是自己用软件版，还是先试一轮代跑版。',
};

export default function PricingPage() {
  const plans = getPricingPlans();

  return (
    <MarketingPageShell
      eyebrow="收费方式"
      title="先小单验证，不先把价格做成门槛"
      description="现在这套定价的目的不是做豪华套餐，而是让你先低成本试一轮，判断值不值得继续。"
      typeLine="先看样本，再决定自己做还是交给我们做。"
      primaryCta={{ href: '/register?plan=free', label: '免费拿样本' }}
      secondaryCta={{ href: '/book', label: '先聊 15 分钟' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`interactive-panel rounded-[2rem] border p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] ${
                plan.highlight ? 'border-slate-900/10 bg-white' : 'border-black/5 bg-white/88'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{plan.name}</div>
                  <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                    {plan.price}
                    <span className="ml-2 text-base font-medium text-slate-500">{plan.period}</span>
                  </h2>
                </div>
                {plan.highlight ? (
                  <span className="rounded-full border border-black/10 bg-[#f7f7f2] px-3 py-1 text-xs font-medium text-slate-700">
                    最容易开始
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{plan.goodFor}</p>

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-3 rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Link
                  href={plan.paymentUrl}
                  className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  {plan.ctaLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold text-slate-950">为什么现在这样定</div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{TARGET_AUDIENCE_ONE_LINER}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{PRICING_CEILING_NOTE}</p>
            <div className="mt-6 space-y-3">
              {[
                '如果你只想先判断方向，先拿免费样本。',
                '如果你愿意自己动手跑，先开软件版。',
                '如果你只想先看一轮整理好的结果，就走代跑版。',
              ].map((row) => (
                <div key={row} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                  {row}
                </div>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-slate-800" />
              <div className="text-sm font-semibold text-slate-950">你最需要知道的</div>
            </div>

            <div className="mt-6 space-y-4">
              {CREDITS_POLICY_CARDS.map((card) => (
                <article key={card.title} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                  <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                    {card.description}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </MarketingPageShell>
  );
}
