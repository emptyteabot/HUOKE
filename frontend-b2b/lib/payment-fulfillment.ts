import { markDealWon } from './intelligence/action-engine';
import { readIntakeRecords } from './intake';
import { SITE_URL } from './site';
import { updateSourceStage } from './tasks';

type PaymentRecord = {
  id: string;
  createdAt: string;
  email?: string;
  company?: string;
  plan?: string;
  paymentStatus?: string;
  deliveryId?: string;
};

type PaidPaymentArgs = {
  sourceId: string;
  provider: 'stripe' | 'alipay';
  providerTradeNo?: string;
  amount?: string;
  paidAt?: string;
};

export function startUrlForPayment(record: {
  id?: string;
  plan?: string;
  company?: string;
  email?: string;
  deliveryId?: string;
}) {
  const params = new URLSearchParams({
    plan: String(record.plan || '').trim() || 'pro',
  });

  if (record.deliveryId) params.set('delivery', String(record.deliveryId).trim());
  else if (record.id) params.set('sourceId', String(record.id).trim());
  if (record.company) params.set('company', String(record.company).trim());
  if (record.email) params.set('email', String(record.email).trim());

  return `${SITE_URL}/start?${params.toString()}`;
}

async function getPaymentRecord(sourceId: string) {
  const records = await readIntakeRecords<PaymentRecord>('payment_intents.json');
  return records.find((record) => record.id === sourceId) || null;
}

export async function markPaymentPaidAndProvision(args: PaidPaymentArgs) {
  const sourceId = String(args.sourceId || '').trim();
  if (!sourceId) {
    throw new Error('payment sourceId missing');
  }

  const record = await getPaymentRecord(sourceId);
  if (!record) {
    throw new Error(`payment_intent not found: ${sourceId}`);
  }

  if (record.paymentStatus === 'verified' && record.deliveryId) {
    return {
      record,
      startUrl: startUrlForPayment(record),
      alreadyProvisioned: true,
    };
  }

  const contactKey = String(record.email || record.company || record.id).trim().toLowerCase();
  await updateSourceStage('payment_intent', sourceId, {
    paymentStatus: 'paid',
    paymentProvider: args.provider,
    paidAt: args.paidAt || new Date().toISOString(),
    paidAmount: String(args.amount || ''),
    alipayTradeNo: args.provider === 'alipay' ? String(args.providerTradeNo || '') : '',
    deliveryStatus: 'provisioning',
  });

  await markDealWon({ contactKey });

  const updated = (await getPaymentRecord(sourceId)) || record;
  return {
    record: updated,
    startUrl: startUrlForPayment(updated),
    alreadyProvisioned: false,
  };
}
