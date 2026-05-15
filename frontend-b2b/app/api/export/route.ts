import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { buildPayload, loadLeadRows } from "../leads/route";
import {
  debitAndUnlock,
  exportCreditCost,
  freeExportsRemaining,
  getWalletFromRequest,
  linkUnlockHours,
  normalizeUserId,
  walletPublic,
  walletSetCookieHeader,
  walletTokenForResponse,
} from "@/lib/lead_wallet";
import { chargeM2mCredits, fetchM2mWallet } from "@/lib/m2m/billing";

export const runtime = "nodejs";

type ExportRequest = {
  walletToken?: string;
  userId?: string;
  minScore?: number;
  limit?: number;
  onlyTarget?: boolean;
  excludeCompetitors?: boolean;
  vertical?: string;
};

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  const fields = [
    "platform",
    "author",
    "score",
    "intent_level",
    "keyword",
    "contact",
    "author_url",
    "post_url",
    "source_url",
    "collected_at",
    "content",
  ];

  const lines: string[] = [];
  lines.push(fields.join(","));
  for (const row of rows) {
    lines.push(fields.map((f) => csvEscape(row[f])).join(","));
  }
  return lines.join("\r\n");
}

function nowIso() {
  return new Date().toISOString();
}

function mergeWallet(local: ReturnType<typeof getWalletFromRequest>, backendCredits?: number | null) {
  if (backendCredits == null || Number.isNaN(Number(backendCredits))) return local;
  return {
    ...local,
    credits: Math.max(0, Math.trunc(Number(backendCredits))),
  };
}

async function syncBackendWallet(userId: string, localWallet: ReturnType<typeof getWalletFromRequest>) {
  const backend = await fetchM2mWallet(userId);
  const backendCredits = backend?.wallet?.credits;
  return {
    backend,
    wallet: mergeWallet(localWallet, backendCredits ?? null),
  };
}

export async function POST(req: NextRequest) {
  let body: ExportRequest = {};
  try {
    body = (await req.json()) as ExportRequest;
  } catch {
    body = {};
  }

  const userId = normalizeUserId(body.userId || req.nextUrl.searchParams.get("userId"));
  const localWallet = getWalletFromRequest(req, userId, body.walletToken);
  const { backend, wallet: syncedWallet } = await syncBackendWallet(localWallet.user_id, localWallet);
  const creditCost = exportCreditCost();

  const hasExportAccess = freeExportsRemaining(syncedWallet) > 0 || syncedWallet.credits >= creditCost;
  if (!hasExportAccess) {
    const res = NextResponse.json(
      {
        error: "export_access_required",
        message: "导出需要有效开通码、积分或后台配置的免费导出额度。",
        required: creditCost,
        wallet: walletPublic(syncedWallet),
        wallet_token: walletTokenForResponse(syncedWallet),
      },
      { status: 402 },
    );
    res.headers.set("Set-Cookie", walletSetCookieHeader(syncedWallet));
    res.headers.set("X-LeadPulse-Wallet-Token", walletTokenForResponse(syncedWallet));
    return res;
  }

  const minScore = Math.max(0, Math.min(100, toInt(body.minScore, 65)));
  const limit = Math.max(1, Math.min(2000, toInt(body.limit, 500)));
  const onlyTarget = toBool(body.onlyTarget, true);
  const excludeCompetitors = toBool(body.excludeCompetitors, true);
  const vertical = String(body.vertical || "study_abroad").trim() || "study_abroad";

  const loaded = await loadLeadRows(Math.max(1000, limit * 6), vertical);
  if (!loaded.rows.length && loaded.source === "unavailable") {
    const res = NextResponse.json(
      {
        error: "lead_source_unavailable",
        source: loaded.source,
        source_detail: loaded.source_detail,
        errors: loaded.errors,
        wallet: walletPublic(syncedWallet),
        wallet_token: walletTokenForResponse(syncedWallet),
      },
      { status: 500 },
    );
    res.headers.set("Set-Cookie", walletSetCookieHeader(syncedWallet));
    res.headers.set("X-LeadPulse-Wallet-Token", walletTokenForResponse(syncedWallet));
    return res;
  }

  const payload = buildPayload(loaded.rows, {
    minScore,
    limit,
    onlyTarget,
    excludeCompetitors,
    vertical,
  });

  if (!payload.rows.length) {
    const res = NextResponse.json(
      {
        error: "no_rows_after_filters",
        message: "当前筛选条件下没有可导出的线索。",
        wallet: walletPublic(syncedWallet),
        wallet_token: walletTokenForResponse(syncedWallet),
      },
      { status: 400 },
    );
    res.headers.set("Set-Cookie", walletSetCookieHeader(syncedWallet));
    res.headers.set("X-LeadPulse-Wallet-Token", walletTokenForResponse(syncedWallet));
    return res;
  }

  const unlockUntil = new Date(Date.now() + linkUnlockHours() * 60 * 60 * 1000).toISOString();
  let nextWallet = syncedWallet;
  let creditsSpent = 0;
  let exportMode: "free" | "credit" = "free";

  if (freeExportsRemaining(syncedWallet) > 0) {
    const debit = debitAndUnlock(syncedWallet, creditCost);
    if (!debit.ok) {
      const res = NextResponse.json(
        {
          error: debit.error,
          message: "当前免费导出额度不可用，请先刷新余额或充值。",
          required: creditCost,
          wallet: walletPublic(syncedWallet),
          wallet_token: walletTokenForResponse(syncedWallet),
        },
        { status: 402 },
      );
      res.headers.set("Set-Cookie", walletSetCookieHeader(syncedWallet));
      res.headers.set("X-LeadPulse-Wallet-Token", walletTokenForResponse(syncedWallet));
      return res;
    }
    nextWallet = debit.wallet;
    exportMode = debit.mode;
    creditsSpent = debit.credits_spent;
  } else if (backend?.wallet) {
    try {
      const charged = await chargeM2mCredits({
        userId: syncedWallet.user_id,
        credits: creditCost,
        referenceId: `export:${syncId(syncedWallet.user_id)}`,
        detail: `LeadPulse export charge for ${payload.rows.length} rows`,
        eventType: "high_value",
      });

      const backendWalletCredits = Number(charged.wallet?.credits ?? syncedWallet.credits);
      nextWallet = {
        ...syncedWallet,
        credits: Math.max(0, Math.trunc(backendWalletCredits)),
        exports_count: syncedWallet.exports_count + 1,
        last_export_at: nowIso(),
        links_unlocked_until: unlockUntil,
      };
      exportMode = "credit";
      creditsSpent = creditCost;
    } catch (error) {
      const res = NextResponse.json(
        {
          error: "billing_charge_failed",
          message: error instanceof Error ? error.message : "billing charge failed",
          required: creditCost,
          wallet: walletPublic(syncedWallet),
          wallet_token: walletTokenForResponse(syncedWallet),
        },
        { status: 402 },
      );
      res.headers.set("Set-Cookie", walletSetCookieHeader(syncedWallet));
      res.headers.set("X-LeadPulse-Wallet-Token", walletTokenForResponse(syncedWallet));
      return res;
    }
  } else {
    const debit = debitAndUnlock(syncedWallet, creditCost);
    if (!debit.ok) {
      const res = NextResponse.json(
        {
          error: debit.error,
          message: "积分不足，请先充值后再导出。",
          required: creditCost,
          wallet: walletPublic(syncedWallet),
          wallet_token: walletTokenForResponse(syncedWallet),
        },
        { status: 402 },
      );
      res.headers.set("Set-Cookie", walletSetCookieHeader(syncedWallet));
      res.headers.set("X-LeadPulse-Wallet-Token", walletTokenForResponse(syncedWallet));
      return res;
    }
    nextWallet = debit.wallet;
    exportMode = debit.mode;
    creditsSpent = debit.credits_spent;
  }

  const csvBody = rowsToCsv(payload.rows as Array<Record<string, unknown>>);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const filename = `leadpack-${vertical}-${stamp}-${payload.rows.length}.csv`;
  const nextToken = walletTokenForResponse(nextWallet);

  const res = new NextResponse(`\uFEFF${csvBody}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-LeadPulse-Export-Count": String(payload.rows.length),
      "X-LeadPulse-Source": loaded.source,
      "X-LeadPulse-Credits-Remaining": String(nextWallet.credits),
      "X-LeadPulse-Export-Mode": exportMode,
      "X-LeadPulse-Credits-Spent": String(creditsSpent),
    },
  });

  res.headers.set("Set-Cookie", walletSetCookieHeader(nextWallet));
  res.headers.set("X-LeadPulse-Wallet-Token", nextToken);
  return res;
}

function syncId(userId: string) {
  return crypto.createHash("sha1").update(`${userId}:${Date.now()}:${Math.random()}`).digest("hex").slice(0, 16);
}
