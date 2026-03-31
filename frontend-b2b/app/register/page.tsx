import Link from 'next/link';

import { DesignPartnerForm } from '../../components/design-partner-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref="/pay?plan=pro" ctaLabel="直接去开通" />

      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/92 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-10">
          <div className="mb-8 max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Apply</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">开通 Free，或申请 Design Partner</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              这页服务的是独立开发者、indie hacker、微型 SaaS 和 agency。你如果只是想先验证上线、支付和导出代码，走 Free；如果想更快把增长闭环跑通，就继续申请更深度支持。
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm text-slate-600">
                适合：已经在做产品、正在找更快上线 + 接入支付 + 可导出代码 + 更稳增长链路的人。
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm text-slate-600">
                不适合：只想囤功能、不愿意跑漏斗、不想面对真实用户与转化的人。
              </div>
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-cyan-700">
                你也可以先去
                <Link href="/book" className="mx-1 underline">
                  预约页
                </Link>
                或直接去
                <Link href="/pay?plan=pro" className="mx-1 underline">
                  Pro / Max 开通页
                </Link>
                。
              </div>
            </div>

            <DesignPartnerForm variant="page" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
