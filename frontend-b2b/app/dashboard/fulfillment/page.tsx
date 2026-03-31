import Link from 'next/link';
import { ArrowRight, ExternalLink, FileCheck2, PackageCheck, Sparkles } from 'lucide-react';

import { DashboardShell } from '../../../components/dashboard-shell';
import { readFulfillmentPackages } from '../../../lib/fulfillment';

export const dynamic = 'force-dynamic';

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function FulfillmentDashboardPage() {
  const packages = await readFulfillmentPackages(24);

  return (
    <DashboardShell
      active="fulfillment"
      title="交付包看板"
      description="这里看每一笔自动交付：抓了什么产品、生成了什么结果、给了什么访问码。"
    >
      <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Fulfillment</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">最近自动生成的交付包</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              这不是文案草稿，是付款意向之后系统真实生成的启动结果。
            </p>
          </div>
          <div className="rounded-full border border-black/10 bg-[#f8f8f4] px-4 py-2 text-sm font-semibold text-slate-700">
            共 {packages.length} 个交付包
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-slate-700" />
              <span className="text-sm font-medium text-slate-500">状态</span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {packages.filter((item) => item.status === 'provisioned').length}
            </div>
            <p className="mt-2 text-sm text-slate-600">已 provisioned 的交付包</p>
          </article>
          <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-slate-700" />
              <span className="text-sm font-medium text-slate-500">产品快照</span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {packages.filter((item) => item.snapshot.title || item.snapshot.description).length}
            </div>
            <p className="mt-2 text-sm text-slate-600">已抓到标题或描述</p>
          </article>
          <article className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-5 w-5 text-slate-700" />
              <span className="text-sm font-medium text-slate-500">访问码</span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {packages.filter((item) => item.accessCode).length}
            </div>
            <p className="mt-2 text-sm text-slate-600">已生成 workspace 与访问码</p>
          </article>
        </div>
      </section>

      <div className="mt-8 space-y-4">
        {packages.map((item) => {
          const deliveryHref = `/start?plan=${item.planId}&delivery=${item.id}&company=${encodeURIComponent(item.company)}&email=${encodeURIComponent(item.email)}`;
          return (
            <article
              key={item.id}
              className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
                    {item.planName} · {formatTime(item.createdAt)}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {item.snapshot.title || item.company}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.narrative.oneLiner}</p>
                </div>
                <div className="grid gap-2 text-sm text-slate-700">
                  <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">Workspace：{item.workspaceId}</div>
                  <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">访问码：{item.accessCode}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <p className="text-sm font-medium text-slate-500">产品快照</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {item.snapshot.description || '当前交付包已生成，但目标站点没有可用描述。'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      信号分 {item.signals.score}
                    </div>
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      表单 {item.signals.forms}
                    </div>
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      CTA {item.signals.ctas.length}
                    </div>
                    <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      {item.signals.hasPayment ? '有支付' : '缺支付'}
                    </div>
                  </div>
                  {item.productUrl ? (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950"
                    >
                      打开原产品
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <p className="text-sm font-medium text-slate-500">工作流 / 首轮触达</p>
                  <div className="mt-3 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                    当前节点：{item.workflow.currentNode}
                  </div>
                  <div className="mt-3 space-y-3">
                    {item.workflow.nodes.slice(0, 2).map((node) => (
                      <div key={node.id} className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                        {node.label} · {node.output}
                      </div>
                    ))}
                    {item.outreachAngles.slice(0, 2).map((angle) => (
                      <div key={angle} className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                        {angle}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">可执行计划</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.executionPlan.summary}</p>
                  </div>
                  <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    {item.executionPlan.steps.length} steps
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {item.executionPlan.steps.slice(0, 4).map((step) => (
                    <div key={step.id} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">{step.label}</div>
                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          {step.owner}
                        </div>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{step.surface}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{step.instruction}</p>
                      <p className="mt-2 text-sm text-slate-500">验收：{step.successHint}</p>
                      <div className="mt-3 space-y-2">
                        {step.browserSteps.slice(0, 2).map((browserStep, index) => (
                          <div key={browserStep} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-3 py-2 text-sm text-slate-700">
                            {index + 1}. {browserStep}
                          </div>
                        ))}
                      </div>
                      {step.actionUrl ? (
                        <a
                          href={step.actionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                          {step.actionLabel}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={deliveryHref}
                  className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  打开交付页
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                {item.email ? (
                  <Link
                    href={`/dashboard/tasks?contact=${encodeURIComponent(item.email.toLowerCase())}`}
                    className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                  >
                    打开执行任务
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </DashboardShell>
  );
}
