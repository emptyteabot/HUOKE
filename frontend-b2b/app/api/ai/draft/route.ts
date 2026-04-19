import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const author = String(body?.author || "同学").trim() || "同学";
    const keyword = String(body?.keyword || "留学申请").trim();
    const content = String(body?.content || "").trim();
    const angle = String(body?.angle || "时间线风险").trim();
    const cta = String(body?.cta || "回复“评估”领取10分钟方案").trim();

    const snippet = content.length > 120 ? `${content.slice(0, 120)}...` : content;

    const subject = `[A/B:A] ${author}，你这个${keyword || "留学"}问题建议今天先做三步`;
    const message = `${author}你好，我看了你最近的内容，核心卡点在「${angle}」。\n\n建议你先做这3步：\n1) 先确认国家/专业/预算是否匹配\n2) 24小时内给你可执行时间线\n3) 判断是否需要顾问介入，避免无效投入\n\n${cta}\n\n线索摘要：${snippet || "（无摘要）"}`;

    return NextResponse.json({ subject, message, mode: "template" });
  } catch (error) {
    return NextResponse.json({ error: "draft_failed", detail: String(error) }, { status: 500 });
  }
}
