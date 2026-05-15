import Link from 'next/link';
import type { Metadata } from 'next';

import { TypewriterDecor } from '../../components/typewriter-decor';

export const metadata: Metadata = {
  title: '内部入口',
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
    <main className="lead-surface relative min-h-screen overflow-hidden px-6 py-16 text-slate-900">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-xl lead-glass rounded-lg p-8">
        <div className="lead-pill">
          内部入口
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">这个页面只给你自己看</h1>
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
              className="lead-input"
              placeholder="输入访问密钥"
            />
          </label>
          <button
            type="submit"
            className="lead-button lead-button-primary"
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
