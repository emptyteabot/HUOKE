"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrCreateClientUserId } from "@/lib/client_user";

type LeadRow = {
  external_id: string;
  platform: string;
  author: string;
  keyword: string;
  score: number;
  content: string;
  author_url: string;
};

type DraftPayload = { subject: string; message: string; mode: string };

type OutreachEvent = {
  id: string;
  created_at: string;
  platform: string;
  author: string;
  subject: string;
  message: string;
  status: "draft" | "sent";
};

const STORAGE_KEY = "leadpulse_outreach_events";

export default function AIPage() {
  const [userId, setUserId] = useState("guest_demo");

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [angle, setAngle] = useState("时间线风险");
  const [cta, setCta] = useState("回复“评估”，我给你10分钟判断方案");
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  const selectedLead = useMemo(() => leads.find((x) => x.external_id === selectedId) || null, [leads, selectedId]);

  useEffect(() => {
    setUserId(getOrCreateClientUserId());
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoadingLeads(true);
      try {
        const qs = new URLSearchParams({
          limit: "200",
          minScore: "60",
          onlyTarget: "1",
          excludeCompetitors: "1",
          userId,
        });
        const res = await fetch(`/api/leads?${qs.toString()}`, { cache: "no-store" });
        const payload = await res.json();
        setLeads(payload?.rows || []);
        if ((payload?.rows || []).length > 0) {
          setSelectedId(payload.rows[0].external_id);
        }
      } finally {
        setLoadingLeads(false);
      }
    };
    if (userId) run();
  }, [userId]);

  const generateDraft = async () => {
    if (!selectedLead) return;
    setGenLoading(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          author: selectedLead.author,
          keyword: selectedLead.keyword,
          content: selectedLead.content,
          angle,
          cta,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "draft_failed");
      setDraft(payload);
    } catch (e) {
      alert(`生成失败: ${String(e)}`);
    } finally {
      setGenLoading(false);
    }
  };

  const saveEvent = (status: "draft" | "sent") => {
    if (!selectedLead || !draft) return;
    const event: OutreachEvent = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      created_at: new Date().toISOString(),
      platform: selectedLead.platform,
      author: selectedLead.author,
      subject: draft.subject,
      message: draft.message,
      status,
    };

    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as OutreachEvent[]) : [];
    arr.unshift(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    alert(status === "sent" ? "已记录为已触达" : "已保存草稿");
  };

  return (
    <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>触达参数</div>

        <label style={{ display: "block", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--lp-muted)", marginBottom: 6 }}>选择线索</div>
          <select className="lp-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {loadingLeads ? <option>加载中...</option> : null}
            {leads.map((item) => (
              <option key={item.external_id} value={item.external_id}>
                {item.author} | {item.platform} | {item.score}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--lp-muted)", marginBottom: 6 }}>痛点角度</div>
          <select className="lp-select" value={angle} onChange={(e) => setAngle(e.target.value)}>
            <option>时间线风险</option>
            <option>预算匹配</option>
            <option>选校决策</option>
            <option>文书质量</option>
            <option>签证不确定性</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--lp-muted)", marginBottom: 6 }}>行动指令</div>
          <input className="lp-input" value={cta} onChange={(e) => setCta(e.target.value)} />
        </label>

        <button className="lp-btn" onClick={generateDraft} disabled={!selectedLead || genLoading}>
          {genLoading ? "生成中..." : "生成个性化触达文案"}
        </button>

        {selectedLead ? (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--lp-muted)", lineHeight: 1.7 }}>
            <div><strong>线索:</strong> {selectedLead.author}</div>
            <div><strong>关键词:</strong> {selectedLead.keyword || "-"}</div>
            <div>{selectedLead.content?.slice(0, 140) || "-"}</div>
          </div>
        ) : null}
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>AI 输出</div>

        {!draft ? <div style={{ color: "var(--lp-muted)" }}>先选择线索并点击生成。</div> : null}

        {draft ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "var(--lp-muted)", marginBottom: 4 }}>标题</div>
              <div className="lp-card" style={{ padding: 10 }}>{draft.subject}</div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "var(--lp-muted)", marginBottom: 4 }}>正文</div>
              <div className="lp-card" style={{ padding: 10, whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                {draft.message}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="lp-btn" onClick={() => saveEvent("draft")}>保存草稿</button>
              <button className="lp-btn" onClick={() => saveEvent("sent")}>标记已触达</button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
