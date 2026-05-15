import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { LeadSignalFeed } from '../../components/lead-signal-feed';
import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '工作流演示',
  description: '看懂 LeadPulse 如何从公开留言识别购买意图，并推进到预约和充值。',
};

const quickPoints = ['先识别高意向留言', '再判断预算和阶段', '最后推到预约或充值'];

export default function DemoPage() {
  return (
    <MarketingPageShell
      eyebrow="工作流演示"
      title="两分钟，看懂留言怎么变成销售动作。"
      description="演示页只负责一件事：让你看到系统不是在堆关键词链接，而是在逐条分析购买意图、预算信号和下一步动作。"
      typeLine="客户不需要看说明书。客户只需要知道：看见了什么，为什么值钱，下一步该怎么做。"
      primaryCta={{ href: '/book', label: '预约 15 分钟演示' }}
      secondaryCta={{ href: '/product', label: '看产品工作流' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="lead-glass rounded-[24px] p-6">
            <div className="lead-pill">为什么要看演示</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">客户不需要看说明书。</h2>
            <p className="mt-4 text-sm font-light leading-7 text-slate-600">
              销售拿到的每条线索，都应该能回答三个问题：这人为什么像客户、现在处于什么阶段、下一步应该怎么开口。
            </p>
            <div className="mt-6 space-y-3">
              {quickPoints.map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
            <Link href="/product" className="lead-button lead-button-secondary mt-6 text-sm">
              看产品详情
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <LeadSignalFeed />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="lead-glass rounded-[24px] p-6">
          <h2 className="text-2xl font-extrabold text-slate-950">看完演示，就做下一步。</h2>
          <p className="mt-3 text-sm font-light leading-7 text-slate-600">
            如果你还在判断方向，先预约 15 分钟。如果你已经确认要跑线索，直接充值试跑。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/book" className="lead-button lead-button-primary">
              预约 15 分钟
            </Link>
            <Link href="/pay?package=standard" className="lead-button lead-button-secondary">
              直接充值试跑
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
