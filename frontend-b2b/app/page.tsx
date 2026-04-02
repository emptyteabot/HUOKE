"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrCreateClientUserId } from "@/lib/client_user";

type LeadSummary = {
  total_rows: number;
  filtered_rows: number;
  target_rows: number;
  competitor_rows: number;
  dm_ready_rows: number;
  score_ge_65_rows: number;
};

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
    <div className="lp-shell">
      <section className="lp-card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="lp-badge" style={{ marginBottom: 10 }}>留学赛道 · AI 获客 SaaS</div>
        <h1 style={{ fontSize: 34, margin: "4px 0 10px", lineHeight: 1.2 }}>LeadPulse Revenue OS</h1>
        <p style={{ margin: 0, color: "var(--lp-muted)", fontSize: 15 }}>
          <span className="lp-typewriter">目标输入 → 自动筛选 → 积分导出 → 私信触达</span>
        </p>

        <div className="lp-grid lp-grid-4" style={{ marginTop: 18 }}>
          <div className="lp-card" style={{ padding: 14 }}>
            <div style={{ color: "var(--lp-muted)", fontSize: 12 }}>总样本</div>
            <div className="lp-kpi">{summary?.total_rows ?? "--"}</div>
          </div>
          <div className="lp-card" style={{ padding: 14 }}>
            <div style={{ color: "var(--lp-muted)", fontSize: 12 }}>高分线索</div>
            <div className="lp-kpi">{summary?.score_ge_65_rows ?? "--"}</div>
          </div>
          <div className="lp-card" style={{ padding: 14 }}>
            <div style={{ color: "var(--lp-muted)", fontSize: 12 }}>目标线索</div>
            <div className="lp-kpi">{summary?.target_rows ?? "--"}</div>
          </div>
          <div className="lp-card" style={{ padding: 14 }}>
            <div style={{ color: "var(--lp-muted)", fontSize: 12 }}>可用积分</div>
            <div className="lp-kpi">{credits ?? "--"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <Link className="lp-btn" href="/dashboard">进入作战中枢</Link>
          <Link className="lp-btn" href="/dashboard/leads">查看潜在客户</Link>
          <Link className="lp-btn" href="/dashboard/ai">生成触达文案</Link>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>商业化卖点</div>
        <div style={{ color: "var(--lp-muted)", fontSize: 14, lineHeight: 1.8 }}>
          1) OpenClaw 半天自动采集各平台帖子+评论。<br />
          2) AI 自动筛掉同行机构，保留高意向潜在客户。<br />
          3) 前台默认隐藏私信主页链接，前3次免费导出，之后按积分解锁。
        </div>
      </section>
    </div>
  );
}

