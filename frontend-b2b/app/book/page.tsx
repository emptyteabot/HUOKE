import Link from 'next/link';
import { CheckCircle2, Clock3, MessageSquareQuote } from 'lucide-react';

import { BookingRequestForm } from '../../components/booking-request-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

const agenda = ['确认你的客单价和目标行业', '判断是否值得消耗 LP Coin 提取线索', '如果预算达标，锁定 Discovery Call'];
const prepItems = ['一句话说明你卖什么', '说明你希望找到哪类客户', '准备一个可接受的线索预算区间'];

export default function BookPage() {
  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref="/pricing" ctaLabel="查看充值包" />

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="lead-pill">Discovery Call</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-5xl">
            只有预算和意图都达标，才值得进入电话。
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            这不是产品介绍电话。目标只有一个：判断你的业务是否适合用 LeadPulse 提取高意向线索。
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <BookingRequestForm />

          <div className="space-y-6">
            <div className="lead-card p-6">
              <div className="flex items-center gap-3">
                <MessageSquareQuote className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-extrabold text-slate-950">电话里只判断三件事</h2>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                {agenda.map((item) => (
                  <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lead-card p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-extrabold text-slate-950">提前准备</h2>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                {prepItems.map((item) => (
                  <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lead-card p-6">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-slate-700" />
                <h2 className="text-2xl font-extrabold text-slate-950">更快路径</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                如果你已经确认要跑线索，直接充值 LP Coin；系统会在余额充足时继续提取高意向线索。
              </p>
              <Link href="/pay?package=standard" className="lead-button lead-button-secondary mt-6 text-sm">
                充值 LP Coin
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
