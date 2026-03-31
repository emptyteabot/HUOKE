import { DashboardShell } from '../../../components/dashboard-shell';
import { MicroPromptForm } from '../../../components/micro-prompt-form';
import { readPipelineSnapshot } from '../../../lib/pipeline';

type SearchParams = Promise<{
  contact?: string;
}>;

export const dynamic = 'force-dynamic';

export default async function MicroPromptPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const contactKey = String(resolved.contact || '').trim().toLowerCase();
  const pipeline = await readPipelineSnapshot();
  const contact = pipeline.contacts.find((item) => item.key === contactKey);

  return (
    <DashboardShell
      active="leads"
      title="补信息微表单"
      description="当系统判断当前线索还缺关键信息时，不直接让模型乱猜，而是用一张确定性微表单补齐预算、目标和阻碍。"
    >
      <div className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        {contact ? (
          <>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Micro prompt</div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              {contact.company} · {contact.name}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前系统动作：{contact.intelligenceAction || '未指定'}。先补齐关键信息，再决定推演示、诊断还是方案。
            </p>
            <div className="mt-6 rounded-2xl border border-black/10 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
              当前下一步：{contact.nextAction}
            </div>

            <div className="mt-6">
              <MicroPromptForm
                contactKey={contact.key}
                sourceKind={contact.sourceKind}
                sourceId={contact.sourceId}
                company={contact.company}
                contactName={contact.name}
                email={contact.email}
              />
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-600">没有找到对应线索，请从线索页进入。</div>
        )}
      </div>
    </DashboardShell>
  );
}
