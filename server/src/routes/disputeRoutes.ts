import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import {
  getDisputes,
  getDispute,
  submitSellerResponse,
  uploadEvidence,
} from '../controllers/disputeController';

type FileFilterCallback = ((error: Error) => void) | ((error: null, acceptFile: boolean) => void);

const router = Router();

// Configure Multer for dispute evidence
const uploadsDir = path.join(__dirname, '../../uploads/disputes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const disputeStorage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, uploadsDir);
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
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
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|mov|avi|wmv|flv|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');

    if (extname || mimetype) {
      (cb as (error: null, acceptFile: boolean) => void)(null, true);
    } else {
      (cb as (error: Error) => void)(new Error('Invalid file type. Only images, documents, and videos are allowed.'));
    }
  },
});

// All routes require authentication and seller role
router.use(authenticate);
router.use(authorize('seller', 'admin'));

// Get all disputes
router.get('/', getDisputes);

// Get single dispute
router.get('/:disputeId', getDispute);

// Submit seller response
router.post('/:disputeId/response', submitSellerResponse);

// Upload evidence
router.post('/:disputeId/evidence', disputeUpload.array('files', 10), uploadEvidence);

export default router;

