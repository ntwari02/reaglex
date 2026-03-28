import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { cloudinaryUploadBuffers } from '../middleware/cloudinaryMemoryUpload';
import {
  getDisputes,
  getDispute,
  submitSellerResponse,
  uploadEvidence,
} from '../controllers/disputeController';

type FileFilterCallback = ((error: Error) => void) | ((error: null, acceptFile: boolean) => void);

const router = Router();

const disputeUpload = multer({
  storage: multer.memoryStorage(),
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
router.post(
  '/:disputeId/evidence',
  disputeUpload.array('files', 10),
  cloudinaryUploadBuffers('reaglex/disputes'),
  uploadEvidence,
);

export default router;

