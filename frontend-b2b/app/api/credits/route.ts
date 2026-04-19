import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, walletPublic, walletSetCookieHeader, walletTokenForResponse } from "@/lib/lead_wallet";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || undefined;
  const wallet = getWalletFromRequest(req, userId);

  const token = walletTokenForResponse(wallet);
  const res = NextResponse.json({
    ok: true,
    wallet: walletPublic(wallet),
    wallet_token: token,
  });
  res.headers.set("Set-Cookie", walletSetCookieHeader(wallet));
  res.headers.set("X-LeadPulse-Wallet-Token", token);
  return res;
}



