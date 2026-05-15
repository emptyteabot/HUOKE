import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { PRIVACY_SECTIONS } from '../../lib/pricing';

export default function PrivacyPage() {
  return (
    <main className="lead-surface relative min-h-screen overflow-hidden text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />
      <SiteHeader ctaHref="/book" ctaLabel="预约诊断" />

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="lead-pill">Privacy</p>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">隐私说明</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            LeadPulse 只收集完成线索提取、积分发放、余额扣减和客户支持所必需的信息，并尽量把范围控制在真正需要的部分。
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {PRIVACY_SECTIONS.map((section) => (
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
