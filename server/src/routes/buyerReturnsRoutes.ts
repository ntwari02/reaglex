import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { cloudinaryUploadBuffers } from '../middleware/cloudinaryMemoryUpload';
import {
  addReturnCaseMessage,
  aiAssistReturnDescription,
  createReturnCase,
  getReturnCase,
  getReturnOrderPreview,
  getBuyerRewardsSummary,
  getSmartSatisfactionPrompts,
  listReturnCases,
  createInstantResolution,
  submitRewardedReview,
  listMyReviews,
  submitSatisfactionResponse,
  uploadReturnEvidence,
} from '../controllers/buyerReturnsController';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many return requests. Please try again shortly.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|mp4|mov|avi|wmv|webm|mkv/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.toLowerCase()) || file.mimetype.startsWith('video/');
    if (ext || mime) return cb(null, true);
    return cb(new Error('Invalid file type for evidence upload'));
  },
});

router.use(authenticate);
router.use(limiter);

router.get('/order/:orderId/preview', getReturnOrderPreview);
router.get('/post-delivery/rewards', getBuyerRewardsSummary);
router.get('/post-delivery/:orderId/satisfaction-prompts', getSmartSatisfactionPrompts);
router.post('/post-delivery/:orderId/satisfaction-response', submitSatisfactionResponse);
router.post('/post-delivery/:orderId/instant-resolution', createInstantResolution);
router.get('/post-delivery/reviews', listMyReviews);
router.post('/post-delivery/reviews', submitRewardedReview);
router.get('/cases', listReturnCases);
router.get('/cases/:caseId', getReturnCase);
router.post('/cases', createReturnCase);
router.post('/ai/assist-description', aiAssistReturnDescription);
router.post(
  '/cases/:caseId/evidence',
  upload.array('files', 12),
  cloudinaryUploadBuffers('spacilly/returns'),
  uploadReturnEvidence,
);
router.post('/cases/:caseId/messages', addReturnCaseMessage);

export default router;

