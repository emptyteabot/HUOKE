import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-black/5 px-6 py-8 text-sm text-[#86868b]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-slate-900">LeadPulse</div>

        <div className="flex flex-wrap gap-4">
          <Link href="/demo" className="transition hover:text-slate-950">
            演示
          </Link>
          <Link href="/pay?plan=pro" className="transition hover:text-slate-950">
            定价
          </Link>
          <Link href="/privacy" className="transition hover:text-slate-950">
            隐私
          </Link>
          <Link href="/terms" className="transition hover:text-slate-950">
            条款
          </Link>
        </div>
      </div>
    </footer>
  );
}
