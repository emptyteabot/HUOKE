import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { HeroProductStage } from '../components/hero-product-stage';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import { TypewriterDecor } from '../components/typewriter-decor';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '../lib/site';

export const dynamic = 'force-dynamic';

const productExplainers = [
  {
    title: '找线索',
    detail: '不是泛流量，而是先找更可能回复、预约、付款的人。',
  },
  {
    title: '做触达',
    detail: '自动生成首轮触达、跟进和预约推进，不再每次从零写。',
  },
  {
    title: '推商业动作',
    detail: '把预约、支付、开通和后续动作接成一条真正能卖的线。',
  },
];

const nextSteps = [
  {
    step: '第一步',
    title: '先认识产品',
    detail: '先看清楚它到底是什么，适合谁用。',
    href: '/product',
    cta: '看产品介绍',
  },
  {
    step: '第二步',
    title: '再看它怎么工作',
    detail: '看看它如何从找线索推进到预约和收款。',
    href: '/demo',
    cta: '看真实演示',
  },
  {
    step: '第三步',
    title: '最后直接开始',
    detail: '如果你已经有产品、但还没有稳定客户，就直接开通 Pro。',
    href: '/pay?plan=pro',
    cta: '立即开通',
  },
];

export default function HomePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader ctaHref="/pay?plan=pro" ctaLabel="立即开通" />

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.96fr] lg:items-center">
          <div className="fade-up">
            <div className="apple-pill breathing-pill px-4 py-2 text-sm text-slate-900">
              给已经做出产品、但还没有稳定客户的人
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
              LeadPulse
              <br />
              把获客、支付和交付接成一条线
            </h1>
            <div className="mt-4 text-base leading-7">
              <TypewriterDecor text="不是再做一个工具，而是把从访问到收款的路径跑通。" />
            </div>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              如果你会做产品，但不会持续获客、触达、成交和收款，LeadPulse 会帮你把这些动作组织起来，让一个人也能把增长闭环跑起来。
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/pay?plan=pro"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
              >
                立即开通 Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/demo"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
              >
                先看真实演示
              </Link>
            </div>
          </div>

          <HeroProductStage />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <div className="interactive-panel rounded-[36px] border border-black/5 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-8">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">What it does</div>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">它会帮你做三件事</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {productExplainers.map((item) => (
              <article key={item.title} className="interactive-panel rounded-[28px] border border-black/5 bg-[#f8f8f4] p-5">
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="interactive-panel rounded-[36px] border border-black/5 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-8">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">How to start</div>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">一步一步往前走</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {nextSteps.map((item) => (
              <article key={item.step} className="interactive-panel rounded-[28px] border border-black/5 bg-[#f8f8f4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">{item.step}</div>
                <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                <Link
                  href={item.href}
                  className="interactive-button mt-5 inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
                >
                  {item.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
