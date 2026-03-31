import { CreditCard, Radar, ShieldCheck } from 'lucide-react';

const stageItems = [
  {
    title: '这是什么',
    detail: '一个把获客、支付和交付接起来的 AI 增长系统。',
    icon: Radar,
  },
  {
    title: '帮谁用',
    detail: '给独立开发者、微型 SaaS、agency 和已经有产品但还没跑通成交的人。',
    icon: CreditCard,
  },
  {
    title: '怎么工作',
    detail: '先找线索，再推触达、支付和交付，最后回到经营结果。',
    icon: ShieldCheck,
  },
];

export function HeroProductStage() {
  return (
    <div className="interactive-panel rounded-[32px] border border-black/5 bg-white/92 p-6 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Product</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">这是个什么产品</h2>
      </div>

      <div className="mt-6 grid gap-4">
        {stageItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-black/10 bg-white p-3">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
