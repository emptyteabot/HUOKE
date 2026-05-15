import { MessageSquareText, Zap } from 'lucide-react';

type LeadSignal = {
  source: string;
  time: string;
  quote: string;
  analysis: string;
  stage: string;
  score: number;
  action: string;
};

const leadSignals: LeadSignal[] = [
  {
    source: '小红书留言',
    time: '刚刚',
    quote: '做本地生活代运营的团队有没有靠谱推荐？想找能直接给报价和案例的，预算别太离谱。',
    analysis: '已经进入比较服务商阶段，“报价”和“案例”同时出现，可以直接发样本并追问预算窗口。',
    stage: '比较 / 询价',
    score: 94,
    action: '发案例，顺手问预算',
  },
  {
    source: '行业论坛',
    time: '3 分钟前',
    quote: '我们公司销售团队扩到 30 人了，表格管不住线索，有没有适合中小团队的系统？最好能这周演示。',
    analysis: '团队扩张和本周演示同时出现，采购节奏已经打开，适合马上推进发现电话。',
    stage: '选型中',
    score: 91,
    action: '约本周演示',
  },
  {
    source: '知乎回答区',
    time: '7 分钟前',
    quote: '想换一套客户管理工具，现在最关心的是迁移成本和后续培训，求真实使用过的人推荐。',
    analysis: '不是随口问问，而是在认真计算迁移和培训成本，属于准备替换前的高质量意图。',
    stage: '准备替换',
    score: 88,
    action: '给迁移方案',
  },
  {
    source: '微信群截图',
    time: '1 分钟前',
    quote: '谁有靠谱的获客系统？老板要求这个月看到线索质量，别再给我关键词垃圾链接了。',
    analysis: '验收周期很近，并且明确排斥垃圾线索，属于要结果的强需求。',
    stage: '结果导向',
    score: 90,
    action: '先给样本',
  },
  {
    source: '公众号评论',
    time: '5 分钟前',
    quote: '文章里提到的那个私域成交工具能私信报价吗？我们教育团队想先试一轮。',
    analysis: '主动问价格并愿意先试一轮，已经过了看看而已的阶段。',
    stage: '试单',
    score: 87,
    action: '私信报价',
  },
  {
    source: '海外营销社区',
    time: '6 分钟前',
    quote: 'We need someone to filter out buyers, not just scrape posts. Looking for people with real budget.',
    analysis: '对方要的不是名单，而是能筛出有预算的人，属于采购前的高意向诉求。',
    stage: '采购前',
    score: 93,
    action: '给筛选逻辑',
  },
  {
    source: '知识星球',
    time: '10 分钟前',
    quote: '有没有能监控同行评论区的方案？主要想找正在问价格、问推荐的人。',
    analysis: '目标非常聚焦，就是抓正在比较的人，属于清晰的工具采购需求。',
    stage: '工具采购',
    score: 83,
    action: '讲监控范围',
  },
  {
    source: '贴吧帖子',
    time: '16 分钟前',
    quote: '公司要找外包做获客，老板说先拿一批样本看质量，有做过的朋友吗？',
    analysis: '先样本后判断，标准试单心态，后续容易推进到正式合作。',
    stage: '试单前',
    score: 84,
    action: '交付样本',
  },
  {
    source: 'Reddit',
    time: '12 分钟前',
    quote: 'We are replacing our CRM and rebuilding the sales workflow. Looking for options for a 20-person team.',
    analysis: '已经在重建销售流程，需求不是了解概念，而是找能落地的方案。',
    stage: '方案比较',
    score: 85,
    action: '发流程图',
  },
];

const signalColumns = [leadSignals.slice(0, 3), leadSignals.slice(3, 6), leadSignals.slice(6, 9)];

export function LeadSignalFeed() {
  return (
    <div className="lead-glass overflow-hidden rounded-lg text-left">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="text-sm font-bold text-slate-950">全网高意向留言流</div>
          <div className="mt-1 text-xs text-slate-500">论坛、评论区、社群里的真实采购信号</div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          正在过滤噪音
        </div>
      </div>

      <div className="lead-feed relative h-[560px] overflow-hidden bg-slate-50/45 p-3 sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white/95 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-white/95 to-transparent" />

        <div className="grid gap-3 md:grid-cols-3">
          {signalColumns.map((column, columnIndex) => {
            const animationClass =
              columnIndex === 0 ? 'lead-scroll' : columnIndex === 1 ? 'lead-scroll-reverse' : 'lead-scroll-slow';
            return (
              <div key={columnIndex} className="h-[520px] overflow-hidden">
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
                          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                            <MessageSquareText className="h-3.5 w-3.5 text-blue-600" />
                            {signal.source}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">{signal.time}</div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                          <Zap className="h-3 w-3 text-amber-500" />
                          {signal.score}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-slate-800">“{signal.quote}”</p>

                      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="text-[11px] font-bold tracking-[0.18em] text-slate-400">AI 分析</div>
                        <p className="mt-2 text-sm leading-7 text-slate-700">{signal.analysis}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          阶段：{signal.stage}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{signal.action}</span>
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
  );
}
