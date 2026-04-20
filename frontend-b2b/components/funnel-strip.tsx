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
    <section className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
      <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
        <div className="max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">{eyebrow}</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <Link
              key={step.title}
              href={step.href}
              className={`interactive-button rounded-[1.4rem] border px-5 py-4 ${
                step.active
                  ? 'border-black/10 bg-[#eef1f5] text-slate-950 shadow-[0_16px_48px_rgba(15,23,42,0.08)]'
                  : 'border-black/5 bg-[#f8f8f4] text-slate-700 hover:border-black/10 hover:bg-white hover:text-slate-950'
              }`}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{step.label}</div>
              <div className="mt-2 text-base font-semibold">{step.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
