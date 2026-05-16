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

const dashboardLeads = [
  {
    source: 'Reddit / r/shopify',
    company: '深圳 DTC 家居品牌',
    signal: '在讨论区询问 Shopify Plus 替代方案，重点提到库存同步和海外客服效率。',
    analysis: '已有跨境站点和明确替换痛点，适合先发同类品牌案例，再约 20 分钟诊断。',
    score: 93,
    stage: '替换评估',
    owner: '外贸 SaaS 销售',
  },
  {
    source: '小红书评论',
    company: '杭州户外用品独立站',
    signal: '留言问“有没有懂 TikTok Shop 和独立站一起投放的服务商，预算可以谈”。',
    analysis: '主动找服务商且预算开放，先给投放诊断样本，避免直接硬推报价。',
    score: 91,
    stage: '服务商比较',
    owner: '出海代运营',
  },
  {
    source: '知乎问答',
    company: '广州 B2B 工厂官网',
    signal: '提到询盘质量低，正在比较海外 SEO、LinkedIn 私信和展会获客。',
    analysis: '问题已经从流量变成线索质量，适合切入获客系统和线索筛选。',
    score: 88,
    stage: '渠道重选',
    owner: 'B2B 增长顾问',
  },
  {
    source: '行业论坛',
    company: '宁波汽配出口商',
    signal: '询问“有没有能持续找到海外经销商线索的工具，别只给海关数据”。',
    analysis: '明确排斥泛名单，正在找意图线索，适合展示公开讨论提取样本。',
    score: 90,
    stage: '工具采购',
    owner: '外贸获客',
  },
  {
    source: 'LinkedIn 评论区',
    company: '苏州工业软件团队',
    signal: '评论竞品帖子时提到“我们也在找欧美代理渠道，缺靠谱线索源”。',
    analysis: '需求场景清晰但还在早期，先发渠道拓展清单和样本更容易接住。',
    score: 84,
    stage: '渠道探索',
    owner: '渠道销售',
  },
  {
    source: 'Facebook Group',
    company: '跨境母婴品牌',
    signal: '发帖寻找“能帮忙筛 KOL 和批发买家的 agency”，要求先看样本。',
    analysis: '已提出 agency 和样本要求，符合先样本后试单路径。',
    score: 89,
    stage: '样本确认',
    owner: '品牌增长',
  },
  {
    source: 'V2EX 讨论',
    company: '上海开发者工具 SaaS',
    signal: '创始人抱怨 Product Hunt 后续线索断层，想找长期出海获客方式。',
    analysis: '有产品和冷启动痛点，适合先定位开发者社区与购买信号。',
    score: 86,
    stage: '增长瓶颈',
    owner: 'SaaS 销售',
  },
  {
    source: '公众号留言',
    company: '青岛机械出口团队',
    signal: '问“海外询盘能不能自动分辨真假客户，销售跟太多垃圾询盘”。',
    analysis: '预算未明但痛点强烈，先引导上传历史询盘做免费样本。',
    score: 82,
    stage: '痛点确认',
    owner: '线索运营',
  },
  {
    source: 'Reddit / r/Entrepreneur',
    company: '北美华人电商品牌',
    signal: '寻找中文团队帮他们做中国供应链和英文站增长，要求可远程沟通。',
    analysis: '跨境协作场景明确，可用中英双语案例切入。',
    score: 87,
    stage: '供应链增长',
    owner: '服务销售',
  },
  {
    source: '知识星球',
    company: '深圳 3C 配件卖家',
    signal: '询问“有没有能监控同行评论区，找到正在问价格的人”的方案。',
    analysis: '需求高度贴合 LeadPulse，适合直接给评论区线索截图样本。',
    score: 92,
    stage: '强匹配',
    owner: '客户成功',
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
      primaryCta={{ href: '/book', label: '申请免费样本' }}
      secondaryCta={{ href: '/demo', label: '查看只读演示' }}
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

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="lead-glass overflow-hidden rounded-lg border border-white/80 shadow-xl shadow-slate-200/20">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-white/65 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="lead-pill w-fit">只读工作台截图</div>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">10 条出海行业脱敏线索样本</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                这里展示客户付费后实际看到的线索结构：来源、脱敏公司、原始需求、AI 判断、阶段、评分和负责人。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-2xl font-extrabold text-slate-950">10</div>
                <div className="text-xs text-slate-500">脱敏样本</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-2xl font-extrabold text-slate-950">88</div>
                <div className="text-xs text-slate-500">平均评分</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-2xl font-extrabold text-slate-950">7</div>
                <div className="text-xs text-slate-500">可直接触达</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-slate-50/55 p-4">
            <table className="min-w-[1080px] border-separate border-spacing-y-3 text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  <th className="px-4">来源</th>
                  <th className="px-4">脱敏对象</th>
                  <th className="px-4">购买信号</th>
                  <th className="px-4">AI 判断</th>
                  <th className="px-4">阶段</th>
                  <th className="px-4">评分</th>
                  <th className="px-4">负责人</th>
                </tr>
              </thead>
              <tbody>
                {dashboardLeads.map((lead) => (
                  <tr key={`${lead.source}-${lead.company}`} className="align-top">
                    <td className="rounded-l-lg border-y border-l border-slate-200 bg-white px-4 py-4 font-semibold text-slate-700">{lead.source}</td>
                    <td className="border-y border-slate-200 bg-white px-4 py-4 font-bold text-slate-950">{lead.company}</td>
                    <td className="max-w-[270px] border-y border-slate-200 bg-white px-4 py-4 leading-7 text-slate-700">{lead.signal}</td>
                    <td className="max-w-[300px] border-y border-slate-200 bg-white px-4 py-4 leading-7 text-slate-600">{lead.analysis}</td>
                    <td className="border-y border-slate-200 bg-white px-4 py-4">
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{lead.stage}</span>
                    </td>
                    <td className="border-y border-slate-200 bg-white px-4 py-4">
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">{lead.score}</span>
                    </td>
                    <td className="rounded-r-lg border-y border-r border-slate-200 bg-white px-4 py-4 font-semibold text-slate-700">{lead.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            申请免费样本
          </Link>
          <Link href="/demo" className="lead-button lead-button-secondary">
            查看只读演示
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}
