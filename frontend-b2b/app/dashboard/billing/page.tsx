"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getOrCreateClientUserId } from "@/lib/client_user";
import { getPricingPlans } from "@/lib/pricing";

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

type CreditsResponse = {
  ok?: boolean;
  wallet?: WalletInfo;
  wallet_token?: string;
};

const pricingPlans = getPricingPlans();

function formatDateTime(value: string) {
  if (!value) return "未发生";

  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ts);
}

function unlockStatus(wallet: WalletInfo | null) {
  if (!wallet) {
    return {
      title: "读取中",
      detail: "正在同步 wallet 配置与解锁状态。",
    };
  }

  if (wallet.links_unlocked && wallet.links_unlocked_until) {
    return {
      title: "已解锁",
      detail: `主页与帖子链接开放到 ${formatDateTime(wallet.links_unlocked_until)}`,
    };
  }

  return {
    title: "未解锁",
    detail: `导出后会解锁 ${wallet.link_unlock_hours} 小时`,
  };
}

function nextAction(wallet: WalletInfo | null) {
  if (!wallet) {
    return {
      title: "同步 wallet",
      detail: "先拉取当前 credits 与免费导出额度，再决定是否补充付费方案。",
      primaryHref: "/dashboard/leads",
      primaryLabel: "去线索页",
      secondaryHref: "/redeem",
      secondaryLabel: "兑换开通",
    };
  }

  if (wallet.free_exports_remaining > 0) {
    return {
      title: "先吃掉免费导出额度",
      detail: `你还有 ${wallet.free_exports_remaining} 次免费导出，当前最短路径是直接去 leads 导出并解锁链接。`,
      primaryHref: "/dashboard/leads",
      primaryLabel: "去导出线索",
      secondaryHref: "/pay?plan=pro",
      secondaryLabel: "看 Pro 方案",
    };
  }

  if (wallet.credits >= wallet.export_credit_cost) {
    return {
      title: "credits 仍够跑下一轮",
      detail: `当前 credits 还能支持约 ${Math.floor(wallet.credits / wallet.export_credit_cost)} 次导出。可以继续跑筛选、导出和触达。`,
      primaryHref: "/dashboard/leads",
      primaryLabel: "继续跑线索",
      secondaryHref: "/dashboard/messages",
      secondaryLabel: "看消息推进",
    };
  }

  return {
    title: "需要补充 credits",
    detail: "免费额度已用完，当前 credits 不足以继续导出。下一步应该购买 Pro / Max 或直接兑换启动码。",
    primaryHref: "/pay?plan=pro",
    primaryLabel: "购买 Pro",
    secondaryHref: "/redeem",
    secondaryLabel: "兑换开通",
  };
}

export default function BillingPage() {
  const [userId, setUserId] = useState("guest_demo");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletToken, setWalletToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUserId(getOrCreateClientUserId());
  }, []);

  const loadWallet = async (silent = false) => {
    if (!userId) return;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const q = new URLSearchParams();
      q.set("userId", userId);
      if (walletToken) q.set("walletToken", walletToken);

      const response = await fetch(`/api/credits?${q.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as CreditsResponse;
      if (!response.ok || !payload?.wallet) {
        throw new Error("wallet_load_failed");
      }

      setWallet(payload.wallet);
      if (payload.wallet_token) {
        setWalletToken(String(payload.wallet_token));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "wallet_load_failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const status = unlockStatus(wallet);
  const action = nextAction(wallet);
  const exportCost = wallet?.export_credit_cost ?? 20;
  const unlockHours = wallet?.link_unlock_hours ?? 72;
  const estimatedPaidExports = wallet ? Math.floor(wallet.credits / exportCost) : 0;
  const totalRunway = wallet ? wallet.free_exports_remaining + estimatedPaidExports : 0;

  return (
    <div className="lp-grid" style={{ gap: 14 }}>
      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Billing Workspace</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
              这里直接读取当前 wallet / credits 规则，不做假账单。你现在看到的是实时导出额度、credits 成本和链接解锁窗口。
            </div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
              Workspace ID：<b>{wallet?.user_id || userId}</b>
            </div>
          </div>
          <button className="lp-btn" type="button" onClick={() => void loadWallet(true)} disabled={loading || refreshing}>
            {refreshing ? "刷新中..." : "刷新 wallet"}
          </button>
        </div>
        {error ? <div style={{ color: "#c62828", marginTop: 10 }}>读取失败：{error}</div> : null}
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div className="lp-grid lp-grid-4">
          <div>
            <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>当前 credits</div>
            <div className="lp-kpi">{loading ? "--" : wallet?.credits ?? 0}</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 12, marginTop: 4 }}>
              单次导出消耗 {exportCost} credits
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>免费导出剩余</div>
            <div className="lp-kpi">{loading ? "--" : wallet?.free_exports_remaining ?? 0}</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 12, marginTop: 4 }}>
              共 {wallet?.free_export_limit ?? 0} 次，已用 {wallet?.free_exports_used ?? 0} 次
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>累计导出次数</div>
            <div className="lp-kpi">{loading ? "--" : wallet?.exports_count ?? 0}</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 12, marginTop: 4 }}>
              上次导出：{formatDateTime(wallet?.last_export_at || "")}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>链接状态</div>
            <div className="lp-kpi" style={{ fontSize: 24 }}>{status.title}</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 12, marginTop: 4 }}>{status.detail}</div>
          </div>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
          <div
            style={{
              border: "1px solid #d7e3f7",
              borderRadius: 18,
              background: "#fbfdff",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700 }}>实时 wallet 规则</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
              <div>1. 免费导出先扣：当前还剩 {wallet?.free_exports_remaining ?? 0} 次。</div>
              <div>2. 免费额度用完后，每次导出扣 {exportCost} credits。</div>
              <div>3. 每次导出都会把主页 / 帖子链接解锁 {unlockHours} 小时。</div>
              <div>4. 按当前余额估算，还能再跑 {totalRunway} 次导出，其中付费段约 {estimatedPaidExports} 次。</div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #d7e3f7",
              borderRadius: 18,
              background: "#f4f8ff",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700 }}>{action.title}</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>{action.detail}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <Link href={action.primaryHref} className="lp-btn">
                {action.primaryLabel}
              </Link>
              <Link
                href={action.secondaryHref}
                className="lp-btn"
                style={{ background: "white", color: "#163861", border: "1px solid #cddcf0" }}
              >
                {action.secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>订阅与补充路径</div>
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {pricingPlans.map((plan) => (
            <article
              key={plan.id}
              style={{
                border: plan.highlight ? "1px solid #9cbdf2" : "1px solid #d7e3f7",
                borderRadius: 18,
                background: plan.highlight ? "#f4f8ff" : "#fbfdff",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 700 }}>{plan.name}</div>
                <div style={{ color: "#224a87", fontSize: 13 }}>
                  {plan.price}
                  {plan.period}
                </div>
              </div>
              <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>{plan.goodFor}</div>
              <div style={{ color: "var(--lp-muted)", fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
                {plan.features.slice(0, 4).map((feature) => (
                  <div key={feature}>• {feature}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <Link href={plan.paymentUrl} className="lp-btn">
                  {plan.ctaLabel}
                </Link>
                {plan.id !== "free" ? (
                  <Link
                    href="/redeem"
                    className="lp-btn"
                    style={{ background: "white", color: "#163861", border: "1px solid #cddcf0" }}
                  >
                    去兑换码开通
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
