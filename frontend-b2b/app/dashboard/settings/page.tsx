import Link from "next/link";

import { CREDITS_POLICY, getPricingPlans } from "@/lib/pricing";
import { defaultCredits, exportCreditCost, freeExportLimit, linkUnlockHours } from "@/lib/lead_wallet";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

function hasValue(value: string | undefined) {
  return String(value || "").trim().length > 0;
}

function toneStyles(tone: "good" | "warn" | "neutral") {
  if (tone === "good") {
    return {
      border: "1px solid #b9e3c6",
      background: "#f3fbf5",
      color: "#0b6f3d",
      pillBackground: "#dff3e5",
    };
  }

  if (tone === "warn") {
    return {
      border: "1px solid #f0d7aa",
      background: "#fff8ea",
      color: "#9a6500",
      pillBackground: "#f8e8c5",
    };
  }

  return {
    border: "1px solid #d7e3f7",
    background: "#fbfdff",
    color: "#224a87",
    pillBackground: "#edf4ff",
  };
}

function statusCard(args: {
  label: string;
  value: string;
  helper: string;
  tone: "good" | "warn" | "neutral";
}) {
  const tone = toneStyles(args.tone);

  return (
    <article
      key={args.label}
      style={{
        border: tone.border,
        borderRadius: 18,
        background: tone.background,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          background: tone.pillBackground,
          color: tone.color,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          padding: "6px 10px",
          textTransform: "uppercase",
        }}
      >
        {args.label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 12 }}>{args.value}</div>
      <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>{args.helper}</div>
    </article>
  );
}

export default function SettingsPage() {
  const pricingPlans = getPricingPlans();
  const siteUrl = SITE_URL;
  const bookingUrl = String(process.env.NEXT_PUBLIC_BOOKING_URL || `${SITE_URL}/book`).trim();
  const supportEmail = String(process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "").trim();
  const basePath = String(process.env.NEXT_PUBLIC_BASE_PATH || "/").trim() || "/";
  const paymentProvider = String(process.env.LEADPULSE_PAYMENT_PROVIDER || "xunhupay").trim().toLowerCase();
  const hasInternalKey = hasValue(process.env.LEADPULSE_INTERNAL_ACCESS_KEY) || hasValue(process.env.LEADPULSE_AUTOMATION_KEY);
  const hasAutomationKey = hasValue(process.env.LEADPULSE_AUTOMATION_KEY);
  const hasWalletSecret = hasValue(process.env.WALLET_SIGNING_SECRET);
  const walletSecretIsDefault = String(process.env.WALLET_SIGNING_SECRET || "").trim() === "";
  const xunhuReady = hasValue(process.env.LEADPULSE_XUNHU_APP_ID) && hasValue(process.env.LEADPULSE_XUNHU_APP_SECRET);
  const supabaseReady =
    hasValue(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const smtpReady =
    hasValue(process.env.LEADPULSE_SMTP_HOST) &&
    hasValue(process.env.LEADPULSE_SMTP_USER) &&
    hasValue(process.env.LEADPULSE_SMTP_PASS) &&
    hasValue(process.env.LEADPULSE_EMAIL_FROM);
  const notificationTargets = [
    { label: "Generic webhook", enabled: hasValue(process.env.LEADPULSE_INTAKE_WEBHOOK_URL) },
    { label: "Slack", enabled: hasValue(process.env.LEADPULSE_SLACK_WEBHOOK_URL) },
    { label: "Feishu", enabled: hasValue(process.env.LEADPULSE_FEISHU_WEBHOOK_URL) },
    { label: "GAS", enabled: hasValue(process.env.LEADPULSE_GOOGLE_APPS_SCRIPT_URL) },
  ];
  const notificationCount = notificationTargets.filter((item) => item.enabled).length;

  const actionItems: string[] = [];
  if (!hasWalletSecret) actionItems.push("补上 WALLET_SIGNING_SECRET，避免 wallet 落到开发默认密钥。");
  if (!hasInternalKey) actionItems.push("补上 LEADPULSE_INTERNAL_ACCESS_KEY 或 LEADPULSE_AUTOMATION_KEY，否则非本地环境会被 middleware 拦住。");
  if (!smtpReady) actionItems.push("补齐 SMTP 配置，当前消息页能看队列，但不能稳定原生发信。");
  if (paymentProvider === "xunhupay" && !xunhuReady) actionItems.push("补上虎皮椒 AppID 与密钥，否则只能创建本地订单，不能生成自动收银台。");
  if (notificationCount === 0) actionItems.push("至少接一个通知目标，避免 booking / payment 线索只留在本地状态库。");
  if (!supabaseReady) actionItems.push("如果要稳定切远端数据源，补齐 Supabase URL 与 key。");

  const accessMode = hasInternalKey ? "已保护" : "缺密钥";
  const walletPolicySummary = `${freeExportLimit()} 次免费导出 / 每次 ${exportCreditCost()} 积分 / 链接解锁 ${linkUnlockHours()} 小时`;

  return (
    <div className="lp-grid" style={{ gap: 14 }}>
      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700 }}>工作台设置</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, marginTop: 4 }}>
              这里只读现有站点、定价、环境和 console 接入状态，不展示 secret 原文。
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/internal-login" className="lp-btn">
              内部登录
            </Link>
            <Link href="/pay?package=standard" className="lp-btn" style={{ background: "white", color: "#163861", border: "1px solid #cddcf0" }}>
              打开充值页
            </Link>
          </div>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div className="lp-grid lp-grid-4">
          {statusCard({
            label: "站点",
            value: SITE_NAME,
            helper: `${siteUrl} ｜ basePath ${basePath}`,
            tone: "good",
          })}
          {statusCard({
            label: "控制台",
            value: accessMode,
            helper: hasInternalKey ? "dashboard / ops / proof 等路径走 internal-login + cookie gate。" : "没有 internal key 时，非本地环境会被 middleware 拦住。",
            tone: hasInternalKey ? "good" : "warn",
          })}
          {statusCard({
            label: "Wallet",
            value: walletPolicySummary,
            helper: `访客默认积分：${defaultCredits()}。账务页会按这套规则读取余额。`,
            tone: hasWalletSecret && !walletSecretIsDefault ? "good" : "warn",
          })}
          {statusCard({
            label: "支付",
            value: paymentProvider,
            helper: xunhuReady ? "虎皮椒收银台已接入，到账后自动发放 LP Coin。" : "虎皮椒密钥未配置，暂时不能生成自动收银台。",
            tone: xunhuReady ? "good" : "warn",
          })}
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>站点身份</div>
        <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
          <div style={{ border: "1px solid #d7e3f7", borderRadius: 18, background: "#fbfdff", padding: 16 }}>
            <div style={{ fontWeight: 700 }}>{SITE_NAME}</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>{SITE_DESCRIPTION}</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.7, marginTop: 10 }}>
              <div>站点地址：{siteUrl}</div>
              <div>预约入口：{bookingUrl}</div>
              <div>支持邮箱：{supportEmail || "未配置"}</div>
            </div>
          </div>

          <div style={{ border: "1px solid #d7e3f7", borderRadius: 18, background: "#f4f8ff", padding: 16 }}>
            <div style={{ fontWeight: 700 }}>入口路径</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>
              <div>入口：/dashboard、/ops、/proof、/agents、/cases、/investors</div>
              <div>登录：/internal-login</div>
              <div>Billing：/dashboard/billing</div>
              <div>Settings：/dashboard/settings</div>
              <div>开通：/pay、/redeem、/start</div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>充值模型</div>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {pricingPlans.map((plan) => (
            <article
              key={plan.id}
              style={{
                border: plan.highlight ? "1px solid #9cbdf2" : "1px solid #d7e3f7",
                borderRadius: 18,
                background: plan.highlight ? "#f4f8ff" : "#fbfdff",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 700 }}>{plan.name}</div>
                <div style={{ color: "#224a87", fontSize: 13 }}>
                  {plan.price}
                  {plan.period}
                </div>
              </div>
              <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>{plan.goodFor}</div>
              <div style={{ color: "var(--lp-muted)", fontSize: 12, lineHeight: 1.7, marginTop: 10 }}>
                {plan.features.slice(0, 4).map((feature) => (
                  <div key={feature}>• {feature}</div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <Link href={plan.paymentUrl} className="lp-btn">
                  {plan.ctaLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>运行状态</div>
        <div className="lp-grid lp-grid-4">
          {statusCard({
            label: "余额签名",
            value: hasWalletSecret ? "已配置" : "缺失",
            helper: hasWalletSecret ? "余额凭证会按自定义密钥签名。" : "当前缺签名密钥，生产环境需要补齐。",
            tone: hasWalletSecret && !walletSecretIsDefault ? "good" : "warn",
          })}
          {statusCard({
            label: "SMTP",
            value: smtpReady ? "已就绪" : "未就绪",
            helper: smtpReady ? "messages / communications 可直接走 SMTP 发送。" : "还缺 SMTP host/user/pass/from 之一。",
            tone: smtpReady ? "good" : "warn",
          })}
          {statusCard({
            label: "Supabase",
            value: supabaseReady ? "已就绪" : "本地后备",
            helper: supabaseReady ? "线索数据可走远端表作为后备数据源。" : "当前更偏本地导出器 / 状态快照。",
            tone: supabaseReady ? "good" : "neutral",
          })}
          {statusCard({
            label: "支付",
            value: paymentProvider,
            helper: xunhuReady ? "下单、验签回调、金额校验和自动加积分已接入。" : "缺虎皮椒正式密钥，线上无法自动发货。",
            tone: xunhuReady ? "good" : "warn",
          })}
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>积分规则快照</div>
        <div className="lp-grid lp-grid-2">
          <div style={{ border: "1px solid #d7e3f7", borderRadius: 18, background: "#fbfdff", padding: 16 }}>
            <div style={{ fontWeight: 700 }}>当前规则</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.8, marginTop: 8 }}>
              <div>访客默认积分：{defaultCredits()}</div>
              <div>免费导出上限：{freeExportLimit()}</div>
              <div>单次导出成本：{exportCreditCost()}</div>
              <div>解锁窗口：{linkUnlockHours()} 小时</div>
            </div>
          </div>

          <div style={{ border: "1px solid #d7e3f7", borderRadius: 18, background: "#f4f8ff", padding: 16 }}>
            <div style={{ fontWeight: 700 }}>产品承诺</div>
            <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.8, marginTop: 8 }}>
              {CREDITS_POLICY.slice(0, 3).map((item) => (
                <div key={item}>• {item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>待处理动作</div>
        {actionItems.length ? (
          <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.8 }}>
            {actionItems.map((item) => (
              <div key={item}>• {item}</div>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--lp-muted)", fontSize: 13, lineHeight: 1.8 }}>
            目前 workspace 关键项都已接上，下一步更像是继续做标准 SaaS 级别的账务、团队权限和审计轨迹。
          </div>
        )}
      </section>
    </div>
  );
}
