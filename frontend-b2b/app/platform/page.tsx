import type { Metadata } from 'next';
import { BellRing, CreditCard, Filter, LineChart, MessageSquareQuote, Send } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { CREDITS_POLICY_CARDS, PRICING_CEILING_NOTE, getPricingPlans } from '../../lib/pricing';

export const metadata: Metadata = {
  title: '平台',
  description: 'LeadPulse 平台页：线索筛选、LP Coin、导出、通知和经营数据的统一工作台。',
};

const stackItems = [
  { title: '公开讨论监听', detail: '看见论坛、评论区、社群和问答里的真实需求。', icon: MessageSquareQuote },
  { title: '意图过滤', detail: '过滤垃圾链接，只保留求推荐、问报价、找服务商的信号。', icon: Filter },
  { title: '积分扣费', detail: '噪声低价扣费，高意向线索按结果扣费。', icon: CreditCard },
];

const modules = [
  { title: '线索池', description: '保留原文链接、上下文、评分和下一步动作。', icon: LineChart },
  { title: '通知', description: '把高意向线索推给飞书、企业微信或销售负责人。', icon: BellRing },
  { title: '导出', description: '余额和权限满足时导出线索，用于私信或 CRM 跟进。', icon: Send },
];

export default function PlatformPage() {
  const pricingPlans = getPricingPlans();

  return (
    <MarketingPageShell
      eyebrow="平台"
      title="把线索、扣费和推进动作收成一个工作台。"
      description="平台价值不在于模块更多，而在于每条高意向线索都有来源、判断、扣费和下一步动作。"
      primaryCta={{ href: '/pricing', label: '查看充值包' }}
      secondaryCta={{ href: '/dashboard/leads', label: '打开线索池' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {stackItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="lead-card p-6">
                <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-extrabold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="lead-card p-6">
                <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-extrabold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.98fr_1.02fr]">
          <section className="lead-card p-6">
            <div className="lead-pill">Pricing</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">三档充值包，同一套扣费逻辑。</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{PRICING_CEILING_NOTE}</p>
            <div className="mt-6 space-y-4">
              {pricingPlans.map((plan) => (
                <article key={plan.id} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">{plan.name}</div>
                      <div className="mt-2 text-2xl font-extrabold text-slate-950">{plan.price}</div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{plan.goodFor}</p>
                    </div>
                    {plan.highlight ? <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">主力包</div> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="lead-card p-6">
            <div className="lead-pill">Credits</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">把复杂规则讲成产品规则。</h2>
            <div className="mt-6 space-y-4">
              {CREDITS_POLICY_CARDS.map((card) => (
                <article key={card.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-extrabold text-slate-950">{card.title}</h3>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-600">{card.description}</div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </MarketingPageShell>
  );
}
