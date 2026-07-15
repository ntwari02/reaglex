import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { cloudinaryUploadBuffers } from '../middleware/cloudinaryMemoryUpload';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadCollectionFields } = require('../../config/cloudinary');
import {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
  updateSellerOrderTracking,
  getSellerCarrierOptions,
  bulkProcessSellerOrders,
  markOrderReadyForPickup,
} from '../controllers/sellerOrderController';
import {
  getSellerCollections,
  createSellerCollection,
  updateSellerCollection,
  deleteSellerCollection,
  getCollectionProducts,
  addProductToCollection,
  removeProductFromCollection,
  reorderCollectionProducts,
  previewCollectionProducts,
  previewCollectionRules,
} from '../controllers/sellerCollectionController';
import { getDashboardStats } from '../controllers/sellerDashboardController';
import { createAdvertisingInquiry } from '../controllers/sellerAdvertisingController';
import { getSellerOnboardingStatus } from '../controllers/sellerOnboardingController';
import {
  listViolationAppeals,
  submitViolationAppeal,
} from '../controllers/sellerViolationAppealController';
import { getPublicFeeSchedule } from '../controllers/sellerFeeScheduleController';
import {
  getSellerShippingSettings,
  putSellerShippingSettings,
} from '../controllers/sellerShippingSettingsController';

const router = Router();

const appealUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.pdf', '.webp'];
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.originalname}`));
    }
  },
});

// All seller routes require authenticated sellers
router.use(authenticate, authorize('seller'));

router.get('/dashboard/stats', getDashboardStats);
router.get('/onboarding/status', getSellerOnboardingStatus);
router.get('/fee-schedule', getPublicFeeSchedule);
router.post('/advertising/inquiries', createAdvertisingInquiry);
router.get('/violations/appeals', listViolationAppeals);
router.post('/violations/appeals', submitViolationAppeal);
router.post(
  '/violations/appeals/upload',
  appealUpload.array('attachments', 5),
  cloudinaryUploadBuffers('spacilly/violation-appeals'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      const files = (req.files as Express.Multer.File[]).map((file) => ({
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      }));
      return res.json({
        message: 'Files uploaded successfully',
        files,
        urls: files.map((f) => f.path),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload files';
      console.error('[seller] violation appeal upload', error);
      return res.status(500).json({ message });
    }
  },
);
router.get('/shipping-settings', getSellerShippingSettings);
router.put('/shipping-settings', putSellerShippingSettings);
router.get('/orders', getSellerOrders);
router.get('/orders/:orderId', getSellerOrderById);
router.patch('/orders/:orderId/status', updateSellerOrderStatus);
router.patch('/orders/:orderId/tracking', updateSellerOrderTracking);
router.patch('/orders/:orderId/ready', markOrderReadyForPickup);
router.get('/orders/:orderId/carrier-options', getSellerCarrierOptions);
router.post('/orders/bulk-process', bulkProcessSellerOrders);
router.get('/collections', getSellerCollections);
router.post('/collections', createSellerCollection);
router.patch('/collections/:collectionId', updateSellerCollection);
router.delete('/collections/:collectionId', deleteSellerCollection);
router.get('/collections/:collectionId/products', getCollectionProducts);
router.post('/collections/:collectionId/products', addProductToCollection);
router.delete('/collections/:collectionId/products/:productId', removeProductFromCollection);
router.patch('/collections/:collectionId/products/reorder', reorderCollectionProducts);
router.post('/collections/preview', previewCollectionRules); // For new collections (no ID yet)
router.post('/collections/:collectionId/preview', previewCollectionProducts); // For existing collections

// Image upload for collections — Cloudinary URLs in file.path
router.post(
  '/collections/upload-images',
  uploadCollectionFields,
  (req: Request, res: Response, next: (err?: unknown) => void) => {
    if ((req as any).fileValidationError) {
      return res.status(400).json({ message: (req as any).fileValidationError });
    }
    next();
  },
  (req: Request, res: Response) => {
    try {
      const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] };
      const coverImage = files?.cover_image?.[0];
      const thumbnailImage = files?.thumbnail_image?.[0];

      if (!coverImage && !thumbnailImage) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const result: Record<string, string> = {};
      if (coverImage?.path) {
        result.cover_image_url = coverImage.path;
      }
      if (thumbnailImage?.path) {
        result.thumbnail_image_url = thumbnailImage.path;
      }

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Error uploading collection images:', error);
      return res.status(500).json({ message: error.message || 'Failed to upload images' });
    }
  },
);

export default router;
