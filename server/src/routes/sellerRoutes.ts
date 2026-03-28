import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadCollectionFields } = require('../../config/cloudinary');
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
