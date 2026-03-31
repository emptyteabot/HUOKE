import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  Globe2,
  Handshake,
  PenSquare,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

import { CopyTextButton } from '../../../components/copy-text-button';
import { DashboardShell } from '../../../components/dashboard-shell';
import { readAgentWorkspace, type AgentId } from '../../../lib/agent-os';

export const dynamic = 'force-dynamic';

const agentVisuals: Record<
  AgentId,
  {
    kicker: string;
    icon: typeof Search;
    accent: string;
  }
> = {
  scout: { kicker: 'Scout', icon: Search, accent: 'from-amber-50 to-white' },
  closer: { kicker: 'Closer', icon: Handshake, accent: 'from-emerald-50 to-white' },
  content: { kicker: 'Content', icon: PenSquare, accent: 'from-sky-50 to-white' },
  ops: { kicker: 'Ops', icon: ShieldCheck, accent: 'from-slate-100 to-white' },
};

function formatDateLabel(value?: string) {
  if (!value) return '无截止时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function healthLabel(health: 'healthy' | 'watch' | 'blocked') {
  if (health === 'healthy') return '健康';
  if (health === 'watch') return '观察';
  return '阻塞';
}

function queueStatusLabel(status: 'ready' | 'watch' | 'blocked') {
  if (status === 'ready') return 'Ready';
  if (status === 'watch') return 'Watch';
  return 'Blocked';
}

function statusTone(status: 'healthy' | 'watch' | 'blocked' | 'ready' | 'neutral') {
  if (status === 'healthy' || status === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'watch') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-black/10 bg-white text-slate-600';
}

function priorityTone(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function runtimeLabel(status: 'ready' | 'watch' | 'blocked') {
  if (status === 'ready') return 'Ready';
  if (status === 'watch') return 'Watch';
  return 'Blocked';
}

export default async function DashboardAiPage() {
  const workspace = await readAgentWorkspace();

  const summaryCards = [
    { label: '在线 Agent', value: workspace.summary.activeAgents, helper: 'Scout / Closer / Content / Ops', icon: Bot },
    { label: '已挂载 Skills', value: workspace.summary.totalSkills, helper: '每个 agent 都有边界', icon: Wrench },
    { label: 'Ready 队列', value: workspace.summary.readyQueue, helper: '可以立刻派发执行', icon: CheckCircle2 },
    { label: '高优先级', value: workspace.summary.highPriorityQueue, helper: '今天必须推进', icon: Clock3 },
    { label: 'Blocked', value: workspace.summary.blockedQueue, helper: '先清阻塞，再谈放大', icon: AlertTriangle },
  ];

  return (
    <DashboardShell
      active="ai"
      title="Agent OS"
      description="这里看多 agent 执行层的真实状态：谁在跑、谁卡住、哪些动作现在最该派发。"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">{card.label}</div>
                  <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-[#eef5ff] p-3">
                  <Icon className="h-5 w-5 text-[#0071e3]" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{card.helper}</p>
            </article>
          );
        })}
      </div>

      {workspace.runtime ? (
        <div className="mt-8 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Runtime Stack</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">运行栈</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">这里显示 OpenClaw / RAG / Browser fallback / MCP / loop 的真实状态。</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#eef5ff] p-3">
                <Cpu className="h-5 w-5 text-[#0071e3]" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {workspace.runtime.layers.map((layer) => (
                <article key={layer.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">{layer.label}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{layer.detail}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(layer.status)}`}>
                      {runtimeLabel(layer.status)}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">来源：{layer.source}</div>
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Bindings</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">外接能力</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">每个 agent 挂了什么能力、有没有 blocker、现在能不能继续跑。</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#eef5ff] p-3">
                <Globe2 className="h-5 w-5 text-[#0071e3]" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {workspace.runtime.agents.map((agent) => (
                <article key={agent.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
                        {agent.label} · {agent.openclawAgentId}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{agent.model}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(agent.status)}`}>
                      {runtimeLabel(agent.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">知识文件</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
                        <Database className="h-4 w-4" />
                        {agent.knowledgeFiles}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">会话数</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{agent.sessions}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">Browser</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{agent.browserProfile || '未绑定'}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {agent.capabilities.map((capability) => (
                      <span key={`${agent.id}-${capability.name}`} className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(capability.status)}`} title={capability.detail}>
                        {capability.label}
                      </span>
                    ))}
                  </div>

                  {agent.blockers.length ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                      Blockers：{agent.blockers.join('；')}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                      这条 agent 链路已具备继续自动化扩展的基础。
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Dispatch Hotlist</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">现在最该派发的动作</h2>
            </div>
            <Link href="/dashboard/tasks" className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
              去任务页
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {workspace.topDispatch.map((item, index) => (
              <article key={item.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">#{index + 1} · {item.sourceLabel}</div>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.context}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${priorityTone(item.priority)}`}>
                      {item.priority.toUpperCase()}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(item.status)}`}>
                      {queueStatusLabel(item.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 text-slate-900">
                  下一步：{item.nextAction}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">截止：{formatDateLabel(item.dueAt)}</p>
                  <Link href={item.link} className="interactive-button inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950">
                    打开详情
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Founder Memory</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">一人公司要一直记住的事</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {workspace.memory.map((item) => (
              <article key={item.label} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">{item.label}</div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(item.status)}`}>
                    {item.status === 'neutral' ? 'Info' : queueStatusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.helper}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Agent Registry</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">四个 agent，四条执行链</h2>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {workspace.agents.map((agent) => {
            const visual = agentVisuals[agent.id];
            const Icon = visual.icon;

            return (
              <article key={agent.id} className={`interactive-panel rounded-[2rem] border border-black/5 bg-gradient-to-br ${visual.accent} p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">{visual.kicker} · {agent.modeLabel}</div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="rounded-2xl border border-black/10 bg-white/85 p-3">
                        <Icon className="h-5 w-5 text-slate-800" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{agent.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{agent.role}</p>
                      </div>
                    </div>
                  </div>

                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(agent.health)}`}>
                    {healthLabel(agent.health)}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-700">{agent.summary}</p>

                <div className="mt-5 rounded-3xl border border-black/10 bg-white/80 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Current Focus</div>
                  <p className="mt-3 text-sm leading-7 text-slate-900">{agent.focus}</p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
                    <div className="text-xs text-slate-500">总队列</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{agent.queueCount}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
                    <div className="text-xs text-slate-500">Ready</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{agent.readyCount}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
                    <div className="text-xs text-slate-500">Blocked</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{agent.blockedCount}</div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {agent.metrics.map((metric) => (
                    <span key={metric} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {metric}
                    </span>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  {agent.skills.map((skill) => (
                    <article key={skill.id} className="interactive-panel rounded-3xl border border-black/5 bg-white/85 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-2xl">
                          <h4 className="text-sm font-semibold text-slate-950">{skill.label}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{skill.description}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(skill.status)}`}>
                          {queueStatusLabel(skill.status)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-black/10 bg-[#f8f8f4] px-3 py-1 text-xs text-slate-500">输入：{skill.inputLabel}</span>
                        <span className="rounded-full border border-black/10 bg-[#f8f8f4] px-3 py-1 text-xs text-slate-500">输出：{skill.outputLabel}</span>
                        <span className="rounded-full border border-black/10 bg-[#f8f8f4] px-3 py-1 text-xs text-slate-500">backlog：{skill.backlogCount}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Queue Lanes</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">每个 agent 的执行队列</h2>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {workspace.agents.map((agent) => {
            const visual = agentVisuals[agent.id];
            const Icon = visual.icon;
            const queue = workspace.queueByAgent[agent.id];

            return (
              <section key={agent.id} className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-black/10 bg-[#eef5ff] p-3">
                      <Icon className="h-5 w-5 text-[#0071e3]" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">{visual.kicker}</div>
                      <h3 className="mt-1 text-xl font-semibold text-slate-950">{agent.name}</h3>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {queue.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-black/10 bg-[#fafaf6] px-4 py-6 text-sm text-slate-500">
                      当前没有待处理动作。
                    </div>
                  ) : (
                    queue.slice(0, 4).map((item) => (
                      <article key={item.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="max-w-2xl">
                            <h4 className="text-sm font-semibold text-slate-950">{item.title}</h4>
                            <p className="mt-2 text-sm text-slate-600">{item.context}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${priorityTone(item.priority)}`}>
                              {item.priority.toUpperCase()}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusTone(item.status)}`}>
                              {queueStatusLabel(item.status)}
                            </span>
                          </div>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-700">{item.nextAction}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                          <span>{item.sourceLabel}</span>
                          <span>{formatDateLabel(item.dueAt)}</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Prompt Stack</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">给 founder 直接复制的 Prompt</h2>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {workspace.prompts.map((prompt) => (
            <article key={prompt.id} className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">{prompt.label}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{prompt.helper}</p>
                </div>
                <CopyTextButton value={prompt.value} />
              </div>

              <div className="mt-5 rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-800">{prompt.value}</pre>
              </div>
            </article>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
