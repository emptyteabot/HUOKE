import type { Metadata } from 'next';
import { CheckCircle2, Filter, Send, Target } from 'lucide-react';

import { LeadSignalFeed } from '../../components/lead-signal-feed';
import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '产品',
  description: 'LeadPulse 只保留一条管线：发现公开讨论里的购买意图，过滤噪音，推送高意向线索并锁定发现电话。',
};

const valueCards = [
  {
    icon: Filter,
    title: '剔除 98% 的噪音软文',
    detail:
      '无论是水军刷屏、同行软文还是无意义吐槽，AI 都会先识别并过滤。销售拿到的线索池，每一条都应该清澈见底。',
  },
  {
    icon: Target,
    title: '看懂购买意图',
    detail:
      '不仅抓取，更能理解。自动分析贴文中的求推荐、找代运营、问报价、要演示等真实交易意图，并标记客户所在阶段。',
  },
  {
    icon: Send,
    title: '推送到你的系统',
    detail:
      '发现商机后，立刻通过飞书、企业微信或标准接口把结构化结果连同原文链接推入你的工作流。',
  },
];

const workflow = [
  {
    title: '看见提问',
    detail: '从论坛、评论区、社群和问答里捕捉正在找方案的人。',
  },
  {
    title: '过滤噪音',
    detail: '水军、吐槽、同行软文先剔除，只留下有采购语气的内容。',
  },
  {
    title: '标记意图',
    detail: '识别求推荐、要报价、找代运营、想演示等交易信号。',
  },
  {
    title: '推给销售',
    detail: '把该跟进的人送到团队面前，让销售把精力放回逼单。',
  },
];

export default function ProductPage() {
  return (
    <MarketingPageShell
      eyebrow="产品工作流"
      title="我们不爬数据，我们提取真相。"
      description="传统的舆情工具只会给你丢来一堆包含关键词的垃圾链接。LeadPulse 的 AI 引擎真正理解上下文，只把那些真的准备掏钱的客户送到你面前。"
      typeLine="动态对话测算预算 -> 预算达标 -> 获取日历空闲 -> 锁定高净值发现电话。"
      primaryCta={{ href: '/book', label: '立即获取高意向线索' }}
      secondaryCta={{ href: '/pricing', label: '查看充值包' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <LeadSignalFeed />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {valueCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={index === 1 ? 'rounded-lg border border-slate-900 bg-slate-950 p-6 text-white shadow-xl' : 'lead-card p-6'}
              >
                <div
                  className={
                    index === 1
                      ? 'flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-blue-300'
                      : 'flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm'
                  }
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-extrabold">{card.title}</h2>
                <p className={index === 1 ? 'mt-3 text-sm leading-7 text-slate-300' : 'mt-3 text-sm leading-7 text-slate-600'}>
                  {card.detail}
                </p>

                {index === 1 ? (
                  <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      “麻烦私信下报价单”
                    </div>
                    <div className="mt-3 text-sm text-slate-500 line-through">“这篇测评写得真不错”</div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {workflow.map((step, index) => (
            <article key={step.title} className="lead-card p-5">
              <div className="font-mono text-sm font-bold text-slate-400">0{index + 1}</div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-950">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
