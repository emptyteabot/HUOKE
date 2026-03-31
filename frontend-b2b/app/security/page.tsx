import type { Metadata } from 'next';
import { Lock, MailCheck, Radar, ShieldCheck, TimerReset, Workflow } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '安全',
  description: 'LeadPulse 安全页：节流、退订、日志、密钥和人工接管边界。',
};

const guardrails = [
  {
    title: 'SMTP 节流',
    description: '先保住账号和域名信誉，再谈自动化规模。',
    icon: TimerReset,
  },
  {
    title: '退订与抑制名单',
    description: '一旦用户退订，后续触达自动停止。',
    icon: MailCheck,
  },
  {
    title: '发送日志',
    description: '每次发送、阻拦和失败都有记录。',
    icon: Radar,
  },
  {
    title: '自动化密钥',
    description: '批量动作通过密钥保护，不把敏感入口裸露出去。',
    icon: Lock,
  },
  {
    title: '运行边界',
    description: '多 agent 有 runtime、blockers 和 cron 节奏，不会失控乱跑。',
    icon: Workflow,
  },
  {
    title: '人工接管',
    description: '定价、风控和现金流判断始终留给人。',
    icon: ShieldCheck,
  },
];

const principles = [
  '先保证稳定发出去，再扩大自动化。',
  '任何自动触达都要可暂停、可退订、可人工接管。',
  '公开页、付款、条款、隐私和后台口径必须一致。',
  '最贵的不是少发几封，而是一次把域名和账号搞废。',
];

export default function SecurityPage() {
  return (
    <MarketingPageShell
      eyebrow="安全"
      title="自动化能卖出去，前提是边界先做好"
      description="LeadPulse 不是盲目追求全自动，而是把节流、日志、退订、密钥和人工接管一起做进产品里。"
      primaryCta={{ href: '/terms', label: '看条款' }}
      secondaryCta={{ href: '/privacy', label: '看隐私' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          {guardrails.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3 w-fit">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-6 pb-10 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Principles</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">卖出去之前，先把自己保护好</h2>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {principles.map((item) => (
              <article key={item} className="interactive-panel rounded-3xl border border-black/5 bg-[#f8f8f4] p-5 text-sm leading-7 text-slate-600">
                {item}
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
