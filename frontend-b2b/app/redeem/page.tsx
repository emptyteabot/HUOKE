import Link from 'next/link';
import { FileCheck2, Ticket } from 'lucide-react';

import { FunnelStrip } from '../../components/funnel-strip';
import { RedeemCodeForm } from '../../components/redeem-code-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getPlanById } from '../../lib/pricing';

type SearchParams = Promise<{
  plan?: string;
  code?: string;
}>;

export default async function RedeemPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const plan = getPlanById(resolved.plan);
  const initialCode = String(resolved.code || '').trim();

  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref="/pay?package=standard" ctaLabel="返回充值页" />

      <div className="relative z-10">
        <FunnelStrip
          steps={[
            { label: '产品', title: '认识工作流', href: '/product' },
            { label: '充值', title: '获得开通码', href: '/pay?package=standard' },
            { label: '兑换', title: '站内开通', href: '/redeem', active: true },
          ]}
        />
      </div>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="lead-card p-6">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-slate-700" />
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">站内兑换</h1>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              付款或人工发码后，在这里完成开通。系统会核销兑换码、生成启动交付包，并把你带到启动页。
            </p>
            <div className="mt-6 grid gap-3">
              {['1. 输入兑换码和邮箱', '2. 补齐公司 / 产品链接', '3. 兑换成功后自动进入启动页'].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
              没有码就先去
              <Link href="/pay?package=standard" className="mx-1 font-bold text-slate-900 underline underline-offset-4">
                充值页
              </Link>
              完成付款；有了码再回来兑换。
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
              <FileCheck2 className="h-4 w-4" />
              当前方案：{plan.name}
            </div>
          </article>

          <RedeemCodeForm defaultPlan={plan.id} initialCode={initialCode} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
