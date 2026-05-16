import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, Download, GitBranch, ShieldCheck, Target, Workflow } from 'lucide-react';

import { SITE_URL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'DeepSeek Desktop Agent PoW | Ian Chen',
  description: 'DeepSeek 桌面端 Agent 早期用户留存指标设计与竞品分析。',
  alternates: {
    canonical: `${SITE_URL}/deepseek-harness-pow`,
  },
  openGraph: {
    title: 'DeepSeek Desktop Agent PoW | Ian Chen',
    description: 'ETCR、D1/D7 任务留存、工具失败恢复与 Harness 任务链路分析。',
    url: `${SITE_URL}/deepseek-harness-pow`,
    type: 'article',
  },
};

const proofMetrics = [
  { label: '小红书内容', value: '179 篇' },
  { label: '累计曝光', value: '48.4 万' },
  { label: '累计互动', value: '3.72 万' },
  { label: 'AI 相关内容', value: '96 篇' },
];

const signalRows = [
  {
    topic: 'Claude 全家桶工作流',
    data: '6.2 万曝光 / 1.55 万互动',
    signal: '非技术用户需要可复制的 AI Coding 上手路径',
    implication: '首次体验不能只给空白输入框，要给任务模板、可执行步骤和检查点。',
  },
  {
    topic: 'Codex 与 Claude 编程任务对比',
    data: '12.2 万曝光 / 3833 互动',
    signal: '开发者关注工具分工、代码修复和重构边界',
    implication: '产品需要明确自己更适合计划、写代码、修复、重构还是交付。',
  },
  {
    topic: 'NotebookLM + Claude 工作流',
    data: '1.32 万曝光 / 3057 互动',
    signal: '知识管理、Token 成本和多工具协作需求强',
    implication: '桌面 Agent 需要低摩擦接入本地资料和长期上下文。',
  },
  {
    topic: '多 Agent 架构分析',
    data: '1.28 万曝光 / 2299 互动',
    signal: '工程受众关注任务状态、上下文传递和可控性',
    implication: 'Harness 需要暴露任务状态、工具调用、失败原因和人工接管点。',
  },
];

const retentionMetrics = [
  'ETCR：被用户确认接受的任务完成数 / 用户发起的任务数',
  '首次有效激活率：首次会话中完成至少 1 个真实任务，且结果被用户确认接受的新用户占比',
  'D7 第二任务留存：首次激活后 7 天内完成第 2 个被接受任务的用户占比',
  '工具失败恢复率：工具调用失败后，系统自动恢复并最终完成任务的会话占比',
  '人工确认后再使用率：经历过人工确认或修正的用户，7 天内继续使用 Agent 的占比',
];

const competitors = [
  {
    name: 'Claude Code',
    strength: '长上下文理解、代码库阅读、解释与协作式修改强。',
    gap: '终端 / IDE 心智对非技术用户偏硬，长任务成本和停止点不清。',
    opportunity: '把“会想”转成可执行、可检查、可恢复的任务面板。',
  },
  {
    name: 'Codex',
    strength: '更贴近软件工程任务，适合 repo 内修改、测试、diff 和重构。',
    gap: '普通用户门槛高，跨桌面资料和非代码工作流的连续性不足。',
    opportunity: '把工程纪律迁移到更宽的桌面任务：计划、权限、diff、日志、回滚。',
  },
  {
    name: 'OpenClaw',
    strength: '多通道 Agent gateway，覆盖聊天应用、技能、沙箱、会话和多 Agent 路由。',
    gap: '初次配置、技能选择和安全边界会增加认知负担。',
    opportunity: '先把单用户桌面任务做深，再逐步开放技能与多 Agent 编排。',
  },
];

const monthPlan = [
  '第 1 周：访谈 20 个重度 AI Coding 用户，复盘 Claude / Codex / Cursor / OpenClaw 的失败节点。',
  '第 2 周：上线代码库理解、局部修改、文档归纳 3 个任务模板。',
  '第 3 周：灰度计划确认、执行日志、失败恢复、结果接受埋点。',
  '第 4 周：按 cohort 看 D7 第二任务留存，砍掉只增加聊天轮次但不能推进任务的入口。',
];

export default function DeepSeekHarnessPowPage() {
  return (
    <main className="lead-surface min-h-screen text-slate-950">
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-6 lg:px-8">
        <nav className="flex flex-col gap-3 border-b border-slate-200 pb-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-semibold text-slate-950">
            Ian Chen / DeepSeek Agent PoW
          </Link>
          <div className="flex flex-wrap gap-3">
            <Link href="https://agenthelpjob.com" className="transition hover:text-slate-950">
              agenthelpjob.com
            </Link>
            <Link href="https://leadpulseagi.com" className="transition hover:text-slate-950">
              leadpulseagi.com
            </Link>
          </div>
        </nav>

        <header className="py-14 sm:py-16">
          <div className="apple-pill mb-6 w-fit">Proof of Work</div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            DeepSeek 桌面端 Agent 早期用户留存指标设计与竞品分析
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            核心结论：桌面端 Agent 不应该只看 DAU、启动次数或聊天轮次，而应看用户是否把真实任务交给 Agent，
            并在计划、执行、校验、人工确认、复用链路中持续获得可接受结果。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/deepseek/pow_deepseek_harness.pdf" className="lead-button lead-button-primary">
              <Download className="h-4 w-4" />
              下载 PoW PDF
            </Link>
            <Link href="/deepseek/resume_deepseek_harness.pdf" className="lead-button lead-button-secondary">
              <Download className="h-4 w-4" />
              下载简历
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {proofMetrics.map((metric) => (
            <article key={metric.label} className="interactive-panel bg-white/90 p-5">
              <div className="text-sm font-medium text-slate-500">{metric.label}</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</div>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="interactive-panel bg-white/90 p-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold">北极星指标</h2>
            </div>
            <p className="mt-5 text-lg font-semibold text-slate-950">ETCR：有效任务完成率</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              被用户确认接受的任务完成数 / 用户发起的任务数。这个指标比聊天轮次更接近 Agent 产品价值，因为桌面 Agent
              的核心不是多聊，而是替用户推进任务。
            </p>
          </article>

          <article className="interactive-panel bg-white/90 p-6">
            <div className="flex items-center gap-3">
              <Workflow className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold">Harness 任务链路</h2>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              我在 MetaGPT 实习中把长链路 Agent 任务拆成“解析 - 匹配 - 生成 - 人工确认 - 追踪”。每个节点都要定义输入、
              输出、失败分支、重试机制和人工接管条件，避免把低信任任务直接做成黑箱自动化。
            </p>
          </article>
        </section>

        <section className="mt-10 interactive-panel bg-white/90 p-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-slate-700" />
            <h2 className="text-2xl font-semibold">从内容数据反推用户信号</h2>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="p-3 font-semibold">内容方向</th>
                  <th className="p-3 font-semibold">数据表现</th>
                  <th className="p-3 font-semibold">用户信号</th>
                  <th className="p-3 font-semibold">对 DeepSeek 的启发</th>
                </tr>
              </thead>
              <tbody>
                {signalRows.map((row) => (
                  <tr key={row.topic} className="border-b border-slate-100">
                    <td className="p-3 font-medium text-slate-950">{row.topic}</td>
                    <td className="p-3 text-slate-600">{row.data}</td>
                    <td className="p-3 text-slate-600">{row.signal}</td>
                    <td className="p-3 text-slate-600">{row.implication}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="interactive-panel bg-white/90 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold">早期指标树</h2>
            </div>
            <div className="mt-6 space-y-3">
              {retentionMetrics.map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-[#f8f8f4] px-4 py-3 text-sm leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="interactive-panel bg-white/90 p-6">
            <div className="flex items-center gap-3">
              <GitBranch className="h-5 w-5 text-slate-700" />
              <h2 className="text-2xl font-semibold">最小事件流</h2>
            </div>
            <p className="mt-5 rounded-lg border border-slate-200 bg-[#f8f8f4] p-4 font-mono text-sm leading-7 text-slate-700">
              session_start → task_intent_selected → context_attached → plan_generated → user_confirmed_plan → tool_called →
              tool_failed/tool_succeeded → result_reviewed → result_accepted → task_reopened/reused
            </p>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              关键是把“用户为什么回来”从结果里拆出来：首次任务成功、人工确认增强信任、模板可复用，还是本地上下文接得足够顺。
            </p>
          </article>
        </section>

        <section className="mt-10 interactive-panel bg-white/90 p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            <h2 className="text-2xl font-semibold">竞品痛点与机会</h2>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {competitors.map((item) => (
              <article key={item.name} className="rounded-lg border border-slate-200 bg-[#f8f8f4] p-5">
                <h3 className="text-lg font-semibold text-slate-950">{item.name}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">强项：{item.strength}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">痛点：{item.gap}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">机会：{item.opportunity}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 interactive-panel bg-white/90 p-6">
          <h2 className="text-2xl font-semibold">可落地的首月路线</h2>
          <div className="mt-6 grid gap-3">
            {monthPlan.map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-[#f8f8f4] px-4 py-3 text-sm leading-7 text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-5 rounded-lg bg-slate-950 p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">我希望直接面谈 DeepSeek Harness / Agent 产品方向</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              我可以从用户信号、指标体系、早期反馈闭环和 vibe coding 原型四个方向直接落地。
            </p>
          </div>
          <Link href="mailto:13398580812@163.com" className="lead-button bg-white text-slate-950 hover:bg-slate-100">
            联系 Ian
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </section>
    </main>
  );
}
