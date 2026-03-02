import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createDispute,
  getBuyerDisputes,
  getBuyerDispute,
  submitBuyerResponse,
  uploadBuyerEvidence,
} from '../controllers/buyerDisputeController';

const router = Router();

// Configure Multer for dispute evidence
const uploadsDir = path.join(__dirname, '../../uploads/disputes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const disputeStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadsDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `dispute-${uniqueSuffix}${ext}`);
  },
});

const disputeUpload = multer({
  storage: disputeStorage,
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
router.post('/:disputeId/evidence', disputeUpload.array('files', 10), uploadBuyerEvidence);

export default router;

