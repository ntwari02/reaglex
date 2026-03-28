import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadProductImages } = require('../../config/cloudinary');
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts,
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  listStockHistory,
  transferAllProductsToMe,
} from '../controllers/inventoryController';

const router = Router();

// All routes require authenticated sellers
router.use(authenticate, authorize('seller'));

// Products
router.get('/products', listProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.post('/products/bulk-update', bulkUpdateProducts);
// Image upload for products — Cloudinary only (URLs in req.files[].path)
router.post('/products/upload-images', uploadProductImages, async (req: Request, res: Response) => {
  const files = ((req as any).files as Express.Multer.File[]) || [];
  const safeFiles = Array.isArray(files) ? files : [];
  if (safeFiles.length === 0) return res.status(400).json({ message: 'No images uploaded.' });

  const urls = safeFiles.map((f) => f.path);
  return res.status(201).json({ urls, provider: 'cloudinary' });
});

// Warehouses
router.get('/warehouses', listWarehouses);
router.post('/warehouses', createWarehouse);
router.put('/warehouses/:id', updateWarehouse);
router.delete('/warehouses/:id', deleteWarehouse);

// Stock history
router.get('/history', listStockHistory);

// Temporary endpoint to transfer all products to current seller (for testing/debugging)
router.post('/products/transfer-all-to-me', transferAllProductsToMe);

export default router;
