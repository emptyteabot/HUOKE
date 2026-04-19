import DashboardNav from "@/components/dashboard-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-shell">
      <header className="lp-card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="lp-badge" style={{ marginBottom: 8 }}>Workspace Console</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>LeadPulse · Revenue Workspace</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
              Leads / Messages / Tasks / Billing / Fulfillment
            </div>
          </div>
          <DashboardNav />
        </div>
      </header>

      {children}
    </div>
  );
}
