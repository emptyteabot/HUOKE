"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, MessageSquareText, Radar, ShieldCheck } from "lucide-react";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getOrCreateClientUserId } from "@/lib/client_user";

type LeadSummary = {
  total_rows: number;
  target_rows: number;
  score_ge_65_rows: number;
  dm_ready_rows: number;
};

const steps = [
  {
    title: "抓评论区和搜索里的高意图表达",
    detail: "只抓“求推荐、预算、避雷、找谁做、怎么做”这类会直接影响成交的话。",
  },
  {
    title: "先剔除同行、机构号和噪声",
    detail: "名单不是越大越好，先把不能转化的样本拿掉，剩下的才值得私信。",
  },
  {
    title: "一键导出成可触达名单",
    detail: "导出后直接拿到主页/帖子入口，进入首轮触达，不再靠表格手工拼。",
  },
];

const proofRows = [
  {
    label: "你真正买到的",
    value: "不是后台，不是 CRM，而是一批已经带有购买意图的可触达名单。",
  },
  {
    label: "最短使用方式",
    value: "先看 5-10 条真实样本，再决定要不要开软件版或人工代跑版。",
  },
  {
    label: "不再承诺的东西",
    value: "不卖大而全的复杂后台，不先讲部署和体系，只卖高意图名单。",
  },
];

export default function HomePage() {
  const [summary, setSummary] = useState<LeadSummary | null>(null);
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
      } catch {
        setSummary(null);
      }
    };
    if (userId) run();
  }, [userId]);

  return (
    <main className="min-h-screen bg-[#f5f5ef] text-slate-900">
      <SiteHeader ctaHref="/book" ctaLabel="预约拿样本" />

      <section className="mx-auto max-w-7xl px-6 pb-8 pt-16 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="fade-up">
            <div className="apple-pill breathing-pill inline-flex px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#86868b]">
              小红书 / 抖音 / X 评论区高意图线索
            </div>
            <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-slate-950 md:text-[4rem] md:leading-[1.02]">
              自动捕获小红书 / 抖音 / X 评论区高意图线索，
              <br />
              一键拿到可触达名单。
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              LeadPulse 只做一件事：把公开平台里已经在问“找谁、多少钱、怎么做”的人，清洗成你能立刻私信的名单。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register?plan=free"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                先看样本
              </Link>
              <Link
                href="/pricing"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white/88 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-white hover:text-slate-950"
              >
                看价格
              </Link>
              <Link
                href="/book"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white/88 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-white hover:text-slate-950"
              >
                预约人工代跑
              </Link>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {proofRows.map((item) => (
                <div
                  key={item.label}
                  className="interactive-panel rounded-2xl border border-black/5 bg-white/82 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_12px_40px_rgba(15,23,42,0.04)]"
                >
                  <div className="font-semibold text-slate-950">{item.label}</div>
                  <div className="mt-2">{item.value}</div>
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
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">当前样本池</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">这不是空话，是现成盘子</h2>
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
                  <div className="text-xs text-slate-500">可私信入口</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{summary?.dm_ready_rows ?? "--"}</div>
                </div>
              </div>
            </section>

            <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/88 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">怎么用</div>
              <div className="mt-4 space-y-3">
                {steps.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <MessageSquareText className="h-5 w-5 text-slate-900" />
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">对比</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">你不是缺流量，你是缺已经在问问题的人</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                "社媒监听工具告诉你哪里有人提到你，但不会交付可私信名单。",
                "评论自动化工具会回消息，但不会先剔除同行和机构号。",
                "CRM 会管理进入系统的人，但不会替你从评论区里抓真实需求。",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="interactive-panel rounded-[2rem] border border-black/5 bg-white/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-slate-900" />
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">交付方式</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">先买结果，再决定要不要自己操盘</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                "Free：先看 5-10 条真实样本，验证系统能不能抓到高意图名单。",
                "Pro：给你软件和控制台，名单你自己导出、自己触达、自己承担平台风控。",
                "Max / DFY：我们人工代跑、人工审查、每周交付名单，并代发首轮破冰私信。",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-black/5 bg-[#f8f8f4] px-4 py-4 text-sm leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register?plan=free"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:border-black/15 hover:bg-[#fbfbf8]"
              >
                先拿样本
              </Link>
              <Link
                href="/pricing"
                className="interactive-button inline-flex items-center rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-black/15 hover:bg-[#fbfbf8] hover:text-slate-950"
              >
                看定价
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
