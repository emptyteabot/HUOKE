import crypto from "node:crypto";
import { NextRequest } from "next/server";

const COOKIE_NAME = "lp_wallet";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type WalletState = {
  v: number;
  user_id: string;
  credits: number;
  exports_count: number;
  free_exports_used: number;
  last_export_at: string;
  links_unlocked_until: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function toInt(value: string | undefined, fallback: number): number {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export function freeExportLimit(): number {
  return Math.max(0, toInt(process.env.FREE_EXPORT_LIMIT, 3));
}

export function exportCreditCost(): number {
  return Math.max(1, toInt(process.env.EXPORT_CREDIT_COST, 20));
}

export function linkUnlockHours(): number {
  return Math.max(1, toInt(process.env.LINK_UNLOCK_HOURS, 72));
}

export function defaultCredits(): number {
  return Math.max(0, toInt(process.env.DEFAULT_EXPORT_CREDITS, 0));
}

function signingSecret(): string {
  return String(process.env.WALLET_SIGNING_SECRET || "leadpulse-wallet-dev-secret-change-me");
}

export function normalizeUserId(input: string | null | undefined): string {
  const raw = String(input || "guest_demo").trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9_-]/g, "_").slice(0, 64);
  return safe || "guest_demo";
}

function defaultWallet(userId: string): WalletState {
  return {
    v: 1,
    user_id: normalizeUserId(userId),
    credits: defaultCredits(),
    exports_count: 0,
    free_exports_used: 0,
    last_export_at: "",
    links_unlocked_until: "",
  };
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

function encodeWallet(wallet: WalletState): string {
  const payload = Buffer.from(JSON.stringify(wallet), "utf8").toString("base64url");
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}

function decodeWallet(token: string): WalletState | null {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const payload = parts[0] || "";
  const sig = parts[1] || "";
  if (!payload || !sig) return null;

  const expected = hmac(payload);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as WalletState;
    if (!obj || typeof obj !== "object") return null;
    return {
      v: 1,
      user_id: normalizeUserId(obj.user_id),
      credits: Math.max(0, toInt(String(obj.credits), defaultCredits())),
      exports_count: Math.max(0, toInt(String(obj.exports_count), 0)),
      free_exports_used: Math.max(0, toInt(String((obj as any).free_exports_used), 0)),
      last_export_at: String(obj.last_export_at || ""),
      links_unlocked_until: String(obj.links_unlocked_until || ""),
    };
  } catch {
    return null;
  }
}

export function walletCookieValue(wallet: WalletState): string {
  return encodeWallet(wallet);
}

export function walletTokenForResponse(wallet: WalletState): string {
  return walletCookieValue(wallet);
}

export function parseWalletToken(token: string, userId: string): WalletState | null {
  const parsed = decodeWallet(token);
  if (!parsed) return null;
  if (normalizeUserId(parsed.user_id) !== normalizeUserId(userId)) return null;
  return parsed;
}

export function getWalletFromRequest(req: NextRequest, userIdInput?: string, tokenOverride?: string): WalletState {
  const userId = normalizeUserId(userIdInput || req.nextUrl.searchParams.get("userId"));

  const tokenCandidates = [
    String(tokenOverride || ""),
    String(req.headers.get("x-wallet-token") || ""),
    String(req.nextUrl.searchParams.get("walletToken") || ""),
    String(req.cookies.get(COOKIE_NAME)?.value || ""),
  ];

  for (const token of tokenCandidates) {
    if (!token) continue;
    const parsed = parseWalletToken(token, userId);
    if (parsed) return parsed;
  }

  return defaultWallet(userId);
}

export function isLinksUnlocked(wallet: WalletState): boolean {
  const ts = Date.parse(String(wallet.links_unlocked_until || ""));
  if (!Number.isFinite(ts)) return false;
  return ts > Date.now();
}

export function freeExportsRemaining(wallet: WalletState): number {
  return Math.max(0, freeExportLimit() - wallet.free_exports_used);
}

export function debitAndUnlock(
  wallet: WalletState,
  cost: number,
):
  | { ok: true; wallet: WalletState; mode: "free" | "credit"; credits_spent: number }
  | { ok: false; error: string } {
  const c = Math.max(1, Math.trunc(cost));

  const freeRemaining = freeExportsRemaining(wallet);
  const unlockMs = linkUnlockHours() * 60 * 60 * 1000;

  if (freeRemaining > 0) {
    const next: WalletState = {
      ...wallet,
      free_exports_used: wallet.free_exports_used + 1,
      exports_count: wallet.exports_count + 1,
      last_export_at: nowIso(),
      links_unlocked_until: new Date(Date.now() + unlockMs).toISOString(),
    };
    return { ok: true, wallet: next, mode: "free", credits_spent: 0 };
  }

  if (wallet.credits < c) {
    return { ok: false, error: "insufficient_credits" };
  }

  const next: WalletState = {
    ...wallet,
    credits: Math.max(0, wallet.credits - c),
    exports_count: wallet.exports_count + 1,
    last_export_at: nowIso(),
    links_unlocked_until: new Date(Date.now() + unlockMs).toISOString(),
  };
  return { ok: true, wallet: next, mode: "credit", credits_spent: c };
}

export function walletSetCookieHeader(wallet: WalletState): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const token = walletCookieValue(wallet);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}${secure}`;
}

export function walletPublic(wallet: WalletState) {
  return {
    user_id: wallet.user_id,
    credits: wallet.credits,
    exports_count: wallet.exports_count,
    free_export_limit: freeExportLimit(),
    free_exports_used: wallet.free_exports_used,
    free_exports_remaining: freeExportsRemaining(wallet),
    last_export_at: wallet.last_export_at,
    links_unlocked: isLinksUnlocked(wallet),
    links_unlocked_until: wallet.links_unlocked_until,
    export_credit_cost: exportCreditCost(),
    link_unlock_hours: linkUnlockHours(),
  };
}


