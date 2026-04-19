import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CreditCard,
  FileCode2,
  Layers3,
  MessageSquareQuote,
  Radar,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '产品',
  description: 'LeadPulse 产品页：把社媒意图、预约、付款和交付接成一条更短的成交路径。',
};

const pillars = [
  {
    title: '意图发现',
    description: '先抓“求推荐、预算、避雷、找谁做、怎么做”的自然表达，而不是先猜内容方向。',
    icon: Radar,
  },
  {
    title: '线索裁剪',
    description: '先筛掉同行、机构号、搬运号和噪声账号，再决定哪些值得导出。',
    icon: ShieldCheck,
  },
  {
    title: '推进成交',
    description: '导出之后直接接文案、预约、付款和启动交付，不让动作散在四个工具里。',
    icon: CreditCard,
  },
  {
    title: '资产沉淀',
    description: '把页面、话术、任务和结果沉淀下来，下一轮不从零开始。',
    icon: FileCode2,
  },
];

const stackGaps = [
  {
    title: '社媒监听工具',
    weakness: '擅长告诉你“哪里有人提到你”，但不替你推进 booking、payment 和后续交付。',
    leadpulse: 'LeadPulse 从意图开始，但不止于监听，会一路推进到 start。',
  },
  {
    title: '评论/私信自动化工具',
    weakness: '擅长把评论变成 DM，但你还是要自己判断这是不是值得跟进的人。',
    leadpulse: 'LeadPulse 先判断值不值得跟，再释放导出、链接和草稿。',
  },
  {
    title: '外呼/邮件序列工具',
    weakness: '擅长推进联系人，但前提是你已经有一批值得联系的人。',
    leadpulse: 'LeadPulse 先从公开平台里抓意图，再进入推进环节。',
  },
  {
    title: '纯内容代运营',
    weakness: '能帮你发很多内容，但你很难知道哪条真的带来商机和付款。',
    leadpulse: 'LeadPulse 把内容生态里的需求信号接到线索、消息和付款动作里。',
  },
];

const replaceRows = [
  {
    label: '你原来要拼的栈',
    detail: '监听工具 + 评论/私信工具 + 外呼工具 + 工作流工具 + 手工表格。',
  },
  {
    label: '每一层都断在哪里',
    detail: '监听工具停在“知道有人提到”；DM 工具停在“发出消息”；外呼工具停在“序列执行”；表格停在“你自己记得更新”。',
  },
  {
    label: 'LeadPulse 做的事',
    detail: '把意图、筛选、导出、草稿、booking、payment 和 start 放进一条更短且可追踪的路径。',
  },
];

const outputs = [
  '公开站首页、产品页、演示页、预约页、付款页、启动页',
  '意图筛选、同行剔除、导出即解锁链接',
  'Closer 草稿、任务回流、付款确认和交付推进',
  '可复用页面、流程、执行资产和内部中枢',
];

export default function ProductPage() {
  return (
    <MarketingPageShell
      eyebrow="产品"
      title="不是一个社媒工具，而是一条完整的成交路径"
      description="如果别的竞品是在某一个节点上更强，LeadPulse 的目标是把节点之间的空档补上。它从社媒意图开始，但不止于监听；它进入触达，但不止于发消息；它推进付款，但不把交付丢给你自己。"
      typeLine="先抓意图，再裁剪线索，再推进预约、付款和 start。"
      primaryCta={{ href: '/demo', label: '先看演示' }}
      secondaryCta={{ href: '/pay?plan=pro', label: '看价格' }}
    >
      <section className="mx-auto max-w-7xl px-6 py-2 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {pillars.map((item) => {
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
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">Where others stop</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">大多数竞品都停在链路中间</h2>
            <div className="mt-6 space-y-4">
              {stackGaps.map((item) => (
                <article key={item.title} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.weakness}</p>
                  <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                    {item.leadpulse}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                <Layers3 className="h-5 w-5 text-slate-800" />
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">What LeadPulse replaces</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">你不用再自己拼五层栈</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {replaceRows.map((row) => (
                <div
                  key={row.label}
                  className="interactive-panel rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4"
                >
                  <div className="text-sm font-semibold text-slate-950">{row.label}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">{row.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-black/5 bg-white px-5 py-5">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-slate-800" />
                <div className="text-sm font-semibold text-slate-950">你真正买到的东西</div>
              </div>
              <div className="mt-4 space-y-3">
                {outputs.map((item) => (
                  <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Why now</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">平台上已经有人在问问题，你现在缺的是收口层</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                竞品往往只解决其中一层：有人提到你、有人给你发私信、有人收到了外呼、有人帮你发内容。
                LeadPulse 的差异是把这几个动作串起来，让你从平台意图出发，直接推进到 booking、payment 和 start。
              </p>
            </div>

            <div className="flex flex-wrap gap-3 xl:justify-end">
              <Link
                href="/compare"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                看更细对比
              </Link>
              <Link
                href="/demo"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
              >
                看演示
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
