import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadPulse - AI驱动的B2B获客平台",
  description: "使用AI自动化您的B2B销售流程",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
