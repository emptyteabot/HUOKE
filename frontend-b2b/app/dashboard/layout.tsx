import Link from 'next/link';
import { Activity } from 'lucide-react';

import DashboardNav from '@/components/dashboard-nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="lead-glass rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">LeadPulse</div>
                <div className="mt-1 text-lg font-extrabold text-slate-950">线索作战台</div>
              </div>
            </Link>
            <DashboardNav />
          </div>
        </header>

        <div className="mt-5">{children}</div>
      </div>
    </main>
  );
}
