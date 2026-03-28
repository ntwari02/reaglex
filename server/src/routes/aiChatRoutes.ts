import { Request, Response, Router } from 'express';
import { optionalAuthenticate } from '../middleware/auth';
import { postAiChat } from '../controllers/aiChatController';
import { getAiMetrics } from '../ai-assistant/singleton';

const router = Router();

router.post('/chat', optionalAuthenticate, postAiChat);

/** AI router observability: per-model requests, latency, fallbacks. */
router.get('/metrics', (_req: Request, res: Response) => {
  res.json(getAiMetrics().getSnapshot());
});

export default router;
