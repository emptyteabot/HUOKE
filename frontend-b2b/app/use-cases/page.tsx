import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  MessageSquareMore,
  Rocket,
  SearchCheck,
  UserRound,
} from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: 'Use Cases',
  description:
    'LeadPulse use cases for founders, agencies, service teams, and education operators who need an AI Lead Capture & Conversion OS instead of another point tool.',
};

const personas = [
  {
    title: 'Indie SaaS and AI tool founders',
    description:
      'You need to find real buying intent in public posts, comments, and platform conversations before you waste cycles on broad outbound.',
    outcome: 'Move from public intent to demo requests, paid pilots, and onboarding faster.',
    icon: Rocket,
  },
  {
    title: 'Agency and studio operators',
    description:
      'You already know how to sell. The bottleneck is spotting the right conversations early and turning them into repeatable handoff and payment steps.',
    outcome: 'Qualify faster, avoid noisy leads, and keep the whole path inside one operating layer.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'High-ticket education or consulting teams',
    description:
      'You sell through trust and timing. LeadPulse helps you spot urgent questions, budget signals, and buying language before the inquiry goes cold.',
    outcome: 'Reduce missed demand and push more qualified conversations into booked diagnostics.',
    icon: GraduationCap,
  },
  {
    title: 'Lean growth teams inside service businesses',
    description:
      'Your team needs a standard SaaS workflow for capture, review, routing, follow-up, and kickoff without building a custom RevOps stack first.',
    outcome: 'Operate a smaller team with clearer lead views, task flow, and revenue handoff.',
    icon: Building2,
  },
];

const loops = [
  {
    title: 'Capture the right signal',
    description:
      'Start with public demand expressions like "who should we use", "how much", "need help", "any recommendation", or explicit problem statements.',
    icon: SearchCheck,
  },
  {
    title: 'Qualify before outreach',
    description:
      'LeadPulse filters noisy accounts, competitor chatter, and low-intent traffic before your team exports links, writes drafts, or starts follow-up.',
    icon: UserRound,
  },
  {
    title: 'Convert inside one path',
    description:
      'The same system carries the lead toward booking, payment, and kickoff so your team is not stitching together five different tools by hand.',
    icon: MessageSquareMore,
  },
];

const scenarioRows = [
  {
    label: 'When you need more than social listening',
    detail:
      'Use LeadPulse when the real business need is not "knowing what people said", but moving fast enough to capture the revenue hidden in those conversations.',
  },
  {
    label: 'When you need more than DM automation',
    detail:
      'Use LeadPulse when automated replies are not enough, and you need qualification, routing, payment, and kickoff to stay attached to the same lead record.',
  },
  {
    label: 'When you need more than an outbound sequencer',
    detail:
      'Use LeadPulse when the hard part is sourcing the right high-intent people from public demand signals, not just sending another sequence.',
  },
];

export default function UseCasesPage() {
  return (
    <MarketingPageShell
      eyebrow="Use cases"
      title="Who LeadPulse is built for"
      description="LeadPulse is an AI Lead Capture & Conversion OS for teams that do not just want visibility. They want a standard SaaS workflow from public intent to booking, payment, and onboarding."
      typeLine="Use cases for a shorter revenue path"
      primaryCta={{ href: '/register?plan=free', label: '先开 Free' }}
      secondaryCta={{ href: '/book', label: '预约 15 分钟' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-2">
          {personas.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-fit rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                    <Icon className="h-5 w-5 text-slate-800" />
                  </div>
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    AI Lead Capture & Conversion OS
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <div className="mt-5 rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                  {item.outcome}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Operating loop</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">The same core motion, mapped across different teams</h2>
            <div className="mt-6 space-y-4">
              {loops.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-black/10 bg-white p-3">
                        <Icon className="h-5 w-5 text-slate-800" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">When LeadPulse fits best</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Use it when the bottleneck is conversion continuity</h2>
            <div className="mt-6 space-y-4">
              {scenarioRows.map((item) => (
                <article key={item.label} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{item.label}</h3>
                  <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                    {item.detail}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-black/5 bg-white px-5 py-5">
              <h3 className="text-lg font-semibold text-slate-950">Choose your starting motion</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm text-slate-700">
                  Free: validate one use case.
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm text-slate-700">
                  Book: align the workflow with your funnel.
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm text-slate-700">
                  Pro: launch the full conversion operating loop.
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr] xl:items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">CTA</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Pick the entry point that matches your team</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                If you are still validating demand, start Free. If you already have inbound signals and need a tighter conversion path, go straight to Pro. If the workflow boundary is the real question, book a short call first.
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
