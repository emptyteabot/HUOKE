import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';

import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

type Cta = {
  href: string;
  label: string;
};

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  typeLine?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  children: React.ReactNode;
};

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  typeLine = '先看真实样本，再决定要不要继续投入。',
  primaryCta = { href: '/book', label: '免费查看线索样本' },
  secondaryCta = { href: '/demo', label: '预约工作流演示' },
  children,
}: Props) {
  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref={primaryCta.href} ctaLabel={primaryCta.label} />

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-16 text-center sm:px-6 lg:px-8 lg:pt-20">
        <div className="lead-fade-up mx-auto max-w-4xl">
          <div className="lead-pill mx-auto">{eyebrow}</div>
          <h1 className="mt-5 text-[2.55rem] font-extrabold leading-[1.08] tracking-tight text-slate-950 md:text-[3.7rem]">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg font-light leading-8 text-slate-600">{description}</p>
          <p className="mx-auto mt-3 max-w-3xl text-base font-light leading-7 text-slate-500">{typeLine}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={primaryCta.href} className="lead-button lead-button-primary">
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={secondaryCta.href} className="lead-button lead-button-secondary">
              <Play className="h-4 w-4" />
              {secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10">{children}</div>
      <SiteFooter />
    </main>
  );
}
