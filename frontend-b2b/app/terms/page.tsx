import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { TERMS_SECTIONS } from '../../lib/pricing';

export default function TermsPage() {
  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref="/pay?package=standard" ctaLabel="充值 LP Coin" />

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="lead-pill">Terms</p>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">服务条款</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            本服务条款旨在明确规范 LeadPulse 的线索提取服务标准、积分（LP Coin）计费及扣费规则，以及交付与结算机制。
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="lead-card p-6">
              <h2 className="text-2xl font-extrabold text-slate-950">{section.title}</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {section.items.map((item) => (
                  <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
