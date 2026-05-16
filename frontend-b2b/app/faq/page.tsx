import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '常见问题',
  description: '解释 LeadPulse 是什么、适合谁、免费体验能看到什么，以及方案之间的区别。',
};

const faqs = [
  {
    q: 'LeadPulse 是什么？',
    a: 'LeadPulse 是公开平台销售线索工作台，帮助团队从帖子、评论区和公开讨论里发现购买信号，并整理成可跟进的结构化线索。',
  },
  {
    q: '它和市面上的社媒监控 / 舆情工具有什么区别？',
    a: '传统社媒监控更关注品牌提及次数、情绪分析和舆情走势，结果往往是一大堆包含关键词的噪音。LeadPulse 专注商业变现，专门识别求推荐、找报价、痛点抱怨等购买信号，并提供完整来源上下文，专为销售跟进设计。',
  },
  {
    q: '免费试用能看到什么？',
    a: '提交业务信息后，我们会为你跑出一小批真实线索样本。你可以看到原始出处、客户讨论上下文和意图标签，用来判断你的目标客户是否真的会在公开平台发声。',
  },
  {
    q: '充值包和代跑有什么区别？',
    a: '充值包适合有执行力的团队，自己看线索、筛选并分配给销售。代跑服务适合没时间摸索的团队，你提需求，我们帮你设定规则、跑数据并复核，最终交付更干净的线索名单和破冰建议。',
  },
  {
    q: 'LeadPulse 适合什么样的团队？',
    a: '最适合已经有明确产品或服务、清楚目标客户是谁、客单价有一定利润空间，并且愿意主动出击触达客户的团队。尤其适合 ToB SaaS、代运营机构、出海服务商和咨询服务团队。',
  },
  {
    q: '什么时候不适合使用？',
    a: '如果你还没明确卖什么，或者目标客户画像不清晰；又或者产品客单价极低、依赖海量自然流量而非精准触达，那现阶段可能不适合使用 LeadPulse。',
  },
];

export default function FaqPage() {
  return (
    <MarketingPageShell
      eyebrow="常见问题"
      title={
        <>
          开始之前，
          <br />
          先把<span className="text-gradient">关键问题</span>说清楚。
        </>
      }
      description="这里解释 LeadPulse 是什么、适合谁、免费试用能看到什么，以及方案之间的区别。"
      typeLine="先看样本，再决定要不要继续。"
      primaryCta={{ href: '/book', label: '申请免费样本' }}
      secondaryCta={{ href: '/demo', label: '预约 15 分钟演示' }}
    >
      <section className="mx-auto max-w-3xl px-4 py-4 pb-20 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={faq.q}
              className="group lead-glass rounded-[20px] border border-white/80 open:border-blue-200 open:bg-white/85"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
                <span className="text-base font-bold text-slate-800 group-open:text-blue-700">{faq.q}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180 group-open:text-blue-500" />
              </summary>
              <div className="px-6 pb-6">
                <div className="border-t border-slate-100/70 pt-4 text-sm font-light leading-7 text-slate-600">{faq.a}</div>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-16 rounded-[24px] border border-slate-100 bg-slate-50/60 p-8 text-center">
          <h2 className="font-bold text-slate-950">还有其他疑问？</h2>
          <p className="mt-2 text-sm text-slate-500">我们随时准备为您解答关于获客工作流的任何问题。</p>
          <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/book" className="lead-button lead-button-primary text-sm">
              申请免费样本
            </Link>
            <Link href="/demo" className="lead-button lead-button-secondary text-sm">
              预约 15 分钟演示
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
