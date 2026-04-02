import crypto from "node:crypto";

const WALLET_COOKIE = "leadpulse_wallet";
const EXPORT_CREDIT_COST = 5;
const DEFAULT_FREE_CREDITS = 20;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type LeadWallet = {
  userId: string;
  credits: number;
  exportCredits: number;
  linksUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

type RequestLike = {
  headers: Headers;
  cookies?: {
    get(name: string): { value: string } | undefined;
  };
};

function sanitizeUserId(userId?: string) {
  const raw = String(userId || "").trim();
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function parseCookieHeader(cookieHeader: string) {
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf("=");
    if (idx <= 0) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function decodeWalletCookie(raw: string): LeadWallet | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<LeadWallet>;
    if (!parsed.userId) return null;

    const credits = Number(parsed.credits);
    const exportCredits = Number(parsed.exportCredits);
    const createdAt = String(parsed.createdAt || new Date().toISOString());
    const updatedAt = String(parsed.updatedAt || createdAt);
    return {
      userId: sanitizeUserId(parsed.userId) || "guest_demo",
      credits: Number.isFinite(credits) ? Math.max(0, Math.trunc(credits)) : DEFAULT_FREE_CREDITS,
      exportCredits: Number.isFinite(exportCredits) ? Math.max(0, Math.trunc(exportCredits)) : 0,
      linksUnlocked: Boolean(parsed.linksUnlocked),
      createdAt,
      updatedAt,
    };
  } catch {
    return null;
  }
}

function encodeWalletCookie(wallet: LeadWallet) {
  return Buffer.from(JSON.stringify(wallet), "utf8").toString("base64url");
}

function createWallet(userId: string): LeadWallet {
  const now = new Date().toISOString();
  return {
    userId: sanitizeUserId(userId) || "guest_demo",
    credits: DEFAULT_FREE_CREDITS,
    exportCredits: 0,
    linksUnlocked: DEFAULT_FREE_CREDITS >= EXPORT_CREDIT_COST,
    createdAt: now,
    updatedAt: now,
  };
}

function readWalletCookie(request: RequestLike) {
  const cookieFromNext = request.cookies?.get(WALLET_COOKIE)?.value;
  if (cookieFromNext) {
    return decodeWalletCookie(cookieFromNext);
  }

  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) return null;

  const cookies = parseCookieHeader(cookieHeader);
  const raw = cookies[WALLET_COOKIE];
  return raw ? decodeWalletCookie(raw) : null;
}

export function exportCreditCost() {
  return EXPORT_CREDIT_COST;
}

export function getWalletFromRequest(request: RequestLike, userId?: string): LeadWallet {
  const fromCookie = readWalletCookie(request);
  const resolvedUserId = sanitizeUserId(userId) || fromCookie?.userId || "guest_demo";

  if (fromCookie && fromCookie.userId === resolvedUserId) {
    return {
      ...fromCookie,
      linksUnlocked: fromCookie.linksUnlocked || fromCookie.credits >= EXPORT_CREDIT_COST,
      updatedAt: new Date().toISOString(),
    };
  }

  return createWallet(resolvedUserId);
}

export function isLinksUnlocked(wallet: LeadWallet) {
  return Boolean(wallet.linksUnlocked || wallet.credits >= EXPORT_CREDIT_COST);
}

export function walletPublic(wallet: LeadWallet) {
  return {
    user_id: wallet.userId,
    credits: wallet.credits,
    export_credits: wallet.exportCredits,
    export_credit_cost: EXPORT_CREDIT_COST,
    links_unlocked: isLinksUnlocked(wallet),
    created_at: wallet.createdAt,
    updated_at: wallet.updatedAt,
  };
}

export function walletTokenForResponse(wallet: LeadWallet) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(walletPublic(wallet)))
    .digest("hex")
    .slice(0, 24);
}

export function walletSetCookieHeader(wallet: LeadWallet) {
  const payload = encodeWalletCookie({
    ...wallet,
    linksUnlocked: isLinksUnlocked(wallet),
    updatedAt: new Date().toISOString(),
  });

  return `${WALLET_COOKIE}=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}
