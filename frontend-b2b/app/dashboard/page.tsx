"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrCreateClientUserId } from "@/lib/client_user";

type LeadRow = {
  external_id: string;
  platform: string;
  author: string;
  keyword: string;
  score: number;
  intent_level: string;
  is_target: boolean;
  is_competitor: boolean;
  dm_ready: boolean;
  author_url: string;
  post_url: string;
  content: string;
};

type LeadsPayload = {
  generated_at: string;
  source?: string;
  entitlements?: {
    links_unlocked?: boolean;
    credits?: number;
  };
  summary: {
    total_rows: number;
    filtered_rows: number;
    target_rows: number;
    competitor_rows: number;
    dm_ready_rows: number;
    score_ge_65_rows: number;
    platform_counts: Record<string, number>;
  };
  rows: LeadRow[];
};

export default function DashboardPage() {
  const [data, setData] = useState<LeadsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("guest_demo");

  useEffect(() => {
    setUserId(getOrCreateClientUserId());
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({
          limit: "20",
          minScore: "65",
          onlyTarget: "1",
          excludeCompetitors: "1",
          userId,
        });
        const res = await fetch(`/api/leads?${qs.toString()}`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "load_failed");
        setData(payload);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    if (userId) run();
  }, [userId]);

  const summary = data?.summary;
  const linksUnlocked = Boolean(data?.entitlements?.links_unlocked);

  return (
    <div className="lp-grid" style={{ gap: 14 }}>
      <section className="lp-card" style={{ padding: 16 }}>
        <div className="lp-grid lp-grid-4">
          <div>
            <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>线索总量</div>
            <div className="lp-kpi">{summary?.total_rows ?? "--"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>目标线索</div>
            <div className="lp-kpi">{summary?.target_rows ?? "--"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>高分(≥65)</div>
            <div className="lp-kpi">{summary?.score_ge_65_rows ?? "--"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>可私信主页</div>
            <div className="lp-kpi">{summary?.dm_ready_rows ?? "--"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <Link href="/dashboard/leads" className="lp-btn">筛选潜在客户</Link>
          <Link href="/dashboard/messages" className="lp-btn">查看消息草稿</Link>
          <Link href="/dashboard/tasks" className="lp-btn">推进任务</Link>
          <Link href="/dashboard/billing" className="lp-btn">账单与额度</Link>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>最新高意向线索（Top 20）</div>
          <div style={{ color: "var(--lp-muted)", fontSize: 13 }}>
            主页链接状态：{linksUnlocked ? "已解锁" : "已锁定（导出后可见）"}
          </div>
        </div>

        {loading ? <div>加载中...</div> : null}
        {error ? <div style={{ color: "#c62828" }}>加载失败：{error}</div> : null}

        {!loading && !error ? (
          <div style={{ overflowX: "auto" }}>
            <table className="lp-table">
              <thead>
                <tr>
                  <th>平台</th>
                  <th>作者</th>
                  <th>分数</th>
                  <th>意向</th>
                  <th>关键词</th>
                  <th>主页</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows || []).map((row) => (
                  <tr key={row.external_id}>
                    <td>{row.platform}</td>
                    <td>{row.author}</td>
                    <td>{row.score}</td>
                    <td>{row.intent_level}</td>
                    <td>{row.keyword || "-"}</td>
                    <td>
                      {row.author_url ? (
                        <a href={row.author_url} target="_blank" rel="noreferrer" style={{ color: "#0d61cb" }}>
                          查看主页
                        </a>
                      ) : row.dm_ready ? (
                        <span style={{ color: "#b26a00" }}>导出后可见</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
