import DashboardNav from "@/components/dashboard-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-shell">
      <header className="lp-card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="lp-badge" style={{ marginBottom: 8 }}>Manus级 AI 作战台</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>线索Pulse · 留学垂直获客系统</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
              实时线索 / 竞品排除 / AI触达 / 订阅交付
            </div>
          </div>
          <DashboardNav />
        </div>
      </header>

      {children}
    </div>
  );
}
