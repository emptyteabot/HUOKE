import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

type DashboardTab = 'overview' | 'leads' | 'tasks' | 'messages' | 'emails' | 'ai' | 'closer' | 'fulfillment' | 'billing' | 'settings';

type Props = {
  active: DashboardTab;
  title: string;
  description: string;
  children: ReactNode;
};

export function DashboardShell({ active, title, description, children }: Props) {
  return (
    <section className="space-y-6">
      <div className="lead-glass rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="lead-pill">经营工作台</div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-[2.7rem]">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/billing"
              className="lead-button lead-button-secondary min-h-11 px-5 text-sm"
            >
              账单额度
            </Link>
            <Link
              href="/book"
              className="lead-button lead-button-primary min-h-11 px-5 text-sm"
            >
              预约诊断
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
          <span className="lead-pill">当前页：{active}</span>
          <span className="lead-pill">LeadPulse</span>
        </div>
      </div>

      <div>{children}</div>
    </section>
  );
}
