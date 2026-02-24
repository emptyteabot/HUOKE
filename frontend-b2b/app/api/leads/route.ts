import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

export const runtime = "nodejs";

type RunResult = { ok: boolean; stderr: string; stdout: string };

type IntentLevel = "high" | "medium" | "low";

type LeadRow = {
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
};

type LeadsPayload = {
  generated_at: string;
  vertical: string;
  filters: {
    limit: number;
    min_score: number;
    only_target: boolean;
    exclude_competitors: boolean;
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

type SupabaseLeadRecord = {
  id?: string;
  name?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
};

type VerticalConfig = {
  key: string;
  intentKeywords: string[];
  targetHints: string[];
  competitorKeywords: string[];
};

type SupabaseLoadResult =
  | { status: "ok"; rows: LeadRow[] }
  | { status: "not_configured"; reason: string }
  | { status: "failed"; reason: string };

const DEFAULT_VERTICAL = "study_abroad";

const VERTICAL_CONFIGS: Record<string, VerticalConfig> = {
  study_abroad: {
    key: "study_abroad",
    intentKeywords: [
      "留学",
      "申请",
      "文书",
      "中介",
      "择校",
      "雅思",
      "托福",
      "gpa",
      "offer",
      "硕士",
      "本科",
      "博士",
      "费用",
      "预算",
      "签证",
      "deadline",
    ],
    targetHints: [
      "留学",
      "申请",
      "择校",
      "文书",
      "预算",
      "费用",
      "雅思",
      "托福",
      "gpa",
      "offer",
      "请问",
      "求推荐",
      "求助",
      "怎么选",
    ],
    competitorKeywords: [
      "留学中介",
      "留学机构",
      "顾问老师",
      "保录",
      "代办",
      "服务报价",
      "工作室",
      "教育机构",
      "官方账号",
    ],
  },
  vibe_coding: {
    key: "vibe_coding",
    intentKeywords: ["独立开发", "saas", "获客", "转化", "冷启动", "增长", "出海", "agent"],
    targetHints: ["求工具", "求推荐", "获客", "自动化", "订阅", "转化", "客户", "线索"],
    competitorKeywords: ["代运营", "课程", "训练营", "工作室", "咨询服务", "接单"],
  },
};

const DEMAND_TERMS = ["求推荐", "求助", "请问", "有没有", "哪家", "想找", "怎么选", "预算", "费用", "急", "避雷"];
const QUESTION_TERMS = ["?", "？", "请问", "有没有", "哪家", "怎么", "如何"];

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

function containsAny(text: string, terms: string[]): boolean {
  const t = String(text || "").toLowerCase();
  return terms.some((term) => t.includes(String(term || "").toLowerCase()));
}

function normalizeVertical(vertical: string): string {
  const key = String(vertical || "").trim().toLowerCase();
  return VERTICAL_CONFIGS[key] ? key : DEFAULT_VERTICAL;
}

function getVerticalConfig(vertical: string): VerticalConfig {
  return VERTICAL_CONFIGS[normalizeVertical(vertical)] || VERTICAL_CONFIGS[DEFAULT_VERTICAL];
}

function scoreIntent(text: string, intentTerms: string[]): { level: IntentLevel; bonus: number; question: boolean } {
  const t = String(text || "").toLowerCase();
  const hit = intentTerms.reduce((acc, term) => (t.includes(String(term || "").toLowerCase()) ? acc + 1 : acc), 0);
  const urgent = containsAny(t, ["急", "ddl", "deadline", "来不及", "本周", "这周", "马上", "尽快"]);
  const question = containsAny(t, QUESTION_TERMS);

  if (hit >= 2 || (hit >= 1 && urgent)) return { level: "high", bonus: 22, question };
  if (hit >= 1 || question) return { level: "medium", bonus: 12, question };
  return { level: "low", bonus: 0, question };
}

function isCompetitor(author: string, text: string, competitorTerms: string[]): boolean {
  const authorLower = String(author || "").trim().toLowerCase();
  const textLower = String(text || "").toLowerCase();

  const noiseAuthors = new Set(["", "search_card", "unknown", "匿名", "none", "null"]);
  if (noiseAuthors.has(authorLower)) return true;

  const institutionalAuthorHints = ["中介", "机构", "顾问", "工作室", "教育", "老师", "官方", "播报", "留学服务", "留学咨询"];
  if (containsAny(authorLower, institutionalAuthorHints)) return true;

  const selfPromoTerms = ["私信我", "加我微信", "微信咨询", "欢迎咨询", "咨询我", "服务报价", "套餐", "保录", "代办", "点击主页"];
  const directSellTerms = ["私信", "加v", "微信", "咨询", "报价", "套餐", "保录", "代办", "服务"];

  const demandLike = containsAny(textLower, DEMAND_TERMS) || containsAny(textLower, QUESTION_TERMS);
  const selfPromoLike = containsAny(textLower, selfPromoTerms);
  const salesHits = directSellTerms.reduce((acc, term) => (textLower.includes(term) ? acc + 1 : acc), 0);

  if (selfPromoLike || salesHits >= 2) return true;

  const keywordHit = containsAny(textLower, competitorTerms);
  if (keywordHit && !demandLike) return true;

  return false;
}

function isTarget(text: string, competitor: boolean, intentLevel: IntentLevel, targetTerms: string[]): boolean {
  if (competitor) return false;
  if (intentLevel === "high" || intentLevel === "medium") return true;

  const textLower = String(text || "").toLowerCase();
  const demandLike = containsAny(textLower, DEMAND_TERMS);
  const questionLike = containsAny(textLower, QUESTION_TERMS);
  const hit = targetTerms.reduce((acc, term) => (textLower.includes(String(term || "").toLowerCase()) ? acc + 1 : acc), 0);

  if (hit >= 2) return true;
  if (hit >= 1 && (demandLike || questionLike)) return true;
  if (demandLike && textLower.length >= 25) return true;
  return false;
}

function parseNoteMeta(notes: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = String(notes || "").split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const chunks = line.split("|");
    for (const chunk of chunks) {
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

    let parsedMeta = false;
    const chunks = line.split("|");
    for (const chunk of chunks) {
      const part = chunk.trim();
      const idx = part.indexOf("=");
      if (idx <= 0) continue;
      const key = part.slice(0, idx).trim().toLowerCase();
      if (metaKeys.has(key)) parsedMeta = true;
    }

    if (!parsedMeta && !line.includes("=")) {
      body.push(raw);
    }
  }

  return body.join(" ").trim();
}

function md5_16(text: string): string {
  return crypto.createHash("md5").update(String(text || ""), "utf8").digest("hex").slice(0, 16);
}

function mapSupabaseRecord(record: SupabaseLeadRecord, vertical: string): LeadRow | null {
  const notes = String(record.notes || "");
  if (!notes) return null;

  const meta = parseNoteMeta(notes);
  const hasOpenclawSignal = meta.openclaw_sync === "1" || Boolean(meta.external_id || meta.post_url || meta.author_url);
  if (!hasOpenclawSignal) return null;

  const cfg = getVerticalConfig(vertical);

  const author = String(record.name || "Unknown").trim() || "Unknown";
  const keyword = String(meta.keyword || "").trim();
  const content = extractNoteContent(notes) || notes.slice(-280);
  const platform = String(meta.source || meta.platform || "xhs").trim().toLowerCase() || "xhs";
  const authorUrl = String(meta.author_url || "").trim();
  const postUrl = String(meta.post_url || "").trim();
  const sourceUrl = String(meta.source_url || "").trim();
  const collectedAt = String(meta.collected_at || record.created_at || "").trim();
  const contact = String(record.phone || "").trim();

  const textBlob = `${author} ${keyword} ${content}`;
  const intentSig = scoreIntent(textBlob, cfg.intentKeywords);
  const competitor = isCompetitor(author, textBlob, cfg.competitorKeywords);
  const target = isTarget(textBlob, competitor, intentSig.level, cfg.targetHints);

  const dmMeta = String(meta.dm_ready || "").trim().toLowerCase();
  const dmFromMeta = dmMeta === "1" || dmMeta === "true" || dmMeta === "yes";
  const dmFromUrl = /\/user\/profile\//i.test(authorUrl) || /xiaohongshu\.com\/user/i.test(authorUrl);
  const dmReady = dmFromMeta || dmFromUrl;

  const baseScore = parseIntSafe(meta.score, 70);
  const calibratedBase = clamp(30 + Math.trunc(baseScore * 2.2), 35, 85);
  const demandBonus = containsAny(textBlob, DEMAND_TERMS) ? 14 : intentSig.question ? 6 : 0;
  const score = clamp(calibratedBase + intentSig.bonus + demandBonus + (dmReady ? 8 : 0) - (competitor ? 18 : 0), 0, 100);

  const externalId = String(meta.external_id || "").trim() || md5_16(`${platform}|${author}|${postUrl}|${content.slice(0, 80)}`);

  return {
    external_id: externalId,
    platform,
    author,
    keyword,
    score,
    intent_level: intentSig.level,
    is_target: target,
    is_competitor: competitor,
    dm_ready: dmReady,
    author_url: authorUrl,
    post_url: postUrl,
    source_url: sourceUrl,
    content,
    contact,
    collected_at: collectedAt,
  };
}

function summarize(rows: LeadRow[]): LeadsPayload["summary"] {
  const platformCounts: Record<string, number> = {};
  for (const item of rows) {
    const p = item.platform || "unknown";
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  }

  return {
    total_rows: rows.length,
    filtered_rows: 0,
    target_rows: rows.filter((x) => x.is_target).length,
    competitor_rows: rows.filter((x) => x.is_competitor).length,
    dm_ready_rows: rows.filter((x) => x.dm_ready).length,
    score_ge_65_rows: rows.filter((x) => x.score >= 65).length,
    platform_counts: platformCounts,
  };
}

function buildPayload(rows: LeadRow[], params: { limit: number; minScore: number; onlyTarget: boolean; excludeCompetitors: boolean; vertical: string }): LeadsPayload {
  let filtered = rows;
  if (params.excludeCompetitors) filtered = filtered.filter((x) => !x.is_competitor);
  if (params.onlyTarget) filtered = filtered.filter((x) => x.is_target);
  if (params.minScore > 0) filtered = filtered.filter((x) => x.score >= params.minScore);

  filtered = filtered.slice(0, Math.max(1, params.limit));

  const summary = summarize(rows);
  summary.filtered_rows = filtered.length;

  return {
    generated_at: new Date().toISOString(),
    vertical: params.vertical,
    filters: {
      limit: params.limit,
      min_score: params.minScore,
      only_target: params.onlyTarget,
      exclude_competitors: params.excludeCompetitors,
    },
    summary,
    rows: filtered,
  };
}

async function loadLeadsFromSupabase(maxFetch: number, vertical: string): Promise<SupabaseLoadResult> {
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
    const uniq = new Map<string, LeadRow>();

    for (const record of records || []) {
      const row = mapSupabaseRecord(record, vertical);
      if (!row) continue;
      if (!uniq.has(row.external_id)) uniq.set(row.external_id, row);
    }

    const rows = Array.from(uniq.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.collected_at || "").localeCompare(String(a.collected_at || ""));
    });

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

function loadFromLocalExporter(params: {
  minScore: number;
  limit: number;
  onlyTarget: boolean;
  excludeCompetitors: boolean;
  vertical: string;
}): { ok: true; payload: LeadsPayload } | { ok: false; error: string; detail?: string } {
  const projectRoot = path.resolve(process.cwd(), "..");
  const scriptPath = path.join(projectRoot, "tools", "export_leads_for_web.py");
  if (!existsSync(scriptPath)) {
    return { ok: false, error: "export_script_missing", detail: scriptPath };
  }

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "leadpulse-web-"));
  const outPath = path.join(tmpDir, "leads.json");

  try {
    const args = [
      "--project-root",
      projectRoot,
      "--output",
      outPath,
      "--limit",
      String(params.limit),
      "--min-score",
      String(params.minScore),
      "--only-target",
      params.onlyTarget ? "1" : "0",
      "--exclude-competitors",
      params.excludeCompetitors ? "1" : "0",
      "--vertical",
      params.vertical,
    ];

    const run = runExporter(scriptPath, args, projectRoot);
    if (!run.ok) {
      return {
        ok: false,
        error: "exporter_failed",
        detail: `${run.stderr.slice(-1200)} ${run.stdout.slice(-600)}`.trim(),
      };
    }

    const payload = JSON.parse(readFileSync(outPath, "utf-8")) as LeadsPayload;
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, error: "exporter_exception", detail: String(error) };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function loadFromBundledSnapshot(): { ok: true; rows: LeadRow[]; detail: string } | { ok: false; error: string; detail?: string } {
  const snapshotPath = path.join(process.cwd(), "data", "leads_snapshot.json");
  if (!existsSync(snapshotPath)) {
    return { ok: false, error: "snapshot_missing", detail: snapshotPath };
  }

  try {
    const raw = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    const rowsRaw = Array.isArray(raw?.rows) ? raw.rows : [];

    const rows: LeadRow[] = rowsRaw
      .map((item: any) => {
        const platform = String(item?.platform || "unknown").trim().toLowerCase() || "unknown";
        const author = String(item?.author || "Unknown").trim() || "Unknown";
        const keyword = String(item?.keyword || "").trim();
        const content = String(item?.content || "").trim();
        const postUrl = String(item?.post_url || "").trim();

        return {
          external_id: String(item?.external_id || "").trim() || md5_16(`${platform}|${author}|${postUrl}|${content.slice(0, 80)}`),
          platform,
          author,
          keyword,
          score: clamp(parseIntSafe(String(item?.score ?? 0), 0), 0, 100),
          intent_level: (["high", "medium", "low"].includes(String(item?.intent_level || ""))
            ? String(item?.intent_level)
            : "low") as IntentLevel,
          is_target: Boolean(item?.is_target),
          is_competitor: Boolean(item?.is_competitor),
          dm_ready: Boolean(item?.dm_ready),
          author_url: String(item?.author_url || "").trim(),
          post_url: postUrl,
          source_url: String(item?.source_url || "").trim(),
          content,
          contact: String(item?.contact || "").trim(),
          collected_at: String(item?.collected_at || "").trim(),
        };
      })
      .filter((x: LeadRow) => Boolean(x.external_id));

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.collected_at || "").localeCompare(String(a.collected_at || ""));
    });

    return { ok: true, rows, detail: snapshotPath };
  } catch (error) {
    return { ok: false, error: "snapshot_read_failed", detail: String(error) };
  }
}
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const minScore = clamp(parseIntSafe(url.searchParams.get("minScore"), 65), 0, 100);
  const limit = clamp(parseIntSafe(url.searchParams.get("limit"), 200), 1, 1000);
  const onlyTarget = parseBool(url.searchParams.get("onlyTarget"), true);
  const excludeCompetitors = parseBool(url.searchParams.get("excludeCompetitors"), true);
  const vertical = normalizeVertical((url.searchParams.get("vertical") || DEFAULT_VERTICAL).trim());

  const supabaseLoad = await loadLeadsFromSupabase(Math.max(600, limit * 6), vertical);
  if (supabaseLoad.status === "ok") {
    const payload = buildPayload(supabaseLoad.rows, {
      minScore,
      limit,
      onlyTarget,
      excludeCompetitors,
      vertical,
    });
    return NextResponse.json(payload);
  }

  const fallback = loadFromLocalExporter({
    minScore,
    limit,
    onlyTarget,
    excludeCompetitors,
    vertical,
  });

  if (fallback.ok) {
    return NextResponse.json(fallback.payload);
  }

  const snapshot = loadFromBundledSnapshot();
  if (snapshot.ok) {
    const payload = buildPayload(snapshot.rows, {
      minScore,
      limit,
      onlyTarget,
      excludeCompetitors,
      vertical,
    });

    return NextResponse.json({
      ...payload,
      source: "bundled_snapshot",
      source_detail: snapshot.detail,
    });
  }

  return NextResponse.json(
    {
      error: "lead_source_unavailable",
      supabase: supabaseLoad,
      local: fallback,
      snapshot,
    },
    { status: 500 },
  );
}



