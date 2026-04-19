import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CreditCard,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import {
  CREDITS_POLICY_CARDS,
  PRICING_CEILING_NOTE,
  TARGET_AUDIENCE_ONE_LINER,
  getPricingPlans,
} from '../../lib/pricing';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'LeadPulse pricing for an AI Lead Capture & Conversion OS that turns public buying intent into qualified pipeline, bookings, payments, and onboarding.',
};

const buyingPrinciples = [
  {
    title: 'Buy one revenue path, not five disconnected tools',
    description:
      'LeadPulse packages signal capture, qualification, outreach prep, booking, payment, and kickoff into one operating layer.',
    icon: Sparkles,
  },
  {
    title: 'Start self-serve, upgrade when the loop works',
    description:
      'Free is for validating the first loop. Pro is the default plan when you want a stable conversion system. Max is for higher throughput teams.',
    icon: Gauge,
  },
  {
    title: 'Pricing stays clear enough to explain in one screen',
    description:
      'Plans are simple on purpose. The goal is faster adoption, cleaner handoff, and less confusion between software, service, and billing.',
    icon: CreditCard,
  },
];

const compareRows = [
  {
    label: 'Best for',
    values: {
      free: 'Validate one narrow lead path before you commit.',
      pro: 'Run the default LeadPulse operating model with repeatable weekly usage.',
      max: 'Operate multiple offers, higher volume, or a lean growth team.',
    },
  },
  {
    label: 'Conversion motion',
    values: {
      free: 'Test capture, review, and export with minimal risk.',
      pro: 'Run signal to booking to payment to onboarding as one path.',
      max: 'Scale the same path across more workflows, operators, and output.',
    },
  },
  {
    label: 'Why people choose it',
    values: {
      free: 'You want proof before process.',
      pro: 'You want a real SaaS operating layer, not another experiment.',
      max: 'You need more throughput without rebuilding your stack.',
    },
  },
];

export default function PricingPage() {
  const plans = getPricingPlans();

  return (
    <MarketingPageShell
      eyebrow="Pricing"
      title="Pricing for an AI Lead Capture & Conversion OS"
      description="LeadPulse is priced like a standard SaaS, but the value is not just access to a dashboard. You are buying a shorter path from public intent to booked call, paid customer, and kickoff."
      typeLine="AI Lead Capture & Conversion OS"
      primaryCta={{ href: '/register?plan=free', label: '先开 Free' }}
      secondaryCta={{ href: '/pay?plan=pro', label: '直接开通 Pro' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {buyingPrinciples.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="w-fit rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`interactive-panel rounded-[2rem] border p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] ${
                plan.highlight
                  ? 'border-slate-900/10 bg-white'
                  : 'border-black/5 bg-white/88'
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
                    Most teams start here
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

      <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Plan logic</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Choose the plan by operating model, not vanity features</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{TARGET_AUDIENCE_ONE_LINER}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{PRICING_CEILING_NOTE}</p>

            <div className="mt-6 space-y-4">
              {compareRows.map((row) => (
                <article key={row.label} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{row.label}</h3>
                  <div className="mt-4 grid gap-3 xl:grid-cols-3">
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Free</div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{row.values.free}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pro</div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{row.values.pro}</p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Max</div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{row.values.max}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                <LineChart className="h-5 w-5 text-slate-800" />
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Credits and policy</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Keep pricing simple. Keep usage explicit.</h2>
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
                <div className="text-sm font-semibold text-slate-950">Need help choosing?</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                If you are still deciding whether LeadPulse should behave more like a self-serve SaaS or an operator-assisted growth system for your team, book a short call and we can choose the right plan boundary first.
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

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Next step</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Start with proof, then scale the conversion loop
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Free is the lowest-friction entry. Pro is the standard operating plan. If you already know the motion works, go straight to Pro or book a call to map the rollout.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 xl:justify-end">
              <Link
                href="/register?plan=free"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                先开 Free
              </Link>
              <Link
                href="/book"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
              >
                预约 15 分钟
              </Link>
              <Link
                href="/pay?plan=pro"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
              >
                开通 Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
