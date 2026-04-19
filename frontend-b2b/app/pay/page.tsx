import Image from 'next/image';
import Link from 'next/link';
import { CreditCard, FileCheck2, ShieldCheck, Ticket } from 'lucide-react';

import { FunnelStrip } from '../../components/funnel-strip';
import { RedeemCodeForm } from '../../components/redeem-code-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { CREDITS_POLICY, REFERRAL_POLICY, getPlanById } from '../../lib/pricing';

type SearchParams = Promise<{
  plan?: string;
  redeem?: string;
}>;

const fragmentedStack = [
  {
    title: '监听工具',
    detail: '知道哪里有人提到你，但不会替你交付可触达名单。',
  },
  {
    title: 'DM 自动化',
    detail: '能把评论转成私信，但不负责先筛掉同行、机构号和低价值样本。',
  },
  {
    title: '外呼工具',
    detail: '擅长发序列，但前提是你已经手里有一批值得联系的人。',
  },
  {
    title: '人工表格',
    detail: '最后还是得你自己记谁能联系、谁已导出、谁值得跟进。',
  },
];

const winReasons = [
  '你买到的不是一套宏大系统，而是一条更短的获客路径。',
  '先证明能抓到人，再决定自己跑，还是直接买人工代跑结果。',
  '付款页只解释开通边界，不再假装复杂系统会自动替你成交。',
];

const faqRows = [
  {
    q: '为什么这比单买一个监听工具更值？',
    a: '因为单独监听只会告诉你“哪里有人提到你”，但不会先筛掉噪声，更不会交付可直接触达的名单。LeadPulse 卖的是名单，不是提醒。',
  },
  {
    q: '为什么不直接用评论机器人或私信工具？',
    a: '评论/私信工具擅长自动回复，但不会先帮你筛掉同行、机构号和低价值噪声。LeadPulse 先筛，再导出，再决定由你自跑还是由我们代跑。',
  },
  {
    q: 'Pro 和 Max / DFY 的区别到底是什么？',
    a: 'Pro 交付软件使用权和基础控制台，你自己跑；Max / DFY 交付人工代跑、名单清洗和首轮破冰动作。',
  },
];

export default async function PayPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const plan = getPlanById(resolved.plan);
  const isFreePlan = plan.id === 'free';
  const redeemStatus = String(resolved.redeem || '').trim();
  const planHighlights =
    plan.id === 'max'
      ? ['人工系统代跑', '人工清洗去重后的精准名单', '代发首轮破冰私信 / 邮件']
      : plan.id === 'free'
        ? ['展示 5-10 条真实样本', '适合先验证抓取能力', '不开放完整控制台']
        : ['150 credits / 月', '交付 Leads / Messages / Tasks 基础控制台', '客户自行承担平台风控与发送动作'];

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref={isFreePlan ? '/register?plan=free' : '/redeem'} ctaLabel={isFreePlan ? '先开 Free' : '去兑换开通'} />

      <FunnelStrip
        steps={[
          { label: '产品', title: '认识产品', href: '/product' },
          { label: '付款', title: '付款拿码', href: `/pay?plan=${plan.id}`, active: true },
          { label: '兑换', title: '兑换开通', href: '/redeem' },
        ]}
      />

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="max-w-4xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Start</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">先确认你买的是软件，还是结果</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            付款页只负责把边界说清楚。Free 看样本，Pro 买软件使用权，Max / DFY 买人工代跑结果。别再把三种东西混成一个模糊套餐。
          </p>
        </div>

        {redeemStatus === 'pending' ? (
          <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            兑换码还没发出。先完成付款，再回到这个页面兑换开通。
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
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {plan.id === 'max'
                      ? '你买到的是一轮人工代跑结果，而不是一堆自己还得拼起来的工具。'
                      : isFreePlan
                        ? '你拿到的是一轮小规模真实样本，不是试用幻觉。'
                        : `你买到的是 ${plan.name} 软件版开通权限，而不是人工代跑承诺。`}
                  </p>
                </div>
                {plan.highlight ? (
                  <div className="rounded-full border border-black/10 bg-[#f7f7f2] px-3 py-1 text-xs font-medium text-slate-700">
                    主力方案
                  </div>
                ) : null}
              </div>

              <div className="mt-6 space-y-3">
                {planHighlights.map((item) => (
                  <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">你不是在买一层工具</h2>
              </div>
              <div className="mt-5 space-y-3">
                {winReasons.map((item) => (
                  <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm leading-7 text-slate-700">
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
                <p className="mt-4 text-sm leading-7 text-slate-600">先看真实样本，确认系统确实能抓到你想要的人，再决定要不要买软件版或 DFY。</p>
                <div className="mt-6">
                  <Link
                    href={plan.paymentUrl}
                    className="interactive-button inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                  >
                    去开通 Free
                  </Link>
                </div>
              </article>
            ) : (
              <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-slate-700" />
                  <h2 className="text-2xl font-semibold text-slate-950">{plan.id === 'max' ? '先付款，再确认代跑周期' : '先付款，再开通软件版'}</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {plan.id === 'max'
                    ? '付款只解决一件事：确认你要我们人工代跑这轮名单。付款后会进入人工确认与交付排期。'
                    : '付款只解决一件事：让你拿到软件版开通权限。没有开通，就不会伪装成“已经成交”。'}
                </p>

                <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-black/5 bg-[#f8f8f4] p-4">
                  <div className="relative mx-auto aspect-square max-w-[340px] overflow-hidden rounded-[1.5rem] bg-white">
                    <Image src="/payment/wechat-qr.jpg" alt="LeadPulse 微信支付收款码" fill className="object-contain" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {[
                    plan.id === 'max' ? '1. 微信扫码付款' : '1. 微信扫码付款',
                    plan.id === 'max' ? '2. 联系我们确认本轮 DFY 目标与交付周期' : '2. 联系发码方领取开通码',
                    plan.id === 'max' ? '3. 进入人工代跑与交付排期' : '3. 回到站内输入兑换码开通',
                  ].map((item) => (
                    <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            )}

            {!isFreePlan ? (
              <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-3">
                  <Ticket className="h-5 w-5 text-slate-700" />
                  <h2 className="text-xl font-semibold text-slate-950">发码规则</h2>
                </div>
                <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                  <div className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    软件版一笔付款对应一次开通；DFY 则对应一次人工服务周期和交付排期。
                  </div>
                  <div className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    如果你要续期或升级，不是等系统乱扣费，而是重新购买下一周期或重新确认一轮代跑。
                  </div>
                  <div className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    这样订单、开通和人工交付边界分得清，不会再把“付款意向”伪装成“已经开通或已经交付”。
                  </div>
                </div>
              </article>
            ) : null}
          </div>

          <div className="space-y-6">
            {!isFreePlan ? <RedeemCodeForm /> : null}

            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-950">为什么比拼栈更划算</h2>
              </div>
              <div className="mt-5 space-y-3">
                {fragmentedStack.map((item) => (
                  <div key={item.title} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                你当然可以继续买监听、评论自动化、外呼、表格四套系统，但最后还是要自己把名单和动作拼起来。
                LeadPulse 的价值不是某一个点更炫，而是先把高意图名单交到你手里。
              </div>
            </article>

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
                  href="/redeem"
                  className="interactive-button inline-flex rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  去兑换页
                </Link>
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

            <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-950">购买前常见问题</h2>
              </div>
              <div className="mt-5 space-y-3">
                {faqRows.map((item) => (
                  <div key={item.q} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
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
