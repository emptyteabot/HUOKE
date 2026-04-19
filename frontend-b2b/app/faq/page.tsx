import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CircleHelp, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'LeadPulse FAQ covering positioning, setup, pricing, workflow boundaries, and what an AI Lead Capture & Conversion OS actually does.',
};

const sections = [
  {
    title: 'What is LeadPulse?',
    icon: Sparkles,
    items: [
      {
        q: 'LeadPulse 到底是什么产品？',
        a: 'LeadPulse 是一个 AI Lead Capture & Conversion OS。它不是单一社媒监听工具，也不是普通 CRM。它把公开平台里的高意图需求表达，接到筛选、导出、触达准备、预约、付款和启动交付这条路径里。',
      },
      {
        q: '它和社媒监听工具有什么不同？',
        a: '社媒监听通常停在“知道哪里有人提到你”。LeadPulse 继续把线索推进到 booking、payment 和 onboarding，所以它卖的是更短的成交路径，而不是更多仪表盘。',
      },
      {
        q: '它和评论私信自动化有什么不同？',
        a: '评论和私信工具擅长自动回复，但不会先替你筛掉同行、低意图和噪声。LeadPulse 先判断值不值得推进，再把动作接到后续商业流程里。',
      },
    ],
  },
  {
    title: 'Who is it for?',
    icon: CircleHelp,
    items: [
      {
        q: '适合哪些团队？',
        a: '最适合独立开发者、AI SaaS 团队、工作室、agency，以及依赖高质量线索的高客单服务团队。共同点不是行业，而是都需要从公开需求里更快地拿到真实成交机会。',
      },
      {
        q: '不适合哪些情况？',
        a: '如果你只想看品牌提及量，只想做舆情分析，或者已经有非常成熟的 CRM、支付和交付系统且只缺一个小插件，LeadPulse 不一定是第一优先级。',
      },
      {
        q: '它更像软件还是服务？',
        a: '目标形态是标准 SaaS，但当前仍保留必要的人在环确认与执行边界。我们不会把人工确认包装成“完全自动化”，这反而更适合真正落地的商业流程。',
      },
    ],
  },
  {
    title: 'Pricing and rollout',
    icon: CreditCard,
    items: [
      {
        q: 'Free、Pro、Max 怎么选？',
        a: 'Free 用来验证第一条线索到转化路径。Pro 是默认主力方案，适合想把整条路径跑稳定的团队。Max 适合更高吞吐、多 offer 或多操作者环境。',
      },
      {
        q: '为什么不只做一个低价套餐？',
        a: '因为不同团队买的不是同一批“功能”，而是不同强度的 operating model。LeadPulse 的定价按运营密度和转换路径来分层，而不是堆砌功能开关。',
      },
      {
        q: '多久可以开始用？',
        a: '如果你先走 Free，可以立刻验证路径。如果你直接开 Pro，重点是尽快让公开意图、预约、付款和 kickoff 的边界跑顺，而不是拖到一个超长实施周期之后。',
      },
    ],
  },
  {
    title: 'Trust and boundaries',
    icon: ShieldCheck,
    items: [
      {
        q: 'LeadPulse 是不是已经全自动？',
        a: '不是，也不应该假装是。它已经把很多商业动作产品化，但支付确认、运营判断、部分渠道动作仍可能保留人为确认，这样系统边界更清楚，也更安全。',
      },
      {
        q: '支持哪些集成？',
        a: '当前重点是把商业路径接起来，包括 webhook fan-out、通知链路、支付与 start 流程、代码导出和 GitHub 同步路径。集成目标不是做 logo 墙，而是保证路径真的能跑起来。',
      },
      {
        q: '为什么 FAQ 里一直强调 booking、payment、onboarding？',
        a: '因为那正是 LeadPulse 的核心差异。很多竞品在链路中间停住。LeadPulse 要解决的是从公开需求信号一路推进到商业结果，而不是停在“看见线索”这一步。',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <MarketingPageShell
      eyebrow="FAQ"
      title="Questions teams ask before they trust the workflow"
      description="LeadPulse sells a different promise from most competitors: not just visibility, not just automation, but a clearer path from public intent to revenue. These are the questions that matter before you adopt it."
      typeLine="Answers about the AI Lead Capture & Conversion OS model"
      primaryCta={{ href: '/register?plan=free', label: '先开 Free' }}
      secondaryCta={{ href: '/book', label: '预约 15 分钟' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                    <Icon className="h-5 w-5 text-slate-800" />
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">FAQ</div>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-3">
                  {section.items.map((item) => (
                    <article key={item.q} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                      <h3 className="text-lg font-semibold text-slate-950">{item.q}</h3>
                      <p className="mt-4 text-sm leading-7 text-slate-600">{item.a}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-10 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr] xl:items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">CTA</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Still deciding how to start?</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Start Free if you want proof. Book a short call if you need the workflow boundary clarified. Go Pro if you already know your team needs the full signal-to-conversion path now.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 xl:justify-end">
              <Link
                href="/register?plan=free"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                先开 Free
              </Link>
              <Link
                href="/book"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
              >
                预约 15 分钟
              </Link>
              <Link
                href="/pay?plan=pro"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
              >
                开通 Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
