import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Coins,
  Mail,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import { CopyTextButton } from '../../components/copy-text-button';
import { DashboardShell } from '../../components/dashboard-shell';
import { RevenueDashboard } from '../../components/revenue-dashboard';
import { readAgentWorkspace } from '../../lib/agent-os';
import { communicationDeliveryState, readCommunicationDrafts } from '../../lib/communications';
import { readFulfillmentPackages } from '../../lib/fulfillment';
import { readComplianceLibrary, readCreativeLibrary } from '../../lib/marketing';
import { readOpsDashboardData } from '../../lib/ops';
import { buildOutreachPlans } from '../../lib/outreach';
import { readOutreachEvents } from '../../lib/outreach-log';
import { readPipelineSnapshot } from '../../lib/pipeline';
import { readFollowUpTasks } from '../../lib/tasks';

export const dynamic = 'force-dynamic';

function formatDateLabel(value?: string) {
  if (!value) return '无时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusTone(status: 'ready' | 'watch' | 'blocked' | 'neutral') {
  if (status === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'watch') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-black/10 bg-white text-slate-600';
}

function intelligenceBadgeTone(action?: string) {
  if (action === 'handoff_to_closer') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (action === 'rerank_catalog') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (action === 'open_micro_prompt') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-black/10 bg-white text-slate-600';
}

export default async function DashboardPage() {
  const [ops, pipeline, creativeLibrary, complianceLibrary, outreachEvents, agentWorkspace, communicationDrafts, fulfillmentPackages, followUpTasks] = await Promise.all([
    readOpsDashboardData(),
    readPipelineSnapshot(),
    readCreativeLibrary(),
    readComplianceLibrary(),
    readOutreachEvents(),
    readAgentWorkspace(),
    readCommunicationDrafts(),
    readFulfillmentPackages(3),
    readFollowUpTasks(),
  ]);

  const outreachPlans = buildOutreachPlans(
    pipeline.contacts,
    creativeLibrary.creatives,
    complianceLibrary.replacements,
    outreachEvents,
  );

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const readyPlans = outreachPlans.filter((plan) => plan.readyStep);
  const latestFulfillment = fulfillmentPackages[0] || null;
  const executionTasks = followUpTasks
    .filter((task) => task.status === 'pending' && String(task.stepKey || '').startsWith('fulfillment-'))
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
    .slice(0, 3);
  const closerDrafts = communicationDrafts
    .map((draft) => ({
      ...draft,
      deliveryState: communicationDeliveryState(draft),
    }))
    .filter((draft) => draft.templateKey === 'intelligence-closer-email' || draft.templateKey === 'intelligence-closer-dm')
    .sort((left, right) => new Date(left.readyAt).getTime() - new Date(right.readyAt).getTime());
  const sentTodayCount = outreachEvents.filter((item) => item.sentAt.startsWith(todayPrefix)).length;
  const readyCreatives = creativeLibrary.creatives.filter((item) => item.status === 'ready');

  const metricCards = [
    { label: '总线索', value: pipeline.summary.totalContacts, helper: '本地 pipeline', icon: Target },
    { label: '今日可发', value: readyPlans.length, helper: '已 ready 的触达', icon: Send },
    { label: '今日已发', value: sentTodayCount, helper: 'outreach 发送记录', icon: Mail },
    { label: '待收款', value: pipeline.summary.paymentQueue, helper: '最接近现金', icon: Coins },
    { label: 'Agent Ready', value: agentWorkspace.summary.readyQueue, helper: '当前可直接执行', icon: Bot },
    { label: 'Blocked', value: agentWorkspace.summary.blockedQueue, helper: '优先清障', icon: AlertTriangle },
  ];

  return (
    <DashboardShell
      active="overview"
      title="Founder 控制台"
      description="这里只放对今天有用的信息：谁先跟进、什么能发、哪里卡住、钱离你还有多远。"
    >
      <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Operating Pulse</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[#86868b]">{card.label}</div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white p-3">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.helper}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Agent Pulse</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Agent 现在什么情况</h2>
            </div>
            <Link href="/dashboard/ai" className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
              打开 Agent OS
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-4">
              <div className="text-xs text-[#86868b]">在线 agent</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{agentWorkspace.summary.activeAgents}</div>
            </article>
            <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-4">
              <div className="text-xs text-[#86868b]">Skills</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{agentWorkspace.summary.totalSkills}</div>
            </article>
            <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-4">
              <div className="text-xs text-[#86868b]">High priority</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{agentWorkspace.summary.highPriorityQueue}</div>
            </article>
            <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-4">
              <div className="text-xs text-[#86868b]">Watch queue</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{agentWorkspace.summary.watchQueue}</div>
            </article>
          </div>

          <div className="mt-6 space-y-4">
            {agentWorkspace.topDispatch.slice(0, 4).map((item, index) => (
              <article key={item.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
                      #{index + 1} · {item.sourceLabel}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.context}</p>
                  </div>
                  <Link href={item.link} className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
                    处理
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 text-slate-900">
                  下一步：{item.nextAction}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Founder Memory</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">别丢的上下文</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {agentWorkspace.memory.slice(0, 4).map((item) => (
              <article key={item.label} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">{item.label}</div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(item.status)}`}>
                    {item.status === 'neutral' ? 'Info' : item.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.helper}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10">
        <RevenueDashboard series={ops.series} />
      </div>

      {latestFulfillment ? (
        <section className="mt-10 interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Latest Delivery</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">最新交付包</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{latestFulfillment.narrative.oneLiner}</p>
            </div>
            <Link href="/dashboard/fulfillment" className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
              去交付看板
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
              <div className="text-sm font-medium text-[#86868b]">产品</div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">{latestFulfillment.snapshot.title || latestFulfillment.company}</div>
            </div>
            <div className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
              <div className="text-sm font-medium text-[#86868b]">信号分</div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">{latestFulfillment.signals.score}</div>
            </div>
            <div className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
              <div className="text-sm font-medium text-[#86868b]">当前节点</div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">{latestFulfillment.workflow.currentNode}</div>
            </div>
            <div className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
              <div className="text-sm font-medium text-[#86868b]">执行步骤</div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">{latestFulfillment.executionPlan.steps.length}</div>
            </div>
          </div>

          {executionTasks.length ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {executionTasks.map((task) => (
                <article key={task.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="text-sm font-medium text-[#86868b]">{task.owner}</div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{task.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{task.detail}</p>
                  {task.actionUrl ? (
                    <Link
                      href={task.actionUrl}
                      target={/^https?:\/\//.test(task.actionUrl) ? '_blank' : undefined}
                      rel={/^https?:\/\//.test(task.actionUrl) ? 'noreferrer' : undefined}
                      className="interactive-button mt-4 inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                    >
                      {task.actionLabel || '去执行'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Priority Accounts</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">今天最该推进的联系人</h2>
            </div>
            <Link href="/dashboard/leads" className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
              去线索页
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {pipeline.contacts.slice(0, 4).map((contact) => (
              <article key={contact.key} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{contact.company}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {contact.name} · {contact.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {contact.stageLabel} · 推荐 {contact.recommendedPlanLabel}
                    </div>
                    {contact.rerankBoost ? (
                      <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                        排序提升 +{contact.rerankBoost}
                      </div>
                    ) : null}
                    {contact.intelligenceAction ? (
                      <div className={`rounded-full border px-3 py-1 text-xs font-medium ${intelligenceBadgeTone(contact.intelligenceAction)}`}>
                        {contact.intelligenceAction}
                      </div>
                    ) : null}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">{contact.summary}</p>
                {contact.intelligenceAction === 'handoff_to_closer' ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    已进入 Closer 优先链路。
                  </div>
                ) : null}
                <div className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900">
                  下一步：{contact.nextAction}
                </div>
                <p className="mt-3 text-xs text-[#86868b]">最近进入：{formatDateLabel(contact.latestAt)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Outbound Queue</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">下一条触达</h2>
              </div>
              <Link href="/dashboard/emails" className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
                去触达页
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {closerDrafts.slice(0, 2).map((draft) => (
                <article key={`closer-${draft.id}`} className="interactive-panel rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{draft.company}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Closer 优先 · {draft.channel === 'email' ? '邮件' : '私信'}
                      </p>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700">
                      成交优先
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900">
                    现在动作：直接发送 closer 草稿。
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{draft.subject}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <CopyTextButton value={draft.subject} label="复制主题" />
                    <CopyTextButton value={draft.body} label="复制正文" />
                  </div>
                </article>
              ))}

              {readyPlans.slice(0, 3).map((plan) => (
                <article key={plan.contact.key} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{plan.contact.company}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {plan.contact.stageLabel} · {plan.primaryChannelLabel}
                      </p>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {plan.readyStep?.label || 'Ready'}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 text-slate-900">
                    现在动作：{plan.immediateActionLabel}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{plan.batchSubject}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <CopyTextButton value={plan.batchEmail} label="复制邮件" />
                    <CopyTextButton value={plan.batchDm} label="复制私信" />
                  </div>
                  <p className="mt-4 text-xs text-[#86868b]">
                    下一时间点：{formatDateLabel(plan.readyStep?.readyAt || plan.nextStep?.readyAt)}
                  </p>
                </article>
              ))}
            </div>
          </article>

          <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Growth Assets</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">增长资产库存</h2>

            <div className="mt-6 grid gap-4">
              <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[#86868b]">Ready 素材</div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{readyCreatives.length}</div>
                  </div>
                  <Sparkles className="h-5 w-5 text-slate-700" />
                </div>
              </article>

              <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[#86868b]">合规替换词</div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{complianceLibrary.replacements.length}</div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                </div>
              </article>
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
