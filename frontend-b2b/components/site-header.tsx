import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

type Props = {
  ctaHref?: string;
  ctaLabel?: string;
};

const navItems = [
  { href: '/product', label: '产品' },
  { href: '/pricing', label: '定价' },
  { href: '/faq', label: '常见问题' },
];

export function SiteHeader({ ctaHref = '/book', ctaLabel = '预约评估' }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-950 text-white shadow-sm">
            <Activity className="h-4 w-4" />
          </span>
          <span className="truncate text-xl font-bold tracking-tight text-slate-950">LeadPulse</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-slate-950">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href={ctaHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
          <span className="hidden sm:inline">{ctaLabel}</span>
          <span className="sm:hidden">预约</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
