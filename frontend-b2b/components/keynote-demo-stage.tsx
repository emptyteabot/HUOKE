import { Bot, CreditCard, MessageSquareQuote, Search, ShieldCheck } from 'lucide-react';

const modules = [
  {
    label: 'Signals',
    title: '发现真实需求',
    detail: '高意向关键词、目标账户、公开求助信号。',
    icon: Search,
  },
  {
    label: 'Convert',
    title: '承接预约和付款',
    detail: '用更短路径把客户带到下一步。',
    icon: CreditCard,
  },
  {
    label: 'Operate',
    title: '沉淀成稳定动作',
    detail: '不是一次性操作，而是可复用流程。',
    icon: ShieldCheck,
  },
];

export function KeynoteDemoStage() {
  return (
    <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/92 p-5 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="rounded-[1.6rem] border border-black/5 bg-[#f8f8f4] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">LeadPulse Demo</div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">把客户带到更近的一步</h3>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-3">
            <Bot className="h-5 w-5 text-slate-800" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <div key={module.title} className="interactive-panel rounded-[1.4rem] border border-black/5 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3 w-fit">
                  <Icon className="h-4 w-4 text-slate-800" />
                </div>
                <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{module.label}</div>
                <div className="mt-2 text-base font-semibold text-slate-950">{module.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{module.detail}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="interactive-panel rounded-[1.4rem] border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                <MessageSquareQuote className="h-4 w-4 text-slate-800" />
              </div>
              <div className="text-sm font-semibold text-slate-950">客户先看到什么</div>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">一句话看懂产品做什么。</div>
              <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">一眼知道下一步是演示、预约还是开通。</div>
              <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3">所有动作都回到同一条成交路径。</div>
            </div>
          </div>

          <div className="interactive-panel rounded-[1.4rem] border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Flow</div>
            <div className="mt-3 text-sm leading-7 text-slate-600">
              演示页负责讲清楚。
              <br />
              预约页负责承接。
              <br />
              付款页负责开通。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
