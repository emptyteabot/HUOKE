"use client";

import { useEffect, useState } from "react";

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

export default function EmailsPage() {
  const [events, setEvents] = useState<OutreachEvent[]>([]);

  const load = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as OutreachEvent[]) : [];
    setEvents(list);
  };

  useEffect(() => {
    load();
  }, []);

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setEvents([]);
  };

  return (
    <div className="lp-grid" style={{ gap: 14 }}>
      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>触达记录</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13 }}>来自 AI 触达页面的草稿/已触达记录（本地存储）</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="lp-btn" onClick={load}>刷新</button>
            <button className="lp-btn" onClick={clearAll}>清空</button>
          </div>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        {events.length === 0 ? (
          <div style={{ color: "var(--lp-muted)" }}>暂无记录。先去「AI触达」页面生成并保存文案。</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="lp-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>状态</th>
                  <th>平台</th>
                  <th>对象</th>
                  <th>标题</th>
                  <th>内容</th>
                </tr>
              </thead>
              <tbody>
                {events.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.created_at).toLocaleString("zh-CN")}</td>
                    <td>{item.status === "sent" ? "已触达" : "草稿"}</td>
                    <td>{item.platform}</td>
                    <td>{item.author}</td>
                    <td>{item.subject}</td>
                    <td style={{ minWidth: 420 }}>{item.message.slice(0, 180)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
