import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { getCreditPackages } from '../../lib/pricing';

export const metadata: Metadata = {
  title: '方案与定价',
  description: '先确认 LeadPulse 的线索质量，再决定是否充值放量。',
};

const planFeatures: Record<string, string[]> = {
  trial: ['查看真实线索样本', '看到来源和上下文', '判断客户是否真的有需求', '不用先付款'],
  icebreaker: ['小额验证一个方向', '适合创始人亲自试跑', '看清意图质量和平台来源', '到账后自动发放'],
  standard: ['持续接收高意向线索', '购买信号 AI 标签', '来源和上下文完整保留', '可直接推进销售跟进'],
  enterprise: ['适合高频筛选', '多渠道线索池', '配合销售团队持续回收', '余额充足时稳定放量'],
};

const chooseCards = [
  {
    title: '不确定行不行？',
    dot: 'bg-slate-300',
    detail: '直接先用免费体验额度。如果你卖的东西比较冷门，或者不知道客户平时在哪讨论，先看样本最稳妥。',
  },
  {
    title: '团队有执行力？',
    dot: 'bg-blue-500',
    detail: '选标准包。每天花 10 分钟看新样本和高意向线索，确认方向后直接推进销售跟进。',
  },
  {
    title: '只要现成结果？',
    dot: 'bg-slate-800',
    detail: '选企业包。你提要求，我们把规则、过滤、复核和交付边界整理清楚，再稳定放量。',
  },
];

const roiMetrics = [
  {
    value: '70%',
    label: '垃圾询盘拦截率',
  },
  {
    value: '100%',
    label: '结构化 Excel 交付',
  },
  {
    value: 'Qualified Meeting',
    label: '只为能直接写入日历的合格会议付费',
  },
];

export default function PricingPage() {
  const packages = getCreditPackages();

  return (
    <MarketingPageShell
      eyebrow="方案与定价"
      title={
        <>
          先确认线索质量，
          <br />
          <span className="text-gradient">再决定投入。</span>
        </>
      }
      description="从免费样本开始，判断公开平台线索是否适合你的业务。确认有效后，再选择小额试跑、标准放量，或让我们先代跑一轮。"
      typeLine="70% 垃圾询盘拦截率 · 100% 结构化 Excel 交付 · 只为能直接写入日历的 Qualified Meeting 付费。"
      primaryCta={{ href: '/book', label: '申请免费样本' }}
      secondaryCta={{ href: '/pay?package=standard', label: '直接充值' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="lead-glass rounded-[24px] p-5">
          <div className="grid gap-3 md:grid-cols-3">
            {roiMetrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-slate-200 bg-white/80 px-5 py-5 text-center">
                <div className="text-2xl font-extrabold tracking-tight text-slate-950">{metric.value}</div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-600">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((item) => {
            const isFeatured = item.id === 'standard';
            return (
              <article
                key={item.id}
                className={
                  isFeatured
                    ? 'relative flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/20'
                    : 'lead-glass flex h-full flex-col rounded-[24px] p-7'
                }
              >
                {isFeatured ? (
                  <>
                    <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/20 blur-[70px]" />
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-lg bg-blue-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                      推荐
                    </div>
                  </>
                ) : null}

                <div className="relative z-10 mt-2">
                  <h2 className={isFeatured ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-950'}>{item.name}</h2>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className={isFeatured ? 'text-5xl font-extrabold text-white' : 'text-4xl font-extrabold text-slate-950'}>
                      ￥{item.priceCny}
                    </span>
                    <span className={isFeatured ? 'text-sm font-medium text-blue-200' : 'text-sm font-medium text-slate-500'}>
                      {item.requiresPayment ? ' / 包' : ' / 体验'}
                    </span>
                  </div>
                  <p className={isFeatured ? 'mt-4 text-sm font-light leading-7 text-slate-300' : 'mt-4 text-sm font-light leading-7 text-slate-500'}>
                    适合：{item.bestFor}
                  </p>
                </div>

                <ul className="relative z-10 mt-7 flex-1 space-y-4">
                  {(planFeatures[item.id] || []).map((feature) => (
                    <li key={feature} className={isFeatured ? 'flex items-start gap-3 text-sm text-slate-200' : 'flex items-start gap-3 text-sm text-slate-700'}>
                      <CheckCircle2 className={isFeatured ? 'mt-0.5 h-5 w-5 shrink-0 text-blue-400' : 'mt-0.5 h-5 w-5 shrink-0 text-slate-300'} />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={item.paymentUrl}
                  className={
                    isFeatured
                      ? 'relative z-10 mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 font-semibold text-slate-950 transition hover:bg-blue-50'
                      : 'mt-8 inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 transition hover:bg-slate-50'
                  }
                >
                  {item.id === 'trial' ? '申请免费样本' : item.ctaLabel}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t border-slate-200/60 px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-slate-950">怎么选？</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {chooseCards.map((card) => (
            <article key={card.title}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <span className={`h-1.5 w-1.5 rounded-full ${card.dot}`} />
                {card.title}
              </h3>
              <p className="text-sm font-light leading-7 text-slate-500">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
