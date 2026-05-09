import { readFile } from "fs/promises";
import path from "path";
import { SelfOutreachActions } from "@/components/self-outreach-actions";

export const dynamic = "force-dynamic";

type OutreachRow = {
  rank: string;
  priority: string;
  industry_label: string;
  quality_score: string;
  source: string;
  platform: string;
  author: string;
  profile_url?: string;
  compose_url?: string;
  contact_mode?: string;
  fit_tier?: string;
  source_url: string;
  published_at: string;
  title: string;
  signal_summary: string;
  recommended_offer: string;
  first_message: string;
  next_action: string;
};

type OutreachPayload = {
  generated_at: string;
  source_file: string;
  source_rows: number;
  strict_ready_rows: number;
  queue_rows: number;
  manual_send_only: boolean;
  source_note?: string;
  industry_mix: Record<string, number>;
  rows: OutreachRow[];
};

type SearchParams = Promise<{ source?: string | string[] }>;

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function leadKey(row: OutreachRow) {
  return `${row.rank}:${row.author}:${row.source_url}`;
}

function fitLabel(row: OutreachRow) {
  if (row.fit_tier === "platform_task") return "搜索任务";
  if (row.fit_tier === "platform_candidate") return "待核对候选";
  if (row.fit_tier === "channel_partner") return "渠道观察";
  if (row.fit_tier === "direct_buyer") return "直客";
  return null;
}

function sourceValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function readOutreachPayload(source: "global" | "domestic") {
  const fileName = source === "domestic" ? "domestic_outreach_queue.json" : "strict_outreach_queue.json";
  const filePath = path.join(process.cwd(), "data", "self_outreach", fileName);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as OutreachPayload;
}

export default async function SelfOutreachPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolved = searchParams ? await searchParams : {};
  const activeSource = sourceValue(resolved.source) === "domestic" ? "domestic" : "global";
  const payload = await readOutreachPayload(activeSource);
  const rows = payload.rows || [];
  const p0Rows = rows.filter((row) => row.priority === "P0").length;
  const latestGenerated = dateLabel(payload.generated_at);
  const isDomestic = activeSource === "domestic";

  return (
    <div className="lp-grid" style={{ gap: 14 }}>
      <section className="lp-card" style={{ padding: 18 }}>
        <div className="lp-badge" style={{ marginBottom: 10 }}>Manual send only</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(260px, 0.75fr)", gap: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.4 }}>LeadPulse 自用私信工作台</h1>
            <p style={{ margin: "10px 0 0", color: "var(--lp-muted)", lineHeight: 1.7 }}>
              这里不是群发工具。LeadPulse 已经完成候选发现、二次过滤、证据摘录和私信草稿。
              {isDomestic
                ? "你只需要逐条打开小红书/微博/知乎来源或主页核对，再复制中文草稿，最后由你在平台内手动发送。"
                : "你只需要逐条打开原帖核对，再复制草稿到 Reddit，最后由你手动点击发送。"}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <a className={isDomestic ? "lp-btn lp-btn-secondary" : "lp-btn"} href="/dashboard/self-outreach">
                全球公开源
              </a>
              <a
                className={isDomestic ? "lp-btn" : "lp-btn lp-btn-secondary"}
                href="/dashboard/self-outreach?source=domestic"
              >
                国内平台
              </a>
            </div>
          </div>
          <div className="lp-grid lp-grid-2">
            <div className="lp-mini-card">
              <div className="lp-mini-label">严格队列</div>
              <div className="lp-kpi">{payload.queue_rows}</div>
            </div>
            <div className="lp-mini-card">
              <div className="lp-mini-label">今日 P0</div>
              <div className="lp-kpi">{p0Rows}</div>
            </div>
            <div className="lp-mini-card">
              <div className="lp-mini-label">Ready 池</div>
              <div className="lp-kpi">{payload.strict_ready_rows}</div>
            </div>
            <div className="lp-mini-card">
              <div className="lp-mini-label">更新时间</div>
              <div style={{ fontWeight: 700 }}>{latestGenerated}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>行业分布</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>{payload.source_file}</div>
            {payload.source_note ? (
              <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>{payload.source_note}</div>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(payload.industry_mix || {}).map(([industry, count]) => (
              <span key={industry} className="lp-badge">
                {industry}: {count}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-grid">
        {rows.map((row) => (
          <article key={leadKey(row)} className="lp-card lp-outreach-card">
            <div className="lp-outreach-head">
              <div>
                <div className="lp-badge">{row.priority} · #{row.rank} · {row.industry_label}</div>
                {fitLabel(row) ? <div className="lp-badge" style={{ marginTop: 6 }}>{fitLabel(row)}</div> : null}
                <h2 className="lp-outreach-title">{row.title}</h2>
                <div className="lp-outreach-meta">
                  <span>{row.author}</span>
                  <span>{dateLabel(row.published_at)}</span>
                  <span>{row.source}</span>
                  <span>Score {row.quality_score}</span>
                </div>
              </div>
              <div className="lp-score-pill">{row.platform}</div>
            </div>

            <div className="lp-outreach-grid">
              <div>
                <div className="lp-section-label">证据</div>
                <p className="lp-evidence">{row.signal_summary}</p>
              </div>
              <div>
                <div className="lp-section-label">报价方向</div>
                <p className="lp-evidence">{row.recommended_offer}</p>
              </div>
            </div>

            <div className="lp-draft-box">
              <div className="lp-section-label">待发送私信草稿</div>
              <p>{row.first_message}</p>
            </div>

            <SelfOutreachActions
              leadKey={leadKey(row)}
              author={row.author}
              platform={row.platform}
              sourceUrl={row.source_url}
              profileUrl={row.profile_url}
              composeUrl={row.compose_url}
              contactMode={row.contact_mode}
              message={row.first_message}
            />
          </article>
        ))}
      </section>
    </div>
  );
}
