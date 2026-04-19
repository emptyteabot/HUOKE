import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  Bot,
  CheckSquare,
  FileCheck2,
  LayoutDashboard,
  Mail,
  MessageSquareQuote,
  Radar,
  Target,
} from 'lucide-react';

type DashboardTab = 'overview' | 'leads' | 'tasks' | 'emails' | 'messages' | 'ai' | 'closer' | 'fulfillment' | 'billing' | 'settings';

type Props = {
  active: DashboardTab;
  title: string;
  description: string;
  children: ReactNode;
};

const navItems: Array<{
  key: DashboardTab;
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: 'overview', href: '/dashboard', label: '总览', icon: LayoutDashboard },
  { key: 'leads', href: '/dashboard/leads', label: '线索', icon: Target },
  { key: 'tasks', href: '/dashboard/tasks', label: '任务', icon: CheckSquare },
  { key: 'emails', href: '/dashboard/emails', label: '触达', icon: Mail },
  { key: 'messages', href: '/dashboard/messages', label: '消息', icon: MessageSquareQuote },
  { key: 'closer', href: '/dashboard/closer', label: 'Closer', icon: Mail },
  { key: 'fulfillment', href: '/dashboard/fulfillment', label: '交付', icon: FileCheck2 },
  { key: 'billing', href: '/dashboard/billing', label: '账单', icon: FileCheck2 },
  { key: 'settings', href: '/dashboard/settings', label: '设置', icon: Radar },
  { key: 'ai', href: '/dashboard/ai', label: 'Agent OS', icon: Bot },
];

export function DashboardShell({ active, title, description, children }: Props) {
  return (
    <main className="dashboard-light min-h-screen bg-[#f5f5f7] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f5f5f7]/92 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <Link href="/" className="inline-flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-sm font-semibold text-slate-900 shadow-sm">
                  LP
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">LeadPulse</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">Control</div>
                </div>
              </Link>

              <div className="mt-6">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#86868b]">Operating system</div>
                <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.6rem]">
                  {title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[#86868b]">{description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/ops"
                className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-black/15 hover:bg-white hover:text-slate-900"
              >
                经营看板
              </Link>
              <Link
                href="/book"
                className="interactive-button inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbfb]"
              >
                预约诊断
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`interactive-button inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                    isActive
                      ? 'border-black/15 bg-white text-slate-950 shadow-sm'
                      : 'border-black/10 bg-white/80 text-slate-600 hover:border-black/15 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/experiments"
              className="interactive-button inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-black/15 hover:bg-white hover:text-slate-900"
            >
              <Radar className="h-4 w-4" />
              实验页
            </Link>

            <Link
              href="/"
              className="interactive-button inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-black/15 hover:bg-white hover:text-slate-900"
            >
              返回官网
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">{children}</section>
    </main>
  );
}
