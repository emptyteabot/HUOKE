import type { Metadata } from 'next';
import { Banknote, Cloud, CreditCard, FileJson2, GitFork, LineChart, MessageSquareQuote, ServerCog } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { CREDITS_POLICY_CARDS, PRICING_CEILING_NOTE, getPricingPlans } from '../../lib/pricing';

export const metadata: Metadata = {
  title: '平台',
  description: 'LeadPulse 平台页：支付、credits、导出、部署、消息和经营数据的统一平台。',
};

const stackItems = [
  { title: '公开站点', detail: '首页、演示、预约、付款和信任页统一输出。', icon: ServerCog },
  { title: '结构化信息', detail: '定价、FAQ、SEO、条款和隐私保持同一口径。', icon: FileJson2 },
  { title: '定价系统', detail: 'Free / Pro / Max 与 credits 逻辑统一。', icon: CreditCard },
];

const modules = [
  { title: 'Credits 引擎', description: '把动作消耗统一折算成 credits。', icon: CreditCard },
  { title: '支付', description: '首笔确认、续费、取消和邀请奖励都在一个口径里。', icon: Banknote },
  { title: '导出与 GitHub', description: '代码和资产可以留在你手里。', icon: GitFork },
  { title: '部署', description: '页面和控制台走同一套部署链路。', icon: Cloud },
  { title: '消息', description: '草稿、发送、退订和发送日志全部统一。', icon: MessageSquareQuote },
  { title: '经营指标', description: '新增、回本、留存和退款统一回到系统里。', icon: LineChart },
];

export default function PlatformPage() {
  const pricingPlans = getPricingPlans();

  return (
    <MarketingPageShell
      eyebrow="平台"
      title="把支付、credits 和执行都收成一个平台"
      description="平台价值不在于模块更多，而在于口径更统一、动作更顺、资产更可复用。"
      primaryCta={{ href: '/pay?plan=pro', label: '看定价与 credits' }}
      secondaryCta={{ href: '/start?plan=pro', label: '打开启动页' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {stackItems.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3 w-fit">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 py-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3 w-fit">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.98fr_1.02fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Pricing</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">三档价格，同一套平台逻辑</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{PRICING_CEILING_NOTE}</p>
            <div className="mt-6 space-y-4">
              {pricingPlans.map((plan) => (
                <article key={plan.id} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{plan.name}</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">{plan.price}</div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{plan.goodFor}</p>
                    </div>
                    {plan.highlight ? (
                      <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">主力方案</div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Credits</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">把复杂规则讲成产品规则</h2>
            <div className="mt-6 space-y-4">
              {CREDITS_POLICY_CARDS.map((card) => (
                <article key={card.title} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                  <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                    {card.description}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </MarketingPageShell>
  );
}
