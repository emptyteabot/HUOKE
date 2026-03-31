import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "线索Pulse | AI获客作战台",
  description: "留学赛道 AI 获客 SaaS：实时线索、竞品排除、AI 触达与交付闭环。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
