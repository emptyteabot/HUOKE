import outreachQueue from "@/data/self_outreach/strict_outreach_queue.json";
import { SelfOutreachActions } from "@/components/self-outreach-actions";

type OutreachRow = {
  rank: string;
  priority: string;
  industry_label: string;
  quality_score: string;
  source: string;
  platform: string;
  author: string;
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
  industry_mix: Record<string, number>;
  rows: OutreachRow[];
};

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

export default function SelfOutreachPage() {
  const payload = outreachQueue as OutreachPayload;
  const rows = payload.rows || [];
  const p0Rows = rows.filter((row) => row.priority === "P0").length;
  const latestGenerated = dateLabel(payload.generated_at);

  return (
    <div className="lp-grid" style={{ gap: 14 }}>
      <section className="lp-card" style={{ padding: 18 }}>
        <div className="lp-badge" style={{ marginBottom: 10 }}>Manual send only</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(260px, 0.75fr)", gap: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.4 }}>LeadPulse 自用私信工作台</h1>
            <p style={{ margin: "10px 0 0", color: "var(--lp-muted)", lineHeight: 1.7 }}>
              这里不是群发工具。LeadPulse 已经完成候选发现、二次过滤、证据摘录和私信草稿。
              你只需要逐条打开原帖核对，再复制草稿到 Reddit，最后由你手动点击发送。
            </p>
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
              sourceUrl={row.source_url}
              message={row.first_message}
            />
          </article>
        ))}
      </section>
    </div>
  );
}
