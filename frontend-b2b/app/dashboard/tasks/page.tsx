import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock3, Layers3, ListTodo } from 'lucide-react';

import { BulkTaskCompleteButton } from '../../../components/bulk-task-complete-button';
import { DashboardShell } from '../../../components/dashboard-shell';
import { TaskCompleteButton } from '../../../components/task-complete-button';
import { completionPreviewForTask, isTaskOverdue, taskStepSummary } from '../../../lib/task-automation';
import { readFollowUpTasks } from '../../../lib/tasks';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  status?: string;
  priority?: string;
  contact?: string;
  q?: string;
  source?: string;
  due?: string;
}>;

type SourceFilter = 'all' | 'design_partner' | 'booking_request' | 'payment_intent';
type DueFilter = 'all' | 'overdue' | 'today' | 'week';
type StatusFilter = 'all' | 'pending' | 'completed';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

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

function statusStyle(status: 'pending' | 'completed') {
  return status === 'completed'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-cyan-200 bg-cyan-50 text-cyan-700';
}

function priorityStyle(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-600';
}

function sourceLabel(sourceKind: SourceFilter) {
  if (sourceKind === 'design_partner') return '设计伙伴';
  if (sourceKind === 'booking_request') return '诊断预约';
  if (sourceKind === 'payment_intent') return '付款意向';
  return '全部来源';
}

function hrefForFilters(
  status: StatusFilter,
  priority: PriorityFilter,
  contact: string,
  q: string,
  source: SourceFilter,
  due: DueFilter,
) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (priority !== 'all') params.set('priority', priority);
  if (contact) params.set('contact', contact);
  if (q) params.set('q', q);
  if (source !== 'all') params.set('source', source);
  if (due !== 'all') params.set('due', due);
  const query = params.toString();
  return `/dashboard/tasks${query ? `?${query}` : ''}`;
}

function matchesDueFilter(value: string, dueFilter: DueFilter, now: Date) {
  if (dueFilter === 'all') return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const nowTime = now.getTime();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (dueFilter === 'overdue') return date.getTime() < nowTime;
  if (dueFilter === 'today') return date.getTime() >= nowTime && date.getTime() <= endOfToday.getTime();
  return date.getTime() >= nowTime && date.getTime() <= endOfWeek.getTime();
}

function intelligenceTaskLabel(stepKey?: string) {
  if (!stepKey || !stepKey.startsWith('intelligence-')) return '';
  if (stepKey.includes('handoff_to_closer')) return '成交加速';
  if (stepKey.includes('rerank_catalog')) return '推荐重排';
  if (stepKey.includes('open_micro_prompt')) return '补信息';
  return '智能动作';
}

function intelligenceTaskTone(stepKey?: string) {
  if (!stepKey || !stepKey.startsWith('intelligence-')) return 'border-black/10 bg-white text-slate-600';
  if (stepKey.includes('handoff_to_closer')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (stepKey.includes('rerank_catalog')) return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (stepKey.includes('open_micro_prompt')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-600';
}

function pillClass(active: boolean) {
  return active
    ? 'interactive-button inline-flex rounded-full border border-black/10 bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0062c3]'
    : 'interactive-button inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb] hover:text-slate-950';
}

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const allTasks = await readFollowUpTasks();
  const now = new Date();
  const todayPrefix = new Date().toISOString().slice(0, 10);

  const statusFilter: StatusFilter =
    resolved.status === 'completed' || resolved.status === 'pending' ? resolved.status : 'all';
  const priorityFilter: PriorityFilter =
    resolved.priority === 'high' || resolved.priority === 'medium' || resolved.priority === 'low'
      ? resolved.priority
      : 'all';
  const sourceFilter: SourceFilter =
    resolved.source === 'design_partner' ||
    resolved.source === 'booking_request' ||
    resolved.source === 'payment_intent'
      ? resolved.source
      : 'all';
  const dueFilter: DueFilter =
    resolved.due === 'overdue' || resolved.due === 'today' || resolved.due === 'week'
      ? resolved.due
      : 'all';
  const contactFilter = String(resolved.contact || '').trim().toLowerCase();
  const query = String(resolved.q || '').trim().toLowerCase();

  const tasks = allTasks.map((task) => {
    const summary = taskStepSummary(task);
    return {
      ...task,
      summary,
      overdue: isTaskOverdue(task, now),
      completionPreview: completionPreviewForTask(task),
    };
  });

  const filteredTasks = tasks.filter((task) => {
    const statusMatches = statusFilter === 'all' ? true : task.status === statusFilter;
    const priorityMatches = priorityFilter === 'all' ? true : task.priority === priorityFilter;
    const sourceMatches = sourceFilter === 'all' ? true : task.sourceKind === sourceFilter;
    const contactMatches = contactFilter ? task.key === contactFilter : true;
    const dueMatches = matchesDueFilter(task.dueAt, dueFilter, now);
    const text = [
      task.company,
      task.contactName,
      task.email,
      task.stage,
      task.title,
      task.detail,
      task.summary.playbookLabel,
      task.summary.stepLabel,
    ]
      .join(' ')
      .toLowerCase();
    const queryMatches = query ? text.includes(query) : true;
    return statusMatches && priorityMatches && sourceMatches && contactMatches && dueMatches && queryMatches;
  });

  const pendingTasks = filteredTasks
    .filter((task) => task.status === 'pending')
    .sort((left, right) => {
      if (left.overdue !== right.overdue) return left.overdue ? -1 : 1;
      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    });

  const completedTasks = filteredTasks
    .filter((task) => task.status === 'completed')
    .sort(
      (left, right) =>
        new Date(right.completedAt || right.createdAt).getTime() -
        new Date(left.completedAt || left.createdAt).getTime(),
    );

  const pendingCount = tasks.filter((task) => task.status === 'pending').length;
  const overdueCount = tasks.filter((task) => task.overdue).length;
  const dueTodayCount = tasks.filter((task) => task.status === 'pending' && matchesDueFilter(task.dueAt, 'today', now)).length;
  const completedTodayCount = tasks.filter(
    (task) => task.status === 'completed' && String(task.completedAt || '').startsWith(todayPrefix),
  ).length;

  const summaryCards = [
    { label: '待办总数', value: pendingCount, icon: ListTodo },
    { label: '已逾期', value: overdueCount, icon: AlertCircle },
    { label: '今天到期', value: dueTodayCount, icon: Clock3 },
    { label: '今天完成', value: completedTodayCount, icon: CheckCircle2 },
  ];

  return (
    <DashboardShell
      active="tasks"
      title="任务推进链"
      description="这里看哪些任务先做、为什么要做、做完以后系统会推什么下一步。"
    >
      <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Task Runtime</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
            当前待办：{pendingCount} · 今天完成：{completedTodayCount}
          </div>
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
            今天到期：{dueTodayCount} · 已逾期：{overdueCount}
          </div>
          <div className="rounded-2xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-900">
            先清逾期，再推收款，再扫预约链。
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
          <p className="text-sm text-[#86868b]">状态</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(['all', 'pending', 'completed'] as StatusFilter[]).map((item) => (
              <Link key={item} href={hrefForFilters(item, priorityFilter, contactFilter, query, sourceFilter, dueFilter)} className={pillClass(statusFilter === item)}>
                {item === 'all' ? '全部' : item === 'pending' ? '待办' : '已完成'}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-[#86868b]">优先级</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(['all', 'high', 'medium', 'low'] as PriorityFilter[]).map((item) => (
              <Link key={item} href={hrefForFilters(statusFilter, item, contactFilter, query, sourceFilter, dueFilter)} className={pillClass(priorityFilter === item)}>
                {item === 'all' ? '全部优先级' : item}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-[#86868b]">来源链路</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(['all', 'design_partner', 'booking_request', 'payment_intent'] as SourceFilter[]).map((item) => (
              <Link key={item} href={hrefForFilters(statusFilter, priorityFilter, contactFilter, query, item, dueFilter)} className={pillClass(sourceFilter === item)}>
                {sourceLabel(item)}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-[#86868b]">到期窗口</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(['all', 'overdue', 'today', 'week'] as DueFilter[]).map((item) => (
              <Link key={item} href={hrefForFilters(statusFilter, priorityFilter, contactFilter, query, sourceFilter, item)} className={pillClass(dueFilter === item)}>
                {item === 'all' ? '全部时间' : item === 'overdue' ? '已逾期' : item === 'today' ? '今天内' : '7 天内'}
              </Link>
            ))}
          </div>
        </div>

        <form action="/dashboard/tasks" method="get" className="flex flex-wrap gap-3">
          {statusFilter !== 'all' ? <input type="hidden" name="status" value={statusFilter} /> : null}
          {priorityFilter !== 'all' ? <input type="hidden" name="priority" value={priorityFilter} /> : null}
          {sourceFilter !== 'all' ? <input type="hidden" name="source" value={sourceFilter} /> : null}
          {dueFilter !== 'all' ? <input type="hidden" name="due" value={dueFilter} /> : null}
          {contactFilter ? <input type="hidden" name="contact" value={contactFilter} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="搜索公司、联系人、标题、详情、链路阶段"
            className="min-w-[280px] flex-1 rounded-[24px] border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/20"
          />
          <button type="submit" className="interactive-button inline-flex rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0062c3]">
            搜索
          </button>
          {(query || contactFilter || sourceFilter !== 'all' || dueFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all') ? (
            <Link href="/dashboard/tasks" className="interactive-button inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbfb] hover:text-slate-950">
              清空筛选
            </Link>
          ) : null}
        </form>

        {contactFilter ? (
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
            当前联系人筛选：{contactFilter}
          </div>
        ) : null}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Pending Queue</div>
              <h2 className="text-2xl font-semibold text-slate-950">待办队列</h2>
              <p className="mt-2 text-sm text-slate-600">当前结果 {pendingTasks.length} 条待办。</p>
            </div>
            {pendingTasks.length > 1 ? <BulkTaskCompleteButton taskIds={pendingTasks.map((item) => item.id)} /> : null}
          </div>

          <div className="mt-6 space-y-4">
            {pendingTasks.length ? (
              pendingTasks.map((task) => (
                <article key={task.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{task.title}</h3>
                      <p className="mt-1 text-sm text-[#86868b]">
                        {task.company} · {task.contactName} · {task.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className={`rounded-full border px-3 py-1 text-xs ${priorityStyle(task.priority)}`}>{task.priority}</div>
                      <div className={`rounded-full border px-3 py-1 text-xs ${statusStyle(task.status)}`}>{task.status}</div>
                      <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">{task.summary.playbookLabel}</div>
                      <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">
                        {task.summary.stepLabel} · {task.summary.progressLabel}
                      </div>
                      {task.stepKey?.startsWith('intelligence-') ? (
                        <div className={`rounded-full border px-3 py-1 text-xs ${intelligenceTaskTone(task.stepKey)}`}>
                          {intelligenceTaskLabel(task.stepKey)}
                        </div>
                      ) : null}
                      {task.overdue ? <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">已逾期</div> : null}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">{task.detail}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                      <span className="text-[#86868b]">链路阶段：</span>
                      {task.summary.stepLabel}
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                      <span className="text-[#86868b]">来源状态：</span>
                      {task.stage}
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                      <span className="text-[#86868b]">渠道：</span>
                      {task.channel}
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                      <span className="text-[#86868b]">截止：</span>
                      {formatDateLabel(task.dueAt)}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
                    完成后自动推进：
                    {task.completionPreview.nextTaskTitle
                      ? ` ${task.completionPreview.nextTaskStepLabel} · ${task.completionPreview.nextTaskProgressLabel} · ${task.completionPreview.nextTaskTitle}`
                      : ' 当前已是本轮最后一步。'}
                  </div>

                  {task.actionUrl ? (
                    <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{task.actionLabel || '去执行'}</div>
                      <div className="mt-1 text-slate-500">{task.successHint || '完成后回到任务页标记完成。'}</div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <TaskCompleteButton taskId={task.id} />
                    {task.actionUrl ? (
                      <Link
                        href={task.actionUrl}
                        target={/^https?:\/\//.test(task.actionUrl) ? '_blank' : undefined}
                        rel={/^https?:\/\//.test(task.actionUrl) ? 'noreferrer' : undefined}
                        className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                      >
                        {task.actionLabel || '去执行'}
                      </Link>
                    ) : null}
                    {task.stepKey?.includes('open_micro_prompt') ? (
                      <Link
                        href={`/dashboard/micro-prompt?contact=${encodeURIComponent(task.key)}`}
                        className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                      >
                        去补信息
                      </Link>
                    ) : null}
                    <Link
                      href={`/dashboard/leads?q=${encodeURIComponent(task.email || task.company)}`}
                      className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                    >
                      去线索页
                    </Link>
                    <Link
                      href={`/dashboard/emails?contact=${encodeURIComponent(task.key)}`}
                      className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                    >
                      去触达页
                    </Link>
                    <Link
                      href={hrefForFilters(statusFilter, priorityFilter, task.key, query, sourceFilter, dueFilter)}
                      className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                    >
                      只看这个联系人
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm text-slate-500">
                当前筛选条件下没有待办任务。
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#eef5ff] p-3">
                <Layers3 className="h-5 w-5 text-[#0071e3]" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Playbooks</div>
                <h2 className="text-2xl font-semibold text-slate-950">链路观察</h2>
                <p className="mt-1 text-sm text-slate-600">看清楚当前卡在哪一段，别只做单个任务。</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                设计伙伴：资格判断 · 推预约 / 方案 · 72h 跟进 · 本轮收口
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                诊断预约：确认诊断 · 会后成交推进 · 48h 跟进 · 决策收口
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                付款意向：收款确认 · Onboarding · 首周复盘 · 续费风险
              </div>
            </div>
          </div>

          <div className="interactive-panel rounded-3xl border border-black/5 bg-white/90 p-6">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">History</div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">已完成 / 历史</h2>
            <div className="mt-6 space-y-4">
              {completedTasks.length ? (
                completedTasks.map((task) => (
                  <article key={task.id} className="rounded-2xl border border-black/5 bg-[#f8f8f4] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                        <p className="mt-1 text-xs text-[#86868b]">
                          {task.company} · {task.summary.playbookLabel} · {task.summary.stepLabel} · {task.summary.progressLabel}
                        </p>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs ${statusStyle(task.status)}`}>{task.status}</div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                        <span className="text-[#86868b]">完成时间：</span>
                        {formatDateLabel(task.completedAt || task.createdAt)}
                      </div>
                      <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
                        <span className="text-[#86868b]">来源：</span>
                        {sourceLabel(task.sourceKind)}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] p-4 text-sm text-slate-500">
                  当前筛选条件下没有已完成任务。
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
