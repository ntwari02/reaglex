import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { RecommendationEmailPreference } from '../models/RecommendationEmailPreference';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { recordRecommendationActivity, getOrCreateRecommendationPreference } from '../services/recommendationEmail.service';
import { User } from '../models/User';
import { getClientUrl } from '../config/publicEnv';

const router = Router();
const CLIENT_URL = getClientUrl();

const prefSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly']).optional(),
  mode: z.enum(['deals_only', 'mixed']).optional(),
  unsubscribed: z.boolean().optional(),
});

const activitySchema = z.object({
  eventType: z.enum([
    'wishlist_add',
    'wishlist_remove',
    'product_view',
    'cart_add',
    'cart_remove',
    'purchase',
    'category_interaction',
    'tag_interaction',
  ]),
  productId: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

router.get('/unsubscribe/:token', async (req, res) => {
  const { token } = req.params;
  const pref = await RecommendationEmailPreference.findOneAndUpdate(
    { unsubscribeToken: token },
    { $set: { unsubscribed: true, enabled: false } },
    { new: true },
  );
  if (!pref) return res.status(404).send('Invalid unsubscribe link.');
  return res.redirect(`${CLIENT_URL}/account?tab=settings&section=notifications&emailPref=unsubscribed`);
});

router.get('/track/open/:historyId', async (req, res) => {
  const { historyId } = req.params;
  if (mongoose.Types.ObjectId.isValid(historyId)) {
    await RecommendationEmailHistory.findByIdAndUpdate(historyId, {
      $inc: { opens: 1 },
      $set: { openedAt: new Date() },
    });
  }
  const pixel = Buffer.from(
    'R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=',
    'base64',
  );
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(pixel);
});

router.get('/track/click/:historyId/:productId', async (req, res) => {
  const { historyId, productId } = req.params;
  if (mongoose.Types.ObjectId.isValid(historyId)) {
    await RecommendationEmailHistory.findByIdAndUpdate(historyId, {
      $inc: { clicks: 1 },
      $set: { clickedAt: new Date() },
    });
  }
  return res.redirect(`${CLIENT_URL}/products/${encodeURIComponent(productId)}?src=recommendation_email`);
});

router.use(authenticate);

router.get('/preferences/me', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const pref = await getOrCreateRecommendationPreference(req.user.id);
  return res.json({
    preference: pref
      ? {
          enabled: pref.enabled,
          frequency: pref.frequency,
          mode: pref.mode,
          unsubscribed: pref.unsubscribed,
          suppressed: pref.suppressed,
          lastSentAt: pref.lastSentAt,
        }
      : null,
  });
});

router.patch('/preferences/me', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const input = prefSchema.parse(req.body || {});
    const user = await User.findById(req.user.id).select('email');
    if (!user?.email) return res.status(404).json({ message: 'User not found' });
    const pref = await RecommendationEmailPreference.findOneAndUpdate(
      { userId: req.user.id },
      {
        $setOnInsert: {
          userId: req.user.id,
          email: String(user.email).toLowerCase(),
          unsubscribeToken: new mongoose.Types.ObjectId().toString(),
        },
        $set: {
          ...input,
          ...(input.unsubscribed === true ? { enabled: false } : {}),
          ...(input.unsubscribed === false ? { enabled: input.enabled ?? true } : {}),
        },
      },
      { upsert: true, new: true },
    );
    return res.json({
      message: 'Recommendation email preferences saved',
      preference: {
        enabled: pref.enabled,
        frequency: pref.frequency,
        mode: pref.mode,
        unsubscribed: pref.unsubscribed,
        suppressed: pref.suppressed,
        lastSentAt: pref.lastSentAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid preference payload', errors: err.flatten() });
    }
    return res.status(500).json({ message: 'Failed to update preferences' });
  }
});

router.post('/activity', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const payload = activitySchema.parse(req.body || {});
    await recordRecommendationActivity({
      userId: req.user.id,
      eventType: payload.eventType,
      productId: payload.productId,
      category: payload.category,
      tags: payload.tags,
      meta: payload.meta,
    });
    return res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid activity payload', errors: err.flatten() });
    }
    return res.status(500).json({ message: 'Failed to record activity' });
  }
});

router.post('/track/conversion/:historyId', async (req: AuthenticatedRequest, res) => {
  const { historyId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(historyId)) return res.status(400).json({ message: 'Invalid history id' });
  await RecommendationEmailHistory.findByIdAndUpdate(historyId, {
    $inc: { conversions: 1 },
    $set: { conversionAt: new Date() },
  });
  return res.json({ success: true });
});

export default router;

