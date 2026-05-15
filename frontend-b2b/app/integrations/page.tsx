import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BellRing, CreditCard, Mail, Send, ShieldCheck, Webhook, Workflow } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '集成',
  description: 'LeadPulse 集成页：把高意向线索推送到飞书、企业微信、Webhook、CRM 和销售工作流。',
};

const nativeGroups = [
  {
    title: 'Webhook 与通知',
    description: '高意向线索生成后，可以推送到飞书、企业微信或你的内部接口。',
    points: ['原文链接', 'AI 分析', '评分与下一步动作'],
    icon: Webhook,
  },
  {
    title: '充值与余额',
    description: '线索提取和扣费统一落到余额，避免人工催款和应收账款。',
    points: ['充值订单', '余额变化', '扣费记录'],
    icon: CreditCard,
  },
  {
    title: '销售接手',
    description: '把该跟进的人、该说的话、该约的电话，放到销售能立刻执行的位置。',
    points: ['线索池', '消息草稿', '任务流转'],
    icon: Send,
  },
];

const workflowCards = [
  {
    title: '发现层',
    detail: '公开讨论、评论区、社群和问答里的需求表达进入同一套判断模型。',
  },
  {
    title: '路由层',
    detail: '任务、消息草稿和通知处在中间层，确保每条合格线索都有下一步。',
  },
  {
    title: '成交层',
    detail: '预约、充值、交付和复盘继续挂在同一条线索路径上。',
  },
  {
    title: '人工层',
    detail: '需要判断、确认和售后的环节保留人工接管，不包装成假自动化。',
  },
];

export default function IntegrationsPage() {
  return (
    <MarketingPageShell
      eyebrow="集成"
      title="集成的目的不是堆 Logo，而是把线索推向成交。"
      description="LeadPulse 的集成逻辑很简单：发现商机后，立刻把结构化结果、原文链接和下一步动作送到你的团队或系统。"
      typeLine="能自动推送的自动推送，需要人工判断的明确交给人。"
      primaryCta={{ href: '/book', label: '预约集成诊断' }}
      secondaryCta={{ href: '/pricing', label: '查看充值包' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          {nativeGroups.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="lead-card p-6">
                <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-extrabold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <div className="mt-5 space-y-3">
                  {item.points.map((point) => (
                    <div key={point} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.96fr_1.04fr]">
          <section className="lead-card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Workflow className="h-5 w-5 text-slate-800" />
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-[0.24em] text-slate-500">工作流</div>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">从公开信号到销售动作</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {workflowCards.map((card) => (
                <article key={card.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-extrabold text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="lead-card p-6">
            <div className="lead-pill">边界</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">清楚边界，比假装全自动更重要。</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                <BellRing className="mb-3 h-5 w-5 text-slate-800" />
                通知和人工接管保持可见。
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                <Mail className="mb-3 h-5 w-5 text-slate-800" />
                沟通内容绑定原始线索。
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                <ShieldCheck className="mb-3 h-5 w-5 text-slate-800" />
                充值、扣费和退款可追踪。
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="lead-button lead-button-primary">
                预约集成诊断
              </Link>
              <Link href="/pay?package=standard" className="lead-button lead-button-secondary">
                直接充值试跑
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </MarketingPageShell>
  );
}
