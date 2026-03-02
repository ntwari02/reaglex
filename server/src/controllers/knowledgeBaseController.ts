import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { KnowledgeBase } from '../models/KnowledgeBase';
import mongoose from 'mongoose';

/**
 * Search knowledge base articles
 */
export async function searchArticles(req: AuthenticatedRequest, res: Response) {
  try {
    const { query, category, limit = 20, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { isPublished: true };

    if (category && category !== 'all') {
      filter.category = category;
    }

    let articles;
    if (query && typeof query === 'string' && query.trim()) {
      // Text search - fallback to regex if text index doesn't exist
      try {
        articles = await KnowledgeBase.find({
          ...filter,
          $text: { $search: query },
        })
          .select('title content category tags views helpfulCount')
          .sort({ score: { $meta: 'textScore' } })
          .limit(Number(limit))
          .skip(skip)
          .lean();
      } catch (textSearchError: any) {
        // Fallback to regex search if text index doesn't exist
        console.log('Text search index not available, using regex search');
        const searchRegex = new RegExp(query, 'i');
        articles = await KnowledgeBase.find({
          ...filter,
          $or: [
            { title: searchRegex },
            { content: searchRegex },
            { tags: { $in: [searchRegex] } },
          ],
        })
          .select('title content category tags views helpfulCount')
          .sort({ createdAt: -1 })
          .limit(Number(limit))
          .skip(skip)
          .lean();
      }
    } else {
      // Regular query - get all published articles
      articles = await KnowledgeBase.find(filter)
        .select('title content category tags views helpfulCount')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .lean();
    }

    const total = await KnowledgeBase.countDocuments(filter);

    // Log for debugging
    console.log(`Knowledge base search: Found ${articles.length} articles (Total: ${total})`);

    return res.json({
      articles: articles || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Search articles error:', error);
    return res.status(500).json({ message: 'Failed to search articles' });
  }
}

/**
 * Get article by ID
 */
export async function getArticle(req: AuthenticatedRequest, res: Response) {
  try {
    const { articleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID' });
    }

    const article = await KnowledgeBase.findById(articleId).lean();

    if (!article || !article.isPublished) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Increment views
    await KnowledgeBase.updateOne({ _id: articleId }, { $inc: { views: 1 } });

    return res.json({ article: { ...article, views: (article.views || 0) + 1 } });
  } catch (error: any) {
    console.error('Get article error:', error);
    return res.status(500).json({ message: 'Failed to fetch article' });
  }
}

/**
 * Submit feedback for article
 */
export async function submitArticleFeedback(req: AuthenticatedRequest, res: Response) {
  try {
    const { articleId } = req.params;
    const { helpful } = req.body;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID' });
    }

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ message: 'Helpful field is required' });
    }

    const update = helpful
      ? { $inc: { helpfulCount: 1 } }
      : { $inc: { notHelpfulCount: 1 } };

    await KnowledgeBase.updateOne({ _id: articleId }, update);

    return res.json({ message: 'Feedback submitted successfully' });
  } catch (error: any) {
    console.error('Submit feedback error:', error);
    return res.status(500).json({ message: 'Failed to submit feedback' });
  }
}

/**
 * Get articles by category
 */
export async function getArticlesByCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const articles = await KnowledgeBase.find({
      category,
      isPublished: true,
    })
      .select('title category tags views helpfulCount')
      .sort({ views: -1 })
      .limit(Number(limit))
      .lean();

    return res.json({ articles });
  } catch (error: any) {
    console.error('Get articles by category error:', error);
    return res.status(500).json({ message: 'Failed to fetch articles' });
  }
}

