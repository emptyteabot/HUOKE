import type { Metadata } from 'next';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '常见问题',
  description: '关于样本、软件版、代跑版，以及适不适合现在开始的几个常见问题。',
};

const questions = [
  {
    q: 'LeadPulse 到底是做什么的？',
    a: '简单说，就是先帮你从公开平台里找出更值得联系的人，而不是先让你买一堆复杂工具。',
  },
  {
    q: '免费样本会给我什么？',
    a: '会先给你一小批真实样本，让你判断方向是不是对的。方向不对，就没必要继续付费。',
  },
  {
    q: '软件版和代跑版有什么区别？',
    a: '软件版更适合你自己动手；代跑版更适合你先想拿一轮整理好的结果。',
  },
  {
    q: '为什么价格没有做得很复杂？',
    a: '因为现在最重要的不是套餐设计，而是先验证有没有人愿意为结果付钱。',
  },
  {
    q: '我适不适合现在开始？',
    a: '如果你现在就想找客户，适合；如果你还在想做什么产品、卖什么服务，那通常还太早。',
  },
  {
    q: '先聊 15 分钟有必要吗？',
    a: '如果你已经很清楚自己要什么，直接拿样本也行；如果你现在很乱，先聊一下会更省时间。',
  },
];

export default function FaqPage() {
  return (
    <MarketingPageShell
      eyebrow="常见问题"
      title="先把几个最现实的问题说清楚"
      description="公开页不再讲一堆术语，只回答你现在最关心的几件事。"
      typeLine="样本、价格、适不适合，现在一次说清楚。"
      primaryCta={{ href: '/register?plan=free', label: '免费拿样本' }}
      secondaryCta={{ href: '/book', label: '先聊 15 分钟' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-2">
          {questions.map((item) => (
            <article
              key={item.q}
              className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
            >
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{item.q}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
