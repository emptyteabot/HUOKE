import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, Sparkles } from 'lucide-react';

import { CopyTextButton } from '../../components/copy-text-button';
import {
  getFulfillmentPackage,
  getFulfillmentPackageByAccessCode,
  getFulfillmentPackageBySourceId,
} from '../../lib/fulfillment';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { buildOnboardingIntakeTemplate, getOnboardingTrack } from '../../lib/onboarding';

type SearchParams = Promise<{
  plan?: string;
  company?: string;
  email?: string;
  delivery?: string;
  sourceId?: string;
  code?: string;
  checkout?: string;
  redeem?: string;
}>;

export const dynamic = 'force-dynamic';

export default async function StartPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const company = String(resolved.company || '').trim();
  const email = String(resolved.email || '').trim();
  const launchCode = String(resolved.code || '').trim().toUpperCase();
  const track = getOnboardingTrack(resolved.plan);
  const deliveryPackage =
    (await getFulfillmentPackage(String(resolved.delivery || ''))) ||
    (await getFulfillmentPackageBySourceId(String(resolved.sourceId || ''))) ||
    (await getFulfillmentPackageByAccessCode(launchCode));
  const intakeTemplate = buildOnboardingIntakeTemplate({
    plan: resolved.plan,
    company,
    email,
  });
  const checkoutSuccess = String(resolved.checkout || '').trim() === 'success';
  const redeemSuccess = String(resolved.redeem || '').trim() === 'success';

  return (
    <main className="min-h-screen bg-[#f5f5ef] text-slate-900">
      <SiteHeader ctaHref="/book" ctaLabel="预约 onboarding" />

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-4xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Start</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            {track.planName} 启动页：付款后怎么在 24 小时内开始产生价值
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            这不是欢迎页，而是交付页。目标只有一个：让你尽快把上线、支付、实验页、触达和首周复盘接起来。
          </p>
        </div>

        {redeemSuccess && deliveryPackage ? (
          <div className="mt-8 rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            兑换码已经验证成功，交付包也已经生成。现在别继续猜流程，直接按下面的启动动作往前推。
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-slate-700" />
              <p className="text-sm font-medium text-slate-500">主目标</p>
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-950">{track.primaryOutcome}</p>
          </article>
          <article className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-slate-700" />
              <p className="text-sm font-medium text-slate-500">见效时间</p>
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-950">{track.timeToValue}</p>
          </article>
          <article className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-5 w-5 text-slate-700" />
              <p className="text-sm font-medium text-slate-500">当前信息</p>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>方案：{track.planName}</p>
              <p>公司：{company || '待填写'}</p>
              <p>邮箱：{email || '待填写'}</p>
            </div>
          </article>
        </div>

        {checkoutSuccess && !deliveryPackage ? (
          <div className="mt-8 rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            支付已经成功返回，系统正在自动开通并生成交付包。通常几秒内完成；如果还没显示，刷新一次这个页面。
          </div>
        ) : null}

        {launchCode && !deliveryPackage ? (
          <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            没找到这个启动码对应的交付包。确认你拿到的是最新启动码；如果是刚付款后新发的码，稍等片刻再刷新。
          </div>
        ) : null}

        {deliveryPackage ? (
          <section className="mt-10 rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Auto delivery</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">系统已经自动生成首批交付包</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{deliveryPackage.narrative.oneLiner}</p>
              </div>
              <div className="grid min-w-[260px] gap-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                  Workspace：{deliveryPackage.workspaceId}
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                  访问码：{deliveryPackage.accessCode}
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                  状态：{deliveryPackage.status}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <p className="text-sm font-medium text-slate-500">产品快照</p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">
                  {deliveryPackage.snapshot.title || deliveryPackage.company}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {deliveryPackage.snapshot.description || '系统已记录产品链接，并按当前站点内容生成首批获客交付动作。'}
                </p>
                {deliveryPackage.productUrl ? (
                  <p className="mt-3 text-sm text-slate-500">链接：{deliveryPackage.productUrl}</p>
                ) : null}
              </article>

              <article className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <p className="text-sm font-medium text-slate-500">系统判断</p>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
                  <p>{deliveryPackage.narrative.whoFor}</p>
                  <p>{deliveryPackage.narrative.whyNow}</p>
                </div>
              </article>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <p className="text-sm font-medium text-slate-500">网页信号</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                    信号分：{deliveryPackage.signals.score}
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                    页面语言：{deliveryPackage.signals.language || '未识别'}
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                    表单数：{deliveryPackage.signals.forms}
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                    CTA 数：{deliveryPackage.signals.ctas.length}
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                    预约入口：{deliveryPackage.signals.hasBooking ? '已识别' : '未识别'}
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                    支付入口：{deliveryPackage.signals.hasPayment ? '已识别' : '未识别'}
                  </div>
                </div>
                {deliveryPackage.signals.headings.length ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-slate-500">主标题 / 次标题</p>
                    {[deliveryPackage.signals.headline, ...deliveryPackage.signals.headings]
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((item) => (
                        <div key={item} className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                  </div>
                ) : null}
              </article>

              <article className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <p className="text-sm font-medium text-slate-500">工作流轨迹</p>
                <div className="mt-4 space-y-3">
                  {deliveryPackage.workflow.nodes.map((node, index) => (
                    <div key={node.id} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">
                          {index + 1}. {node.label}
                        </div>
                        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          {node.status}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{node.detail}</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">输出：{node.output}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <p className="text-sm font-medium text-slate-500">交付内容</p>
                <div className="mt-4 space-y-3">
                  {deliveryPackage.deliveryItems.map((item) => (
                    <div key={item} className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <p className="text-sm font-medium text-slate-500">第一批动作</p>
                <div className="mt-4 space-y-3">
                  {deliveryPackage.firstActions.map((item) => (
                    <div key={item} className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                <p className="text-sm font-medium text-slate-500">首轮触达角度</p>
                <div className="mt-4 space-y-3">
                  {deliveryPackage.outreachAngles.map((item) => (
                    <div key={item} className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-6 rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">可执行计划</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{deliveryPackage.executionPlan.summary}</p>
                </div>
                <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  {deliveryPackage.executionPlan.steps.length} steps ready
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {deliveryPackage.executionPlan.steps.map((step, index) => (
                  <div key={step.id} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-950">
                        {index + 1}. {step.label}
                      </div>
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        {step.owner}
                      </div>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{step.surface}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{step.instruction}</p>
                    <p className="mt-2 text-sm text-slate-500">结果：{step.expectedResult}</p>
                    <p className="mt-2 text-sm text-slate-500">验收：{step.successHint}</p>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">操作顺序</p>
                      {step.browserSteps.map((browserStep, browserIndex) => (
                        <div key={browserStep} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-3 py-2 text-sm text-slate-700">
                          {browserIndex + 1}. {browserStep}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">验收清单</p>
                      {step.verifyChecks.map((check) => (
                        <div key={check} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-3 py-2 text-sm text-slate-700">
                          {check}
                        </div>
                      ))}
                    </div>
                    {step.actionUrl ? (
                      <a
                        href={step.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center rounded-2xl border border-black/10 bg-[#f8f8f4] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-black/15 hover:bg-white"
                      >
                        {step.actionLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">接下来 24 小时</h2>
              </div>
              <div className="mt-6 space-y-4">
                {track.first24Hours.map((item, index) => (
                  <div key={item} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                    <div className="text-sm font-medium text-slate-500">Step {index + 1}</div>
                    <p className="mt-2 text-base leading-7 text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">你要准备的输入</h2>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {track.founderInputs.map((item) => (
                  <article key={item.title} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                    <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">这个方案会交付什么</h2>
              </div>
              <div className="mt-6 space-y-3">
                {track.deliverables.map((item) => (
                  <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">首周里程碑</h2>
              </div>
              <div className="mt-6 space-y-3">
                {track.weekOneMilestones.map((item) => (
                  <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm leading-7 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Intake template</p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">把这些信息一次发齐</h2>
                </div>
                <CopyTextButton value={intakeTemplate} label="复制模板" />
              </div>
              <pre className="mt-6 overflow-x-auto rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-700">
                {intakeTemplate}
              </pre>
            </section>

            <section className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Done means done</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">什么叫真正启动成功</h2>
              <div className="mt-6 space-y-3">
                {track.successChecks.map((item) => (
                  <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm leading-7 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  预约 15 分钟 onboarding
                </Link>
                <Link
                  href="/product"
                  className="inline-flex items-center rounded-2xl border border-black/10 bg-[#f8f8f4] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/15 hover:bg-white"
                >
                  看产品详情
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
