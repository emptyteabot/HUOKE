"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAVS = [
  { href: "/dashboard", label: "作战中枢" },
  { href: "/dashboard/leads", label: "潜在客户" },
  { href: "/dashboard/tasks", label: "任务" },
  { href: "/dashboard/messages", label: "消息" },
  { href: "/dashboard/billing", label: "账单" },
  { href: "/dashboard/settings", label: "设置" },
  { href: "/dashboard/ai", label: "AI触达" },
  { href: "/dashboard/emails", label: "触达记录" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="lp-nav">
      {NAVS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} data-active={active ? "1" : "0"}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
