import Link from 'next/link';
import { Activity } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-slate-100 bg-white px-4 py-12 text-sm text-slate-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-950">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-slate-950 text-white">
            <Activity className="h-3.5 w-3.5" />
          </span>
          LeadPulse
        </Link>

        <div className="flex flex-wrap gap-6 font-semibold">
          <Link href="/product" className="transition hover:text-slate-950">
            产品
          </Link>
          <Link href="/pricing" className="transition hover:text-slate-950">
            定价
          </Link>
          <Link href="/privacy" className="transition hover:text-slate-950">
            隐私政策
          </Link>
        </div>

        <div>LeadPulse · 专注精准获客</div>
      </div>
    </footer>
  );
}
