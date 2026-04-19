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
    detail: '知道哪里有人提到你，但不会替你判断谁值得推进。',
  },
  {
    title: 'DM 自动化',
    detail: '能把评论转成私信，但不负责筛掉同行和噪声。',
  },
  {
    title: '外呼工具',
    detail: '擅长发序列，但前提是你已经手里有一批好名单。',
  },
  {
    title: '工作流/表格',
    detail: '最后还得你自己记 booking、payment 和 start 的状态。',
  },
];

const winReasons = [
  '不是买一个监听工具，而是买一条从意图到付款的路径。',
  '不是导出完就结束，而是继续推进 booking、payment 和 start。',
  '不是把客户丢进后台，而是让公开流量先看懂价值，再进入开通动作。',
];

const faqRows = [
  {
    q: '为什么这比单买一个监听工具更值？',
    a: '因为单独监听只会告诉你“哪里有人提到你”，但不会替你把这批人推进到导出、消息、预约和付款。LeadPulse 把这些动作接在一起。',
  },
  {
    q: '为什么不直接用评论机器人或私信工具？',
    a: '评论/私信工具擅长自动回复，但不会先帮你筛掉同行、机构号和低价值噪声。LeadPulse 先筛，再导出，再推进。',
  },
  {
    q: '为什么我还需要外呼/销售工具吗？',
    a: '如果你团队很大，后面可以继续叠。但对大多数小团队来说，LeadPulse 先把最短成交路径跑顺，比先堆更多系统更重要。',
  },
];

export default async function PayPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const plan = getPlanById(resolved.plan);
  const isFreePlan = plan.id === 'free';
  const redeemStatus = String(resolved.redeem || '').trim();
  const planHighlights =
    plan.id === 'max'
      ? ['300 credits / 月', '更高吞吐、更多自动化动作与协作空间', '续期时重新购买下一枚兑换码']
      : plan.id === 'free'
        ? ['20 credits / 月', '适合先验证产品闭环', '不自动续费，不支持 rollover']
        : ['150 credits / 月', '付款后发兑换码，再用兑换码开通', '续期时重新购买下一枚兑换码'];

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
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            先买 {plan.name} 兑换码，再开通
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            这里不再假装自动收款。LeadPulse 的正确顺序是：先付款拿到兑换码，再回站内兑换，系统才会生成启动交付包。
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
                    你买到的不是“自动订阅幻觉”，而是一枚可以真正兑换开通的 {plan.name} 兑换码。
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
                <p className="mt-4 text-sm leading-7 text-slate-600">先把产品跑起来，再决定要不要升级到付费方案。</p>
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
                  <h2 className="text-2xl font-semibold text-slate-950">先付款，再拿兑换码</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  付款只解决一件事：让你拿到一枚有效兑换码。没有兑换码，就不会开通，也不会伪装成“已成交”。
                </p>

                <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-black/5 bg-[#f8f8f4] p-4">
                  <div className="relative mx-auto aspect-square max-w-[340px] overflow-hidden rounded-[1.5rem] bg-white">
                    <Image src="/payment/wechat-qr.jpg" alt="LeadPulse 微信支付收款码" fill className="object-contain" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {[
                    '1. 微信扫码付款',
                    '2. 联系发码方领取兑换码',
                    '3. 回到站内输入兑换码开通',
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
                    一笔付款对应一枚兑换码；兑换码验证成功后才生成交付包。
                  </div>
                  <div className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    如果你要续期或升级，不是等系统乱扣费，而是重新购买下一枚码。
                  </div>
                  <div className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    这样订单、发码、开通三件事分得清，不会再把“付款意向”伪装成“已经开通”。
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
                你当然可以继续买监听、评论自动化、外呼、工作流四套系统，但最后还是要自己把状态拼起来。
                LeadPulse 的价值不是某一个点更炫，而是把这些点串成一条更短的成交路径。
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
