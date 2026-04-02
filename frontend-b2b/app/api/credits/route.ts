import { NextRequest, NextResponse } from "next/server";

import { getWalletFromRequest, walletPublic, walletSetCookieHeader, walletTokenForResponse } from "@/lib/lead_wallet";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || undefined;
  const wallet = getWalletFromRequest(request, userId);
  const res = NextResponse.json({
    ok: true,
    wallet: walletPublic(wallet),
    wallet_token: walletTokenForResponse(wallet),
  });

  res.headers.set("Set-Cookie", walletSetCookieHeader(wallet));
  res.headers.set("X-LeadPulse-Wallet-Token", walletTokenForResponse(wallet));
  return res;
}
