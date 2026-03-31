import Link from 'next/link';
import { CheckCircle2, Clock3, MessageSquareQuote } from 'lucide-react';

import { BookingRequestForm } from '../../components/booking-request-form';
import { FunnelStrip } from '../../components/funnel-strip';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

const agenda = ['判断你的主路径', '看该先补预约还是付款', '判断更适合 Free / Pro / Max'];

const prepItems = ['一句话说明你卖什么', '最近 1-2 个成交或丢单案例', '当前流量和付款方式'];

export default function BookPage() {
  return (
    <main className="min-h-screen bg-[#f5f5ef] text-slate-900">
      <SiteHeader ctaHref="/pay?plan=pro" ctaLabel="开通 Pro" />

      <FunnelStrip
        steps={[
          { label: '演示', title: '看懂产品', href: '/demo' },
          { label: '预约', title: '预约诊断', href: '/book', active: true },
          { label: '开通', title: '进入方案', href: '/pay?plan=pro' },
        ]}
      />

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">预约诊断</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            用 15 分钟，判断下一步
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">这不是泛泛演示，而是直接判断你该先做哪一步。</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <BookingRequestForm />

          <div className="space-y-6">
            <div className="interactive-panel rounded-3xl border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <MessageSquareQuote className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-semibold text-slate-950">这通话会做什么</h2>
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
                <h2 className="text-2xl font-semibold text-slate-950">会前准备</h2>
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
                <h2 className="text-2xl font-semibold text-slate-950">你会带走什么</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">你会拿到一条更短的成交路径，而不是更多待办事项。</p>
              <div className="mt-6">
                <Link
                  href="/pay?plan=pro"
                  className="interactive-button inline-flex rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  查看主力方案
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
