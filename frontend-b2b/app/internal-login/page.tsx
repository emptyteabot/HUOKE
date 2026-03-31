import Link from 'next/link';
import type { Metadata } from 'next';

import { TypewriterDecor } from '../../components/typewriter-decor';

export const metadata: Metadata = {
  title: 'Internal Access',
  robots: {
    index: false,
    follow: false,
  },
};

type SearchParams = Promise<{
  next?: string;
}>;

function sanitizeNext(value?: string) {
  const next = String(value || '/dashboard/ai').trim();
  if (!next.startsWith('/')) return '/dashboard/ai';
  if (next.startsWith('/internal-login')) return '/dashboard/ai';
  return next;
}

export default async function InternalLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const next = sanitizeNext(resolved.next);

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-xl interactive-panel rounded-[2rem] border border-black/5 bg-white/92 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="apple-pill breathing-pill px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
          Internal Access
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">这个页面只给你自己看</h1>
        <div className="mt-4 text-sm leading-7">
          <TypewriterDecor text="内部数据、案例、融资材料和控制台，不直接给客户看。" />
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-600">
          现在这些页面已经改成内部访问。公开站继续只讲客户价值，内部页只给你自己看。
        </p>

        <form action={next} method="get" className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">内部访问密钥</span>
            <input
              type="password"
              name="access"
              className="w-full rounded-[24px] border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/20"
              placeholder="输入 internal access key"
            />
          </label>
          <button
            type="submit"
            className="interactive-button inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
          >
            进入内部页面
          </button>
        </form>

        <div className="mt-8 text-sm text-[#86868b]">
          公共站点仍然可看：
          <Link href="/" className="ml-2 font-semibold text-slate-900 underline underline-offset-4">
            返回官网
          </Link>
        </div>
      </div>
    </main>
  );
}
