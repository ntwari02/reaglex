import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth';
import { isCloudinaryConfigured } from '../services/cloudinary';
import { uploadBufferToCloudinary } from '../utils/uploadToCloudinary';
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

// Configure Multer storage for product images.
// Render has an ephemeral filesystem, so prefer Cloudinary when configured.
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'products');
const diskStorage = multer.diskStorage({
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

const upload = multer({
  storage: isCloudinaryConfigured() ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp, gif)'));
  },
});

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
  async (req: Request, res: Response) => {
    const files = ((req as any).files as Express.Multer.File[]) || [];
    const safeFiles = Array.isArray(files) ? files : [];
    if (safeFiles.length === 0) return res.status(400).json({ message: 'No images uploaded.' });

    // Cloudinary path: upload buffers and return absolute URLs.
    if (isCloudinaryConfigured()) {
      const uploads = await Promise.all(
        safeFiles.map((f) =>
          uploadBufferToCloudinary({
            buffer: f.buffer,
            folder: 'reaglex/products',
            resourceType: 'image',
          }),
        ),
      );
      const urls = uploads.map((u) => u.url);
      return res.status(201).json({ urls, provider: 'cloudinary' });
    }

    // Local disk path (dev / persistent disk): return relative paths served by express.static(/uploads).
    const urls = safeFiles.map((file) => `/uploads/products/${path.basename(file.path)}`);
    return res.status(201).json({ urls, provider: 'local' });
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


