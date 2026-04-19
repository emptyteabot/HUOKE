import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CreditCard,
  GitBranch,
  Mail,
  ShieldCheck,
  Webhook,
  Workflow,
} from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: 'Integrations',
  description:
    'LeadPulse integrations page for an AI Lead Capture & Conversion OS spanning webhook fan-out, payment routing, GitHub sync, email workflows, and operator handoff.',
};

const nativeGroups = [
  {
    title: 'Webhook fan-out and ops notifications',
    description:
      'Lead submissions and commercial signals can fan out into webhook-driven ops flows so the system does not stop at form collection.',
    points: ['Webhook delivery', 'Slack/Feishu style notification flows', 'Ops visibility for intake and follow-up'],
    icon: Webhook,
  },
  {
    title: 'Payment and onboarding handoff',
    description:
      'LeadPulse links payment intent, confirmation, redeem or start flows, and onboarding steps so revenue events stay connected to delivery.',
    points: ['Payment intent capture', 'Stripe-ready path where configured', 'Kickoff and onboarding routing'],
    icon: CreditCard,
  },
  {
    title: 'Code export and GitHub sync',
    description:
      'The product is designed so assets do not stay trapped in a black box. Teams can move code, site assets, and workflow output into version-controlled delivery.',
    points: ['Code export', 'GitHub sync path', 'Deployment-oriented handoff'],
    icon: GitBranch,
  },
];

const workflowCards = [
  {
    title: 'Capture layer',
    detail:
      'Public signal detection, intake endpoints, and observation events feed the same operating model instead of creating disconnected data islands.',
  },
  {
    title: 'Routing layer',
    detail:
      'Tasks, communication drafts, and notification handoff sit in the middle so every qualified signal gets an obvious next action.',
  },
  {
    title: 'Conversion layer',
    detail:
      'Booking, payment, and kickoff are part of the workflow. That is the difference between a tool that watches leads and a system that moves them.',
  },
  {
    title: 'Operator layer',
    detail:
      'LeadPulse is productized, but still pragmatic. It keeps room for human review, manual confirmation, and founder-operated execution where needed.',
  },
];

const boundaryRows = [
  {
    label: 'What is integrated today',
    detail:
      'LeadPulse already connects the commercial path: intake, webhook fan-out, task automation, payment routing, start/onboarding flow, and GitHub-oriented asset export.',
  },
  {
    label: 'What stays human on purpose',
    detail:
      'Channels that require judgment, manual confirmation, or operator review are not hidden behind fake "full automation" claims. The product keeps the workflow explicit.',
  },
  {
    label: 'Why this matters',
    detail:
      'A standard SaaS experience is not just a grid of logos. It is a clear understanding of what is native, what is assisted, and what your team can trust in production.',
  },
];

export default function IntegrationsPage() {
  return (
    <MarketingPageShell
      eyebrow="Integrations"
      title="Integrations that move leads toward revenue"
      description="LeadPulse is an AI Lead Capture & Conversion OS. The integrations story is not about showing the biggest marketplace. It is about connecting capture, routing, payment, and kickoff in one production path."
      typeLine="Native where it matters. Explicit where humans still decide."
      primaryCta={{ href: '/book', label: '预约集成诊断' }}
      secondaryCta={{ href: '/pay?plan=pro', label: '开通 Pro' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          {nativeGroups.map((item) => {
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
                <div className="mt-5 space-y-3">
                  {item.points.map((point) => (
                    <div
                      key={point}
                      className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.96fr_1.04fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                <Workflow className="h-5 w-5 text-slate-800" />
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Workflow stack</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">The public signal to revenue workflow</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {workflowCards.map((card) => (
                <article key={card.title} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Integration boundaries</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Clear boundaries beat fake automation claims</h2>
            <div className="mt-6 space-y-4">
              {boundaryRows.map((row) => (
                <article key={row.label} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{row.label}</h3>
                  <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                    {row.detail}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm text-slate-700">
                <BellRing className="mb-3 h-5 w-5 text-slate-800" />
                Notification and operator loops stay visible.
              </div>
              <div className="rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm text-slate-700">
                <Mail className="mb-3 h-5 w-5 text-slate-800" />
                Communication flow stays tied to the lead path.
              </div>
              <div className="rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm text-slate-700">
                <ShieldCheck className="mb-3 h-5 w-5 text-slate-800" />
                Commercial state changes stay explicit and auditable.
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">CTA</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Connect the workflow before you add more tools</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                If your stack is already fragmented, start by clarifying the conversion path. Book a call if you need the boundary mapped. Start Free if you want to validate first. Go Pro if you already know the workflow is real.
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
                预约集成诊断
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
