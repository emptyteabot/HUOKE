"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getOrCreateClientUserId } from "@/lib/client_user";
import { getCreditPackages } from "@/lib/pricing";

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

const packages = getCreditPackages();

function formatDateTime(value: string) {
  if (!value) return "未发生";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(ts);
}

export default function BillingPage() {
  const [userId, setUserId] = useState("guest_demo");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletToken, setWalletToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setUserId(getOrCreateClientUserId());
  }, []);

  async function loadWallet() {
    if (!userId) return;
    setLoading(true);
    setError("");

    try {
      const q = new URLSearchParams();
      q.set("userId", userId);
      if (walletToken) q.set("walletToken", walletToken);
      const response = await fetch(`/api/credits?${q.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as CreditsResponse;
      if (!response.ok || !payload.wallet) throw new Error("wallet_load_failed");
      setWallet(payload.wallet);
      if (payload.wallet_token) setWalletToken(String(payload.wallet_token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "wallet_load_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const exportCost = wallet?.export_credit_cost ?? 20;
  const paidRunway = wallet ? Math.floor(wallet.credits / exportCost) : 0;
  const totalRunway = wallet ? wallet.free_exports_remaining + paidRunway : 0;

  return (
    <div className="lp-grid" style={{ gap: 14 }}>
      <section className="lp-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold text-slate-950">LP Coin 余额</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              当前只保留一条计费管线：免费体验额度，按结果扣费，余额不足后充值。
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Workspace ID：<b>{wallet?.user_id || userId}</b>
            </div>
          </div>
          <button className="lp-btn" type="button" onClick={() => void loadWallet()} disabled={loading}>
            {loading ? "刷新中..." : "刷新余额"}
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-rose-700">读取失败：{error}</div> : null}
      </section>

      <section className="lp-card p-4">
        <div className="lp-grid lp-grid-4">
          <div>
            <div className="text-xs font-bold text-slate-500">当前 LP Coin</div>
            <div className="lp-kpi">{loading ? "--" : wallet?.credits ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">1 LP Coin = 1 元</div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">免费导出剩余</div>
            <div className="lp-kpi">{loading ? "--" : wallet?.free_exports_remaining ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">
              共 {wallet?.free_export_limit ?? 0} 次，已用 {wallet?.free_exports_used ?? 0} 次
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">剩余导出轮次</div>
            <div className="lp-kpi">{loading ? "--" : totalRunway}</div>
            <div className="mt-1 text-xs text-slate-500">按单次导出 {exportCost} LP Coin 估算</div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">上次导出</div>
            <div className="lp-kpi text-2xl">{formatDateTime(wallet?.last_export_at || "")}</div>
          </div>
        </div>
      </section>

      <section className="lp-card p-4">
        <div className="lp-grid lp-grid-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="font-extrabold text-slate-950">扣费规则</div>
            <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <div>1. 新用户默认赠送 60 LP Coin。</div>
              <div>2. 噪声线索扣 1 LP Coin。</div>
              <div>3. 高优线索扣 50 LP Coin。</div>
              <div>4. 被确认无效的高优线索退回 50 LP Coin。</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="font-extrabold text-slate-950">下一步</div>
            <div className="mt-3 text-sm leading-7 text-slate-600">
              {wallet && wallet.free_exports_remaining > 0
                ? "先用免费导出验证线索质量；跑通后再充值放量。"
                : wallet && wallet.credits >= 50
                  ? "余额足够继续提取高意向线索。"
                  : "余额不足以稳定提取高意向线索，建议充值标准包。"}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/dashboard/leads" className="lp-btn">
                去线索池
              </Link>
              <Link href="/pay?package=standard" className="lp-btn lp-btn-secondary">
                充值 LP Coin
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-card p-4">
        <div className="mb-3 font-extrabold text-slate-950">充值包</div>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {packages.map((item) => (
            <article key={item.id} className={item.highlight ? "rounded-lg border border-slate-950 bg-white p-4" : "rounded-lg border border-slate-200 bg-slate-50 p-4"}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-extrabold text-slate-950">{item.name}</div>
                <div className="text-sm font-bold text-slate-500">￥{item.priceCny}</div>
              </div>
              <div className="lp-kpi mt-2 text-[28px]">{item.credits}</div>
              <div className="mt-3 text-sm leading-7 text-slate-600">{item.description}</div>
              <Link href={item.paymentUrl} className="lp-btn mt-4">
                {item.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
