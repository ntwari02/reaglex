import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import {
  getBlogPosts,
  getBlogPostBySlug,
  getRelatedBlogPosts,
  getPopularBlogPosts,
  getFeaturedBlogPosts,
  getPopularTags,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  likeBlogPost,
  addComment,
  updateCommentStatus,
} from '../controllers/blogController';

const router = Router();

// Configure Multer for blog thumbnail uploads
const uploadsDir = path.join(__dirname, '../../uploads/blog');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const blogStorage = multer.diskStorage({
  destination: (_req: AuthenticatedRequest, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadsDir);
  },
  filename: (_req: AuthenticatedRequest, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `blog-${uniqueSuffix}${ext}`);
  },
});

const blogUpload = multer({
  storage: blogStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  },
});

// Public routes (no authentication required)
router.get('/', getBlogPosts);
router.get('/featured', getFeaturedBlogPosts);
router.get('/popular', getPopularBlogPosts);
router.get('/tags', getPopularTags);
router.get('/:slug', getBlogPostBySlug);
router.get('/:slug/related', getRelatedBlogPosts);
router.post('/:slug/like', likeBlogPost);
router.post('/:slug/comments', addComment);

// Protected routes (authentication required)
router.post('/', authenticate, authorize('admin', 'seller'), createBlogPost);
router.put('/:slug', authenticate, authorize('admin', 'seller'), updateBlogPost);
router.delete('/:slug', authenticate, authorize('admin', 'seller'), deleteBlogPost);

// Admin-only routes
router.patch('/:slug/comments/:commentId/status', authenticate, authorize('admin'), updateCommentStatus);

// Upload thumbnail route (admin/seller only)
router.post(
  '/:slug/thumbnail',
  authenticate,
  authorize('admin', 'seller'),
  blogUpload.single('thumbnail'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { slug } = req.params;
      const thumbnailUrl = `/uploads/blog/${req.file.filename}`;

      // Update blog post with thumbnail URL
      const { BlogPost } = await import('../models/Blog');
      const blogPost = await BlogPost.findOne({ slug });

      if (!blogPost) {
        // Delete uploaded file if blog post not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Blog post not found' });
      }

      // Check permissions
      if (req.user?.role !== 'admin' && blogPost.authorId.toString() !== req.user?.id) {
        // Delete uploaded file if unauthorized
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Forbidden: you can only update your own posts' });
      }

      // Delete old thumbnail if exists
      if (blogPost.thumbnail) {
        const oldThumbnailPath = path.join(__dirname, '../..', blogPost.thumbnail);
        if (fs.existsSync(oldThumbnailPath)) {
          fs.unlinkSync(oldThumbnailPath);
        }
      }

      blogPost.thumbnail = thumbnailUrl;
      await blogPost.save();

      return res.json({ message: 'Thumbnail uploaded successfully', thumbnailUrl });
    } catch (error: any) {
      console.error('Upload thumbnail error:', error);
      // Delete uploaded file on error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ message: 'Failed to upload thumbnail' });
    }
  }
);

export default router;

