import type { Metadata } from 'next';
import { Bot, BrainCircuit, Clock3, Database, Globe2, Layers3, ShieldCheck, Wrench } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { readAgentWorkspace } from '../../lib/agent-os';

export const metadata: Metadata = {
  title: '执行层',
  description:
    '把可调用能力、运行边界和人工接管点放在一页里，别让系统看起来像一堆散开的名词。',
};

function statusTone(status: 'healthy' | 'watch' | 'blocked' | 'ready') {
  if (status === 'healthy' || status === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'watch') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function runtimeLabel(status: 'ready' | 'watch' | 'blocked') {
  if (status === 'ready') return '正常';
  if (status === 'watch') return '观察';
  return '阻断';
}

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const workspace = await readAgentWorkspace();
  const runtime = workspace.runtime;

  const summaryCards = [
    { label: '在线能力', value: workspace.summary.activeAgents, icon: Bot },
    { label: '可用技能', value: workspace.summary.totalSkills, icon: Wrench },
    { label: '待处理队列', value: workspace.summary.readyQueue, icon: Clock3 },
    { label: '运行层状态', value: runtime ? `${runtime.summary.readyLayers}/${runtime.summary.totalLayers}` : '0/0', icon: Layers3 },
  ];

  return (
    <MarketingPageShell
      eyebrow="执行层"
      title="把能力拆清楚，再把动作串起来。"
      description="系统要能卖，先得能看懂自己到底在做什么：谁负责发现，谁负责跟进，谁负责记录，谁负责接管。"
      primaryCta={{ href: '/dashboard/ai', label: '打开 Agent OS' }}
      secondaryCta={{ href: '/proof', label: '看执行证明' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="lead-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                  <div className="lead-pill w-fit">{item.label}</div>
                    <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                  </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
          <section className="lead-card p-6">
            <div className="lead-pill w-fit">运行层</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">每一层都要有明确职责</h2>
            <div className="mt-6 space-y-4">
              {runtime?.layers.map((layer) => (
                <article key={layer.id} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">{layer.label}</div>
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

          <section className="lead-card p-6">
            <div className="lead-pill w-fit">能力清单</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">每个能力都对应一条结果链路</h2>
            <div className="mt-6 space-y-4">
              {workspace.agents.map((agent) => (
                <article key={agent.id} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="text-xs font-semibold text-slate-500">{agent.modeLabel}</div>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{agent.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{agent.summary}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(agent.health)}`}>
                      {agent.health === 'healthy' ? '正常' : agent.health === 'watch' ? '观察' : '阻断'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">队列</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{agent.queueCount}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">可执行</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{agent.readyCount}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">被阻断</div>
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
              title: '判断',
              description: '用同一个高上下文模型做跨页面、跨工作流的推理，不靠零散 prompt。',
              icon: BrainCircuit,
            },
            {
              title: '记忆',
              description: '把 ICP、offer、运营节奏和内容资产写成 agent memory，而不是散落在聊天记录里。',
              icon: Database,
            },
            {
              title: '阅读',
              description: '当结构化入口不够时，用浏览器做接近真人的阅读和页面兜底。',
              icon: Globe2,
            },
            {
              title: '边界',
              description: '节流、退订、日志、任务和经营复盘要一起存在，才配谈自动化。',
              icon: ShieldCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="lead-card p-6">
                <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 p-3">
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
