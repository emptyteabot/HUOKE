import Stripe from 'stripe';

import { markDealWon } from '../../../../lib/intelligence/action-engine';
import { updateSourceStage } from '../../../../lib/tasks';

function getStripeClient() {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY missing');
  }

  return new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  });
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header.', { status: 400 });
  }

  try {
    const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      return new Response('Stripe webhook secret missing.', { status: 500 });
    }

    const stripe = getStripeClient();
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const sourceId = String(session.metadata?.sourceId || '').trim();
      const contactKey = String(
        session.metadata?.contactKey || session.customer_email || session.customer_details?.email || '',
      )
        .trim()
        .toLowerCase();

      if (sourceId) {
        await updateSourceStage('payment_intent', sourceId, {
          paymentStatus: 'paid',
          stripeCheckoutSessionId: String(session.id || ''),
          stripeCustomerId: String(session.customer || ''),
          stripeSubscriptionId: String(session.subscription || ''),
        });
      }

      if (contactKey) {
        await markDealWon({ contactKey });
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const sourceId = String(invoice.parent?.subscription_details?.metadata?.sourceId || '').trim();
      if (sourceId) {
        await updateSourceStage('payment_intent', sourceId, {
          paymentStatus: 'payment_failed',
          nextAction: 'Stripe 扣款失败，需要人工跟进收款或更换支付方式。',
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const sourceId = String(subscription.metadata?.sourceId || '').trim();
      if (sourceId) {
        await updateSourceStage('payment_intent', sourceId, {
          paymentStatus: 'subscription_canceled',
          nextAction: '订阅已取消，检查续费风险并决定是否重启跟进。',
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('LeadPulse stripe webhook failed:', error);
    return new Response(
      error instanceof Error ? `Webhook error: ${error.message}` : 'Webhook error.',
      { status: 400 },
    );
  }
}
