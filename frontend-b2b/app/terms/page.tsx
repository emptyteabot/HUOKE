import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { TERMS_SECTIONS } from '../../lib/pricing';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-900">
      <SiteHeader ctaHref="/pay?plan=pro" ctaLabel="进入开通页" />

      <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Terms</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">服务条款</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            这份条款只讲清楚三件事：样本、软件使用权、人工代跑服务包。先把边界说明白，避免后面再把软件和服务混在一起。
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-semibold text-slate-950">{section.title}</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {section.items.map((item) => (
                  <li key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">
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
