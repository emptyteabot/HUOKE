import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { FunnelStrip } from '../../components/funnel-strip';
import { LeadSignalFeed } from '../../components/lead-signal-feed';
import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '工作流演示',
  description: 'LeadPulse 演示页：看懂系统如何从公开留言识别购买意图，并推进到预约和充值。',
};

const quickPoints = ['先识别高意向留言', '再判断预算和阶段', '最后推到预约或充值'];

export default function DemoPage() {
  return (
    <MarketingPageShell
      eyebrow="工作流演示"
      title="两分钟，看懂 LeadPulse 怎么把留言变成销售动作。"
      description="演示页只负责一件事：让你看到系统不是在堆关键词链接，而是在逐条分析购买意图、预算信号和下一步动作。"
      primaryCta={{ href: '/book', label: '预约诊断' }}
      secondaryCta={{ href: '/product', label: '看产品工作流' }}
    >
      <FunnelStrip
        steps={[
          { label: '发现', title: '看到真实提问', href: '/demo', active: true },
          { label: '判断', title: '分析购买意图', href: '/product' },
          { label: '推进', title: '预约或充值', href: '/pricing' },
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-4">
            <div className="lead-card p-6">
              <div className="lead-pill">为什么要看演示</div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">客户不需要看说明书</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                客户只需要知道三件事：系统看见了什么、为什么判断这条线索有价值、下一步销售应该做什么。
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
          </div>

          <LeadSignalFeed />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="lead-card p-6">
          <h2 className="text-2xl font-extrabold text-slate-950">看完演示，就做下一步</h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/book" className="lead-button lead-button-primary">
              预约诊断
            </Link>
            <Link href="/pay?package=standard" className="lead-button lead-button-secondary">
              充值 LP Coin
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
