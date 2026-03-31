import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { FunnelStrip } from '../../components/funnel-strip';
import { KeynoteDemoStage } from '../../components/keynote-demo-stage';
import { MarketingPageShell } from '../../components/marketing-page-shell';
import { PublicDemoShowcase } from '../../components/public-demo-showcase';

export const metadata: Metadata = {
  title: '演示',
  description: 'LeadPulse 演示页：更短路径看懂产品、预约和开通逻辑。',
};

const quickPoints = ['先识别高意向线索', '再承接预约与付款', '最后沉淀成稳定动作'];

export default function DemoPage() {
  return (
    <MarketingPageShell
      eyebrow="演示"
      title="两分钟，看懂 LeadPulse"
      description="这页只负责一件事：让客户快速理解产品怎么把演示、预约和付款接起来。"
      primaryCta={{ href: '/pay?plan=pro', label: '开通 Pro' }}
      secondaryCta={{ href: '/book', label: '预约 15 分钟' }}
    >
      <FunnelStrip
        steps={[
          { label: '演示', title: '看懂产品', href: '/demo', active: true },
          { label: '预约', title: '预约诊断', href: '/book' },
          { label: '开通', title: '进入方案', href: '/pay?plan=pro' },
        ]}
      />

      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-4">
            <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Why this page</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">客户不需要看说明书</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                客户只需要知道三件事：产品做什么、下一步点哪里、为什么现在值得继续。
              </p>
              <div className="mt-6 space-y-3">
                {quickPoints.map((item) => (
                  <div key={item} className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  href="/product"
                  className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
                >
                  看产品详情
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <KeynoteDemoStage />
        </div>
      </section>

      <PublicDemoShowcase />

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <h2 className="text-2xl font-semibold text-slate-950">看完演示，就做下一步</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/book"
              className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-950 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
            >
              预约诊断
            </Link>
            <Link
              href="/pay?plan=pro"
              className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
            >
              直接开通
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
