import { NextRequest, NextResponse } from "next/server";
import { buildPayload, loadLeadRows } from "../leads/route";
import {
  debitAndUnlock,
  exportCreditCost,
  getWalletFromRequest,
  normalizeUserId,
  walletTokenForResponse,
  walletPublic,
  walletSetCookieHeader,
} from "@/lib/lead_wallet";

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

export async function POST(req: NextRequest) {
  let body: ExportRequest = {};
  try {
    body = (await req.json()) as ExportRequest;
  } catch {
    body = {};
  }

  const userId = normalizeUserId(body.userId || req.nextUrl.searchParams.get("userId"));
  const wallet = getWalletFromRequest(req, userId, body.walletToken);
  const walletToken = walletTokenForResponse(wallet);
  const creditCost = exportCreditCost();

  const minScore = Math.max(0, Math.min(100, toInt(body.minScore, 65)));
  const limit = Math.max(20, Math.min(2000, toInt(body.limit, 500)));
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
        wallet: walletPublic(wallet),
        wallet_token: walletToken,
      },
      { status: 500 },
    );
    res.headers.set("Set-Cookie", walletSetCookieHeader(wallet));
    res.headers.set("X-LeadPulse-Wallet-Token", walletToken);
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
        wallet: walletPublic(wallet),
        wallet_token: walletToken,
      },
      { status: 400 },
    );
    res.headers.set("Set-Cookie", walletSetCookieHeader(wallet));
    res.headers.set("X-LeadPulse-Wallet-Token", walletToken);
    return res;
  }

  const debit = debitAndUnlock(wallet, creditCost);
  if (!debit.ok) {
    const res = NextResponse.json(
      {
        error: debit.error,
        message: "免费导出次数已用完，积分不足，请先充值后再导出。",
        required: creditCost,
        wallet: walletPublic(wallet),
        wallet_token: walletToken,
      },
      { status: 402 },
    );
    res.headers.set("Set-Cookie", walletSetCookieHeader(wallet));
    res.headers.set("X-LeadPulse-Wallet-Token", walletToken);
    return res;
  }

  const csvBody = rowsToCsv(payload.rows as Array<Record<string, unknown>>);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const filename = `leadpack-${vertical}-${stamp}-${payload.rows.length}.csv`;
  const nextToken = walletTokenForResponse(debit.wallet);

  const res = new NextResponse(`\uFEFF${csvBody}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-LeadPulse-Export-Count": String(payload.rows.length),
      "X-LeadPulse-Source": loaded.source,
      "X-LeadPulse-Credits-Remaining": String(debit.wallet.credits),
      "X-LeadPulse-Export-Mode": debit.mode,
      "X-LeadPulse-Credits-Spent": String(debit.credits_spent),
    },
  });

  res.headers.set("Set-Cookie", walletSetCookieHeader(debit.wallet));
  res.headers.set("X-LeadPulse-Wallet-Token", nextToken);
  return res;
}

