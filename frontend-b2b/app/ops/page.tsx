import Link from 'next/link';
import {
  BarChart3,
  Coins,
  FileText,
  Mail,
  ArrowRight,
  ShieldCheck,
  Target,
  Wallet,
} from 'lucide-react';

import { RevenueDashboard } from '../../components/revenue-dashboard';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { readComplianceLibrary, readCreativeLibrary } from '../../lib/marketing';
import { readOpsDashboardData } from '../../lib/ops';
import { readPipelineSnapshot } from '../../lib/pipeline';

export const dynamic = 'force-dynamic';

function metricLabel(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) return '待补充';
  return `${value}${suffix}`;
}

function rateLabel(value: number) {
  return `${value}%`;
}

function dateLabel(value: string) {
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

function intelligenceBadgeTone(action?: string) {
  if (action === 'handoff_to_closer') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (action === 'rerank_catalog') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (action === 'open_micro_prompt') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-600';
}

export default async function OpsPage() {
  const [ops, creativeLibrary, complianceLibrary, pipeline] = await Promise.all([
    readOpsDashboardData(),
    readCreativeLibrary(),
    readComplianceLibrary(),
    readPipelineSnapshot(),
  ]);

  const metrics = [
    { label: '新增', value: String(ops.summary.newLeads7d), helper: '最近 7 天', icon: Target },
    { label: '回本', value: rateLabel(ops.summary.paybackRate), helper: '最新指标', icon: Coins },
    { label: '留存', value: rateLabel(ops.summary.retentionRate), helper: '最新指标', icon: BarChart3 },
    { label: '退款', value: rateLabel(ops.summary.refundRate), helper: '最新指标', icon: ShieldCheck },
    { label: '现金', value: metricLabel(ops.cashOnHandCny, ' CNY'), helper: '账上现金', icon: Wallet },
    {
      label: 'Runway',
      value: ops.runwayMonths ? `${ops.runwayMonths} 个月` : '待补充',
      helper: `目标 ${ops.targetRunwayMonths} 个月`,
      icon: FileText,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref="/dashboard" ctaLabel="看总览" />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="max-w-4xl fade-up">
          <div className="apple-pill breathing-pill px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
            Founder Operating System
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            经营层只回答四个问题
          </h1>
          <p className="mt-4 text-base leading-8 text-[#86868b]">
            今天新增多少、回本怎么样、谁该先跟进、下一条触达该怎么发。
          </p>
          {ops.sampleMode ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              当前财务指标仍有样本数据。新增来自真实线索；回本、留存、退款还需要继续补真数据。
            </div>
          ) : null}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label}
                className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
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

        <div className="mt-10">
          <RevenueDashboard series={ops.series} />
        </div>

        <section className="mt-10 interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Self Growth</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">LeadPulse 自增长结果</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                目标池、外联队列、内容 backlog 和最新战报已经整理成网页。
              </p>
            </div>
            <Link
              href="/ops/self-growth"
              className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
            >
              打开结果页
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/ops/real-discovery"
              className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
            >
              看真实发现
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
              目标池：{ops.livePipeline.selfGrowthAccounts}
            </div>
            <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
              可外联：{ops.livePipeline.outboundReadyAccounts}
            </div>
            <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
              内容 backlog：{ops.livePipeline.contentBacklogItems}
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Priority Accounts</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">最近待推进联系人</h2>
              </div>
              <div className="text-sm text-[#86868b]">按紧急程度排</div>
            </div>

            <div className="mt-6 space-y-4">
              {pipeline.contacts.slice(0, 6).map((contact) => (
                <article
                  key={contact.key}
                  className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{contact.company}</h3>
                      <p className="mt-1 text-sm text-[#86868b]">
                        {contact.name} · {contact.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                        {contact.stageLabel}
                      </div>
                      <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                        推荐 {contact.recommendedPlanLabel}
                      </div>
                      {contact.rerankBoost ? (
                        <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">
                          排序提升 +{contact.rerankBoost}
                        </div>
                      ) : null}
                      {contact.intelligenceAction ? (
                        <div className={`rounded-full border px-3 py-1 text-xs ${intelligenceBadgeTone(contact.intelligenceAction)}`}>
                          {contact.intelligenceAction}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">{contact.summary}</p>
                  <div className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900">
                    下一步：{contact.nextAction}
                  </div>
                  <p className="mt-3 text-xs text-[#86868b]">最近进入：{dateLabel(contact.latestAt)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-8">
            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Realtime Pipeline</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">当前经营结构</h2>
              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-slate-600">
                  设计伙伴：{ops.livePipeline.designPartnersTotal}
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-slate-600">
                  预约请求：{ops.livePipeline.bookingsTotal}
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-slate-600">
                  付款意向：{ops.livePipeline.paymentIntentsTotal}
                </div>
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900">
                  自增长目标账户：{ops.livePipeline.selfGrowthAccounts}
                </div>
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900">
                  可外联账户：{ops.livePipeline.outboundReadyAccounts}
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-slate-600">
                  内容 backlog：{ops.livePipeline.contentBacklogItems}
                </div>
              </div>
            </div>

            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Growth Assets</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">增长资产库存</h2>

              <div className="mt-6 grid gap-4">
                <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="text-sm font-medium text-[#86868b]">Ready 素材</div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{creativeLibrary.creatives.filter((item) => item.status === 'ready').length}</div>
                </article>

                <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="text-sm font-medium text-[#86868b]">合规替换词</div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{complianceLibrary.replacements.length}</div>
                </article>

                <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="text-sm font-medium text-[#86868b]">USDC 小范围测试</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{ops.usdcExperiment.hypothesis}</p>
                </article>
              </div>
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
