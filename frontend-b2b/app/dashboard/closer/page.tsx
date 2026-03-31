import Link from 'next/link';
import { ArrowRight, Clock3, Mail, MessageSquareQuote, Send, Target } from 'lucide-react';

import { CopyTextButton } from '../../../components/copy-text-button';
import { DashboardShell } from '../../../components/dashboard-shell';
import { DealWonButton } from '../../../components/deal-won-button';
import { CommunicationSendButton } from '../../../components/communication-send-button';
import { CommunicationSentButton } from '../../../components/communication-sent-button';
import { communicationDeliveryState, readCommunicationDrafts } from '../../../lib/communications';
import { readOutreachEvents } from '../../../lib/outreach-log';
import { readPipelineSnapshot } from '../../../lib/pipeline';
import { readFollowUpTasks } from '../../../lib/tasks';

export const dynamic = 'force-dynamic';

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

export default async function CloserPage() {
  const [pipeline, drafts, tasks, outreachEvents] = await Promise.all([
    readPipelineSnapshot(),
    readCommunicationDrafts(),
    readFollowUpTasks(),
    readOutreachEvents(),
  ]);

  const closerContacts = pipeline.contacts.filter(
    (item) => item.intelligenceAction === 'handoff_to_closer' || item.stageLabel.includes('高意向待成交'),
  );
  const closerDrafts = drafts
    .map((draft) => ({
      ...draft,
      deliveryState: communicationDeliveryState(draft),
    }))
    .filter(
      (draft) =>
        draft.templateKey === 'intelligence-closer-email' ||
        draft.templateKey === 'intelligence-closer-dm' ||
        draft.templateKey === 'intelligence-payment-collect-email' ||
        draft.templateKey === 'intelligence-payment-collect-dm',
    )
    .sort((left, right) => new Date(left.readyAt).getTime() - new Date(right.readyAt).getTime());
  const closerTasks = tasks
    .filter((task) => task.stepKey?.includes('handoff_to_closer'))
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
  const closerEvents = outreachEvents
    .filter((item) => item.stepKey.includes('handoff_to_closer') || item.stepLabel.includes('智能动作'))
    .slice(0, 6);

  return (
    <DashboardShell
      active="closer"
      title="Closer War Room"
      description="这一页只盯最接近收钱的动作：高意向待成交、closer 草稿、成交任务和最近发送。"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-slate-500">高意向待成交</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{closerContacts.length}</div>
        </article>
        <article className="interactive-panel rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-emerald-700">Closer 草稿</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-700">{closerDrafts.length}</div>
        </article>
        <article className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-slate-500">Closer 任务</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{closerTasks.length}</div>
        </article>
        <article className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-slate-500">最近发送</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{closerEvents.length}</div>
        </article>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_1fr]">
        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Priority deals</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前高意向待成交</h2>
            </div>
            <Link href="/dashboard/leads" className="inline-flex items-center text-sm font-semibold text-slate-700 transition hover:text-slate-950">
              去线索页
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {closerContacts.length ? (
              closerContacts.map((contact) => (
                <article key={contact.key} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{contact.company}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {contact.name} · {contact.email}
                      </p>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      成交优先
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{contact.nextAction}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                      {contact.stageLabel}
                    </span>
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                      推荐 {contact.recommendedPlanLabel}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <DealWonButton contactKey={contact.key} />
                    <Link
                      href={`/pay?plan=${contact.recommendedPlan}`}
                      className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                    >
                      去付款页
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                    <Link
                      href={`/dashboard/messages?q=${encodeURIComponent(contact.email)}`}
                      className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                    >
                      看成交草稿
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm text-slate-500">当前没有待成交高意向线索。</div>
            )}
          </div>
        </section>

        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Closer queue</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">成交推进草稿</h2>
            </div>
            <Link href="/dashboard/messages" className="inline-flex items-center text-sm font-semibold text-slate-700 transition hover:text-slate-950">
              去消息页
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {closerDrafts.length ? (
              closerDrafts.map((draft) => (
                <article key={draft.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{draft.company}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {draft.templateLabel} · {draft.channel === 'email' ? '邮件' : '私信'}
                      </p>
                    </div>
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                      {draft.deliveryState}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-900">{draft.subject}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <CopyTextButton value={draft.subject} label="复制主题" />
                    <CopyTextButton value={draft.body} label="复制正文" />
                    {draft.deliveryState !== 'sent' && draft.channel === 'email' ? (
                      <CommunicationSendButton draftId={draft.id} />
                    ) : null}
                    {draft.deliveryState !== 'sent' ? <CommunicationSentButton draftId={draft.id} /> : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm text-slate-500">当前没有 closer 草稿。</div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_1fr]">
        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-slate-700" />
            <h2 className="text-2xl font-semibold text-slate-950">Closer 任务</h2>
          </div>
          <div className="mt-6 space-y-4">
            {closerTasks.length ? (
              closerTasks.map((task) => (
                <article key={task.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{task.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{task.company} · {task.owner}</p>
                    </div>
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                      {formatDateLabel(task.dueAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{task.detail}</p>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm text-slate-500">当前没有 closer 任务。</div>
            )}
          </div>
        </section>

        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-slate-700" />
            <h2 className="text-2xl font-semibold text-slate-950">最近成交动作</h2>
          </div>
          <div className="mt-6 space-y-4">
            {closerEvents.length ? (
              closerEvents.map((item) => (
                <article key={item.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-950">{item.company}</h3>
                    <span className="text-xs text-slate-500">{formatDateLabel(item.sentAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.channel} · {item.stepLabel}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm text-slate-500">当前还没有 closer 发送记录。</div>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
