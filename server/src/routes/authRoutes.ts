import { Router } from 'express';
import { login, me, register, googleAuth, googleCallback, completeGoogleRegistration } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google/complete', completeGoogleRegistration);

export default router;


