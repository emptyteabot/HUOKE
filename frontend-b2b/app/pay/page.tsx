import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

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
  title: '充值 LP Coin',
  description: 'LeadPulse 采用预充值积分制：先充值，后提取，高意向线索按结果扣费。',
};

export default async function PayPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const selectedPackage = normalizeCreditPackageId(resolved.package || resolved.plan);
  const packages = getPaidCreditPackages();

  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref="/dashboard/billing" ctaLabel="查看余额" />

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <p className="lead-pill">LP Coin</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-5xl">
            先充值，后提取。只为确定性线索付费。
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            LeadPulse 不卖月费订阅。1 LP Coin = 1 元人民币。自动收银台到账后发放积分，接口异常时可用备用收款码兜底。
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

        <section className="lead-card mt-10 p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-800" />
            <h2 className="text-xl font-extrabold text-slate-950">免费体验额度仍然保留</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            新用户默认有 60 LP Coin 和 3 次免费导出。额度用完后再充值即可，不会自动续费。
          </p>
          <Link href="/dashboard/billing" className="lead-button lead-button-secondary mt-5 text-sm">
            查看当前余额
          </Link>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}
