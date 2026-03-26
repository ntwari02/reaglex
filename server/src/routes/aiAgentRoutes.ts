import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/auth';
import { postAiAgent } from '../controllers/aiAgentController';

const router = Router();

// Optional auth; server-side tool guards still enforce permissions.
router.post('/agent', optionalAuthenticate, postAiAgent);

export default router;

