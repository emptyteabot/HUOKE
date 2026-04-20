import Image from 'next/image';
import Link from 'next/link';
import { CreditCard, FileCheck2, ShieldCheck } from 'lucide-react';

import { FunnelStrip } from '../../components/funnel-strip';
import { RedeemCodeForm } from '../../components/redeem-code-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { CREDITS_POLICY, REFERRAL_POLICY, getPlanById } from '../../lib/pricing';

type SearchParams = Promise<{
  plan?: string;
  redeem?: string;
}>;

const compareRows = [
  {
    title: '自己去翻评论区',
    detail: '很花时间，而且最后拿到的东西通常很乱。',
  },
  {
    title: '直接买一堆工具',
    detail: '工具越多，反而越容易卡在不会用和懒得用。',
  },
  {
    title: '先看样本再决定',
    detail: '先看一轮是否靠谱，再决定要不要继续花钱，这更适合现在这个阶段。',
  },
];

const faqRows = [
  {
    q: '软件版适合谁？',
    a: '适合愿意自己动手筛名单、导名单、自己联系的人。',
  },
  {
    q: '代跑版适合谁？',
    a: '适合先想拿一轮整理好的结果，不想自己折腾的人。',
  },
  {
    q: '为什么现在价格做得比较轻？',
    a: '因为现在更重要的是先验证这件事有没有价值，而不是把套餐做得很重。',
  },
];

export default async function PayPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const plan = getPlanById(resolved.plan);
  const isFreePlan = plan.id === 'free';
  const redeemStatus = String(resolved.redeem || '').trim();
  const highlights =
    plan.id === 'max'
      ? ['我们先帮你跑一轮', '给你一版整理好的名单', '附首轮沟通建议']
      : isFreePlan
        ? ['先看一小批真实样本', '适合先判断方向', '不需要先付款']
        : ['适合自己动手', '可以自己筛和导出名单', '先低成本试一轮'];

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref={isFreePlan ? '/register?plan=free' : '/pricing'} ctaLabel={isFreePlan ? '先看样本' : '看收费方式'} />

      <FunnelStrip
        steps={[
          { label: '第一步', title: '看清产品', href: '/product' },
          { label: '第二步', title: '确认方案', href: `/pay?plan=${plan.id}`, active: true },
          { label: '第三步', title: '开通或安排', href: isFreePlan ? '/register?plan=free' : plan.id === 'max' ? '/book?plan=max' : '/redeem' },
        ]}
      />

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="max-w-4xl">
          <p className="font-mono text-[11px] tracking-[0.28em] text-slate-500">确认方案</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">先从小一点的决定开始</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            这页只做一件事：帮你确认现在是先看样本、自己试一轮，还是直接交给我们先跑一轮。
          </p>
        </div>

        {redeemStatus === 'pending' ? (
          <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            我们还没把开通码发给你。你付完款后，回到这里继续开通即可。
          </div>
        ) : null}

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="space-y-6">
            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div>
                <div className="text-sm font-semibold text-slate-950">{plan.name}</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  {plan.price}
                  <span className="ml-2 text-base font-medium text-slate-500">{plan.period}</span>
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{plan.goodFor}</p>
              </div>

              <div className="mt-6 space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </article>

            {isFreePlan ? (
              <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-slate-700" />
                  <h2 className="text-2xl font-semibold text-slate-950">免费样本不需要付款</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">先看一小批样本，觉得对，再继续；觉得不对，就到这里结束。</p>
                <div className="mt-6">
                  <Link
                    href={plan.paymentUrl}
                    className="interactive-button inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                  >
                    直接看样本
                  </Link>
                </div>
              </article>
            ) : (
              <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-slate-700" />
                  <h2 className="text-2xl font-semibold text-slate-950">{plan.id === 'max' ? '付款后安排首轮代跑' : '付款后开通软件版'}</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {plan.id === 'max'
                    ? '付款后我们会联系你，确认这一轮代跑的目标和交付时间。'
                    : '付款后会给你发开通码，你再回到站内完成开通。'}
                </p>

                <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-black/5 bg-[#f8f8f4] p-4">
                  <div className="relative mx-auto aspect-square max-w-[340px] overflow-hidden rounded-[1.5rem] bg-white">
                    <Image src="/payment/wechat-qr.jpg" alt="LeadPulse 微信收款码" fill className="object-contain" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {(plan.id === 'max'
                    ? ['1. 微信扫码付款', '2. 我们联系你确认本轮目标', '3. 安排首轮代跑']
                    : ['1. 微信扫码付款', '2. 收到开通码', '3. 回站内完成开通']
                  ).map((item) => (
                    <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>

          <div className="space-y-6">
            {!isFreePlan && plan.id !== 'max' ? <RedeemCodeForm /> : null}

            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-950">为什么很多人会先这样试</h2>
              </div>
              <div className="mt-5 space-y-3">
                {compareRows.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-950">补充说明</h2>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {[CREDITS_POLICY[0], REFERRAL_POLICY[0]].map((item) => (
                  <li key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-950">购买前常见问题</h2>
              </div>
              <div className="mt-5 space-y-3">
                {faqRows.map((item) => (
                  <div key={item.q} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-950">{item.q}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{item.a}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
