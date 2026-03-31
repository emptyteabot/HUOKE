import Image from 'next/image';
import Link from 'next/link';
import { CreditCard, FileCheck2, ShieldCheck } from 'lucide-react';

import { FunnelStrip } from '../../components/funnel-strip';
import { PaymentIntentForm } from '../../components/payment-intent-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { CREDITS_POLICY, REFERRAL_POLICY, getPlanById } from '../../lib/pricing';

type SearchParams = Promise<{
  plan?: string;
  checkout?: string;
}>;

export default async function PayPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const plan = getPlanById(resolved.plan);
  const isFreePlan = plan.id === 'free';
  const checkoutStatus = String(resolved.checkout || '').trim();
  const paymentProvider = String(process.env.LEADPULSE_PAYMENT_PROVIDER || 'wechat').trim().toLowerCase();
  const usingWechat = paymentProvider !== 'stripe';

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref={isFreePlan ? '/register?plan=free' : '/book'} ctaLabel={isFreePlan ? '先开 Free' : '预约诊断'} />

      <FunnelStrip
        steps={[
          { label: '产品', title: '认识产品', href: '/product' },
          { label: '演示', title: '看它怎么工作', href: '/demo' },
          { label: '开始', title: '进入方案', href: `/pay?plan=${plan.id}`, active: true },
        ]}
      />

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="max-w-4xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Start</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            选择 {plan.name}，开始使用
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            这一步只做一件事：确认方案、付款和开通。
          </p>
        </div>

        {checkoutStatus === 'cancel' ? (
          <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            你刚刚取消了支付。方案和价格都还在，想继续时重新点一次即可。
          </div>
        ) : null}

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="space-y-6">
            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">{plan.name}</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {plan.price}
                    <span className="ml-2 text-base font-medium text-slate-500">{plan.period}</span>
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{plan.goodFor}</p>
                </div>
                {plan.highlight ? (
                  <div className="rounded-full border border-black/10 bg-[#f7f7f2] px-3 py-1 text-xs font-medium text-slate-700">
                    主力方案
                  </div>
                ) : null}
              </div>

              <div className="mt-6 space-y-3">
                {plan.features.slice(0, 3).map((item) => (
                  <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </article>

            {isFreePlan ? (
              <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-slate-700" />
                  <h2 className="text-2xl font-semibold text-slate-950">Free 无需付款</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">先把产品跑起来，再决定是否进入付费方案。</p>
                <div className="mt-6">
                  <Link
                    href={plan.paymentUrl}
                    className="interactive-button inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                  >
                    去开通 Free
                  </Link>
                </div>
              </article>
            ) : usingWechat ? (
              <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-slate-700" />
                  <h2 className="text-2xl font-semibold text-slate-950">微信收款</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  先用微信收款更直接。你扫码付款后提交信息，我们这边确认到账，再开通 LeadPulse 并推进交付。
                </p>

                <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-black/5 bg-[#f8f8f4] p-4">
                  <div className="relative mx-auto aspect-[3/4] max-w-[340px] overflow-hidden rounded-[1.5rem] bg-white">
                    <Image src="/payment/wechat-qr.jpg" alt="LeadPulse 微信支付收款码" fill className="object-contain" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {['1. 微信扫码付款', '2. 提交邮箱、方案和产品链接', '3. 我们确认到账后开通并生成交付包'].map((item) => (
                    <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ) : (
              <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-slate-700" />
                  <h2 className="text-2xl font-semibold text-slate-950">自动支付</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  使用 Stripe 托管支付，支持银行卡自动扣款。支付成功后，LeadPulse 会自动开通并生成启动交付包。
                </p>

                <div className="mt-6 grid gap-3">
                  {['1. 提交邮箱、方案和产品链接', '2. 跳转 Stripe Checkout 完成支付', '3. 支付成功后自动开通并生成交付包'].map((item) => (
                    <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>

          <div className="space-y-6">
            {!isFreePlan ? <PaymentIntentForm defaultPlan={plan.id} paymentProvider={usingWechat ? 'wechat' : 'stripe'} /> : null}

            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-950">补充说明</h2>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {[CREDITS_POLICY[0], REFERRAL_POLICY[0]].map((item) => (
                  <li key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/terms"
                  className="interactive-button inline-flex rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  服务条款
                </Link>
                <Link
                  href="/privacy"
                  className="interactive-button inline-flex rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  隐私说明
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
