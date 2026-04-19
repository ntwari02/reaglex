import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripeCredentialsResolved } from '../services/paymentGatewayCredentials.service';
import { processStripeCheckoutSession } from '../services/stripeCheckout.service';
import { assertPaymentGatewayEnabled } from '../services/paymentGateway.service';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string | undefined;
  if (!sig) {
    return res.status(400).send('Missing stripe-signature');
  }

  let event: Stripe.Event;
  try {
    const creds = await getStripeCredentialsResolved();
    if (!creds.webhookSecret) {
      return res.status(503).send('Stripe webhook signing secret is not configured (Admin Finance or STRIPE_WEBHOOK_SECRET)');
    }
    const stripe = new Stripe(creds.secretKey, { typescript: true });
    const payload = req.body as Buffer;
    event = stripe.webhooks.constructEvent(payload, sig, creds.webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(400).send(`Webhook Error: ${msg}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await assertPaymentGatewayEnabled('stripe');
      await processStripeCheckoutSession(session.id);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Stripe webhook handler', e);
    return res.status(500).json({ received: false });
  }

  return res.json({ received: true });
});

export default router;
