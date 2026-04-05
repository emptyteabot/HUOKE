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
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref="/pay?plan=pro" ctaLabel="返回付款页" />

      <FunnelStrip
        steps={[
          { label: '产品', title: '认识产品', href: '/product' },
          { label: '付款', title: '拿到兑换码', href: `/pay?plan=${plan.id}` },
          { label: '兑换', title: '站内开通', href: `/redeem?plan=${plan.id}`, active: true },
        ]}
      />

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-slate-700" />
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">站内兑换</h1>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              付款后拿到兑换码，就在这里完成开通。系统会核销兑换码、生成启动交付包，并把你带到启动页。
            </p>
            <div className="mt-6 grid gap-3">
              {[
                '1. 输入兑换码和邮箱',
                '2. 补齐公司 / 产品链接',
                '3. 兑换成功后自动进入启动页',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-600">
              没有码就先去
              <Link href={`/pay?plan=${plan.id}`} className="mx-1 font-semibold text-slate-900 underline underline-offset-4">
                付款页
              </Link>
              扫码付款；有了码再回来兑换。
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
