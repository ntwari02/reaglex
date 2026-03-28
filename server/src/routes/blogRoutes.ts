import { Router } from 'express';
import type { Request } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadBlogThumbnail, deleteImage } = require('../../config/cloudinary');
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
  (req: AuthenticatedRequest, res, next) => {
    uploadBlogThumbnail(req as Request, res, (err: unknown) => {
      if (err) return next(err);
      next();
    });
  },
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { slug } = req.params;
      const thumbnailUrl = req.file.path;

      const { BlogPost } = await import('../models/Blog');
      const blogPost = await BlogPost.findOne({ slug });

      if (!blogPost) {
        await deleteImage(thumbnailUrl);
        return res.status(404).json({ message: 'Blog post not found' });
      }

      if (req.user?.role !== 'admin' && blogPost.authorId.toString() !== req.user?.id) {
        await deleteImage(thumbnailUrl);
        return res.status(403).json({ message: 'Forbidden: you can only update your own posts' });
      }

      if (blogPost.thumbnail) {
        await deleteImage(blogPost.thumbnail);
      }

      blogPost.thumbnail = thumbnailUrl;
      await blogPost.save();

      return res.json({ message: 'Thumbnail uploaded successfully', thumbnailUrl });
    } catch (error: any) {
      console.error('Upload thumbnail error:', error);
      if (req.file?.path) {
        await deleteImage(req.file.path);
      }
      return res.status(500).json({ message: 'Failed to upload thumbnail' });
    }
  },
);

export default router;
