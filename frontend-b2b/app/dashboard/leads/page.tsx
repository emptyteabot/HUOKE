"use client";

import { useEffect, useMemo, useState } from "react";
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

type WalletInfo = {
  user_id: string;
  credits: number;
  exports_count: number;
  free_export_limit: number;
  free_exports_used: number;
  free_exports_remaining: number;
  last_export_at: string;
  links_unlocked: boolean;
  links_unlocked_until: string;
  export_credit_cost: number;
  link_unlock_hours: number;
};

type LeadsPayload = {
  wallet_token?: string;
  generated_at: string;
  source?: string;
  source_detail?: string;
  locked_link_count?: number;
  entitlements?: WalletInfo;
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

export default function LeadsPage() {
  const [userId, setUserId] = useState("guest_demo");

  const [data, setData] = useState<LeadsPayload | null>(null);
  const [walletToken, setWalletToken] = useState("");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [minScore, setMinScore] = useState(65);
  const [onlyTarget, setOnlyTarget] = useState(true);
  const [excludeCompetitors, setExcludeCompetitors] = useState(true);
  const [limit, setLimit] = useState(200);

  useEffect(() => {
    setUserId(getOrCreateClientUserId());
  }, []);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    q.set("minScore", String(minScore));
    q.set("onlyTarget", onlyTarget ? "1" : "0");
    q.set("excludeCompetitors", excludeCompetitors ? "1" : "0");
    q.set("limit", String(limit));
    q.set("userId", userId);
    if (walletToken) q.set("walletToken", walletToken);
    return q.toString();
  }, [excludeCompetitors, limit, minScore, onlyTarget, userId, walletToken]);

  const loadWallet = async (tokenOverride?: string): Promise<string> => {
    try {
      const q = new URLSearchParams();
      q.set("userId", userId);
      const token = tokenOverride || walletToken;
      if (token) q.set("walletToken", token);

      const res = await fetch(`/api/credits?${q.toString()}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "wallet_load_failed");

      setWallet(payload?.wallet || null);
      const nextToken = String(payload?.wallet_token || token || "");
      if (nextToken) setWalletToken(nextToken);
      return nextToken;
    } catch {
      setWallet(null);
      return tokenOverride || walletToken || "";
    }
  };

  const run = async (tokenOverride?: string): Promise<string> => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams(query);
      const token = tokenOverride || walletToken;
      if (token) q.set("walletToken", token);

      const res = await fetch(`/api/leads?${q.toString()}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "load_failed");

      setData(payload);
      if (payload?.entitlements) {
        setWallet(payload.entitlements);
      }

      const nextToken = String(payload?.wallet_token || token || "");
      if (nextToken) setWalletToken(nextToken);
      return nextToken;
    } catch (e) {
      setError(String(e));
      return tokenOverride || walletToken || "";
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          minScore,
          limit,
          onlyTarget,
          excludeCompetitors,
          vertical: "study_abroad",
          walletToken,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload?.wallet) setWallet(payload.wallet);
        if (payload?.wallet_token) setWalletToken(String(payload.wallet_token));
        throw new Error(payload?.message || payload?.error || `export_failed_${res.status}`);
      }

      const freshToken = res.headers.get("X-LeadPulse-Wallet-Token") || "";
      if (freshToken) setWalletToken(freshToken);

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = (filenameMatch?.[1] || "leadpack-export.csv").trim();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setNotice("导出成功：已扣积分并解锁主页链接。可直接私信触达。");
      const tokenForRefresh = freshToken || walletToken;
      await Promise.all([run(tokenForRefresh), loadWallet(tokenForRefresh)]);
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const token = await loadWallet();
      await run(token);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const linksUnlocked = Boolean(wallet?.links_unlocked);

  return (
    <div className="lp-grid" style={{ gap: 14 }}>
      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700 }}>积分导出权限</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
              免费导出剩余：<b>{wallet?.free_exports_remaining ?? "--"}</b>/<b>{wallet?.free_export_limit ?? 3}</b> 次 ｜ 当前积分：<b>{wallet?.credits ?? "--"}</b> ｜ 单次导出消耗：<b>{wallet?.export_credit_cost ?? 20}</b> 积分
            </div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
              链接状态：{linksUnlocked ? "已解锁" : "未解锁（导出后可见私信主页链接）"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="lp-btn" onClick={exportCsv} disabled={exporting || loading}>
              {exporting ? "导出中..." : "积分导出并解锁链接"}
            </button>
          </div>
        </div>
        {notice ? <div style={{ color: "#0b6f3d", marginTop: 10 }}>{notice}</div> : null}
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>筛选器</div>
        <div className="lp-grid lp-grid-4" style={{ alignItems: "end" }}>
          <label>
            <div style={{ fontSize: 12, color: "var(--lp-muted)", marginBottom: 6 }}>最低分</div>
            <input className="lp-input" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value) || 0)} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: "var(--lp-muted)", marginBottom: 6 }}>返回数量</div>
            <input className="lp-input" type="number" min={20} max={1000} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 200)} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={onlyTarget} onChange={(e) => setOnlyTarget(e.target.checked)} />
            仅目标客户
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={excludeCompetitors} onChange={(e) => setExcludeCompetitors(e.target.checked)} />
            排除竞品/机构
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="lp-btn" onClick={() => run()} disabled={loading}>{loading ? "刷新中..." : "应用筛选"}</button>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>线索结果</div>
          <div style={{ color: "var(--lp-muted)", fontSize: 13 }}>
            匹配 {data?.summary.filtered_rows ?? 0} / 总计 {data?.summary.total_rows ?? 0}
            {typeof data?.locked_link_count === "number" && !linksUnlocked
              ? ` ｜ 已锁定链接 ${data.locked_link_count}`
              : ""}
          </div>
        </div>
        <div style={{ color: "var(--lp-muted)", fontSize: 12, marginTop: 6 }}>
          数据源：{data?.source || "unknown"}
          {data?.source_detail ? ` ｜ ${data.source_detail}` : ""}
        </div>

        {error ? <div style={{ color: "#c62828", marginTop: 10 }}>加载失败：{error}</div> : null}

        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table className="lp-table">
            <thead>
              <tr>
                <th>平台</th>
                <th>作者</th>
                <th>分数</th>
                <th>意向</th>
                <th>关键词</th>
                <th>可私信</th>
                <th>证据</th>
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
                  <td>{row.dm_ready ? "是" : "否"}</td>
                  <td style={{ minWidth: 420 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div>{row.content?.slice(0, 120) || "-"}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {row.author_url ? (
                          <a href={row.author_url} target="_blank" rel="noreferrer" style={{ color: "#0d61cb" }}>
                            主页
                          </a>
                        ) : row.dm_ready ? (
                          <span style={{ color: "#b26a00" }}>已锁定（导出后可见）</span>
                        ) : null}
                        {row.post_url ? (
                          <a href={row.post_url} target="_blank" rel="noreferrer" style={{ color: "#0d61cb" }}>
                            帖子
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
