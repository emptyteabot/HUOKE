import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-black/5 px-6 py-8 text-sm text-[#86868b]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-md">
          <div className="text-slate-900 font-semibold">LeadPulse</div>
          <div className="mt-2 leading-7">
            把公开平台里的高意图需求表达，接到线索筛选、触达推进、预约、付款和启动交付。
          </div>
        </div>

        <div className="flex flex-wrap gap-4 lg:gap-6">
          <Link href="/product" className="transition hover:text-slate-950">
            产品
          </Link>
          <Link href="/pricing" className="transition hover:text-slate-950">
            价格
          </Link>
          <Link href="/use-cases" className="transition hover:text-slate-950">
            场景
          </Link>
          <Link href="/integrations" className="transition hover:text-slate-950">
            集成
          </Link>
          <Link href="/faq" className="transition hover:text-slate-950">
            FAQ
          </Link>
          <Link href="/security" className="transition hover:text-slate-950">
            安全
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
