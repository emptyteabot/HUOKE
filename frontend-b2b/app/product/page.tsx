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
} from 'lucide-react';

import { MarketingPageShell } from '../../components/marketing-page-shell';

export const metadata: Metadata = {
  title: '产品工作流',
  description: 'LeadPulse 从小红书和抖音识别最新高痛点需求，并整理成销售能手动跟进的线索。',
};

const sources = [
  { icon: MessageSquare, name: '小红书笔记' },
  { icon: MessagesSquare, name: '小红书评论区' },
  { icon: Rss, name: '抖音短视频评论' },
  { icon: Globe, name: '抖音企业号主页' },
];

const capabilities = [
  {
    icon: Cpu,
    title: 'Manifest 意图路由引擎',
    detail: '抛弃古典关键词计分法。系统先判断内容复杂度和场景具体度，再决定走快速、均衡或深度判定，避免把雅思报班、留学中介、出海询盘和代运营需求混成一类。',
  },
  {
    icon: Filter,
    title: '长上下文预算解析',
    detail: '抛弃脆弱的关键词匹配，强制使用长上下文大模型（如 DeepSeek）深度解析客户输入，识别“只问问”和“准备采购”的差别。',
  },
  {
    icon: Globe,
    title: '高净值线索防火墙',
    detail: '低预算、泛收藏、纯攻略和同行软广先被拦截，只有近期还在问推荐、问价格、找服务商的人进入销售视野。',
  },
  {
    icon: LayoutDashboard,
    title: '结构化交付工作台',
    detail: '每条通过防火墙的线索都保留来源、上下文、预算判断、阶段和安全私信草稿，销售不用再从一堆链接里猜。',
  },
];

const dashboardLeads = [
  {
    source: '小红书笔记',
    company: '雅思 6.0 卡分学生',
    signal: '提到 con offer 卡语言成绩，雅思还差 0.5 分，想找一对一老师本周试听。',
    analysis: '时间线紧、目标分明确、已有试听动作，适合雅思机构立刻承接。',
    score: 94,
    stage: '急需报班',
    owner: '雅思招生',
  },
  {
    source: '小红书评论',
    company: '27Fall 英港申请学生',
    signal: '询问“留学中介怎么选，怕被坑，求真实做过的人推荐”。',
    analysis: '早鸟阶段开始比较机构，信任和相近背景案例能直接推进。',
    score: 91,
    stage: '中介比较',
    owner: '留学中介',
  },
  {
    source: '抖音评论',
    company: '口语 5.5 三战学生',
    signal: '公开说“口语卡了三次，预算 1w 内，求老师带练”。',
    analysis: '预算、科目和痛点同时出现，属于高意向招生线索。',
    score: 88,
    stage: '预算明确',
    owner: '雅思顾问',
  },
  {
    source: '小红书笔记',
    company: '宁波工业设备出口商',
    signal: '抱怨“展会名片没转化，LinkedIn 没效果，海外客户到底去哪找”。',
    analysis: '高客单制造业出海痛点清晰，适合交付海外买家意图样本。',
    score: 90,
    stage: '海外获客瓶颈',
    owner: '出海 B2B',
  },
  {
    source: '抖音短视频评论',
    company: '深圳跨境卖家',
    signal: '说独立站投广告两个月没单，想找 TikTok Shop 和红人营销代运营。',
    analysis: '主动找服务商且预算开放，先给投放诊断样本，避免硬报价。',
    score: 84,
    stage: '服务商比较',
    owner: '跨境代运营',
  },
  {
    source: '小红书评论',
    company: '雅思工作室负责人',
    signal: '抱怨投流来的学生质量差，都是问完价格就没下文，想找更精准的招生方式。',
    analysis: '这是 LeadPulse 的直接买家，痛点在客资质量和投放浪费。',
    score: 89,
    stage: '线索质量痛点',
    owner: 'LeadPulse 自用',
  },
  {
    source: '抖音评论',
    company: '留学顾问个人号',
    signal: '提到今年小红书咨询量明显少了，想知道怎么找到正在问中介的学生。',
    analysis: '明确需要学生线索，适合先发 3 条近期留学需求样本。',
    score: 86,
    stage: '获客下滑',
    owner: 'LeadPulse 自用',
  },
  {
    source: '小红书笔记',
    company: '青岛机械出口团队',
    signal: '问“海外询盘能不能自动分辨真假客户，销售跟太多垃圾询盘”。',
    analysis: '预算未明但痛点强烈，先用公开样本证明意图识别能力。',
    score: 82,
    stage: '痛点确认',
    owner: '外贸获客',
  },
  {
    source: '抖音评论',
    company: '跨境红人营销服务商',
    signal: '说客户总问有没有高意向品牌主线索，自己找太慢了。',
    analysis: '这是出海服务商的线索供给痛点，适合展示英文平台买家 JSON 样本。',
    score: 87,
    stage: '交付压力',
    owner: 'LeadPulse 自用',
  },
  {
    source: '小红书评论',
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
          小红书和抖音里，藏着
          <br />
          <span className="text-gradient">最新还在喊痛</span>的客户。
        </>
      }
      description="LeadPulse 持续扫描小红书和抖音，把问价格、求推荐、找老师、找中介、找代运营、抱怨线索质量等购买信号，整理成销售团队可以直接判断和跟进的线索。"
      typeLine="优先服务雅思招生、留学中介、跨境代运营和高端出海 B2B 团队。"
      primaryCta={{ href: '/book', label: '申请免费样本' }}
      secondaryCta={{ href: '/demo', label: '查看只读演示' }}
    >
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="lead-glass rounded-[24px] border border-white/80 p-6 shadow-xl shadow-slate-200/20 md:p-8">
          <div className="flex flex-col items-stretch justify-between gap-8 lg:flex-row lg:items-center">
            <div className="flex-1">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">1</span>
                原始讨论流
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
                Manifest 意图路由引擎
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                    <span className="flex items-center gap-2 text-xs text-slate-300">
                      <Cpu className="h-3.5 w-3.5 text-blue-400" />
                      复杂度路由
                    </span>
                    <span className="font-mono text-xs text-green-400">fast / balanced / deep</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                    <span className="flex items-center gap-2 text-xs text-slate-300">
                      <Filter className="h-3.5 w-3.5 text-purple-400" />
                      具体度判定
                    </span>
                    <span className="font-mono text-xs text-red-400">低痛点拦截</span>
                  </div>
                </div>
              </div>
            </div>

            <ArrowRight className="hidden h-8 w-8 shrink-0 text-slate-300 lg:block" />

            <div className="flex-1">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">3</span>
                人工跟进
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
                  <span className="rounded-md bg-slate-950 px-3 py-1.5 text-[10px] font-medium text-white">交付样本</span>
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
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">10 条中国社媒高意向线索样本</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                这里展示客户付费后实际看到的线索结构：来源、脱敏对象、原始需求、AI 判断、阶段、评分和负责人。
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
                <div className="text-xs text-slate-500">可手动触达</div>
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
