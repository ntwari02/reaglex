import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/auth';
import { postAiChat } from '../controllers/aiChatController';

const router = Router();

router.post('/chat', optionalAuthenticate, postAiChat);

export default router;
