import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth';
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

// Configure Multer storage for product images
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'products');

const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: (error: Error | null, destination: string) => void) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

// All routes require authenticated sellers
router.use(authenticate, authorize('seller'));

// Products
router.get('/products', listProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.post('/products/bulk-update', bulkUpdateProducts);
// Image upload for products
router.post(
  '/products/upload-images',
  upload.array('images', 5),
  (req: Request, res: Response) => {
    const files = (req as any).files as any[];
    const safeFiles = Array.isArray(files) ? files : [];
    const urls = safeFiles.map((file) => {
      return `/uploads/products/${path.basename(file.path)}`;
    });
    return res.status(201).json({ urls });
  }
);

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


