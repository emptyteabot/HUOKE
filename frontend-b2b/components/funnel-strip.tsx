import Link from 'next/link';

type Step = {
  label: string;
  title: string;
  href: string;
  active?: boolean;
};

type Props = {
  eyebrow?: string;
  title?: string;
  description?: string;
  steps: Step[];
};

export function FunnelStrip({
  eyebrow = '怎么开始',
  title = '先看、再问、再决定',
  description = '先把方向看清楚，再决定要不要继续。',
  steps,
}: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="lead-card p-5">
        <div className="max-w-2xl">
          <div className="lead-pill">{eyebrow}</div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <Link
              key={step.title}
              href={step.href}
              className={[
                'rounded-lg border px-5 py-4 transition',
                step.active
                  ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_48px_rgba(15,23,42,0.12)]'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:text-slate-950',
              ].join(' ')}
            >
              <div className={step.active ? 'text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300' : 'text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500'}>
                {step.label}
              </div>
              <div className="mt-2 text-base font-extrabold">{step.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
