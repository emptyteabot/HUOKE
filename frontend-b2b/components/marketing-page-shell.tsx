import Link from 'next/link';

import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { TypewriterDecor } from './typewriter-decor';

type Cta = {
  href: string;
  label: string;
};

type Props = {
  eyebrow: string;
  title: string;
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
  typeLine = '更快看懂，更快继续下一步。',
  primaryCta = { href: '/book', label: '预约诊断' },
  secondaryCta = { href: '/pay?plan=pro', label: '开通 Pro' },
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-[#f5f5ef] text-slate-900">
      <SiteHeader ctaHref={primaryCta.href} ctaLabel={primaryCta.label} />

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-16 lg:px-8">
        <div className="max-w-4xl fade-up">
          <div className="apple-pill breathing-pill px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
            {eyebrow}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-[4rem] md:leading-[1.04]">
            {title}
          </h1>
          <div className="mt-4 text-base leading-7">
            <TypewriterDecor text={typeLine} />
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryCta.href}
              className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white/88 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-white hover:text-slate-950"
            >
              {secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>

      {children}
      <SiteFooter />
    </main>
  );
}
