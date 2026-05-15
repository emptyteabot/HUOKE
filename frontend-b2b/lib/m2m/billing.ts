import { m2mBackendUrl } from './proxy';

type BackendWallet = {
  user_id?: string;
  credits?: number;
  free_trial_credits_total?: number;
  free_trial_credits_granted?: boolean;
  created_at?: string;
  updated_at?: string;
};

type BackendWalletResponse = {
  wallet?: BackendWallet;
  free_trial_credits?: number;
  high_value_charge_credits?: number;
  noise_charge_credits?: number;
  refund_credits?: number;
};

type ChargeResponse = {
  ok?: boolean;
  wallet?: BackendWallet;
  delta?: number;
  event_type?: string;
  reference_id?: string;
  balance_after?: number;
  reason?: string;
};

function authHeaders(): Record<string, string> {
  const apiKey = String(process.env.LEADPULSE_M2M_API_KEY || '').trim();
  return apiKey ? { authorization: `Bearer ${apiKey}` } : {};
}

export async function fetchM2mWallet(userId: string): Promise<BackendWalletResponse | null> {
  try {
    const target = new URL(`${m2mBackendUrl()}/api/v2/billing/wallet`);
    target.searchParams.set('user_id', userId);
    const response = await fetch(target, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as BackendWalletResponse;
  } catch {
    return null;
  }
}

export async function chargeM2mCredits(args: {
  userId: string;
  credits: number;
  referenceId: string;
  detail?: string;
  eventType?: 'noise' | 'high_value' | 'refund';
}) {
  const response = await fetch(`${m2mBackendUrl()}/api/v2/billing/charge`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      user_id: args.userId,
      event_type: args.eventType || 'high_value',
      reference_id: args.referenceId,
      detail: args.detail || 'LeadPulse export charge',
      credits: Math.max(0, Math.trunc(args.credits)),
    }),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as ChargeResponse;
  if (!response.ok || !payload.ok || !payload.wallet) {
    const reason = typeof payload?.reason === 'string' && payload.reason ? payload.reason : `billing_charge_failed_${response.status}`;
    throw new Error(reason);
  }
  return payload;
}
