import Link from 'next/link';
import { ArrowRight, LayoutDashboard, ShieldCheck } from 'lucide-react';

import { TypewriterDecor } from '../../components/typewriter-decor';

export default function LoginPage() {
  return (
    <main className="lead-surface relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <div className="relative z-10 w-full max-w-2xl lead-glass rounded-lg p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(203,213,225,0.82)] bg-white/80 shadow-sm">
            <LayoutDashboard className="h-7 w-7 text-[#0071e3]" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">LeadPulse 线索作战台</h1>
          <div className="mt-3 text-sm leading-6">
            <TypewriterDecor text="这是内部控制台入口，不是面向客户的普通产品登录页。" />
          </div>
        </div>

        <div className="lead-card p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#0071e3]" />
            <p className="text-sm font-semibold text-slate-900">内部控制台入口</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            这里用于查看线索、消息、任务和余额。公开用户默认从官网、充值页或预约页进入。
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="lead-button lead-button-primary"
          >
            进入内部控制台
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="lead-button lead-button-secondary"
          >
            返回官网
          </Link>
          <Link
            href="/pricing"
            className="lead-button lead-button-secondary"
          >
            查看价格
          </Link>
        </div>
      </div>
    </main>
  );
}
