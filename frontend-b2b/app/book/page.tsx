import Link from 'next/link';
import { CheckCircle2, Clock3, MessageSquareQuote } from 'lucide-react';

import { BookingRequestForm } from '../../components/booking-request-form';
import { FunnelStrip } from '../../components/funnel-strip';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

const agenda = ['看你现在适不适合做这件事', '先拿样本还是直接代跑', '如果继续做，第一轮怎么开始'];

const prepItems = ['一句话说清你卖什么', '最近最想找到哪类客户', '你现在主要靠什么方式获客'];

export default function BookPage() {
  return (
    <main className="min-h-screen bg-[#f5f5ef] text-slate-900">
      <SiteHeader ctaHref="/pricing" ctaLabel="看收费方式" />

      <FunnelStrip
        steps={[
          { label: '第一步', title: '了解产品', href: '/product' },
          { label: '第二步', title: '先聊一聊', href: '/book', active: true },
          { label: '第三步', title: '再决定', href: '/pricing' },
        ]}
      />

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] tracking-[0.28em] text-slate-500">免费沟通</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">先聊 15 分钟，看看值不值得做</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">这通电话不是讲概念，主要是帮你判断这件事值不值得现在做、该从哪一步开始。</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <BookingRequestForm />

          <div className="space-y-6">
            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <MessageSquareQuote className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">这通电话会做什么</h2>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                {agenda.map((item) => (
                  <li key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">你提前想一下</h2>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                {prepItems.map((item) => (
                  <li key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">聊完你会更清楚</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">你会知道自己该先拿免费样本，还是直接做软件版或代跑版，而不是继续空想。</p>
              <div className="mt-6">
                <Link
                  href="/pricing"
                  className="interactive-button inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  看收费方式
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
