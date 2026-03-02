import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth';
import {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
  updateSellerOrderTracking,
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

const router = Router();

// Configure Multer storage for collection images
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'collections');
const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: (error: Error | null, destination: string) => void) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `collection-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// All seller routes require authenticated sellers
router.use(authenticate, authorize('seller'));

router.get('/dashboard/stats', getDashboardStats);
router.get('/orders', getSellerOrders);
router.get('/orders/:orderId', getSellerOrderById);
router.patch('/orders/:orderId/status', updateSellerOrderStatus);
router.patch('/orders/:orderId/tracking', updateSellerOrderTracking);
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

// Image upload for collections
router.post(
  '/collections/upload-images',
  upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'thumbnail_image', maxCount: 1 },
  ]),
  (req: Request, res: Response, next: any) => {
    // Handle multer errors
    if ((req as any).fileValidationError) {
      return res.status(400).json({ message: (req as any).fileValidationError });
    }
    next();
  },
  (req: Request, res: Response) => {
    try {
      console.log('Collection image upload request received');
      const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] };
      console.log('Files received:', Object.keys(files || {}));
      
      const coverImage = files.cover_image?.[0];
      const thumbnailImage = files.thumbnail_image?.[0];
      
      if (!coverImage && !thumbnailImage) {
        console.log('No images found in request');
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      const result: any = {};
      if (coverImage) {
        result.cover_image_url = `/uploads/collections/${path.basename(coverImage.path)}`;
        console.log('Cover image uploaded:', result.cover_image_url);
      }
      if (thumbnailImage) {
        result.thumbnail_image_url = `/uploads/collections/${path.basename(thumbnailImage.path)}`;
        console.log('Thumbnail image uploaded:', result.thumbnail_image_url);
      }
      
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Error uploading collection images:', error);
      return res.status(500).json({ message: error.message || 'Failed to upload images' });
    }
  }
);

// Error handler for multer
router.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: error.message });
  }
  next(error);
});

export default router;


