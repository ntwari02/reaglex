import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';
import { authenticate } from '../middleware/auth';
import { cloudinaryUploadBuffers } from '../middleware/cloudinaryMemoryUpload';
import {
  createDispute,
  getBuyerDisputes,
  getBuyerDispute,
  submitBuyerResponse,
  uploadBuyerEvidence,
} from '../controllers/buyerDisputeController';

const router = Router();

const disputeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased for videos)
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|mov|avi|wmv|flv|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');

    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and videos are allowed.'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Create new dispute
router.post('/', createDispute);

// Get all disputes for buyer
router.get('/', getBuyerDisputes);

// Get single dispute
router.get('/:disputeId', getBuyerDispute);

// Submit buyer response
router.post('/:disputeId/response', submitBuyerResponse);

// Upload evidence
router.post(
  '/:disputeId/evidence',
  disputeUpload.array('files', 10),
  cloudinaryUploadBuffers('reaglex/disputes'),
  uploadBuyerEvidence,
);

export default router;

