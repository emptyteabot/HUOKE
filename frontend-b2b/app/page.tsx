"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  MessageSquareText,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getOrCreateClientUserId } from "@/lib/client_user";

type LeadSummary = {
  total_rows: number;
  filtered_rows: number;
  target_rows: number;
  competitor_rows: number;
  dm_ready_rows: number;
  score_ge_65_rows: number;
};

const platformCards = [
  {
    title: "小红书式首屏",
    icon: Search,
    pattern: "先把最重要的信息前置，减少用户判断成本，不让价值埋在第二屏。",
    translation: "LeadPulse 首屏直接给 proof、结果、路径和 CTA，不再像后台首页。",
  },
  {
    title: "抖音式收口",
    icon: MessageSquareText,
    pattern: "不是只发内容，而是把评论、搜索、咨询和线索表单快速收口。",
    translation: "LeadPulse 先抓高意向需求表达，再推进预约、付款和交付。",
  },
  {
    title: "X 式观点钩子",
    icon: TrendingUp,
    pattern: "先给明确观点和变化，再展示过程，避免一上来就讲复杂功能。",
    translation: "LeadPulse 先说清你为什么会多拿到客户，再解释系统怎么运转。",
  },
];

const compareRows = [
  {
    category: "评论机器人",
    weakness: "会回，但不筛人，也不判断是不是同行。",
    leadpulse: "先判断意图和竞争关系，再决定要不要导出与触达。",
  },
  {
    category: "代运营工作室",
    weakness: "会发很多内容，但你很难知道哪条真正带来商机。",
    leadpulse: "把线索、消息、预约、付款都放进同一条可追踪路径。",
  },
  {
    category: "AI 文案工具",
    weakness: "会生成很多文案，但没有真实线索和推进动作。",
    leadpulse: "先拿到人，再给文案，再把消息和任务接起来。",
  },
  {
    category: "投流工具",
    weakness: "会优化流量，但不会替你承接评论区和私信里的即时需求。",
    leadpulse: "先抓平台里的主动需求表达，再用更短路径推进成交。",
  },
];

const executionSteps = [
  {
    title: "先抓已经在问问题的人",
    detail: "找“求推荐、预算、避雷、怎么做、找谁”的表达，而不是先发更多内容。",
  },
  {
    title: "再筛掉无效样本和同行",
    detail: "把同行、机构号、噪声号先剔掉，保留更值得联系的人。",
  },
  {
    title: "然后导出并解锁触达入口",
    detail: "导出时同步解锁主页/帖子链接，团队能立刻开始私信和跟进。",
  },
  {
    title: "最后把预约、付款和交付接上",
    detail: "不是拿到名单就结束，而是一路推进到 booking、payment 和 start。",
  },
];

export default function HomePage() {
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [userId, setUserId] = useState("guest_demo");

  useEffect(() => {
    setUserId(getOrCreateClientUserId());
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const qs = new URLSearchParams({
          limit: "1",
          minScore: "65",
          onlyTarget: "1",
          excludeCompetitors: "1",
          userId,
        });
        const res = await fetch(`/api/leads?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        setSummary(data?.summary || null);

        const cRes = await fetch(`/api/credits?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
        const cData = await cRes.json().catch(() => ({}));
        setCredits(typeof cData?.wallet?.credits === "number" ? cData.wallet.credits : null);
      } catch {
        setSummary(null);
        setCredits(null);
      }
    };
    if (userId) run();
  }, [userId]);

  return (
    <main className="min-h-screen bg-[#f5f5ef] text-slate-900">
      <SiteHeader ctaHref="/register?plan=free" ctaLabel="先开 Free" />

      <section className="mx-auto max-w-7xl px-6 pb-8 pt-16 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="fade-up">
            <div className="apple-pill breathing-pill inline-flex px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
              小红书 / 抖音 / X 意图信号
            </div>
            <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-slate-950 md:text-[4rem] md:leading-[1.02]">
              别再先发 100 条内容。
              <br />
              先抓已经在问“多少钱、找谁、怎么做”的人。
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              LeadPulse 把平台原生内容打法、评论/搜索意图、预约、付款和交付收进同一条更短路径。
              不是再加一个 AI 功能，而是把“发现需求的人”到“推进成交”之间的空档补上。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register?plan=free"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                先开 Free
              </Link>
              <Link
                href="/book"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white/88 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-white hover:text-slate-950"
              >
                预约 15 分钟
              </Link>
              <Link
                href="/pay?plan=pro"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white/88 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-white hover:text-slate-950"
              >
                直接开通 Pro
              </Link>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                "公开站先讲价值，不再像后台首页。",
                "线索、消息、预约、付款和启动页接成一条线。",
                "保留内部中枢，但默认不把客户直接丢进后台。",
              ].map((item) => (
                <div
                  key={item}
                  className="interactive-panel rounded-2xl border border-black/5 bg-white/82 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_12px_40px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 fade-up-delay">
            <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                  <Radar className="h-5 w-5 text-slate-900" />
                </div>
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Live proof</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">现在系统里有什么</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                  <div className="text-xs text-slate-500">总样本</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{summary?.total_rows ?? "--"}</div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                  <div className="text-xs text-slate-500">高分线索</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{summary?.score_ge_65_rows ?? "--"}</div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                  <div className="text-xs text-slate-500">目标线索</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{summary?.target_rows ?? "--"}</div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                  <div className="text-xs text-slate-500">当前积分</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{credits ?? "--"}</div>
                </div>
              </div>
            </section>

            <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Today flow</div>
              <div className="mt-4 space-y-3">
                {[
                  {
                    icon: Clock3,
                    title: "20:00-23:00 小红书 / 抖音",
                    detail: "优先抓评论区求助、预算焦虑、求推荐、避雷和“有没有人做过”这类表达。",
                  },
                  {
                    icon: Sparkles,
                    title: "实时筛掉同行和噪声",
                    detail: "不让机构号、内容搬运号和泛娱乐噪声混进导出结果里。",
                  },
                  {
                    icon: BadgeCheck,
                    title: "导出即进入推进",
                    detail: "解锁主页链接、拿文案草稿、继续 booking / payment / start。",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                      </div>
                      <div className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {platformCards.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3 w-fit">
                  <Icon className="h-5 w-5 text-slate-900" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.pattern}</p>
                <div className="mt-5 rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                  {item.translation}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-[#f7f7f2] p-3">
                <ShieldCheck className="h-5 w-5 text-slate-900" />
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Why it wins</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">不是再堆功能，而是先缩短成交路径</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {executionSteps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-black/5 bg-[#f8f8f4] p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Step {index + 1}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{step.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">{step.detail}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Compare</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">比常见竞品路径更短</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="lp-table">
                <thead>
                  <tr>
                    <th>常见做法</th>
                    <th>容易卡住的地方</th>
                    <th>LeadPulse</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.category}>
                      <td>{row.category}</td>
                      <td>{row.weakness}</td>
                      <td>{row.leadpulse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="interactive-panel rounded-[2rem] border border-black/5 bg-white/92 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Next step</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">先跑一轮，再决定要不要放大</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                公开页现在先讲客户价值，不再把访客直接丢进内部后台。你可以先开 Free 看路径，再预约诊断，或者直接开 Pro 把 booking、payment 和 start 接起来。
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-3 xl:justify-end">
              <Link
                href="/register?plan=free"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                先开 Free
              </Link>
              <Link
                href="/book"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                预约诊断
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

          <div className="mt-6 text-xs leading-6 text-slate-500">
            内部使用入口保留在
            <Link href="/login" className="mx-1 font-semibold text-slate-700 underline underline-offset-4">
              /login
            </Link>
            ，公开流量默认不进入后台。
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
