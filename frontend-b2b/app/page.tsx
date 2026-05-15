import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Filter,
  MessageSquareText,
  Play,
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
    source: '小红书留言',
    time: '刚刚',
    quote: '做本地生活代运营的团队有没有靠谱推荐？想找能直接给报价和案例的，预算别太离谱。',
    analysis: '明显在比较服务商，已经把“报价”和“案例”摆到台面上了，属于可以直接接触的询价阶段。',
    stage: '比较 / 询价',
    score: 94,
    action: '发案例，顺手问预算和时间窗',
    tags: ['找代运营', '要报价', '有预算'],
  },
  {
    source: '行业论坛',
    time: '3 分钟前',
    quote: '我们公司销售团队扩到 30 人了，表格管不住线索，有没有适合中小团队的系统？最好能这周演示。',
    analysis: '团队扩张和本周演示同时出现，说明采购节奏已经打开，适合马上推进约时间。',
    stage: '选型中',
    score: 91,
    action: '直接提演示和场景样本',
    tags: ['团队扩张', '本周演示', '选型中'],
  },
  {
    source: '知乎回答区',
    time: '7 分钟前',
    quote: '想换一套客户管理工具，现在最关心的是迁移成本和后续培训，求真实使用过的人推荐。',
    analysis: '不是随口问问，而是在认真算迁移和培训成本，属于准备替换前的高质量意图。',
    stage: '准备替换',
    score: 88,
    action: '给迁移方案和落地流程',
    tags: ['准备替换', '关心成本', '求推荐'],
  },
  {
    source: '海外 SaaS 社区',
    time: '12 分钟前',
    quote: 'We are planning to replace our CRM and rebuild the sales workflow. Looking for a team of around 20 people.',
    analysis: '对方已经在重建销售流程，需求不是了解概念，而是找能落地的方案。',
    stage: '方案比较',
    score: 85,
    action: '发流程图和实施节奏',
    tags: ['CRM 选型', '销售流程', '明确需求'],
  },
  {
    source: '微信群截图',
    time: '1 分钟前',
    quote: '谁有靠谱的获客系统？老板要求这个月看到线索质量，别再给我关键词垃圾链接了。',
    analysis: '验收周期很近，而且已经明确排斥垃圾线索，属于要结果的强需求。',
    stage: '结果导向',
    score: 90,
    action: '先给样本，再讲结果',
    tags: ['急需线索', '本月验收', '排斥垃圾'],
  },
  {
    source: '公众号评论',
    time: '5 分钟前',
    quote: '文章里提到的那个私域成交工具能私信报价吗？我们教育团队想先试一轮。',
    analysis: '主动问价格，还愿意先试一轮，说明已经过了“看看而已”的阶段。',
    stage: '试单',
    score: 87,
    action: '私信报价，顺手约时间',
    tags: ['私信报价', '教育团队', '先试一轮'],
  },
  {
    source: '海外营销社区',
    time: '6 分钟前',
    quote: 'We need someone to filter out buyers, not just scrape posts. Looking for people with real budget.',
    analysis: '对方要的不是信息，而是能筛出有预算的人，属于采购前的高意向诉求。',
    stage: '采购前',
    score: 93,
    action: '先给筛选逻辑和样本',
    tags: ['有预算', '要线索', '非名单'],
  },
  {
    source: '小红书评论',
    time: '14 分钟前',
    quote: '这类服务一般多少钱？我们品牌号刚起步，想找人代跑一批精准客户。',
    analysis: '询价非常直接，而且提到了“精准客户”，不是路过围观，是真的要启动。',
    stage: '询价',
    score: 86,
    action: '先给起步方案和样本',
    tags: ['询价', '代跑需求', '精准客户'],
  },
  {
    source: '行业社群',
    time: '2 分钟前',
    quote: '求推荐靠谱的销售自动化工具，能不能先看样本？合适的话可以直接约时间聊。',
    analysis: '先看样本再决定，说明只差确认质量，推进速度会很快。',
    stage: '样本确认',
    score: 89,
    action: '发样本，跟进约时间',
    tags: ['看样本', '约时间', '销售自动化'],
  },
  {
    source: '海外营销社区',
    time: '6 分钟前',
    quote: 'We want a team that can find people with actual budget, not just random names.',
    analysis: '对结果要求很明确，已经不是普通咨询，而是找人来直接承担获客结果。',
    stage: '结果确认',
    score: 92,
    action: '给结果样本和交付边界',
    tags: ['有预算', '要结果', '强目标'],
  },
  {
    source: '知识星球',
    time: '10 分钟前',
    quote: '有没有能监控同行评论区的方案？主要想找正在问价格、问推荐的人。',
    analysis: '问题非常聚焦，目标就是抓正在比较的人，属于清晰的工具采购需求。',
    stage: '工具采购',
    score: 83,
    action: '讲监控范围和样本质量',
    tags: ['评论区', '问价格', '问推荐'],
  },
  {
    source: '贴吧帖子',
    time: '16 分钟前',
    quote: '公司要找外包做获客，老板说先拿一批样本看质量，有做过的朋友吗？',
    analysis: '先样本后判断，标准试单心态，后续很容易推进到正式合作。',
    stage: '试单前',
    score: 84,
    action: '先给一批真实样本',
    tags: ['外包获客', '看质量', '采购前'],
  },
];

const signalColumns = [
  leadSignals.slice(0, 4),
  leadSignals.slice(4, 8),
  leadSignals.slice(8, 12),
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
    detail: '识别求推荐、寻报价、找代运营、想演示等交易信号。',
  },
  {
    title: '推给销售',
    detail: '把该跟进的人送到团队面前，让销售把精力放回逼单。',
  },
];

const valueCards = [
  {
    icon: Filter,
    title: '剔除 98% 的噪音软文',
    detail:
      '无论是水军刷屏、同行软文还是无意义的吐槽，AI 都能精准识别并过滤。销售拿到的线索池，每一条都清澈见底。',
  },
  {
    icon: Target,
    title: '看懂购买意图',
    detail:
      '不仅抓取，更能理解。自动分析贴文中的求推荐、找代运营、寻报价等真实交易意图，并标记出客户所在阶段。',
  },
  {
    icon: Send,
    title: '无缝推送到您的系统',
    detail:
      '发现商机后，立刻通过企业微信、飞书通知团队，或直接推入您的 CRM，原文链接和关键信息一并带上。',
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
            开始免费体验
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-28 text-center sm:px-6 lg:px-8 lg:pb-20 lg:pt-32">
        <div className="lead-fade-up max-w-5xl">
          <h1 className="text-[3.4rem] font-extrabold leading-[1.04] text-slate-950 sm:text-7xl lg:text-[5.5rem]">
            销售的精力，应该用在逼单。
          </h1>

          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
            您的下一个大单，此刻正在某个行业论坛里询问选型方案。
            <br className="hidden md:block" />
            LeadPulse 通过 AI 语义网络 7x24 小时过滤全网噪音，只为您提取带有明确采购意向的精准商机。
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/book"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-base font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
            >
              立即获取高意向线索
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#workflow"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/78 px-6 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-white sm:w-auto"
            >
              <Play className="h-4 w-4" />
              查看工作流演示
            </Link>
          </div>
        </div>

        <div className="lead-fade-up mt-16 w-full max-w-6xl">
          <div className="lead-glass overflow-hidden rounded-lg text-left">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="text-sm font-semibold text-slate-950">全网高意向留言流</div>
                <div className="mt-1 text-xs text-slate-500">论坛、评论区、社群里的真实采购信号</div>
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
            <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">我们不爬数据，我们提取真相。</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              传统的舆情工具只会给你丢来一堆包含关键词的垃圾链接。LeadPulse 的 AI 引擎真正理解上下文，只把那些真的准备掏钱的客户送到你面前。
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
                        “麻烦私信下报价单”
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 line-through">
                        <X className="h-4 w-4 text-slate-300" />
                        “这篇测评写的真不错”
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
