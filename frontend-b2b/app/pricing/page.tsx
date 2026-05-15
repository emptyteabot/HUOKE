import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ShieldCheck } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';
import { CREDITS_POLICY_CARDS, PRICING_CEILING_NOTE, TARGET_AUDIENCE_ONE_LINER, getCreditPackages } from '../../lib/pricing';

export const metadata: Metadata = {
  title: 'LP Coin 充值包',
  description: 'LeadPulse 采用预充值积分制，按线索过滤结果扣费，不做自动续费订阅。',
};

export default function PricingPage() {
  const packages = getCreditPackages();

  return (
    <MarketingPageShell
      eyebrow="LP Coin 充值包"
      title="不卖月费，只卖能被扣账验证的线索结果。"
      description="国内 B 端不缺工具账号，缺的是确定性线索。LeadPulse 采用先充值、后调用、按结果扣费。"
      typeLine="免费体验先跑通；充值包用于持续提取高意向商机。"
      primaryCta={{ href: '/pay?package=standard', label: '充值 LP Coin' }}
      secondaryCta={{ href: '/dashboard/billing', label: '查看余额' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {packages.map((item) => (
            <article key={item.id} className={item.highlight ? 'lead-card border-slate-950 bg-white p-6' : 'lead-card p-6'}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-950">{item.name}</div>
                  <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">￥{item.priceCny}</h2>
                  <div className="mt-1 text-sm font-semibold text-slate-500">{item.credits} LP Coin</div>
                </div>
                {item.highlight ? <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">推荐</span> : null}
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>

              <div className="mt-6 space-y-3">
                {[item.bestFor, `赠送 ${item.bonusCredits} LP Coin`, item.requiresPayment ? '到账后自动发放' : '新账户自动发放'].map(
                  (feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ),
                )}
              </div>

              <Link href={item.paymentUrl} className="lead-button lead-button-secondary mt-6 w-full text-sm">
                {item.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="lead-card p-6">
            <div className="text-sm font-extrabold text-slate-950">为什么这样定价</div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{TARGET_AUDIENCE_ONE_LINER}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{PRICING_CEILING_NOTE}</p>
            <div className="mt-6 grid gap-3">
              {['噪声拦截费：-1 LP Coin / 条', '高优线索提取费：-50 LP Coin / 条', '对赌失败免单：无效高优线索退回 50 LP Coin'].map(
                (row) => (
                  <div key={row} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold leading-7 text-slate-700">
                    {row}
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="lead-card p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-slate-800" />
              <div className="text-sm font-extrabold text-slate-950">计费规则</div>
            </div>

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
