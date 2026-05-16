import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Building2, GraduationCap, MessageSquareMore, SearchCheck } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '适用场景',
  description: 'LeadPulse 适合需要从公开讨论里提取高意向线索的服务团队、销售团队和工作室。',
};

const personas = [
  {
    title: 'B2B 服务团队',
    description: '你已经知道怎么成交，瓶颈是更早看见正在找方案、问报价、要推荐的人。',
    outcome: '减少无效外呼，把销售精力放在明确有需求的人身上。',
    icon: BriefcaseBusiness,
  },
  {
    title: '外包获客工作室',
    description: '你需要持续交付高质量线索，而不是给客户一堆关键词链接。',
    outcome: '用可追溯的原文和 AI 分析支撑交付质量。',
    icon: Building2,
  },
  {
    title: '教育 / 咨询团队',
    description: '你卖的是信任和时机，需要在客户提问最热的时候进入对话。',
    outcome: '把求推荐、问价格、想试一轮的人推进诊断电话。',
    icon: GraduationCap,
  },
];

const loops = [
  {
    title: '捕捉真实信号',
    description: '从“求推荐”“多少钱”“有没有靠谱服务商”“谁能帮我做”等公开需求开始。',
    icon: SearchCheck,
  },
  {
    title: '触达前先筛选',
    description: '先过滤噪声、同行软文和低意图讨论，再让销售接手。',
    icon: MessageSquareMore,
  },
  {
    title: '承接到预约和充值',
    description: '同一条路径把线索推进到预约电话、充值试跑和后续交付。',
    icon: ArrowRight,
  },
];

export default function UseCasesPage() {
  return (
    <MarketingPageShell
      eyebrow="适用场景"
      title="适合想从公开讨论里提前截获需求的团队。"
      description="LeadPulse 不适合所有行业。它最适合客单价足够、客户会在公开平台提问，并且销售愿意主动跟进的业务。"
      typeLine="先用免费额度验证一个场景，再决定是否放量。"
      primaryCta={{ href: '/book', label: '申请免费样本' }}
      secondaryCta={{ href: '/book', label: '预约 15 分钟' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          {personas.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="lead-card p-6">
                <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h2 className="mt-5 text-xl font-extrabold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">{item.outcome}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="lead-card p-6">
            <div className="lead-pill">工作闭环</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">同一套动作，适配不同团队。</h2>
            <div className="mt-6 space-y-4">
              {loops.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <Icon className="h-5 w-5 text-slate-800" />
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-950">{item.title}</h3>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="lead-card p-6">
            <div className="lead-pill">选择入口</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">选择最适合你的入口。</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              如果还在验证需求，先看真实样本。如果已经有明确场景和预算，直接充值试跑。边界不清楚，就先预约电话。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="lead-button lead-button-primary">
                申请免费样本
              </Link>
              <Link href="/book" className="lead-button lead-button-secondary">
                预约 15 分钟
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
