import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

import { LpCoinCheckout } from '../../components/lp-coin-checkout';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getPaidCreditPackages, normalizeCreditPackageId } from '../../lib/pricing';

type SearchParams = Promise<{
  package?: string;
  plan?: string;
  payment?: string;
}>;

export const metadata: Metadata = {
  title: '充值试跑',
  description: 'LeadPulse 采用预充值积分制：先充值，后提取，高意向线索按结果扣费。',
};

export default async function PayPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const selectedPackage = normalizeCreditPackageId(resolved.package || resolved.plan);
  const packages = getPaidCreditPackages();

  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref="/book" ctaLabel="联系方式" />

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center lead-fade-up">
          <p className="lead-pill mx-auto">充值试跑</p>
          <h1 className="mt-5 text-[2.5rem] font-extrabold leading-[1.1] tracking-tight text-slate-950 md:text-[3.5rem]">
            确认要跑线索，
            <br />
            再<span className="text-gradient">充值放量。</span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg font-light leading-8 text-slate-600">
            先看样本，确认线索质量和行业方向。确定继续后再充值试跑，系统确认收款后自动发放对应积分，余额不足将暂停提取。
          </p>
        </div>

        {resolved.payment === 'return' ? (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-800">
            支付页面已经返回。积分是否到账只看服务端异步通知，通常几秒内刷新余额即可看到。
          </div>
        ) : null}

        <div className="mt-10">
          <LpCoinCheckout packages={packages} defaultPackageId={selectedPackage === 'trial' ? 'standard' : selectedPackage} />
        </div>

        <section className="lead-glass mt-10 rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-800" />
            <h2 className="text-xl font-extrabold text-slate-950">免费体验额度仍然保留</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            新用户默认有 60 LP Coin 和 3 次免费导出。额度用完后再充值即可，不会自动续费。
          </p>
          <div className="mt-5 grid gap-3 text-sm leading-7 text-slate-600 md:grid-cols-3">
            {['新用户默认有 60 积分', '前 3 次导出先体验', '不做默认自动续费'].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white/70 px-4 py-3">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}
