import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  searchArticles,
  getArticle,
  submitArticleFeedback,
  getArticlesByCategory,
} from '../controllers/knowledgeBaseController';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize('seller', 'admin'));

// Search articles
router.get('/search', searchArticles);

// Get articles by category
router.get('/category/:category', getArticlesByCategory);

// Get single article
router.get('/:articleId', getArticle);

// Submit feedback
router.post('/:articleId/feedback', submitArticleFeedback);

export default router;

