import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

type Props = {
  ctaHref?: string;
  ctaLabel?: string;
};

const navItems = [
  { href: '/product', label: '工作流' },
  { href: '/pricing', label: '充值包' },
  { href: '/faq', label: '常见问题' },
  { href: '/dashboard/leads', label: '线索池' },
];

export function SiteHeader({ ctaHref = '/book', ctaLabel = '立即获取线索' }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/68 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
            <Activity className="h-4 w-4" />
          </span>
          <span className="truncate text-xl font-extrabold tracking-tight text-slate-950">LeadPulse</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-500 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-slate-950">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href={ctaHref} className="lead-button lead-button-primary min-h-10 px-5 text-sm">
          <span className="hidden sm:inline">{ctaLabel}</span>
          <span className="sm:hidden">获取线索</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
