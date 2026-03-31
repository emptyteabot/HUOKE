import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  Mail,
  MessageSquareQuote,
  Search,
} from 'lucide-react';

import { CommunicationSentButton } from '../../../components/communication-sent-button';
import { CommunicationSendButton } from '../../../components/communication-send-button';
import { CopyTextButton } from '../../../components/copy-text-button';
import { DashboardShell } from '../../../components/dashboard-shell';
import {
  communicationDeliveryState,
  readCommunicationDrafts,
} from '../../../lib/communications';
import { isSmtpConfigured } from '../../../lib/mailer';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  kind?: string;
  status?: string;
  q?: string;
}>;

type KindFilter = 'all' | 'design_partner' | 'booking_request' | 'payment_intent';
type StatusFilter = 'all' | 'ready' | 'scheduled' | 'sent';

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

function statusLabel(status: StatusFilter) {
  if (status === 'ready') return '可发送';
  if (status === 'scheduled') return '排队中';
  if (status === 'sent') return '已发送';
  return '全部状态';
}

function statusClass(status: StatusFilter) {
  if (status === 'ready') return 'border-black/10 bg-[#f6f7f4] text-slate-900';
  if (status === 'scheduled') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'sent') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-black/10 bg-white text-slate-500';
}

function kindLabel(kind: KindFilter) {
  if (kind === 'design_partner') return '设计伙伴';
  if (kind === 'booking_request') return '预约';
  if (kind === 'payment_intent') return '付款';
  return '全部来源';
}

function hrefForFilters(kind: string, status: string, q: string) {
  const params = new URLSearchParams();
  if (kind && kind !== 'all') params.set('kind', kind);
  if (status && status !== 'all') params.set('status', status);
  if (q) params.set('q', q);
  const query = params.toString();
  return `/dashboard/messages${query ? `?${query}` : ''}`;
}

function draftSortScore(draft: Awaited<ReturnType<typeof readCommunicationDrafts>>[number] & { deliveryState: StatusFilter }) {
  const closerBoost =
    draft.templateKey === 'intelligence-closer-email' ||
    draft.templateKey === 'intelligence-closer-dm' ||
    draft.templateKey === 'intelligence-payment-collect-email' ||
    draft.templateKey === 'intelligence-payment-collect-dm'
      ? 1000000
      : 0;
  const priorityBoost = draft.priority === 'high' ? 10000 : draft.priority === 'medium' ? 1000 : 0;
  const readyBoost = draft.deliveryState === 'ready' ? 100 : draft.deliveryState === 'scheduled' ? 10 : 0;
  return closerBoost + priorityBoost + readyBoost - new Date(draft.readyAt).getTime() / 1000000000;
}

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const kindFilter: KindFilter =
    resolved.kind === 'design_partner' ||
    resolved.kind === 'booking_request' ||
    resolved.kind === 'payment_intent'
      ? resolved.kind
      : 'all';
  const statusFilter: StatusFilter =
    resolved.status === 'ready' || resolved.status === 'scheduled' || resolved.status === 'sent'
      ? resolved.status
      : 'all';
  const query = String(resolved.q || '').trim().toLowerCase();

  const drafts = await readCommunicationDrafts();
  const smtpReady = isSmtpConfigured();
  const decoratedDrafts = drafts
    .map((draft) => ({
      ...draft,
      deliveryState: communicationDeliveryState(draft),
    }))
    .filter((draft) => {
      const kindMatches = kindFilter === 'all' ? true : draft.sourceKind === kindFilter;
      const statusMatches = statusFilter === 'all' ? true : draft.deliveryState === statusFilter;
      const queryText = [
        draft.company,
        draft.contactName,
        draft.email,
        draft.subject,
        draft.body,
        draft.templateLabel,
        draft.objective,
      ]
        .join(' ')
        .toLowerCase();
      const queryMatches = query ? queryText.includes(query) : true;
      return kindMatches && statusMatches && queryMatches;
    })
    .sort((left, right) => draftSortScore(right) - draftSortScore(left));
  const closerDrafts = decoratedDrafts.filter(
    (draft) =>
      draft.templateKey === 'intelligence-closer-email' ||
      draft.templateKey === 'intelligence-closer-dm' ||
      draft.templateKey === 'intelligence-payment-collect-email' ||
      draft.templateKey === 'intelligence-payment-collect-dm',
  );
  const regularDrafts = decoratedDrafts.filter(
    (draft) =>
      draft.templateKey !== 'intelligence-closer-email' &&
      draft.templateKey !== 'intelligence-closer-dm' &&
      draft.templateKey !== 'intelligence-payment-collect-email' &&
      draft.templateKey !== 'intelligence-payment-collect-dm',
  );

  const summary = {
    total: drafts.length,
    ready: drafts.filter((item) => communicationDeliveryState(item) === 'ready').length,
    scheduled: drafts.filter((item) => communicationDeliveryState(item) === 'scheduled').length,
    sent: drafts.filter((item) => communicationDeliveryState(item) === 'sent').length,
    closerReady: drafts.filter(
      (item) =>
        communicationDeliveryState(item) === 'ready' &&
        (
          item.templateKey === 'intelligence-closer-email' ||
          item.templateKey === 'intelligence-closer-dm' ||
          item.templateKey === 'intelligence-payment-collect-email' ||
          item.templateKey === 'intelligence-payment-collect-dm'
        ),
    ).length,
  };

  return (
    <DashboardShell
      active="messages"
      title="消息草稿库"
      description="新线索进来后，LeadPulse 会自动产出首封确认、私信和后续跟进模板。你只要复制、发送、记录，不要每次从零写。"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-slate-500">总草稿</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.total}</div>
        </article>
        <article className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-slate-500">现在可发</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.ready}</div>
        </article>
        <article className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-slate-500">排队中</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.scheduled}</div>
        </article>
        <article className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-slate-500">已发送</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.sent}</div>
        </article>
        <article className="interactive-panel rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-medium text-emerald-700">Closer 待发</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-700">{summary.closerReady}</div>
        </article>
      </div>

      <div className="mt-8 interactive-panel rounded-3xl border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="mb-4 rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-600">
          SMTP 发信状态：
          <span className="ml-2 font-semibold text-slate-900">
            {smtpReady ? '已配置，可直接自动发邮件' : '未配置，当前只能复制或手动标记已发'}
          </span>
        </div>
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          `Closer` 成交推进草稿会自动置顶，优先于普通确认信和普通跟进。
        </div>
        <form action="/dashboard/messages" className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap gap-2">
            {(['all', 'design_partner', 'booking_request', 'payment_intent'] as KindFilter[]).map((item) => (
              <Link
                key={item}
                href={hrefForFilters(item, statusFilter === 'all' ? '' : statusFilter, query)}
              className={`interactive-button inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${
                  item === kindFilter
                    ? 'border-black/10 bg-white text-slate-950 shadow-sm'
                    : 'border-black/10 bg-white/75 text-slate-600 transition hover:border-black/15 hover:bg-white hover:text-slate-900'
                }`}
              >
                {kindLabel(item)}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'ready', 'scheduled', 'sent'] as StatusFilter[]).map((item) => (
              <Link
                key={item}
                href={hrefForFilters(kindFilter === 'all' ? '' : kindFilter, item, query)}
              className={`interactive-button inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${
                  item === statusFilter
                    ? 'border-black/10 bg-white text-slate-950 shadow-sm'
                    : 'border-black/10 bg-white/75 text-slate-600 transition hover:border-black/15 hover:bg-white hover:text-slate-900'
                }`}
              >
                {statusLabel(item)}
              </Link>
            ))}
          </div>

          <div className="flex flex-1 items-center gap-3">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="搜公司、联系人、主题、内容"
              className="min-w-[280px] flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/15"
            />
            <button
              type="submit"
              className="interactive-button inline-flex items-center rounded-full bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0062c3]"
            >
              <Search className="mr-2 h-4 w-4" />
              应用
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 space-y-6">
        {closerDrafts.length ? (
          <section className="interactive-panel rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-700">Closer queue</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">成交优先草稿</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  这些草稿来自 `handoff_to_closer`，优先级高于普通确认信和普通跟进。
                </p>
              </div>
              <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700">
                {closerDrafts.length} 条
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {closerDrafts.map((draft) => {
                const mailtoHref =
                  draft.channel === 'email' && draft.email
                    ? `mailto:${encodeURIComponent(draft.email)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
                    : null;

                return (
                  <article
                    key={`closer-${draft.id}`}
                    className="interactive-panel rounded-3xl border border-emerald-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
                          {draft.company}
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                          {draft.contactName} · {draft.templateLabel}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {draft.objective} · {draft.email || '未填写邮箱'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(draft.deliveryState)}`}>
                          {statusLabel(draft.deliveryState)}
                        </div>
                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          Closer 优先
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Subject</p>
                          <h3 className="mt-2 text-lg font-semibold text-slate-950">{draft.subject}</h3>
                        </div>
                        <CopyTextButton value={draft.subject} label="复制主题" />
                      </div>

                      <div className="mt-5">
                        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Body</p>
                        <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                          {draft.body}
                        </pre>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <CopyTextButton value={draft.body} label="复制正文" />
                      {mailtoHref ? (
                        <a
                          href={mailtoHref}
                          className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          打开邮件
                        </a>
                      ) : null}
                      {draft.deliveryState !== 'sent' && draft.channel === 'email' ? (
                        <CommunicationSendButton draftId={draft.id} />
                      ) : null}
                      {draft.deliveryState !== 'sent' ? <CommunicationSentButton draftId={draft.id} /> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {regularDrafts.length ? (
          regularDrafts.map((draft) => {
            const mailtoHref =
              draft.channel === 'email' && draft.email
                ? `mailto:${encodeURIComponent(draft.email)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
                : null;

            return (
              <article
                key={draft.id}
                className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
                      {draft.company}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                      {draft.contactName} · {draft.templateLabel}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {draft.objective} · {draft.email || '未填写邮箱'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(draft.deliveryState)}`}>
                      {statusLabel(draft.deliveryState)}
                    </div>
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {kindLabel(draft.sourceKind)}
                    </div>
                    {(draft.templateKey === 'intelligence-closer-email' || draft.templateKey === 'intelligence-closer-dm') ? (
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        Closer 优先
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">渠道</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                      {draft.channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquareQuote className="h-4 w-4" />}
                      {draft.channel === 'email' ? '邮件' : '私信'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">阶段</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{draft.stage}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">可发时间</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Clock3 className="h-4 w-4" />
                      {formatDateLabel(draft.readyAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">CTA</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{draft.ctaLabel || '无'}</p>
                  </div>
                </div>

                <div className="mt-6 interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Subject</p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">{draft.subject}</h3>
                    </div>
                    <CopyTextButton value={draft.subject} label="复制主题" />
                  </div>

                  <div className="mt-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Body</p>
                    <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                      {draft.body}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <CopyTextButton value={draft.body} label="复制正文" />
                  {mailtoHref ? (
                    <a
                      href={mailtoHref}
                      className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      打开邮件
                    </a>
                  ) : null}
                  {draft.ctaUrl ? (
                    <a
                      href={draft.ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                    >
                      {draft.ctaLabel || '打开链接'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  ) : null}
                  {draft.deliveryState !== 'sent' && draft.channel === 'email' ? (
                    <CommunicationSendButton draftId={draft.id} />
                  ) : null}
                  {draft.deliveryState !== 'sent' ? <CommunicationSentButton draftId={draft.id} /> : null}
                </div>
              </article>
            );
          })
        ) : !closerDrafts.length ? (
          <div className="rounded-3xl border border-black/5 bg-white/85 p-6 text-sm leading-7 text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            当前没有匹配的消息草稿。去
            <Link href="/dashboard/leads" className="mx-1 font-semibold text-slate-900 underline underline-offset-4">
              线索页
            </Link>
            或
            <Link href="/dashboard/emails" className="mx-1 font-semibold text-slate-900 underline underline-offset-4">
              触达页
            </Link>
            看看最新队列。
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
