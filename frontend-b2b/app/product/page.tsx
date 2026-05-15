import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Cpu,
  Filter,
  Globe,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Rss,
  Twitter,
} from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '产品工作流',
  description: 'LeadPulse 从公开讨论里识别正在表达需求的客户，并整理成销售能跟进的线索。',
};

const sources = [
  { icon: Twitter, name: 'X / Twitter' },
  { icon: MessagesSquare, name: 'Reddit 讨论区' },
  { icon: Rss, name: '行业垂直论坛' },
  { icon: MessageSquare, name: '知乎 / 小红书' },
];

const capabilities = [
  {
    icon: Cpu,
    title: '语义识别',
    detail: '超越简单关键词匹配。引擎能理解求推荐、谁家能做、替代方案、痛点抱怨等复杂表达，准确捕捉真实需求。',
  },
  {
    icon: Filter,
    title: '噪音深度过滤',
    detail: '内置防软文和防泛提及机制，过滤闲聊、水贴、竞品 PR 稿等低意向内容，只保留值得销售花时间跟进的线索。',
  },
  {
    icon: Globe,
    title: '来源完整追溯',
    detail: '每条线索都保留原帖链接、上下文对话和作者主页。销售跟进前，可以充分了解客户背景，制定破冰话术。',
  },
  {
    icon: LayoutDashboard,
    title: '沉浸式跟进工作台',
    detail: '用看板管理线索状态：待跟进、沟通中、已转化。支持导出、分配给销售，或复制建议话术。',
  },
];

export default function ProductPage() {
  return (
    <MarketingPageShell
      eyebrow="工作流"
      title={
        <>
          公开讨论里，藏着
          <br />
          <span className="text-gradient">正在表达需求</span>的客户。
        </>
      }
      description="LeadPulse 持续扫描帖子、评论区、论坛和公开社区，把问价格、求推荐、找替代方案、寻找服务商等购买信号，整理成销售团队可以直接判断和跟进的线索。"
      typeLine="不把关键词链接扔给销售，而是把能推进的人送到销售面前。"
      primaryCta={{ href: '/book', label: '免费查看线索样本' }}
      secondaryCta={{ href: '/demo', label: '预约工作流演示' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="lead-glass rounded-[24px] border border-white/80 p-6 shadow-xl shadow-slate-200/20 md:p-8">
          <div className="flex flex-col items-stretch justify-between gap-8 lg:flex-row lg:items-center">
            <div className="flex-1">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">1</span>
                监控平台
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sources.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/65 p-3 shadow-sm">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <ArrowRight className="hidden h-8 w-8 shrink-0 text-slate-300 lg:block" />

            <div className="group relative flex-1">
              <div className="absolute inset-0 -m-4 rounded-[24px] bg-blue-500/5 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
              <div className="relative mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700">2</span>
                AI 意图识别引擎
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                    <span className="flex items-center gap-2 text-xs text-slate-300">
                      <Cpu className="h-3.5 w-3.5 text-blue-400" />
                      语义分析
                    </span>
                    <span className="font-mono text-xs text-green-400">匹配客户画像</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                    <span className="flex items-center gap-2 text-xs text-slate-300">
                      <Filter className="h-3.5 w-3.5 text-purple-400" />
                      噪音过滤
                    </span>
                    <span className="font-mono text-xs text-red-400">-92% 无效</span>
                  </div>
                </div>
              </div>
            </div>

            <ArrowRight className="hidden h-8 w-8 shrink-0 text-slate-300 lg:block" />

            <div className="flex-1">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">3</span>
                销售工作台
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/3 bg-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="h-2 w-24 rounded bg-slate-200" />
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="h-2 w-32 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="rounded-md bg-slate-950 px-3 py-1.5 text-[10px] font-medium text-white">分配给销售</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="lead-glass rounded-[24px] p-8">
                <Icon className="mb-5 h-8 w-8 text-slate-800" />
                <h2 className="text-xl font-bold text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm font-light leading-7 text-slate-600">{item.detail}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-14 flex flex-col justify-center gap-4 text-center sm:flex-row">
          <Link href="/book" className="lead-button lead-button-primary">
            免费查看线索样本
          </Link>
          <Link href="/demo" className="lead-button lead-button-secondary">
            预约工作流演示
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}
