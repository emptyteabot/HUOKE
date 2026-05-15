import { NextRequest, NextResponse } from "next/server";

import { getWalletFromRequest, walletPublic, walletSetCookieHeader, walletTokenForResponse } from "@/lib/lead_wallet";
import { m2mBackendUrl } from "@/lib/m2m/proxy";

export const runtime = "nodejs";

type BackendWallet = {
  user_id?: string;
  credits?: number;
  free_trial_credits_total?: number;
  free_trial_credits_granted?: boolean;
};

type BackendWalletResponse = {
  wallet?: BackendWallet;
  free_trial_credits?: number;
  high_value_charge_credits?: number;
  noise_charge_credits?: number;
  refund_credits?: number;
};

async function loadBackendWallet(userId: string): Promise<BackendWalletResponse | null> {
  try {
    const target = new URL(`${m2mBackendUrl()}/api/v2/billing/wallet`);
    target.searchParams.set("user_id", userId);

    const response = await fetch(target, {
      method: "GET",
      headers: {
        ...(process.env.LEADPULSE_M2M_API_KEY ? { authorization: `Bearer ${process.env.LEADPULSE_M2M_API_KEY}` } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as BackendWalletResponse;
  } catch {
    return null;
  }
}

function mergeWallet(localWallet: ReturnType<typeof getWalletFromRequest>, backend: BackendWalletResponse | null) {
  const backendWallet = backend?.wallet;
  if (!backendWallet) return localWallet;

  return {
    ...localWallet,
    user_id: String(backendWallet.user_id || localWallet.user_id),
    credits: Math.max(0, Math.trunc(Number(backendWallet.credits ?? localWallet.credits))),
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || undefined;
  const localWallet = getWalletFromRequest(req, userId);
  const backend = await loadBackendWallet(localWallet.user_id);
  const wallet = mergeWallet(localWallet, backend);

  const token = walletTokenForResponse(wallet);
  const res = NextResponse.json({
    ok: true,
    wallet: walletPublic(wallet),
    backend_wallet: backend?.wallet || null,
    billing_policy: backend
      ? {
          free_trial_credits: backend.free_trial_credits,
          high_value_charge_credits: backend.high_value_charge_credits,
          noise_charge_credits: backend.noise_charge_credits,
          refund_credits: backend.refund_credits,
        }
      : null,
    wallet_token: token,
  });
  res.headers.set("Set-Cookie", walletSetCookieHeader(wallet));
  res.headers.set("X-LeadPulse-Wallet-Token", token);
  return res;
}
