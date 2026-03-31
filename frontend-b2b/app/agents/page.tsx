import type { Metadata } from 'next';
import { Bot, BrainCircuit, Clock3, Database, Globe2, Layers3, ShieldCheck, Wrench } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { readAgentWorkspace } from '../../lib/agent-os';

export const metadata: Metadata = {
  title: 'Agents',
  description:
    'LeadPulse 的多-agent 结构：Scout、Closer、Content、Ops，再加 OpenClaw、RAG、MCP、browser fallback 和 loop engine。',
};

function statusTone(status: 'healthy' | 'watch' | 'blocked' | 'ready') {
  if (status === 'healthy' || status === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'watch') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function runtimeLabel(status: 'ready' | 'watch' | 'blocked') {
  if (status === 'ready') return 'Ready';
  if (status === 'watch') return 'Watch';
  return 'Blocked';
}

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const workspace = await readAgentWorkspace();
  const runtime = workspace.runtime;

  const summaryCards = [
    { label: '在线 Agent', value: workspace.summary.activeAgents, icon: Bot },
    { label: 'Skills', value: workspace.summary.totalSkills, icon: Wrench },
    { label: 'Ready Queue', value: workspace.summary.readyQueue, icon: Clock3 },
    { label: 'Runtime Layers', value: runtime ? `${runtime.summary.readyLayers}/${runtime.summary.totalLayers}` : '0/0', icon: Layers3 },
  ];

  return (
    <MarketingPageShell
      eyebrow="Agent Stack"
      title="像 OpenClaw / Manus 那样讲 agent，但把它做成你能卖的产品结构"
      description="LeadPulse 不只是多开几个模型，而是把 Scout、Closer、Content、Ops 拆成明确边界，再用 OpenClaw、RAG、MCP、browser fallback 和自动循环把它们真正串起来。"
      primaryCta={{ href: '/dashboard/ai', label: '打开 Agent OS' }}
      secondaryCta={{ href: '/proof', label: '看执行证明' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="rounded-[2rem] border border-black/5 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">{item.label}</div>
                    <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                    <Icon className="h-5 w-5 text-slate-800" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 py-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Runtime</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">每一层能力都要讲清楚，不要只说“我们有 AI”</h2>
            <div className="mt-6 space-y-4">
              {runtime?.layers.map((layer) => (
                <article key={layer.id} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{layer.label}</div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{layer.detail}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(layer.status)}`}>
                      {runtimeLabel(layer.status)}
                    </span>
                  </div>
                </article>
              )) || (
                <div className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-600">
                  还没有同步 runtime snapshot。先运行内部 agent runtime sync。
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Registry</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">四个 agent，四条赚钱链路</h2>
            <div className="mt-6 space-y-4">
              {workspace.agents.map((agent) => (
                <article key={agent.id} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{agent.modeLabel}</div>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{agent.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{agent.summary}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(agent.health)}`}>
                      {agent.health === 'healthy' ? 'Healthy' : agent.health === 'watch' ? 'Watch' : 'Blocked'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">Queue</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{agent.queueCount}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">Ready</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{agent.readyCount}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">Blocked</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{agent.blockedCount}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {agent.metrics.map((metric) => (
                      <span key={metric} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {metric}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            {
              title: 'Reasoning',
              description: '用同一个高上下文模型做跨页面、跨工作流的推理，不靠零散 prompt。',
              icon: BrainCircuit,
            },
            {
              title: 'Memory',
              description: '把 ICP、offer、运营节奏和内容资产写成 agent memory，而不是散落在聊天记录里。',
              icon: Database,
            },
            {
              title: 'Browser',
              description: '当 API 不够时，用浏览器 profile 做人类式阅读和页面兜底。',
              icon: Globe2,
            },
            {
              title: 'Guardrails',
              description: '节流、退订、日志、任务和经营复盘要一起存在，才配谈自动化。',
              icon: ShieldCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3 w-fit">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </MarketingPageShell>
  );
}
