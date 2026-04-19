import Link from 'next/link';
import { ArrowRight, LayoutDashboard, ShieldCheck } from 'lucide-react';

import { TypewriterDecor } from '../../components/typewriter-decor';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6 py-12">
      <div className="w-full max-w-2xl interactive-panel rounded-[2rem] border border-black/5 bg-white/92 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="mb-8 text-center">
          <div className="mx-auto apple-pill breathing-pill flex h-14 w-14 items-center justify-center rounded-[28px]">
            <LayoutDashboard className="h-7 w-7 text-[#0071e3]" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-slate-950">LeadPulse Console</h1>
          <div className="mt-3 text-sm leading-6">
            <TypewriterDecor text="这是内部控制台入口，不是面向客户的普通产品登录页。" />
          </div>
        </div>

        <div className="rounded-[28px] border border-black/5 bg-[#f8f8f4] p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#0071e3]" />
            <p className="text-sm font-semibold text-slate-900">内部控制台入口</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            这里用于 founder / operator 查看线索、消息、任务和账单。公开用户默认应从官网、价格页或预约页进入。
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-[#0071e3] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#0062c3]"
          >
            进入内部控制台
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
          >
            返回官网
          </Link>
          <Link
            href="/pricing"
            className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
          >
            查看价格
          </Link>
        </div>
      </div>
    </div>
  );
}
