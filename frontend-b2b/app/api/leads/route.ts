import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import {
  exportCreditCost,
  getWalletFromRequest,
  isLinksUnlocked,
  walletPublic,
  walletSetCookieHeader,
  walletTokenForResponse,
} from "@/lib/lead_wallet";
import { scoreLeadIntentBatchWithLlm, llmProviderSummary, type LeadIntentDecision } from "@/lib/llm-intent";
import { fetchM2mWallet } from "@/lib/m2m/billing";

export const runtime = "nodejs";

type RunResult = { ok: boolean; stderr: string; stdout: string };
type IntentLevel = "high" | "medium" | "low";

export type LeadRow = {
  external_id: string;
  platform: string;
  author: string;
  keyword: string;
  score: number;
  intent_level: IntentLevel;
  is_target: boolean;
  is_competitor: boolean;
  dm_ready: boolean;
  author_url: string;
  post_url: string;
  source_url: string;
  content: string;
  contact: string;
  collected_at: string;
  pain_point_summary: string;
  next_action_dm: string;
  llm_decision: LeadIntentDecision;
};

export type LeadRowsLoadResult = {
  rows: RawLeadCandidate[];
  source: "local_exporter" | "openclaw_json" | "supabase" | "bundled_snapshot" | "unavailable";
  source_detail: string;
  errors: Record<string, string>;
};

type RawLeadCandidate = {
  external_id: string;
  platform: string;
  author: string;
  keyword: string;
  author_url: string;
  post_url: string;
  source_url: string;
  content: string;
  contact: string;
  collected_at: string;
};

type LeadsPayload = {
  generated_at: string;
  vertical: string;
  filters: {
    limit: number;
    min_score: number;
    only_target: boolean;
    exclude_competitors: boolean;
    llm_max_rows: number;
    channels: string[];
  };
  summary: {
    total_rows: number;
    llm_scored_rows: number;
    filtered_rows: number;
    target_rows: number;
    competitor_rows: number;
    dm_ready_rows: number;
    score_ge_65_rows: number;
    platform_counts: Record<string, number>;
  };
  llm_provider: ReturnType<typeof llmProviderSummary>;
  rows: LeadRow[];
};

type SupabaseLeadRecord = {
  id?: string;
  name?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
};

type SupabaseLoadResult =
  | { status: "ok"; rows: RawLeadCandidate[] }
  | { status: "not_configured"; reason: string }
  | { status: "failed"; reason: string };

const DEFAULT_VERTICAL = "china_social_b2b";
const DEFAULT_CHANNELS = ["xhs", "douyin"];
const LEAD_ROWS_CACHE_TTL_MS = 30_000;
const leadRowsCache = new Map<string, { loaded_at: number; result: LeadRowsLoadResult }>();

function parseBool(v: string | null, fallback: boolean): boolean {
  if (v == null || v === "") return fallback;
  const raw = v.toLowerCase().trim();
  return raw === "1" || raw === "true" || raw === "yes";
}

function parseIntSafe(v: string | null | undefined, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeVertical(vertical: string): string {
  const key = String(vertical || "").trim().toLowerCase();
  return key || DEFAULT_VERTICAL;
}

function parsePlatformList(raw: string | null | undefined, fallback = DEFAULT_CHANNELS): string[] {
  const aliases: Record<string, string> = {
    "小红书": "xhs",
    xiaohongshu: "xhs",
    "抖音": "douyin",
  };
  const values = String(raw || "")
    .split(",")
    .map((item) => aliases[item.trim().toLowerCase()] || item.trim().toLowerCase())
    .filter(Boolean);
  const uniq = Array.from(new Set(values));
  return uniq.length ? uniq : fallback;
}

function isFreshEnough(collectedAt: string): boolean {
  const raw = String(collectedAt || "").trim();
  if (!raw) return true;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts <= 45 * 24 * 60 * 60 * 1000;
}

function md5_16(text: string): string {
  return crypto.createHash("md5").update(String(text || ""), "utf8").digest("hex").slice(0, 16);
}

function canonicalPostUrl(url: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return raw.split("#", 1)[0].split("?", 1)[0];
}

function textValue(...values: unknown[]): string {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateId(row: {
  platform?: unknown;
  author?: unknown;
  post_url?: unknown;
  source_url?: unknown;
  content?: unknown;
  id?: unknown;
  external_id?: unknown;
}) {
  const explicit = String(row.external_id || row.id || "").trim();
  if (explicit) return explicit.slice(0, 80);
  return md5_16(
    [
      row.platform || "",
      String(row.author || "").toLowerCase(),
      canonicalPostUrl(String(row.post_url || row.source_url || "")),
      String(row.content || "").toLowerCase().slice(0, 180),
    ].join("|"),
  );
}

function normalizeCandidate(record: Record<string, unknown>, fallbackPlatform = "unknown"): RawLeadCandidate | null {
  const content = textValue(record.content, record.body, record.text, record.notes, record.title);
  if (content.length < 8) return null;

  const platform = String(record.platform || record.source || fallbackPlatform || "unknown").trim().toLowerCase() || "unknown";
  const author = String(record.author || record.name || record.username || record.user || "Unknown").trim() || "Unknown";
  const postUrl = String(record.post_url || record.url || record.link || "").trim();
  const sourceUrl = String(record.source_url || record.raw_source_url || postUrl || "").trim();

  return {
    external_id: candidateId({ ...record, platform, author, post_url: postUrl, source_url: sourceUrl, content }),
    platform,
    author,
    keyword: String(record.keyword || record.query || "").trim(),
    author_url: String(record.author_url || record.profile_url || "").trim(),
    post_url: postUrl,
    source_url: sourceUrl,
    content,
    contact: String(record.contact || record.phone || record.email || "").trim(),
    collected_at: String(record.collected_at || record.created_at || record.published_at || "").trim(),
  };
}

function dedupeRows(rows: RawLeadCandidate[]): RawLeadCandidate[] {
  const out: RawLeadCandidate[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key = md5_16(
      `${row.platform}|${String(row.author || "").toLowerCase()}|${canonicalPostUrl(row.post_url || row.source_url)}|${String(row.content || "")
        .toLowerCase()
        .slice(0, 180)}`,
    );
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function sortCandidates(rows: RawLeadCandidate[]): RawLeadCandidate[] {
  return [...rows].sort((a, b) => String(b.collected_at || "").localeCompare(String(a.collected_at || "")));
}

function parseNoteMeta(notes: string): Record<string, string> {
  const out: Record<string, string> = {};

  for (const raw of String(notes || "").split(/\r?\n/)) {
    for (const chunk of raw.split("|")) {
      const part = chunk.trim();
      const idx = part.indexOf("=");
      if (idx <= 0) continue;
      const key = part.slice(0, idx).trim().toLowerCase();
      const value = part.slice(idx + 1).trim();
      if (key) out[key] = value;
    }
  }

  return out;
}

function extractNoteContent(notes: string): string {
  const metaKeys = new Set([
    "source",
    "platform",
    "score",
    "intent",
    "keyword",
    "dm_ready",
    "access_hint",
    "post_url",
    "author_url",
    "source_url",
    "collected_at",
    "external_id",
    "openclaw_sync",
  ]);
  const body: string[] = [];

  for (const raw of String(notes || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const isMetaLine = line
      .split("|")
      .map((chunk) => chunk.trim())
      .some((part) => {
        const idx = part.indexOf("=");
        return idx > 0 && metaKeys.has(part.slice(0, idx).trim().toLowerCase());
      });
    if (!isMetaLine) body.push(raw);
  }

  return body.join(" ").trim();
}

function loadFromOpenclawLatest(maxFetch: number): { ok: true; rows: RawLeadCandidate[]; detail: string } | { ok: false; error: string; detail?: string } {
  const candidates = [
    path.join(path.resolve(process.cwd(), ".."), "data", "openclaw", "openclaw_leads_latest.json"),
    path.join(process.cwd(), "data", "openclaw", "openclaw_leads_latest.json"),
  ];

  const file = candidates.find((p) => existsSync(p));
  if (!file) {
    return { ok: false, error: "openclaw_latest_missing", detail: candidates.join(" | ") };
  }

  try {
    const raw = JSON.parse(readFileSync(file, "utf-8"));
    const list = Array.isArray(raw?.leads) ? raw.leads : Array.isArray(raw) ? raw : [];
    const rows = dedupeRows(
      list
        .map((item: Record<string, unknown>) => normalizeCandidate(item, "openclaw"))
        .filter((item: RawLeadCandidate | null): item is RawLeadCandidate => Boolean(item)),
    );
    return { ok: true, rows: rows.slice(0, clamp(maxFetch, 100, 5000)), detail: file };
  } catch (error) {
    return { ok: false, error: "openclaw_latest_parse_failed", detail: String(error) };
  }
}

async function loadLeadsFromSupabase(maxFetch: number): Promise<SupabaseLoadResult> {
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    return { status: "not_configured", reason: "SUPABASE_URL/SUPABASE_KEY missing" };
  }

  const base = supabaseUrl.replace(/\/+$/, "");
  const fetchLimit = clamp(maxFetch, 200, 5000);
  const endpoint = `${base}/rest/v1/leads?select=id,name,phone,notes,created_at&order=created_at.desc&limit=${fetchLimit}`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      return { status: "failed", reason: `supabase_http_${res.status}:${body.slice(0, 240)}` };
    }

    const records = (await res.json()) as SupabaseLeadRecord[];
    const rows = dedupeRows(
      (records || [])
        .map((record) => {
          const notes = String(record.notes || "");
          const meta = parseNoteMeta(notes);
          return normalizeCandidate(
            {
              id: record.id,
              author: record.name,
              contact: record.phone,
              content: extractNoteContent(notes) || notes,
              platform: meta.source || meta.platform,
              keyword: meta.keyword,
              author_url: meta.author_url,
              post_url: meta.post_url,
              source_url: meta.source_url,
              collected_at: meta.collected_at || record.created_at,
            },
            "supabase",
          );
        })
        .filter((item: RawLeadCandidate | null): item is RawLeadCandidate => Boolean(item)),
    );

    return { status: "ok", rows };
  } catch (error) {
    return { status: "failed", reason: `supabase_fetch_error:${String(error)}` };
  }
}

function runExporter(scriptPath: string, args: string[], cwd: string): RunResult {
  const attempts: Array<{ cmd: string; argv: string[] }> = [
    { cmd: "python", argv: [scriptPath, ...args] },
    { cmd: "py", argv: ["-3", scriptPath, ...args] },
  ];

  for (const attempt of attempts) {
    const proc = spawnSync(attempt.cmd, attempt.argv, {
      cwd,
      encoding: "utf-8",
      timeout: 90000,
    });

    if (!proc.error && proc.status === 0) {
      return { ok: true, stderr: String(proc.stderr || ""), stdout: String(proc.stdout || "") };
    }

    const stderr = String(proc.stderr || proc.error?.message || "");
    const stdout = String(proc.stdout || "");
    if (/not recognized|ENOENT|cannot find/i.test(stderr)) {
      continue;
    }

    return { ok: false, stderr, stdout };
  }

  return { ok: false, stderr: "Python runtime not found", stdout: "" };
}

function loadFromLocalExporter(maxFetch: number, vertical: string): { ok: true; rows: RawLeadCandidate[]; detail: string } | { ok: false; error: string; detail?: string } {
  const projectRoot = path.resolve(process.cwd(), "..");
  const scriptPath = path.join(projectRoot, "tools", "export_leads_for_web.py");
  if (!existsSync(scriptPath)) {
    return { ok: false, error: "export_script_missing", detail: scriptPath };
  }

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "leadpulse-web-"));
  const outPath = path.join(tmpDir, "leads.json");

  try {
    const run = runExporter(
      scriptPath,
      [
        "--project-root",
        projectRoot,
        "--output",
        outPath,
        "--limit",
        String(clamp(maxFetch, 100, 5000)),
        "--min-score",
        "0",
        "--only-target",
        "0",
        "--exclude-competitors",
        "0",
        "--vertical",
        vertical,
      ],
      projectRoot,
    );

    if (!run.ok) {
      return {
        ok: false,
        error: "exporter_failed",
        detail: `${run.stderr.slice(-1200)} ${run.stdout.slice(-600)}`.trim(),
      };
    }

    const payload = JSON.parse(readFileSync(outPath, "utf-8"));
    const rows = dedupeRows(
      (Array.isArray(payload?.rows) ? payload.rows : [])
        .map((item: Record<string, unknown>) => normalizeCandidate(item, "local_exporter"))
        .filter((item: RawLeadCandidate | null): item is RawLeadCandidate => Boolean(item)),
    );

    return { ok: true, rows, detail: "python_exporter_raw_feed" };
  } catch (error) {
    return { ok: false, error: "exporter_exception", detail: String(error) };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function loadFromBundledSnapshot(): { ok: true; rows: RawLeadCandidate[]; detail: string } | { ok: false; error: string; detail?: string } {
  const snapshotPath = path.join(process.cwd(), "data", "leads_snapshot.json");
  if (!existsSync(snapshotPath)) {
    return { ok: false, error: "snapshot_missing", detail: snapshotPath };
  }

  try {
    const raw = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    const rows = dedupeRows(
      (Array.isArray(raw?.rows) ? raw.rows : [])
        .map((item: Record<string, unknown>) => normalizeCandidate(item, "snapshot"))
        .filter((item: RawLeadCandidate | null): item is RawLeadCandidate => Boolean(item)),
    );
    return { ok: true, rows, detail: snapshotPath };
  } catch (error) {
    return { ok: false, error: "snapshot_read_failed", detail: String(error) };
  }
}

function summarize(rows: LeadRow[], totalRows: number): LeadsPayload["summary"] {
  const platformCounts: Record<string, number> = {};
  for (const item of rows) {
    const p = item.platform || "unknown";
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  }

  return {
    total_rows: totalRows,
    llm_scored_rows: rows.length,
    filtered_rows: 0,
    target_rows: rows.filter((x) => x.is_target).length,
    competitor_rows: rows.filter((x) => x.is_competitor).length,
    dm_ready_rows: rows.filter((x) => x.dm_ready).length,
    score_ge_65_rows: rows.filter((x) => x.score >= 65).length,
    platform_counts: platformCounts,
  };
}

function intentLevel(score: number): IntentLevel {
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function rowFromDecision(row: RawLeadCandidate & { llm_decision: LeadIntentDecision }): LeadRow {
  const decision = row.llm_decision;
  const accepted = decision.is_target_buyer && !decision.is_toxic_vendor_or_peer;
  const score = accepted ? clamp(Math.trunc(decision.lead_score), 0, 100) : 0;
  const dmReady = Boolean(row.author_url || row.contact);

  return {
    external_id: row.external_id,
    platform: row.platform,
    author: row.author,
    keyword: row.keyword,
    score,
    intent_level: intentLevel(score),
    is_target: accepted,
    is_competitor: decision.is_toxic_vendor_or_peer,
    dm_ready: dmReady,
    author_url: row.author_url,
    post_url: row.post_url,
    source_url: row.source_url,
    content: row.content,
    contact: row.contact,
    collected_at: row.collected_at,
    pain_point_summary: decision.pain_point_summary,
    next_action_dm: decision.next_action_dm,
    llm_decision: decision,
  };
}

export async function buildPayload(
  rows: RawLeadCandidate[],
  params: {
    limit: number;
    minScore: number;
    onlyTarget: boolean;
    excludeCompetitors: boolean;
    vertical: string;
    llmMaxRows?: number;
    channels?: string[];
  },
): Promise<LeadsPayload> {
  const llmMaxRows = clamp(params.llmMaxRows || params.limit, 1, 500);
  const channels = params.channels?.length ? params.channels : DEFAULT_CHANNELS;
  const scopedRows = sortCandidates(
    rows.filter((row) => channels.includes(String(row.platform || "").toLowerCase()) && isFreshEnough(row.collected_at)),
  );
  const candidateRows = scopedRows.slice(0, llmMaxRows);
  const scored = (await scoreLeadIntentBatchWithLlm(
    candidateRows.map((row) => ({
      ...row,
      source: row.platform,
      sourceUrl: row.post_url || row.source_url,
    })),
  )).map(rowFromDecision);

  let filtered = scored;
  if (params.excludeCompetitors) filtered = filtered.filter((x) => !x.is_competitor);
  if (params.onlyTarget) filtered = filtered.filter((x) => x.is_target);
  if (params.minScore > 0) filtered = filtered.filter((x) => x.score >= params.minScore);

  filtered = filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(b.collected_at || "").localeCompare(String(a.collected_at || ""));
  }).slice(0, Math.max(1, params.limit));

  const summary = summarize(scored, scopedRows.length);
  summary.filtered_rows = filtered.length;

  return {
    generated_at: new Date().toISOString(),
    vertical: params.vertical,
    filters: {
      limit: params.limit,
      min_score: params.minScore,
      only_target: params.onlyTarget,
      exclude_competitors: params.excludeCompetitors,
      llm_max_rows: llmMaxRows,
      channels,
    },
    summary,
    llm_provider: llmProviderSummary(),
    rows: filtered,
  };
}

export async function loadLeadRows(maxFetch: number, vertical: string): Promise<LeadRowsLoadResult> {
  const cacheKey = `${normalizeVertical(vertical)}:${maxFetch}`;
  const cached = leadRowsCache.get(cacheKey);
  if (cached && Date.now() - cached.loaded_at < LEAD_ROWS_CACHE_TTL_MS) {
    return {
      rows: cached.result.rows,
      source: cached.result.source,
      source_detail: cached.result.source_detail,
      errors: { ...cached.result.errors },
    };
  }

  const errors: Record<string, string> = {};

  const openclaw = loadFromOpenclawLatest(Math.max(500, maxFetch));
  if (openclaw.ok && openclaw.rows.length) {
    const result: LeadRowsLoadResult = {
      rows: openclaw.rows,
      source: "openclaw_json",
      source_detail: openclaw.detail,
      errors,
    };
    leadRowsCache.set(cacheKey, { loaded_at: Date.now(), result });
    return result;
  }
  errors.openclaw_json = openclaw.ok ? "openclaw_empty" : `${openclaw.error}:${String(openclaw.detail || "")}`;

  const local = loadFromLocalExporter(Math.max(500, maxFetch), normalizeVertical(vertical));
  if (local.ok && local.rows.length) {
    const result: LeadRowsLoadResult = {
      rows: local.rows,
      source: "local_exporter",
      source_detail: local.detail,
      errors,
    };
    leadRowsCache.set(cacheKey, { loaded_at: Date.now(), result });
    return result;
  }
  errors.local_exporter = local.ok ? "local_exporter_empty" : `${local.error}:${String(local.detail || "")}`;

  const supabaseLoad = await loadLeadsFromSupabase(maxFetch);
  if (supabaseLoad.status === "ok" && supabaseLoad.rows.length) {
    const result: LeadRowsLoadResult = {
      rows: supabaseLoad.rows,
      source: "supabase",
      source_detail: "supabase_rest",
      errors,
    };
    leadRowsCache.set(cacheKey, { loaded_at: Date.now(), result });
    return result;
  }
  errors.supabase = supabaseLoad.status === "ok" ? "supabase_empty" : supabaseLoad.reason;

  const snapshot = loadFromBundledSnapshot();
  if (snapshot.ok && snapshot.rows.length) {
    const result: LeadRowsLoadResult = {
      rows: snapshot.rows,
      source: "bundled_snapshot",
      source_detail: snapshot.detail,
      errors,
    };
    leadRowsCache.set(cacheKey, { loaded_at: Date.now(), result });
    return result;
  }
  errors.snapshot = snapshot.ok ? "snapshot_empty" : `${snapshot.error}:${String(snapshot.detail || "")}`;

  return {
    rows: [],
    source: "unavailable",
    source_detail: "no_source",
    errors,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const minScore = clamp(parseIntSafe(url.searchParams.get("minScore"), 65), 0, 100);
  const limit = clamp(parseIntSafe(url.searchParams.get("limit"), 50), 1, 500);
  const onlyTarget = parseBool(url.searchParams.get("onlyTarget"), true);
  const excludeCompetitors = parseBool(url.searchParams.get("excludeCompetitors"), true);
  const llmMaxRows = clamp(parseIntSafe(url.searchParams.get("llmMaxRows"), limit), limit, 500);
  const vertical = normalizeVertical((url.searchParams.get("vertical") || DEFAULT_VERTICAL).trim());
  const channels = parsePlatformList(url.searchParams.get("channels") || url.searchParams.get("platforms"), DEFAULT_CHANNELS);

  const userId = url.searchParams.get("userId") || undefined;
  const localWallet = getWalletFromRequest(req, userId);
  const backend = await fetchM2mWallet(localWallet.user_id);
  const wallet = backend?.wallet
    ? {
        ...localWallet,
        user_id: String(backend.wallet.user_id || localWallet.user_id),
        credits: Math.max(0, Math.trunc(Number(backend.wallet.credits ?? localWallet.credits))),
      }
    : localWallet;
  const walletToken = walletTokenForResponse(wallet);
  const linksUnlocked = isLinksUnlocked(wallet);

  const loaded = await loadLeadRows(Math.max(600, llmMaxRows * 3), vertical);
  if (!loaded.rows.length && loaded.source === "unavailable") {
    const errorRes = NextResponse.json(
      {
        error: "lead_source_unavailable",
        source: loaded.source,
        source_detail: loaded.source_detail,
        errors: loaded.errors,
        entitlements: walletPublic(wallet),
        wallet_token: walletToken,
      },
      { status: 500 },
    );
    errorRes.headers.set("Set-Cookie", walletSetCookieHeader(wallet));
    errorRes.headers.set("X-LeadPulse-Wallet-Token", walletToken);
    return errorRes;
  }

  const payload = await buildPayload(loaded.rows, {
    minScore,
    limit,
    onlyTarget,
    excludeCompetitors,
    vertical,
    llmMaxRows,
    channels,
  });

  const rows = payload.rows.map((row) => {
    if (linksUnlocked) return row;
    if (!row.author_url && !row.post_url) return row;
    return { ...row, author_url: "", post_url: "" };
  });

  const lockedLinkCount = payload.rows.reduce((acc, row) => {
    if (row.author_url || row.post_url) return acc + 1;
    return acc;
  }, 0);

  const res = NextResponse.json({
    ...payload,
    rows,
    source: loaded.source,
    source_detail: loaded.source_detail,
    locked_link_count: linksUnlocked ? 0 : lockedLinkCount,
    entitlements: {
      ...walletPublic(wallet),
      links_unlocked: linksUnlocked,
      export_credit_cost: exportCreditCost(),
    },
    wallet_token: walletToken,
  });

  res.headers.set("Set-Cookie", walletSetCookieHeader(wallet));
  res.headers.set("X-LeadPulse-Wallet-Token", walletToken);
  return res;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rowsRaw = Array.isArray(body?.rows)
      ? body.rows
      : Array.isArray(body?.posts)
        ? body.posts
        : [
            {
              source: body?.source,
              source_url: body?.source_url || body?.url,
              author: body?.author,
              keyword: body?.keyword,
              content: body?.content || body?.post || body?.text,
            },
          ];

    const rows = rowsRaw
      .map((item: Record<string, unknown>) => normalizeCandidate(item, "manual"))
      .filter((item: RawLeadCandidate | null): item is RawLeadCandidate => Boolean(item));

    if (!rows.length) {
      return NextResponse.json({ error: "empty_rows" }, { status: 400 });
    }

    const payload = await buildPayload(rows, {
      minScore: 0,
      limit: rows.length,
      onlyTarget: false,
      excludeCompetitors: false,
      vertical: DEFAULT_VERTICAL,
      llmMaxRows: rows.length,
      channels: DEFAULT_CHANNELS,
    });

    return NextResponse.json({
      ok: true,
      ...payload,
    });
  } catch (error) {
    return NextResponse.json({ error: "llm_lead_scoring_failed", detail: String(error) }, { status: 500 });
  }
}
