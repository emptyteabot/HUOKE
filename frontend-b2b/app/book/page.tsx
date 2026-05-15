import Link from 'next/link';
import { MapPin, MessagesSquare, User } from 'lucide-react';

import { BookingRequestForm } from '../../components/booking-request-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

const agenda = ['你的业务是否适合公开平台线索', '优先看哪些平台、关键词和人群', '应该从免费样本、标准包还是代跑服务开始'];
const prepItems = ['一句话说明你卖什么产品或服务', '最近最想找哪类客户破冰', '现在主要靠什么方式找客户'];
const outcomes = ['要不要继续使用 LeadPulse', '适合哪种方案对你最划算', '如果开始，第一轮应该从哪里切入'];

export default function BookPage() {
  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref="/pricing" ctaLabel="查看方案" />

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-3xl lead-fade-up">
          <h1 className="text-[2.5rem] font-extrabold leading-[1.1] tracking-tight text-slate-950 md:text-[3.5rem]">
            先聊 15 分钟，
            <br />
            判断<span className="text-gradient">适不适合开始。</span>
          </h1>
          <p className="mt-5 text-lg font-light leading-8 text-slate-600">
            我们会看你的业务、目标客户和当前获客方式，再判断你适合先看样本、充值试跑，还是先做一轮代跑。不浪费彼此时间。
          </p>
        </div>

        <div className="mt-12 grid items-start gap-12 lg:grid-cols-[1fr_400px]">
          <BookingRequestForm />

          <div className="flex flex-col gap-5">
            <div className="lead-glass rounded-[24px] p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950">
                <MessagesSquare className="h-4 w-4 text-slate-500" />
                这 15 分钟会聊什么
              </h2>
              <ul className="space-y-3">
                {agenda.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm font-light leading-7 text-slate-600">
                    <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lead-glass rounded-[24px] p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950">
                <User className="h-4 w-4 text-slate-500" />
                你可以提前想一下
              </h2>
              <ul className="space-y-3">
                {prepItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm font-light leading-7 text-slate-600">
                    <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lead-glass rounded-[24px] p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950">
                <MapPin className="h-4 w-4 text-slate-500" />
                聊完你会更清楚什么
              </h2>
              <ul className="space-y-3">
                {outcomes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm font-light leading-7 text-slate-600">
                    <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/pay?package=standard" className="lead-button lead-button-secondary mt-6 text-sm">
                直接充值试跑
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
