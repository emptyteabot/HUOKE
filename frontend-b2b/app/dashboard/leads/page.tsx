import Link from 'next/link';
import { ArrowRight, Coins, ListTodo, Mail, Search, Target } from 'lucide-react';

import { DashboardShell } from '../../../components/dashboard-shell';
import { IntelligenceActionButton } from '../../../components/intelligence-action-button';
import { TaskCompleteButton } from '../../../components/task-complete-button';
import { readPipelineSnapshot } from '../../../lib/pipeline';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  stage?: string;
  q?: string;
  task?: string;
}>;

type TaskFilter = 'all' | 'pending' | 'overdue' | 'completed';
type StageFilter = 'all' | 'payment' | 'booking' | 'qualification' | 'completed';

function formatDateLabel(value?: string) {
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

function stageGroup(label: string): StageFilter {
  if (label.includes('待确认收款') || label.includes('高意向待成交')) return 'payment';
  if (label.includes('待确认诊断') || label.includes('高意向待推荐') || label.includes('信息补全中')) return 'booking';
  if (label.includes('待资格判断')) return 'qualification';
  return 'completed';
}

function stageLabel(value: StageFilter) {
  if (value === 'payment') return '待确认收款';
  if (value === 'booking') return '待确认诊断';
  if (value === 'qualification') return '待资格判断';
  if (value === 'completed') return '已推进 / 已完成';
  return '全部';
}

function taskLabel(value: TaskFilter) {
  if (value === 'pending') return '有待办';
  if (value === 'overdue') return '有逾期';
  if (value === 'completed') return '只看已完成';
  return '全部';
}

function hrefForFilters(stage: StageFilter, task: TaskFilter, q: string) {
  const params = new URLSearchParams();
  if (stage !== 'all') params.set('stage', stage);
  if (task !== 'all') params.set('task', task);
  if (q) params.set('q', q);
  const query = params.toString();
  return `/dashboard/leads${query ? `?${query}` : ''}`;
}

function intelligenceTone(probability?: number) {
  if ((probability || 0) >= 0.78) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if ((probability || 0) >= 0.48) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-600';
}

function actionTone(action?: string) {
  if (action === 'handoff_to_closer') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (action === 'rerank_catalog') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (action === 'open_micro_prompt') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-600';
}

function actionLabel(action?: string) {
  if (action === 'handoff_to_closer') return '成交加速';
  if (action === 'rerank_catalog') return '推荐重排';
  if (action === 'open_micro_prompt') return '补信息';
  return '';
}

function isDeterministicIntelligenceAction(
  action?: string,
): action is 'handoff_to_closer' | 'rerank_catalog' | 'open_micro_prompt' {
  return action === 'handoff_to_closer' || action === 'rerank_catalog' || action === 'open_micro_prompt';
}

function pillClass(active: boolean) {
  return active
    ? 'interactive-button inline-flex rounded-full border border-black/10 bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0062c3]'
    : 'interactive-button inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb] hover:text-slate-950';
}

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const pipeline = await readPipelineSnapshot();
  const stageFilter: StageFilter =
    resolved.stage === 'payment' ||
    resolved.stage === 'booking' ||
    resolved.stage === 'qualification' ||
    resolved.stage === 'completed'
      ? resolved.stage
      : 'all';
  const taskFilter: TaskFilter =
    resolved.task === 'pending' || resolved.task === 'overdue' || resolved.task === 'completed'
      ? resolved.task
      : 'all';
  const query = String(resolved.q || '').trim().toLowerCase();

  const filteredContacts = pipeline.contacts.filter((contact) => {
    const stageMatches = stageFilter === 'all' ? true : stageGroup(contact.stageLabel) === stageFilter;
    const taskMatches =
      taskFilter === 'all'
        ? true
        : taskFilter === 'pending'
          ? contact.pendingTaskCount > 0
          : taskFilter === 'overdue'
            ? contact.overdueTaskCount > 0
            : contact.completedTaskCount > 0 && contact.pendingTaskCount === 0;
    const queryText = [
      contact.company,
      contact.name,
      contact.email,
      contact.summary,
      contact.nextAction,
      contact.notes.join(' '),
      contact.taskPlaybookLabel,
      contact.taskStepLabel,
      contact.latestPendingTaskTitle,
      contact.latestCompletedTaskTitle,
    ]
      .join(' ')
      .toLowerCase();
    const queryMatches = query ? queryText.includes(query) : true;
    return stageMatches && taskMatches && queryMatches;
  });

  const summaryCards = [
    { label: '待确认收款', value: pipeline.summary.paymentQueue, icon: Coins },
    { label: '待确认诊断', value: pipeline.summary.bookingQueue, icon: Mail },
    { label: '待资格判断', value: pipeline.summary.qualificationQueue, icon: Search },
    { label: '逾期任务', value: pipeline.summary.overdueTasks, icon: ListTodo },
  ];

  return (
    <DashboardShell
      active="leads"
      title="线索与阶段管理"
      description="这里看谁更接近收入，谁先跟进，谁该补信息，谁已经进入 closer 链路。"
    >
      <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Pipeline View</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
            当前联系人：{pipeline.summary.totalContacts} · 活跃待办：{pipeline.summary.pendingTasks}
          </div>
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
            收款 / 预约 / 资格：{pipeline.summary.paymentQueue} / {pipeline.summary.bookingQueue} / {pipeline.summary.qualificationQueue}
          </div>
          <div className="rounded-2xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-900">
            先清逾期，再清收款链。
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#86868b]">{item.label}</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-950">{item.value}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-[#eef5ff] p-3">
                  <Icon className="h-5 w-5 text-[#0071e3]" />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 space-y-4 interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6">
        <div>
          <p className="text-sm text-[#86868b]">阶段</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(['all', 'payment', 'booking', 'qualification', 'completed'] as StageFilter[]).map((item) => (
              <Link key={item} href={hrefForFilters(item, taskFilter, query)} className={pillClass(stageFilter === item)}>
                {stageLabel(item)}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-[#86868b]">任务视角</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(['all', 'pending', 'overdue', 'completed'] as TaskFilter[]).map((item) => (
              <Link key={item} href={hrefForFilters(stageFilter, item, query)} className={pillClass(taskFilter === item)}>
                {taskLabel(item)}
              </Link>
            ))}
          </div>
        </div>

        <form action="/dashboard/leads" method="get" className="flex flex-wrap gap-3">
          {stageFilter !== 'all' ? <input type="hidden" name="stage" value={stageFilter} /> : null}
          {taskFilter !== 'all' ? <input type="hidden" name="task" value={taskFilter} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="搜索公司、联系人、摘要、瓶颈、任务链"
            className="min-w-[280px] flex-1 rounded-[24px] border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/20"
          />
          <button type="submit" className="interactive-button inline-flex rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0062c3]">
            搜索
          </button>
          {(query || stageFilter !== 'all' || taskFilter !== 'all') ? (
            <Link href="/dashboard/leads" className="interactive-button inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbfb] hover:text-slate-950">
              清空筛选
            </Link>
          ) : null}
        </form>
      </div>

      <div className="mt-10 interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Contact Table</div>
            <h2 className="text-2xl font-semibold text-slate-950">联系人列表</h2>
            <p className="mt-2 text-sm text-slate-600">当前筛选结果 {filteredContacts.length} 个联系人。</p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
            当前总待办 {pipeline.summary.pendingTasks} · 已逾期 {pipeline.summary.overdueTasks}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filteredContacts.length ? (
            filteredContacts.map((contact) => {
              const mailtoHref = contact.email
                ? `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(contact.emailSubject)}&body=${encodeURIComponent(contact.emailBody)}`
                : '';

              return (
                <article key={contact.key} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{contact.company}</h3>
                      <p className="mt-1 text-sm text-[#86868b]">
                        {contact.name} · {contact.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">{contact.stageLabel}</div>
                      <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">推荐 {contact.recommendedPlanLabel}</div>
                      <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">待办 {contact.pendingTaskCount}</div>
                      <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">已完成 {contact.completedTaskCount}</div>
                      {contact.overdueTaskCount ? (
                        <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">逾期 {contact.overdueTaskCount}</div>
                      ) : null}
                      {typeof contact.intelligenceProbability === 'number' ? (
                        <div className={`rounded-full border px-3 py-1 text-xs ${intelligenceTone(contact.intelligenceProbability)}`}>
                          智能 {Math.round(contact.intelligenceProbability * 100)}%
                        </div>
                      ) : null}
                      {contact.intelligenceAction ? (
                        <div className={`rounded-full border px-3 py-1 text-xs ${actionTone(contact.intelligenceAction)}`}>
                          {actionLabel(contact.intelligenceAction)}
                        </div>
                      ) : null}
                      {contact.rerankBoost ? (
                        <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">排序 +{contact.rerankBoost}</div>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">{contact.summary}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                      <span className="text-[#86868b]">偏好渠道：</span>
                      {contact.preferredChannel}
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                      <span className="text-[#86868b]">最近进入：</span>
                      {formatDateLabel(contact.latestAt)}
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                      <span className="text-[#86868b]">当前链路：</span>
                      {contact.taskPlaybookLabel && contact.taskStepLabel && contact.taskProgressLabel
                        ? `${contact.taskPlaybookLabel} · ${contact.taskStepLabel} · ${contact.taskProgressLabel}`
                        : '暂无活跃任务'}
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                      <span className="text-[#86868b]">最近完成：</span>
                      {contact.latestCompletedTaskTitle
                        ? `${contact.latestCompletedTaskTitle} · ${formatDateLabel(contact.latestCompletedTaskAt)}`
                        : '暂无'}
                    </div>
                  </div>

                  {contact.intelligenceSummary || contact.intelligenceRoute ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                        <span className="text-[#86868b]">智能判断：</span>
                        {contact.intelligenceSummary || '暂无'}
                      </div>
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                        <span className="text-[#86868b]">动作路由：</span>
                        {contact.intelligenceRoute || '暂无'}
                        {typeof contact.intelligenceGuardrailApproved === 'boolean' ? (
                          <span className="ml-2 text-xs text-[#86868b]">· 护栏 {contact.intelligenceGuardrailApproved ? '放行' : '拦截'}</span>
                        ) : null}
                        {contact.rerankReason ? <span className="ml-2 text-xs text-[#86868b]">· {contact.rerankReason}</span> : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
                    下一步：{contact.nextAction}
                  </div>

                  {contact.taskTimeline.length ? (
                    <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                        <Target className="h-4 w-4 text-[#0071e3]" />
                        最近任务时间线
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {contact.taskTimeline.map((task) => (
                          <div key={task.id} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                              <div
                                className={`rounded-full border px-3 py-1 text-[11px] ${
                                  task.status === 'completed'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                }`}
                              >
                                {task.status}
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-[#86868b]">{task.playbookLabel} · {task.stepLabel} · {task.progressLabel}</p>
                            <p className="mt-2 text-xs text-[#86868b]">
                              {task.status === 'completed'
                                ? `完成于 ${formatDateLabel(task.completedAt)}`
                                : `截止 ${formatDateLabel(task.dueAt)}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {contact.notes.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {contact.notes.map((note) => (
                        <span key={note} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-500">
                          {note}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {contact.latestPendingTaskId ? <TaskCompleteButton taskId={contact.latestPendingTaskId} /> : null}
                    {contact.intelligenceAction === 'open_micro_prompt' ? (
                      <Link
                        href={`/dashboard/micro-prompt?contact=${encodeURIComponent(contact.key)}`}
                        className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                      >
                        补信息
                      </Link>
                    ) : null}
                    {isDeterministicIntelligenceAction(contact.intelligenceAction) && contact.intelligenceAction !== 'open_micro_prompt' ? (
                      <IntelligenceActionButton contactKey={contact.key} action={contact.intelligenceAction} />
                    ) : null}
                    <Link
                      href={`/dashboard/tasks?contact=${encodeURIComponent(contact.key)}&status=pending`}
                      className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                    >
                      看任务
                    </Link>
                    <Link
                      href={`/dashboard/emails?contact=${encodeURIComponent(contact.key)}`}
                      className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                    >
                      看触达模板
                    </Link>
                    {mailtoHref ? (
                      <Link
                        href={mailtoHref}
                        className="interactive-button inline-flex items-center rounded-full bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0062c3]"
                      >
                        打开邮件草稿
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm text-slate-500">
              当前筛选条件下没有匹配的联系人。
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
