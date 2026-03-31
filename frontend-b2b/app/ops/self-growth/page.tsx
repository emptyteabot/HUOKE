import Link from 'next/link';
import { ArrowRight, FileText, Mail, MessageSquareText, Target, TrendingUp } from 'lucide-react';

import { SiteHeader } from '../../../components/site-header';
import {
  readSelfGrowthAccounts,
  readSelfGrowthContentBacklog,
  readSelfGrowthQueue,
  readSelfGrowthReport,
  readSelfGrowthSummary,
} from '../../../lib/self-growth';

export const dynamic = 'force-dynamic';

function formatDateLabel(value: string) {
  if (!value) return '暂无时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function priorityTone(priority: string) {
  if (priority === 'S') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'A') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (priority === 'B') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-600';
}

export default async function SelfGrowthPage() {
  const [summary, accounts, queue, backlog, report] = await Promise.all([
    readSelfGrowthSummary(),
    readSelfGrowthAccounts(),
    readSelfGrowthQueue(),
    readSelfGrowthContentBacklog(),
    readSelfGrowthReport(),
  ]);

  const topAccounts = accounts
    .slice()
    .sort((left, right) => right.blended_score - left.blended_score)
    .slice(0, 6);

  const metrics = [
    { label: '目标池', value: summary.total_accounts, icon: Target, helper: '当前账号池' },
    { label: '可外联', value: summary.queued_accounts, icon: Mail, helper: '已入外联队列' },
    { label: '内容选题', value: summary.content_backlog_items, icon: TrendingUp, helper: '待发布 backlog' },
    { label: 'Top 账户', value: summary.top_accounts.length, icon: FileText, helper: '优先观察对象' },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref="/ops" ctaLabel="返回经营看板" />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="max-w-4xl fade-up">
          <div className="apple-pill breathing-pill px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
            Self Growth
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            LeadPulse 自己给自己找客户
          </h1>
          <p className="mt-4 text-base leading-8 text-[#86868b]">
            这里不是概念页，而是 LeadPulse 当前真实在跑的目标池、外联队列、内容 backlog 和战报。
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-[#86868b]">{metric.label}</div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
                    <p className="mt-2 text-sm text-[#86868b]">{metric.helper}</p>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-3 text-slate-900">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Top Accounts</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">最值得打的目标</h2>
              </div>
              <div className="text-sm text-[#86868b]">按 blended score 排</div>
            </div>

            <div className="mt-6 space-y-4">
              {topAccounts.map((account) => (
                <article key={account.account_id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{account.company_name}</h3>
                      <p className="mt-1 text-sm text-[#86868b]">
                        {account.segment} · {account.primary_channel}
                      </p>
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-xs font-medium ${priorityTone(account.priority)}`}>
                      {account.priority} · {account.blended_score}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{account.pain_statement}</p>
                  <div className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900">
                    下一步：{account.next_action}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-8">
            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Outreach Queue</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">外联队列</h2>
              <div className="mt-6 space-y-4">
                {queue.map((item) => (
                  <article key={item.queue_id} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{item.company_name}</h3>
                        <p className="mt-1 text-sm text-[#86868b]">
                          {item.channel} · {item.recommended_offer}
                        </p>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs font-medium ${priorityTone(item.priority)}`}>
                        {item.priority}
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-[#86868b]">排队时间：{formatDateLabel(item.scheduled_at)}</p>
                    <div className="mt-4 space-y-3">
                      {item.sequence.slice(0, 2).map((step) => (
                        <div key={`${item.queue_id}-${step.step}`} className="rounded-2xl border border-black/5 bg-white px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-[#86868b]">
                            Day {step.day_offset} · {step.channel}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{step.message}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Content Backlog</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">内容选题</h2>
              <div className="mt-6 space-y-4">
                {backlog.slice(0, 6).map((item) => (
                  <article key={item.content_id} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                      <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                        优先级 {item.priority}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.hook}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.angle}</p>
                    <div className="mt-3 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                      CTA：{item.cta}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-10 interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Report</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">最新战报</h2>
            </div>
            <Link href="/dashboard/fulfillment" className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
              去交付看板
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <pre className="mt-6 overflow-x-auto rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
            {report || '暂无战报。'}
          </pre>
        </section>
      </section>
    </main>
  );
}
