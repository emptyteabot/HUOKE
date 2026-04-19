import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, CreditCard, ShieldCheck } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import {
  CREDITS_POLICY_CARDS,
  PRICING_CEILING_NOTE,
  TARGET_AUDIENCE_ONE_LINER,
  getPricingPlans,
} from '../../lib/pricing';

export const metadata: Metadata = {
  title: '价格',
  description: 'LeadPulse 价格页：先看样本，再决定买软件使用权还是直接买人工代跑结果。',
};

const compareRows = [
  {
    label: 'Free',
    detail: '给你 5-10 条真实样本，只解决一件事：证明系统抓得到人。',
  },
  {
    label: 'Pro',
    detail: '纯软件版。你拿控制台、拿筛选与导出能力，自己承担平台规则和发送动作。',
  },
  {
    label: 'Max / DFY',
    detail: '人工代跑版。我们替你跑系统、人工清洗名单，并代发第一轮破冰动作。',
  },
];

export default function PricingPage() {
  const plans = getPricingPlans();

  return (
    <MarketingPageShell
      eyebrow="价格"
      title="先看样本，再决定买软件还是买结果"
      description="定价不再包装复杂叙事，只区分三件事：要不要先看样本、要不要自己跑、要不要直接买人工代跑结果。"
      typeLine="样本验证 / 软件使用权 / Done-For-You"
      primaryCta={{ href: '/register?plan=free', label: '先拿样本' }}
      secondaryCta={{ href: '/book', label: '预约 DFY' }}
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
                  <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">{plan.name}</div>
                  <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                    {plan.price}
                    <span className="ml-2 text-base font-medium text-slate-500">{plan.period}</span>
                  </h2>
                </div>
                {plan.highlight ? (
                  <span className="rounded-full border border-black/10 bg-[#f7f7f2] px-3 py-1 text-xs font-medium text-slate-700">
                    默认入口
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

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={plan.paymentUrl}
                  className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  {plan.ctaLabel}
                </Link>
                <Link
                  href="/book"
                  className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white/88 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-white hover:text-slate-950"
                >
                  预约 15 分钟
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Plan logic</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">别按功能买，按你想不想自己跑来买</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{TARGET_AUDIENCE_ONE_LINER}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{PRICING_CEILING_NOTE}</p>

            <div className="mt-6 space-y-3">
              {compareRows.map((row) => (
                <article key={row.label} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{row.label}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{row.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                <CreditCard className="h-5 w-5 text-slate-800" />
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Rules</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">少讲花活，只讲边界</h2>
              </div>
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

            <div className="mt-6 rounded-3xl border border-black/5 bg-white px-5 py-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-slate-800" />
                <div className="text-sm font-semibold text-slate-950">不确定选哪个？</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                如果你还不确定是先看样本、自己跑软件，还是直接把第一轮交给我们代跑，先约 15 分钟，把边界说清楚再付钱。
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  预约方案诊断
                </Link>
                <Link
                  href="/pay?plan=pro"
                  className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
                >
                  直接开通 Pro
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </MarketingPageShell>
  );
}
