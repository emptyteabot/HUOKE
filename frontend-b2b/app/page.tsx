import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Filter,
  MessageSquareText,
  Send,
  Target,
  X,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LeadSignal = {
  source: string;
  time: string;
  quote: string;
  analysis: string;
  stage: string;
  score: number;
  action: string;
  tags: string[];
};

const leadSignals: LeadSignal[] = [
  {
    source: '小红书笔记',
    time: '刚刚',
    quote: '做留学小红书半年，只涨同行粉，资料党每天 99+，但一个试听都成交不了。',
    analysis: '留学/雅思机构负责人在抱怨线索质量和转化，适合先给近期学生需求样本。',
    stage: '线索质量痛点',
    score: 94,
    action: '发 4 条学生需求样本',
    tags: ['雅思招生', '资料党', '无成交'],
  },
  {
    source: '抖音评论',
    time: '3 分钟前',
    quote: '我们雅思工作室最近投流来的学生质量太差，都是问完价格就没下文。',
    analysis: '明确是机构侧获客痛点，不是普通学生求助，适合 LeadPulse 试单。',
    stage: '投流浪费',
    score: 91,
    action: '给问价/试听线索样本',
    tags: ['雅思机构', '投流无效', '价格党'],
  },
  {
    source: '小红书评论',
    time: '7 分钟前',
    quote: '我们做工业设备出口，展会回来一堆名片没转化，LinkedIn 也没效果。',
    analysis: '高客单制造业出海痛点清晰，问题已经落到询盘质量和渠道有效性。',
    stage: '海外获客瓶颈',
    score: 88,
    action: '发海外买家意图样本',
    tags: ['制造业出海', '询盘质量', '找客户'],
  },
  {
    source: '抖音视频评论',
    time: '12 分钟前',
    quote: '跨境代运营客户越来越难找，客户总问有没有海外品牌主线索，自己找太慢。',
    analysis: '出海服务商的线索供给痛点明确，适合展示 Reddit / X 高意向样本。',
    stage: '交付压力',
    score: 85,
    action: '发海外买家 JSON 样本',
    tags: ['跨境代运营', '品牌主线索', '交付压力'],
  },
  {
    source: '推特帖子',
    time: '1 分钟前',
    quote: 'AI agent 做出来了，但 Product Hunt 和内容都没起量，前 50 个真实用户到底去哪找？',
    analysis: 'AI 初创/独立开发者典型冷启动痛点，需要能立刻私信的高意向早期用户。',
    stage: '冷启动',
    score: 90,
    action: '发相近场景用户样本',
    tags: ['AI 初创', '早期用户', '冷启动'],
  },
  {
    source: 'Reddit 帖子',
    time: '5 分钟前',
    quote: 'I built a micro SaaS, but every lead from cold email is either a founder or a tire kicker.',
    analysis: '独立开发者正在抱怨线索质量，明确需要更准的购买意图过滤。',
    stage: '无效线索',
    score: 87,
    action: '发 Reddit buyer intent 样本',
    tags: ['独立开发者', 'micro SaaS', 'tire kicker'],
  },
  {
    source: '小红书笔记',
    time: '6 分钟前',
    quote: '外贸询盘一半都是无效客户，海关数据买了也没用，想找真正有采购意向的海外买家。',
    analysis: '明确排斥泛名单，正在找意图线索，适合展示公开内容提取样本。',
    stage: '采购前',
    score: 93,
    action: '先给筛选逻辑和样本',
    tags: ['外贸询盘', '非名单', '海外买家'],
  },
  {
    source: '小红书评论',
    time: '14 分钟前',
    quote: '今年小红书咨询量明显少了，想知道怎么找到正在问中介的学生。',
    analysis: '留学顾问直接表达获客下滑，适合先发近期英港申请需求样本。',
    stage: '获客下滑',
    score: 86,
    action: '发 3 条公开需求帖',
    tags: ['留学顾问', '找学生', '小红书咨询少'],
  },
  {
    source: '推特帖子',
    time: '2 分钟前',
    quote: 'Our AI workflow tool has traffic, but we cannot tell which visitors are actually ready to buy.',
    analysis: 'AI 工具团队有线索筛选和销售优先级痛点，适合切入意图评分。',
    stage: '转化判断',
    score: 89,
    action: '发意图评分样本',
    tags: ['AI 工具', '转化差', '意图评分'],
  },
  {
    source: 'Reddit 评论',
    time: '6 分钟前',
    quote: 'Looking for founders who need a no-code automation agency, but LinkedIn scraping lists are garbage.',
    analysis: '自动化服务商在抱怨名单质量，适合用公开需求语义过滤替代泛名单。',
    stage: '名单失效',
    score: 92,
    action: '发高意向帖子样本',
    tags: ['自动化服务商', 'LinkedIn 名单差', 'founder lead'],
  },
  {
    source: '抖音评论',
    time: '10 分钟前',
    quote: '有没有能监控同行评论区的方案？主要想找正在问雅思班价格、问推荐的人。',
    analysis: '问题非常聚焦，目标就是抓正在比较的人，属于清晰工具采购需求。',
    stage: '工具采购',
    score: 83,
    action: '讲监控范围和样本质量',
    tags: ['评论区', '雅思招生', '问推荐'],
  },
  {
    source: '推特帖子',
    time: '16 分钟前',
    quote: 'We need 20 qualified design partners for our AI devtool, not newsletter subscribers.',
    analysis: 'AI 开发工具团队明确要设计伙伴，排斥泛订阅用户，意图强。',
    stage: '设计伙伴',
    score: 84,
    action: '发高意向开发者样本',
    tags: ['AI devtool', 'design partner', '独立开发者'],
  },
];

const signalColumns = [
  leadSignals.slice(0, 4),
  leadSignals.slice(4, 8),
  leadSignals.slice(8, 12),
];

const workflow = [
  {
    title: '扫最新内容',
    detail: '只盯小红书、抖音、推特和 Reddit，按时间排序抓最近还在疼的需求。',
  },
  {
    title: '过滤噪音',
    detail: '水军、纯攻略、同行软广先剔除，只留下有预算或明确动作的人。',
  },
  {
    title: '标记赛道',
    detail: '区分雅思招生、留学中介、跨境代运营、外贸制造出海、AI 初创和独立开发者。',
  },
  {
    title: '交付线索',
    detail: '交付原文、痛点摘要、意向判断和安全私信草稿，人工低频跟进。',
  },
];

const painCards = [
  {
    icon: Filter,
    label: '困境 1',
    title: '线索泛滥却无预算',
    detail: '投流和表单来的咨询大量是比价党、白嫖党和同行，销售越跟越累。',
  },
  {
    icon: BellRing,
    label: '困境 2',
    title: '昂贵的沟通成本',
    detail: '雅思、留学、跨境、外贸、AI 初创和独立开发者都在为无效沟通买单。',
  },
  {
    icon: X,
    label: '困境 3',
    title: '无效的订阅消耗',
    detail: '软件订阅不能替你判断谁真着急、谁有预算、谁只是路过问一句。',
  },
];

const valueCards = [
  {
    icon: Filter,
    title: '剔除低痛点噪音',
    detail:
      '无论是水军刷屏、同行软文还是泛泛求攻略，AI 都会先拦掉。你看到的是近期还在找机构、找老师、找服务商的人。',
  },
  {
    icon: Target,
    title: '看懂购买意图',
    detail:
      '不仅抓取，更能理解。自动分析贴文中的求推荐、找代运营、寻报价等真实交易意图，并标记出客户所在阶段。',
  },
  {
    icon: Send,
    title: '按样本交付，不做群发',
    detail:
      '每条线索保留来源、痛点摘要、意向评分和建议话术。平台触达由真人低频完成，避免粗暴自动化。',
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fdfdfb] text-slate-950">
      <style>{`
        .lead-home {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        }

        .lead-grid {
          background-image:
            linear-gradient(to right, rgba(15, 23, 42, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.035) 1px, transparent 1px);
          background-size: 30px 30px;
          mask-image: linear-gradient(to bottom, black 0%, black 62%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 62%, transparent 100%);
        }

        .lead-surface {
          background:
            linear-gradient(120deg, rgba(240, 249, 255, 0.88), rgba(255, 255, 255, 0.7) 36%),
            linear-gradient(245deg, rgba(236, 253, 245, 0.86), rgba(255, 255, 255, 0.7) 42%),
            #fdfdfb;
        }

        .lead-glass {
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(226, 232, 240, 0.88);
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.04),
            0 24px 70px rgba(15, 23, 42, 0.07);
          backdrop-filter: blur(18px) saturate(165%);
          -webkit-backdrop-filter: blur(18px) saturate(165%);
        }

        .lead-fade-up {
          animation: leadFadeUp 740ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .lead-scroll {
          animation: leadScroll 24s linear infinite;
        }

        .lead-scroll-slow {
          animation: leadScroll 30s linear infinite;
        }

        .lead-scroll-reverse {
          animation: leadScrollReverse 28s linear infinite;
        }

        .lead-feed:hover .lead-scroll,
        .lead-feed:hover .lead-scroll-slow,
        .lead-feed:hover .lead-scroll-reverse {
          animation-play-state: paused;
        }

        @keyframes leadFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes leadScroll {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }

        @keyframes leadScrollReverse {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lead-fade-up,
          .lead-scroll,
          .lead-scroll-slow,
          .lead-scroll-reverse {
            animation: none;
          }
        }
      `}</style>

      <div className="lead-home lead-surface absolute inset-0" />
      <div className="lead-grid pointer-events-none absolute inset-0" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/70 bg-white/68 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-xl font-semibold text-slate-950">LeadPulse</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-500 md:flex">
            <Link href="#product" className="transition hover:text-slate-950">
              工作流
            </Link>
            <Link href="/pricing" className="transition hover:text-slate-950">
              方案与定价
            </Link>
            <Link href="/faq" className="transition hover:text-slate-950">
              常见问题
            </Link>
          </nav>

          <Link
            href="/book"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            联系方式
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-28 text-center sm:px-6 lg:px-8 lg:pb-20 lg:pt-32">
        <div className="lead-fade-up max-w-5xl">
          <h1 className="text-[3.9rem] font-extrabold leading-[0.94] text-slate-950 sm:text-7xl lg:text-[6.6rem]">
            AI 驱动的线索供应商
          </h1>

          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
            只盯小红书、抖音、推特和 Reddit。
            <br className="hidden md:block" />
            目标客户：雅思机构、留学中介、跨境电商代运营、出海 B2B、AI 初创、独立开发者和自动化服务团队。
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/book"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-base font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
            >
              加微信看样本
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/product"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/78 px-6 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-white sm:w-auto"
            >
              看工作流
            </Link>
          </div>
        </div>

        <div className="lead-fade-up mt-12 w-full max-w-6xl text-left">
          <div className="mb-5 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-500">Social Buyer Intent</div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">四个平台里的三类现金痛点</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {painCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="lead-glass rounded-lg p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
                      {card.label}
                    </div>
                    <Icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.detail}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="lead-fade-up mt-16 w-full max-w-6xl">
          <div className="lead-glass overflow-hidden rounded-lg text-left">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="text-sm font-semibold text-slate-950">最新高意向内容流</div>
                <div className="mt-1 text-xs text-slate-500">只看小红书、抖音、推特和 Reddit 里近期还在疼的公开需求</div>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                正在过滤噪音
              </div>
            </div>

              <div className="lead-feed relative h-[620px] overflow-hidden bg-slate-50/45 p-3 sm:p-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white/95 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-white/95 to-transparent" />

              <div className="grid gap-3 md:grid-cols-3">
                {signalColumns.map((column, columnIndex) => {
                  const animationClass =
                    columnIndex === 0 ? 'lead-scroll' : columnIndex === 1 ? 'lead-scroll-reverse' : 'lead-scroll-slow';
                  return (
                    <div key={columnIndex} className="h-[580px] overflow-hidden">
                      <div className={`${animationClass} space-y-3`}>
                        {[...column, ...column].map((signal, index) => (
                          <article
                            key={`${signal.source}-${index}`}
                            className={[
                              'rounded-lg border bg-white p-4 shadow-sm',
                              signal.score >= 90 ? 'border-amber-200 shadow-[0_12px_28px_rgba(15,23,42,0.07)]' : 'border-slate-200',
                            ].join(' ')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                                  <MessageSquareText className="h-3.5 w-3.5 text-blue-600" />
                                  {signal.source}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">{signal.time}</div>
                              </div>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                评分 {signal.score}
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-7 text-slate-800">“{signal.quote}”</p>

                            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                              <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">AI 分析</div>
                              <p className="mt-2 text-sm leading-7 text-slate-700">{signal.analysis}</p>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                阶段：{signal.stage}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">{signal.action}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="relative z-10 border-y border-slate-200/70 bg-white/86 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">我们不卖软件幻觉，我们卖可跟进的线索。</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
              传统舆情工具只会给你一堆关键词结果。LeadPulse 用 Manifest 意图路由先判断复杂度和具体度，再让 AI 看懂上下文，优先筛出正在问推荐、问价格、找服务商、抱怨线索质量的人。
          </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {valueCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-lg border border-slate-200 bg-[#fbfbf8] p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.detail}</p>

                  {index === 1 ? (
                    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        “有没有靠谱老师/机构/代运营，预算可以谈”
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 line-through">
                        <X className="h-4 w-4 text-slate-300" />
                        “这篇内容挺有用先收藏了”
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-4">
            {workflow.map((step, index) => (
              <article key={step.title} className="rounded-lg border border-slate-200 bg-white/82 p-5 shadow-sm">
                <div className="font-mono text-sm text-slate-400">0{index + 1}</div>
                <h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200/70 bg-white px-4 py-10 text-sm text-slate-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-950">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 text-white">
              <Activity className="h-3.5 w-3.5" />
            </span>
            LeadPulse
          </div>

          <div className="flex flex-wrap gap-6 font-medium">
            <Link href="#product" className="transition hover:text-slate-950">
              产品
            </Link>
            <Link href="/pricing" className="transition hover:text-slate-950">
              定价
            </Link>
            <Link href="/privacy" className="transition hover:text-slate-950">
              隐私政策
            </Link>
          </div>

          <div>2026 LeadPulse. 专注精准获客.</div>
        </div>
      </footer>
    </main>
  );
}
