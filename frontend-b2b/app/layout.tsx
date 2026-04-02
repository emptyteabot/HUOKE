import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadPulse | AI Revenue Operating System",
  description: "LeadPulse captures demand, filters noise, and routes high-intent revenue opportunities into one operating system.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
