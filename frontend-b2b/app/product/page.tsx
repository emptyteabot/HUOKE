import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Radar, ShieldCheck, Sparkles } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '产品',
  description: 'LeadPulse 产品页：自动捕获公开平台上的高意图线索，清洗后交付成可触达名单。',
};

const blocks = [
  {
    title: '抓已经在问问题的人',
    description: '优先抓“求推荐、预算、避雷、找谁做、怎么做”这类直接影响成交的问题表达，而不是先猜你要发什么内容。',
    icon: Radar,
  },
  {
    title: '先筛，再导出',
    description: '先剔除同行、机构号和明显噪声，再决定哪些样本值得导出和触达。',
    icon: ShieldCheck,
  },
  {
    title: '把名单变成动作',
    description: '软件版给你筛选、导出和基础草稿；DFY 版直接替你跑完第一轮人工交付。',
    icon: BadgeCheck,
  },
];

const compareRows = [
  {
    title: '社媒监听工具',
    detail: '告诉你哪里有人提到你，但不交付可触达名单。',
  },
  {
    title: '评论 / 私信自动化',
    detail: '会回消息，但不会先替你筛掉同行和低价值样本。',
  },
  {
    title: 'CRM / 表格',
    detail: '擅长管理已经进系统的人，不会替你从公开平台里抓真实需求。',
  },
];

const deliveryRows = [
  'Free：先看 5-10 条真实样本，先证明确实能抓到人。',
  'Pro：你自己跑软件，自己触达，自己承担平台规则与账号环境。',
  'Max / DFY：我们人工代跑、人工清洗、每周交付名单，并代发首轮破冰动作。',
];

export default function ProductPage() {
  return (
    <MarketingPageShell
      eyebrow="产品"
      title="LeadPulse 不是复杂系统，它是高意图名单提取器"
      description="对外只卖一件事：自动捕获公开平台上的高意图线索，清洗后交付成可触达名单。"
      typeLine="先抓高意图，再决定自跑还是代跑"
      primaryCta={{ href: '/register?plan=free', label: '先看样本' }}
      secondaryCta={{ href: '/pricing', label: '看价格' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {blocks.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="w-fit rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
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
        <div className="grid gap-8 xl:grid-cols-[0.96fr_1.04fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Why this exists</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">你不是缺工具，你是缺已经在问问题的人</h2>
            <div className="mt-6 space-y-4">
              {compareRows.map((item) => (
                <article key={item.title} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                <Sparkles className="h-5 w-5 text-slate-800" />
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Delivery</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">先看样本，再决定买软件还是买结果</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {deliveryRows.map((item) => (
                <div
                  key={item}
                  className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register?plan=free"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                先拿样本
              </Link>
              <Link
                href="/book"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
              >
                预约 DFY
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </MarketingPageShell>
  );
}
