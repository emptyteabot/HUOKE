import { m2mBackendUrl } from '../../../lib/m2m/proxy';
import { getCreditPackageById, normalizeCreditPackageId } from '../../../lib/pricing';

type PaymentPayload = {
  package_id?: string;
  packageId?: string;
  plan?: string;
  user_id?: string;
  userId?: string;
  email?: string;
  company?: string;
  note?: string;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeUserId(input: string | undefined) {
  const raw = String(input || 'guest_demo').trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9_-]/g, '_').slice(0, 80);
  return safe || 'guest_demo';
}

async function createBackendOrder(payload: PaymentPayload) {
  const packageId = normalizeCreditPackageId(payload.package_id || payload.packageId || payload.plan);
  const selected = getCreditPackageById(packageId);
  if (!selected.requiresPayment) {
    throw new Error('free_trial_does_not_require_payment');
  }

  const response = await fetch(`${m2mBackendUrl()}/api/v2/billing/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.LEADPULSE_M2M_API_KEY ? { authorization: `Bearer ${process.env.LEADPULSE_M2M_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      user_id: normalizeUserId(payload.user_id || payload.userId || payload.email),
      package_id: selected.packageId,
      contact_email: String(payload.email || '').trim().toLowerCase(),
      contact_company: String(payload.company || '').trim(),
      note: String(payload.note || 'LP Coin recharge from LeadPulse checkout').trim(),
    }),
    cache: 'no-store',
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof result?.detail === 'string' ? result.detail : 'billing_order_failed');
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PaymentPayload;
    const result = await createBackendOrder(payload);
    const order = result?.order || {};
    return Response.json({
      ok: true,
      message: order.pay_url ? '收银台已生成。到账后自动发放 LP Coin。' : '订单已创建，但正式收款参数未配置。',
      order,
      wallet: result?.wallet,
      checkoutUrl: order.pay_url || '',
      checkoutSessionId: order.order_id || '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'payment_intent_failed';
    const status = message.includes('not_require_payment') ? 400 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}
