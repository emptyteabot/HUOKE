import type { Metadata } from 'next';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '常见问题',
  description: '关于 LeadPulse 高意向线索、LP Coin、免费体验额度和自动充值到账的常见问题。',
};

const questions = [
  {
    q: 'LeadPulse 到底卖什么？',
    a: '卖高意向线索提取能力，不卖表单套件，也不卖软件月费。系统从公开讨论里识别采购意图，再把结构化结果送到你的线索池。',
  },
  {
    q: '为什么用 LP Coin？',
    a: '国内 B 端不喜欢软件订阅，但愿意为确定性线索付费。LP Coin 让每一次噪声拦截、高优线索提取和退款都能被记账。',
  },
  {
    q: '免费体验额度是什么？',
    a: '新用户默认获得 60 LP Coin，并保留 3 次免费导出。目的不是薅羊毛，而是先让你看到系统筛出来的结果是否值得继续投钱。',
  },
  {
    q: '怎么扣费？',
    a: '噪声线索扣 1 LP Coin，高优线索扣 50 LP Coin。如果高优线索因为误判被确认为无效，可以退回 50 LP Coin。',
  },
  {
    q: '支付成功后什么时候到账？',
    a: '只看服务端异步通知。浏览器跳回页面只展示状态，不作为发货凭证。',
  },
  {
    q: '为什么没有一堆行业套件？',
    a: 'LeadPulse 只保留精准获客闭环：动态对话测算预算、预算达标、获取日历空闲、锁定发现电话。其他泛行业能力都会稀释产品。',
  },
];

export default function FaqPage() {
  return (
    <MarketingPageShell
      eyebrow="常见问题"
      title="只回答和线索、扣费、到账有关的问题。"
      description="LeadPulse 现在只有一条商业闭环。这里不解释泛表单、套件库或无关工具。"
      typeLine="先验证结果，再充值放量。"
      primaryCta={{ href: '/pricing', label: '查看充值包' }}
      secondaryCta={{ href: '/dashboard/billing', label: '查看余额' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-2">
          {questions.map((item) => (
            <article key={item.q} className="lead-card p-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">{item.q}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
