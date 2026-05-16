import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Filter,
  Globe,
  MessageSquareText,
  MessagesSquare,
  Play,
  Rss,
  Send,
  Target,
  Twitter,
  X,
} from 'lucide-react';

type Signal = {
  source: string;
  time: string;
  quote: string;
  analysis: string;
  stage: string;
  score: number;
  action: string;
};

const painCards = [
  {
    icon: Filter,
    label: '困境 1',
    title: '线索泛滥，却无预算',
    detail: '传统表单收到的大半线索只是路过。销售花了时间，最后却发现对方根本没准备掏钱。',
  },
  {
    icon: BellRing,
    label: '困境 2',
    title: '沟通成本太高',
    detail: '一轮轮发现电话打下去，结果预算只有几百美元。对团队来说，这不是获客，是消耗。',
  },
  {
    icon: X,
    label: '困境 3',
    title: '订阅费在烧，结果没变',
    detail: '静态表单工具只能收集，不能筛人。团队持续付月费，却拦不住垃圾询盘继续挤进来。',
  },
];

const valueCards = [
  {
    icon: Filter,
    title: '剔除 98% 的噪音软文',
    detail: '无论是水军刷屏、同行软文还是无意义吐槽，AI 都会先识别，再过滤。留下来的，才值得销售继续看。',
  },
  {
    icon: Target,
    title: '看懂购买意图',
    detail: '不只抓词，还要看上下文。求推荐、找代运营、寻报价，这些真实交易信号都会被标出来。',
  },
  {
    icon: Send,
    title: '无缝推送到您的系统',
    detail: '发现商机后，结果可以直接进企业微信、飞书或 CRM。原文链接、判断和下一步动作一并带走。',
  },
];

const leadSignals: Signal[] = [
  {
    source: 'Reddit / r/SaaS',
    time: '刚刚',
    quote: 'We need a way to filter out buyers who are only asking for free advice.',
    analysis: '对方已经把问题说成筛选和预算，说明不是泛聊，是采购前的真实摸底。',
    stage: '预算核对',
    score: 96,
    action: '先给样本，再问预算',
  },
  {
    source: '小红书评论',
    time: '2 分钟前',
    quote: '有没有能直接看出谁真想买，谁只是来问问的人？',
    analysis: '已经把痛点从曝光转成结果，适合直接发样本和对照案例。',
    stage: '工具采购',
    score: 93,
    action: '发 1 页样本',
  },
  {
    source: '知乎问答',
    time: '5 分钟前',
    quote: '我们现在最缺的是能快速判断预算和意向的办法。',
    analysis: '预算和意向同时出现，属于高概率可转化线索，不是泛问。',
    stage: '方案比较',
    score: 91,
    action: '约 15 分钟电话',
  },
  {
    source: '行业论坛',
    time: '7 分钟前',
    quote: '想找一个能直接看出客户是不是准备买的人，不要只给我关键词。',
    analysis: '对关键词方案已经失望，正在找更接近实际成交的判断方式。',
    stage: '替换方案',
    score: 94,
    action: '发案例截图',
  },
  {
    source: 'X / Twitter',
    time: '9 分钟前',
    quote: 'Looking for a lead gen partner that can actually qualify intent, not just scrape data.',
    analysis: '表达很明确，想买的是筛选和判断，不是数据堆积。',
    stage: '意图筛选',
    score: 95,
    action: '直接报价',
  },
  {
    source: '微信群留言',
    time: '12 分钟前',
    quote: '老板要的是能直接推进成交的线索，不是再来一堆表格。',
    analysis: '团队内部已经开始替老板找结果导向工具，采购链路在变短。',
    stage: '结果导向',
    score: 90,
    action: '发工作流',
  },
  {
    source: 'Reddit / r/Entrepreneur',
    time: '15 分钟前',
    quote: 'Budget is there, we just need help finding real buyers.',
    analysis: '预算存在，问题变成找真实买家，已经进入服务筛选阶段。',
    stage: '真实买家',
    score: 92,
    action: '给对照样本',
  },
  {
    source: 'Facebook Group',
    time: '18 分钟前',
    quote: 'Anyone know a team that can send qualified meetings, not random names?',
    analysis: '明确要求合格会议，说明对“名单”本身不感兴趣。',
    stage: '会议质量',
    score: 89,
    action: '发会议样本',
  },
  {
    source: '公众号留言',
    time: '20 分钟前',
    quote: '可以先给我看两条能直接跟进的样本吗？',
    analysis: '对样本有要求，属于已经进入评估，而不是随口问问。',
    stage: '样本评估',
    score: 87,
    action: '先发两条',
  },
  {
    source: '行业社群',
    time: '22 分钟前',
    quote: '我们想要能写进日历的客户，不想再看噪音。',
    analysis: '把结果标准说得很直白，属于对高意向结果的明确追求。',
    stage: '结果交付',
    score: 95,
    action: '约会议',
  },
  {
    source: '知乎评论',
    time: '24 分钟前',
    quote: '有没有办法直接把真正要买的人筛出来？',
    analysis: '核心问题已经是筛选，不是曝光，适合进入下一轮对话。',
    stage: '筛选',
    score: 88,
    action: '发样本页',
  },
  {
    source: 'Reddit / r/marketing',
    time: '26 分钟前',
    quote: 'We do not need more traffic. We need better buying signals.',
    analysis: '直接讲购买信号，说明目标已经从流量转成线索质量。',
    stage: '购买信号',
    score: 94,
    action: '发案例',
  },
];

const signalColumns = [leadSignals.slice(0, 4), leadSignals.slice(4, 8), leadSignals.slice(8, 12)];

export default function HomePage() {
  return (
    <main className="lead-surface relative min-h-screen overflow-hidden bg-[#fdfdfb] text-slate-950">
      <div className="lead-grid-bg pointer-events-none absolute inset-0" />

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-xl font-semibold text-slate-950">LeadPulse</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-500 md:flex">
            <Link href="#product" className="transition hover:text-slate-950">
              产品
            </Link>
            <Link href="/pricing" className="transition hover:text-slate-950">
              定价
            </Link>
            <Link href="/faq" className="transition hover:text-slate-950">
              常见问题
            </Link>
          </nav>

          <Link
            href="/book"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            立即获取高意向线索
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-24 text-center sm:px-6 lg:px-8 lg:pb-20 lg:pt-28">
        <div className="lead-fade-up max-w-5xl">
          <div className="text-[2.1rem] font-black leading-none tracking-tight text-slate-950 sm:text-[2.8rem]">
            销售的精力，应该用在逼单。
          </div>

          <h1 className="mt-5 text-[3.1rem] font-extrabold leading-[1.05] text-slate-950 sm:text-6xl lg:text-[5.2rem]">
            您的下一个大单，此刻正在某个行业论坛里询问选型方案。
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
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
              href="/demo"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/78 px-6 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-white sm:w-auto"
            >
              <Play className="h-4 w-4" />
              查看工作流演示
            </Link>
          </div>
        </div>

        <div className="lead-fade-up mt-12 grid w-full max-w-4xl gap-3 text-sm text-slate-500 sm:grid-cols-3">
          <div className="lead-card px-4 py-3">过滤公开讨论里的购买信号</div>
          <div className="lead-card px-4 py-3">只把高意向客户推到您面前</div>
          <div className="lead-card px-4 py-3">样本线索持续滚动展示</div>
        </div>

        <div className="lead-fade-up mt-14 w-full max-w-6xl text-left">
          <div className="mb-5 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-500">B2B Funnel Failure</div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">B 端获客漏斗的三大死穴</h2>
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
                <div className="text-sm font-semibold text-slate-950">全网高意向线索流</div>
                <div className="mt-1 text-xs text-slate-500">留言区、评论区、论坛里正在出现的真实采购信号</div>
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
                              signal.score >= 94 ? 'border-amber-200 shadow-[0_12px_28px_rgba(15,23,42,0.07)]' : 'border-slate-200',
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
                                {signal.score}
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
              传统舆情工具只会丢给你一堆关键词链接。LeadPulse 会先理解上下文，再把真的准备掏钱的人送到你面前。
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
                        样本句子
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-500">
                        <div>“麻烦私信下报价单”</div>
                        <div>“这篇测评写的真不错”</div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-900">看懂购买意图</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                不仅抓取，更能判断。自动识别“求推荐”“找代运营”“寻报价”等真实交易意图，并标记所处阶段。
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-900">无缝推送到您的系统</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                发现商机后，结构化结果和原文链接可以直接进企业微信、飞书或 CRM，销售拿到就能接着跟。
              </p>
            </article>
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

          <div>LeadPulse · 专注精准获客</div>
        </div>
      </footer>
    </main>
  );
}
