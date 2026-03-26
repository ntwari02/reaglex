import { Router } from 'express';
import { chatWithAssistant } from '../controllers/assistantController';

const router = Router();

router.post('/chat', chatWithAssistant);

export default router;

