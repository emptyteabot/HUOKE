import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  Layers3,
  Mail,
  MessageSquareQuote,
  Search,
  Send,
  Shield,
  Sparkles,
} from 'lucide-react';

import { CopyTextButton } from '../../../components/copy-text-button';
import { DashboardShell } from '../../../components/dashboard-shell';
import { OutreachSendButton } from '../../../components/outreach-send-button';
import { readComplianceLibrary, readCreativeLibrary } from '../../../lib/marketing';
import { readOutreachEvents } from '../../../lib/outreach-log';
import {
  buildOutreachBatchBundle,
  buildOutreachPlans,
  type OutreachSequenceStatus,
} from '../../../lib/outreach';
import { readPipelineSnapshot } from '../../../lib/pipeline';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  contact?: string;
  stage?: string;
  channel?: string;
  q?: string;
}>;

type StageFilter = 'all' | 'payment' | 'booking' | 'qualification' | 'completed';
type ChannelFilter = 'all' | 'email' | 'dm' | 'hybrid';

function hrefForFilters(stage: string, channel: string, contact: string, q: string) {
  const params = new URLSearchParams();
  if (stage && stage !== 'all') params.set('stage', stage);
  if (channel && channel !== 'all') params.set('channel', channel);
  if (contact) params.set('contact', contact);
  if (q) params.set('q', q);
  const query = params.toString();
  return `/dashboard/emails${query ? `?${query}` : ''}`;
}

function channelBucket(label: string): ChannelFilter {
  const normalized = label.toLowerCase();
  if (normalized.includes('邮件') && (normalized.includes('微信') || normalized.includes('飞书') || normalized.includes('x'))) {
    return 'hybrid';
  }
  if (normalized.includes('邮件')) {
    return 'email';
  }
  return 'dm';
}

function formatDateLabel(value?: string) {
  if (!value) {
    return '暂无时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusLabel(status: OutreachSequenceStatus) {
  if (status === 'sent') return '已发';
  if (status === 'ready') return '待发送';
  if (status === 'scheduled') return '待跟进';
  return '未解锁';
}

function statusStyle(status: OutreachSequenceStatus) {
  if (status === 'sent') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'ready') {
    return 'border-black/10 bg-[#f6f7f4] text-slate-900';
  }
  if (status === 'scheduled') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-black/10 bg-white text-slate-500';
}

function stageStyle(stage: StageFilter | string) {
  if (stage === 'payment') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (stage === 'booking') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (stage === 'qualification') return 'border-violet-200 bg-violet-50 text-violet-700';
  return 'border-black/10 bg-white text-slate-500';
}

function stageLabel(stage: StageFilter) {
  if (stage === 'payment') return '付款优先';
  if (stage === 'booking') return '预约推进';
  if (stage === 'qualification') return '资格判断';
  if (stage === 'completed') return '已完成';
  return '全部阶段';
}

function channelLabel(channel: ChannelFilter) {
  if (channel === 'email') return '邮件';
  if (channel === 'dm') return '私信';
  if (channel === 'hybrid') return '混合触达';
  return '全部渠道';
}

function filterButtonClass(active: boolean) {
  return active
    ? 'interactive-button inline-flex items-center rounded-full border border-black/10 bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0062c3]'
    : 'inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-black/15 hover:bg-[#f8f8f4] hover:text-slate-950';
}

function intelligenceActionLabel(action?: string) {
  if (action === 'handoff_to_closer') return '优先推进成交';
  if (action === 'rerank_catalog') return '优先调整推荐';
  if (action === 'open_micro_prompt') return '先补关键信息';
  return '';
}

function intelligenceActionTone(action?: string) {
  if (action === 'handoff_to_closer') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (action === 'rerank_catalog') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (action === 'open_micro_prompt') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-500';
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const [pipeline, creativeLibrary, complianceLibrary, outreachEvents] = await Promise.all([
    readPipelineSnapshot(),
    readCreativeLibrary(),
    readComplianceLibrary(),
    readOutreachEvents(),
  ]);

  const contactFilter = String(resolved.contact || '').trim().toLowerCase();
  const query = String(resolved.q || '').trim().toLowerCase();
  const stageFilter: StageFilter =
    resolved.stage === 'payment' ||
    resolved.stage === 'booking' ||
    resolved.stage === 'qualification' ||
    resolved.stage === 'completed'
      ? resolved.stage
      : 'all';
  const channelFilter: ChannelFilter =
    resolved.channel === 'email' || resolved.channel === 'dm' || resolved.channel === 'hybrid'
      ? resolved.channel
      : 'all';

  const plans = buildOutreachPlans(
    pipeline.contacts,
    creativeLibrary.creatives,
    complianceLibrary.replacements,
    outreachEvents,
  );

  const filteredPlans = plans.filter((plan) => {
    const stageMatches = stageFilter === 'all' ? true : plan.stageBucket === stageFilter;
    const channelMatches =
      channelFilter === 'all' ? true : channelBucket(plan.primaryChannelLabel) === channelFilter;
    const contactMatches = contactFilter
      ? `${plan.contact.key} ${plan.contact.company} ${plan.contact.email} ${plan.contact.name}`
          .toLowerCase()
          .includes(contactFilter)
      : true;
    const text = [
      plan.contact.company,
      plan.contact.name,
      plan.contact.email,
      plan.contact.summary,
      plan.contact.nextAction,
      plan.contact.taskPlaybookLabel,
      plan.contact.taskStepLabel,
      plan.immediateActionLabel,
      plan.recommendedHook?.hook || '',
      plan.recommendedHook?.body || '',
      ...plan.sequence.map((item) => `${item.subject} ${item.body}`),
    ]
      .join(' ')
      .toLowerCase();
    const queryMatches = query ? text.includes(query) : true;
    return stageMatches && channelMatches && contactMatches && queryMatches;
  });

  const batchBundle = buildOutreachBatchBundle(filteredPlans);
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const sentTodayCount = outreachEvents.filter((item) => item.sentAt.startsWith(todayPrefix)).length;
  const readyNowCount = plans.filter((plan) => plan.readyStep).length;
  const scheduledCount = plans.filter((plan) => plan.sequence.some((step) => step.status === 'scheduled')).length;
  const paymentCount = plans.filter((plan) => plan.stageBucket === 'payment').length;
  const filteredReadyCount = filteredPlans.filter((plan) => plan.readyStep).length;
  const filteredSentCount = filteredPlans.reduce((sum, plan) => sum + plan.sentCount, 0);
  const topCompanies = filteredPlans.slice(0, 3).map((plan) => plan.contact.company).join(' / ');

  const summaryCards = [
    {
      label: '今日可发',
      value: readyNowCount,
      helper: '已 ready 的触达步骤',
      icon: Send,
    },
    {
      label: '今日已发',
      value: sentTodayCount,
      helper: '日志已记录',
      icon: Mail,
    },
    {
      label: '待跟进',
      value: scheduledCount,
      helper: '等下一拍释放',
      icon: Clock3,
    },
    {
      label: '付款优先',
      value: paymentCount,
      helper: '先收款再 onboarding',
      icon: Sparkles,
    },
  ];

  const stageOptions: StageFilter[] = ['all', 'payment', 'booking', 'qualification', 'completed'];
  const channelOptions: ChannelFilter[] = ['all', 'email', 'dm', 'hybrid'];

  return (
    <DashboardShell
      active="emails"
      title="Outbound 触达台"
      description="这一页已经不是文案展示，而是 Founder 真正会用来发邮件、做私信、看发送记录和切换筛选的浅色作战台。"
    >
      <div className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Dispatch console</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm text-slate-600">
            当前筛选：{stageLabel(stageFilter)} · {channelLabel(channelFilter)}
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm text-slate-600">
            结果：{filteredPlans.length} 个联系人 · ready {filteredReadyCount} · 已发 {filteredSentCount}
          </div>
          <div className="rounded-2xl border border-black/10 bg-[#f6f7f4] px-4 py-3 text-sm text-slate-900">
            {topCompanies ? `先发：${topCompanies}` : '当前筛选下没有可发联系人，换个筛选继续。'}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                  <div className="mt-2 text-sm text-slate-600">{item.helper}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-[#f8f8f4] p-3 text-slate-900 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Filters</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {stageOptions.map((value) => (
                <Link
                  key={value}
                  href={hrefForFilters(value, channelFilter, contactFilter, query)}
                  className={filterButtonClass(stageFilter === value)}
                >
                  {stageLabel(value)}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Channel</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {channelOptions.map((value) => (
                <Link
                  key={value}
                  href={hrefForFilters(stageFilter, value, contactFilter, query)}
                  className={filterButtonClass(channelFilter === value)}
                >
                  {channelLabel(value)}
                </Link>
              ))}
            </div>
          </div>

          <form className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr_auto]">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Contact
              </label>
              <input
                type="text"
                name="contact"
                defaultValue={contactFilter}
                placeholder="公司 / 联系人 / 邮箱"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/20"
              />
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Search</label>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="搜索公司、联系人、痛点、下一步、触达文案"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/20"
              />
            </div>

            <div className="flex items-end gap-3">
              <input type="hidden" name="stage" value={stageFilter === 'all' ? '' : stageFilter} />
              <input type="hidden" name="channel" value={channelFilter === 'all' ? '' : channelFilter} />
              <button
                type="submit"
                className="interactive-button inline-flex items-center rounded-full bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0062c3]"
              >
                <Search className="mr-2 h-4 w-4" />
                应用
              </button>
              <Link
                href="/dashboard/emails"
                className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-black/15 hover:bg-[#f8f8f4] hover:text-slate-950"
              >
                重置
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-6">
          <article className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Ready queue</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前触达队列</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  每个联系人都带当前阶段、任务链、下一步动作和完整发送序列。
                </p>
              </div>
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              >
                去任务页
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 space-y-5">
              {filteredPlans.length ? (
                filteredPlans.map((plan) => (
                  <article
                    key={plan.contact.key}
                    className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">
                          {plan.contact.company}
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                          {plan.contact.name} · {plan.contact.email}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{plan.contact.summary}</p>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${stageStyle(plan.stageBucket)}`}
                        >
                          {plan.contact.stageLabel}
                        </div>
                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(
                            plan.readyStep?.status || plan.nextStep?.status || 'locked',
                          )}`}
                        >
                          {statusLabel(plan.readyStep?.status || plan.nextStep?.status || 'locked')}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">主通道</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{plan.primaryChannelLabel}</p>
                      </div>
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">推进链</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {plan.contact.taskPlaybookLabel || '未生成'} · {plan.contact.taskProgressLabel || '待建立'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">待办</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {plan.contact.latestPendingTaskTitle || '暂无待办'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">最近动作</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {plan.lastSentAt ? formatDateLabel(plan.lastSentAt) : '尚未发送'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm text-slate-900">
                      现在该做：
                      {plan.contact.intelligenceAction
                        ? `${intelligenceActionLabel(plan.contact.intelligenceAction)}；${plan.contact.nextAction}`
                        : plan.immediateActionLabel}
                    </div>

                    {plan.contact.intelligenceAction || typeof plan.contact.intelligenceProbability === 'number' ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {plan.contact.intelligenceAction ? (
                          <div
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${intelligenceActionTone(
                              plan.contact.intelligenceAction,
                            )}`}
                          >
                            智能动作：{intelligenceActionLabel(plan.contact.intelligenceAction)}
                          </div>
                        ) : null}
                        {typeof plan.contact.intelligenceProbability === 'number' ? (
                          <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            智能判断 {Math.round(plan.contact.intelligenceProbability * 100)}%
                          </div>
                        ) : null}
                        {plan.contact.intelligenceRoute ? (
                          <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            路由：{plan.contact.intelligenceRoute}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {plan.contact.notes.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {plan.contact.notes.map((note) => (
                          <div
                            key={`${plan.contact.key}-${note}`}
                            className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-500"
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {plan.recommendedHook ? (
                      <div className="mt-5 rounded-2xl border border-black/5 bg-white px-4 py-4">
                        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">推荐钩子</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{plan.recommendedHook.hook}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{plan.recommendedHook.body}</p>
                        <p className="mt-3 text-sm text-slate-900">CTA：{plan.recommendedHook.cta}</p>
                      </div>
                    ) : null}

                    <div className="mt-5 space-y-3">
                      {plan.sequence.map((step) => (
                        <div
                          key={step.key}
                          className="rounded-2xl border border-black/5 bg-white p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                                {step.label} · {step.channel}
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">{step.objective}</p>
                              <p className="mt-1 text-sm text-slate-500">{step.whenLabel}</p>
                            </div>
                            <div className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(step.status)}`}>
                              {statusLabel(step.status)}
                            </div>
                          </div>

                          {step.subject ? (
                            <div className="mt-4">
                              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                                Subject
                              </p>
                              <p className="mt-2 text-sm text-slate-900">{step.subject}</p>
                            </div>
                          ) : null}

                          <div className="mt-4">
                            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                              Body
                            </p>
                            <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-black/5 bg-[#f8f8f4] p-4 text-sm leading-6 text-slate-600">
                              {step.body}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {step.subject ? <CopyTextButton label="复制 Subject" value={step.subject} /> : null}
                            <CopyTextButton label={step.channel.includes('邮件') ? '复制正文' : '复制私信'} value={step.body} />
                            {step.status === 'ready' ? (
                              <OutreachSendButton
                                payload={{
                                  contactKey: plan.contact.key,
                                  contactName: plan.contact.name,
                                  company: plan.contact.company,
                                  stageBucket: plan.stageBucket,
                                  stepKey: step.key,
                                  stepLabel: step.label,
                                  channel: step.channel,
                                  subject: step.subject,
                                  body: step.body,
                                }}
                              />
                            ) : null}
                            {step.status === 'sent' ? (
                              <div className="text-xs text-slate-500">发送时间：{formatDateLabel(step.sentAt)}</div>
                            ) : null}
                            {step.status === 'scheduled' ? (
                              <div className="text-xs text-slate-500">释放时间：{formatDateLabel(step.readyAt)}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <CopyTextButton label="复制完整序列" value={plan.batchSequence} />
                      <Link
                        href={`/dashboard/leads?q=${encodeURIComponent(plan.contact.company)}`}
                        className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-black/15 hover:bg-[#f8f8f4] hover:text-slate-950"
                      >
                        去线索页
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm text-slate-500">
                  当前筛选条件下没有可触达联系人。
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="space-y-6">
          <article className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Layers3 className="h-5 w-5 text-slate-900" />
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Batch export</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">批量发送包</h2>
              </div>
            </div>

            <div className="mt-6 whitespace-pre-wrap rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-6 text-slate-600">
              {batchBundle.queueSummary || '当前没有可导出的队列摘要。'}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <CopyTextButton label="复制队列摘要" value={batchBundle.queueSummary} />
              <CopyTextButton label="复制邮件包" value={batchBundle.emailBundle} />
              <CopyTextButton label="复制私信包" value={batchBundle.dmBundle} />
              <CopyTextButton label="复制完整序列包" value={batchBundle.sequenceBundle} />
            </div>
          </article>

          <article className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-900" />
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Recent sends</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">最近已发送</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {outreachEvents.length ? (
                outreachEvents.slice(0, 6).map((item) => (
                  <article key={item.id} className="rounded-2xl border border-black/5 bg-[#f8f8f4] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.company}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.stepLabel} · {item.channel}
                        </p>
                      </div>
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        {formatDateLabel(item.sentAt)}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{item.subject || '无 subject'}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] p-4 text-sm text-slate-500">
                  还没有发送记录。先标记一次“已发”，这里就会开始滚动累积。
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-slate-900" />
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Compliance</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">合规词替换库</h2>
                </div>
              </div>
              <Link
                href="/dashboard/ai"
                className="inline-flex items-center text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              >
                去 AI 工作台
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {complianceLibrary.replacements.slice(0, 6).map((item) => (
                <article key={item.risky} className="rounded-2xl border border-black/5 bg-[#f8f8f4] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">风险表达</p>
                  <p className="mt-1 text-sm font-medium text-rose-600">{item.risky}</p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">建议替换</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.safe}</p>
                  <p className="mt-3 text-xs text-slate-500">{item.reason}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <MessageSquareQuote className="h-5 w-5 text-slate-900" />
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Hooks</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">可复用内容钩子</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {creativeLibrary.creatives.slice(0, 4).map((item) => (
                <article key={item.id} className="rounded-2xl border border-black/5 bg-[#f8f8f4] p-4">
                  <div className="flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    <span>{item.channel}</span>
                    <span>{item.status}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-950">{item.hook}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                  <p className="mt-3 text-sm text-slate-900">CTA：{item.cta}</p>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
