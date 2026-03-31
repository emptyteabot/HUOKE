import Link from 'next/link';

type Props = {
  ctaHref?: string;
  ctaLabel?: string;
};

const navItems = [
  { href: '/product', label: '产品' },
  { href: '/demo', label: '演示' },
  { href: '/book', label: '预约' },
];

export function SiteHeader({ ctaHref = '/book', ctaLabel = '预约诊断' }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f5f5f7]/92 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-sm font-semibold text-slate-900 shadow-sm">
            LP
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">LeadPulse</div>
            <div className="mt-1 text-base font-semibold text-slate-950">AI Growth System</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[#86868b] lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-slate-950">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href={ctaHref}
          className="interactive-button inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
        >
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
