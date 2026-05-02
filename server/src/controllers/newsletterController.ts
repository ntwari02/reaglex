import { Request, Response } from 'express';
import { z } from 'zod';
import { NewsletterSubscription } from '../models/NewsletterSubscription';
import { User } from '../models/User';
import { sendNewsletterWelcomeEmail } from '../services/emailService';

const subscribeBodySchema = z.object({
  email: z.string().trim().email('Invalid email').max(320),
  source: z.string().trim().max(64).optional(),
});

/**
 * POST /api/newsletter/subscribe
 * Public: saves email and sends welcome via Resend/SMTP when configured.
 */
export async function subscribeNewsletter(req: Request, res: Response) {
  const parsed = subscribeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: 'Please enter a valid email address.',
    });
  }

  const email = parsed.data.email.toLowerCase();
  const source = parsed.data.source?.trim() || 'footer';

  try {
    const existing = await NewsletterSubscription.findOne({ email }).lean();
    if (existing) {
      return res.status(200).json({
        ok: true,
        alreadySubscribed: true,
        message: "You're already on the list.",
      });
    }

    try {
      await NewsletterSubscription.create({ email, source });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
        return res.status(200).json({
          ok: true,
          alreadySubscribed: true,
          message: "You're already on the list.",
        });
      }
      throw err;
    }

    await User.updateOne(
      { email },
      { $set: { 'notifications.email.newsletter': true } },
    ).catch(() => {
      /* ignore if no matching user */
    });

    const sendResult = await sendNewsletterWelcomeEmail(email);

    return res.status(201).json({
      ok: true,
      alreadySubscribed: false,
      emailSent: sendResult.success,
      message: sendResult.success
        ? 'Thanks! Check your inbox for a confirmation.'
        : "You're on the list. We couldn't send the confirmation email just now—please try again later.",
    });
  } catch (err: unknown) {
    console.error('[newsletter] subscribe error:', err);
    return res.status(500).json({
      ok: false,
      message: 'Something went wrong. Please try again in a moment.',
    });
  }
}
