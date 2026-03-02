import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { BlogPost, IBlogPost, BlogStatus, BlogCategory } from '../models/Blog';
import { User } from '../models/User';

/**
 * Calculate reading time from content
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute) || 1;
}

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Ensure unique slug
 */
async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await BlogPost.findOne({ 
      slug,
      ...(excludeId && { _id: { $ne: excludeId } })
    });
    
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Get all blog posts (public endpoint)
 * Supports filtering, search, pagination, and sorting
 */
export async function getBlogPosts(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      category,
      search,
      status = 'published', // Only show published posts by default
      featured,
      tag,
      page = '1',
      limit = '10',
      sort = 'publishedAt',
      order = 'desc',
    } = req.query as {
      category?: BlogCategory;
      search?: string;
      status?: BlogStatus | 'all';
      featured?: string;
      tag?: string;
      page?: string;
      limit?: string;
      sort?: 'publishedAt' | 'views' | 'likes' | 'createdAt';
      order?: 'asc' | 'desc';
    };

    // Build filter
    const filter: any = {};

    // Only show published posts for public access
    if (status === 'all') {
      // Only admins can see all statuses
      if (req.user?.role !== 'admin') {
        filter.status = 'published';
      }
    } else if (status) {
      // Only admins can filter by non-published status
      if (status === 'published' || req.user?.role === 'admin') {
        filter.status = status;
      } else {
        filter.status = 'published';
      }
    } else {
      filter.status = 'published';
    }

    if (category) {
      filter.category = category;
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    if (tag) {
      filter.tags = { $in: [tag.toLowerCase()] };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortObj: any = {};
    if (sort === 'views') {
      sortObj.views = order === 'asc' ? 1 : -1;
    } else if (sort === 'likes') {
      sortObj.likes = order === 'asc' ? 1 : -1;
    } else if (sort === 'publishedAt') {
      sortObj.publishedAt = order === 'asc' ? 1 : -1;
    } else {
      sortObj.createdAt = order === 'asc' ? 1 : -1;
    }

    // Fetch posts with author info
    const posts = await BlogPost.find(filter)
      .populate('authorId', 'fullName avatarUrl bio')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Transform posts to match frontend format
    const transformedPosts = posts.map((post: any) => ({
      id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      category: post.category,
      thumbnail: post.thumbnail || '',
      excerpt: post.excerpt,
      content: post.content,
      author: {
        name: (post.authorId as any)?.fullName || 'Unknown',
        avatar: (post.authorId as any)?.avatarUrl || '',
        bio: (post.authorId as any)?.bio || '',
      },
      publishedAt: post.publishedAt || post.createdAt,
      readingTime: post.readingTime,
      views: post.views || 0,
      likes: post.likes || 0,
      tags: post.tags || [],
      featured: post.featured || false,
    }));

    // Get total count for pagination
    const total = await BlogPost.countDocuments(filter);

    return res.json({
      posts: transformedPosts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get blog posts error:', error);
    return res.status(500).json({ message: 'Failed to fetch blog posts' });
  }
}

/**
 * Get blog post by slug (public endpoint)
 */
export async function getBlogPostBySlug(req: AuthenticatedRequest, res: Response) {
  try {
    const { slug } = req.params;

    const post = await BlogPost.findOne({ slug })
      .populate('authorId', 'fullName avatarUrl bio')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Only show published posts to non-admins
    if (post.status !== 'published' && req.user?.role !== 'admin') {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Increment views
    await BlogPost.updateOne({ _id: post._id }, { $inc: { views: 1 } });

    // Get approved comments only
    const approvedComments = (post.comments || []).filter(
      (comment: any) => comment.status === 'approved'
    );

    // Transform to match frontend format
    const transformedPost = {
      id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      category: post.category,
      thumbnail: post.thumbnail || '',
      excerpt: post.excerpt,
      content: post.content,
      author: {
        name: (post.authorId as any)?.fullName || 'Unknown',
        avatar: (post.authorId as any)?.avatarUrl || '',
        bio: (post.authorId as any)?.bio || '',
      },
      publishedAt: post.publishedAt || post.createdAt,
      readingTime: post.readingTime,
      views: (post.views || 0) + 1,
      likes: post.likes || 0,
      tags: post.tags || [],
      featured: post.featured || false,
      comments: approvedComments,
    };

    return res.json({ post: transformedPost });
  } catch (error: any) {
    console.error('Get blog post by slug error:', error);
    return res.status(500).json({ message: 'Failed to fetch blog post' });
  }
}

/**
 * Get related blog posts
 */
export async function getRelatedBlogPosts(req: AuthenticatedRequest, res: Response) {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit as string) || 3;

    const currentPost = await BlogPost.findOne({ slug, status: 'published' }).lean();

    if (!currentPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Find related posts by category or tags
    const relatedPosts = await BlogPost.find({
      _id: { $ne: currentPost._id },
      status: 'published',
      $or: [
        { category: currentPost.category },
        { tags: { $in: currentPost.tags || [] } },
      ],
    })
      .populate('authorId', 'fullName avatarUrl bio')
      .limit(limit)
      .sort({ publishedAt: -1 })
      .lean();

    const transformedPosts = relatedPosts.map((post: any) => ({
      id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      category: post.category,
      thumbnail: post.thumbnail || '',
      excerpt: post.excerpt,
      author: {
        name: (post.authorId as any)?.fullName || 'Unknown',
        avatar: (post.authorId as any)?.avatarUrl || '',
        bio: (post.authorId as any)?.bio || '',
      },
      publishedAt: post.publishedAt || post.createdAt,
      readingTime: post.readingTime,
      views: post.views || 0,
      likes: post.likes || 0,
      tags: post.tags || [],
      featured: post.featured || false,
    }));

    return res.json({ posts: transformedPosts });
  } catch (error: any) {
    console.error('Get related blog posts error:', error);
    return res.status(500).json({ message: 'Failed to fetch related blog posts' });
  }
}

/**
 * Get popular blog posts
 */
export async function getPopularBlogPosts(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const posts = await BlogPost.find({ status: 'published' })
      .populate('authorId', 'fullName avatarUrl bio')
      .sort({ views: -1 })
      .limit(limit)
      .lean();

    const transformedPosts = posts.map((post: any) => ({
      id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      thumbnail: post.thumbnail || '',
      views: post.views || 0,
    }));

    return res.json({ posts: transformedPosts });
  } catch (error: any) {
    console.error('Get popular blog posts error:', error);
    return res.status(500).json({ message: 'Failed to fetch popular blog posts' });
  }
}

/**
 * Get featured blog posts
 */
export async function getFeaturedBlogPosts(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 3;

    const posts = await BlogPost.find({ status: 'published', featured: true })
      .populate('authorId', 'fullName avatarUrl bio')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    const transformedPosts = posts.map((post: any) => ({
      id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      category: post.category,
      thumbnail: post.thumbnail || '',
      excerpt: post.excerpt,
      author: {
        name: (post.authorId as any)?.fullName || 'Unknown',
        avatar: (post.authorId as any)?.avatarUrl || '',
        bio: (post.authorId as any)?.bio || '',
      },
      publishedAt: post.publishedAt || post.createdAt,
      readingTime: post.readingTime,
      views: post.views || 0,
      likes: post.likes || 0,
      tags: post.tags || [],
      featured: post.featured || false,
    }));

    return res.json({ posts: transformedPosts });
  } catch (error: any) {
    console.error('Get featured blog posts error:', error);
    return res.status(500).json({ message: 'Failed to fetch featured blog posts' });
  }
}

/**
 * Get popular tags
 */
export async function getPopularTags(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Aggregate tags from published posts
    const tags = await BlogPost.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { tag: '$_id', count: 1, _id: 0 } },
    ]);

    return res.json({ tags: tags.map((t) => t.tag) });
  } catch (error: any) {
    console.error('Get popular tags error:', error);
    return res.status(500).json({ message: 'Failed to fetch popular tags' });
  }
}

/**
 * Create blog post (admin/seller only)
 */
export async function createBlogPost(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Only admins and sellers can create blog posts
    if (req.user.role !== 'admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    const {
      title,
      subtitle,
      category,
      thumbnail,
      excerpt,
      content,
      tags,
      featured,
      status = 'draft',
      seoTitle,
      seoDescription,
      seoKeywords,
    } = req.body;

    if (!title || !excerpt || !content || !category) {
      return res.status(400).json({ message: 'Title, excerpt, content, and category are required' });
    }

    // Generate slug from title
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug);

    // Calculate reading time
    const readingTime = calculateReadingTime(content);

    const blogPost = new BlogPost({
      title,
      slug,
      subtitle,
      category,
      thumbnail,
      excerpt,
      content,
      authorId: req.user.id,
      status,
      featured: featured || false,
      tags: (tags || []).map((tag: string) => tag.toLowerCase().trim()),
      readingTime,
      seoTitle,
      seoDescription,
      seoKeywords,
      publishedAt: status === 'published' ? new Date() : undefined,
    });

    await blogPost.save();

    // Populate author info
    await blogPost.populate('authorId', 'fullName avatarUrl bio');

    const transformedPost = {
      id: blogPost._id.toString(),
      slug: blogPost.slug,
      title: blogPost.title,
      subtitle: blogPost.subtitle,
      category: blogPost.category,
      thumbnail: blogPost.thumbnail || '',
      excerpt: blogPost.excerpt,
      content: blogPost.content,
      author: {
        name: (blogPost.authorId as any)?.fullName || 'Unknown',
        avatar: (blogPost.authorId as any)?.avatarUrl || '',
        bio: (blogPost.authorId as any)?.bio || '',
      },
      publishedAt: blogPost.publishedAt || blogPost.createdAt,
      readingTime: blogPost.readingTime,
      views: blogPost.views || 0,
      likes: blogPost.likes || 0,
      tags: blogPost.tags || [],
      featured: blogPost.featured || false,
    };

    return res.status(201).json({ post: transformedPost });
  } catch (error: any) {
    console.error('Create blog post error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A blog post with this slug already exists' });
    }
    return res.status(500).json({ message: 'Failed to create blog post' });
  }
}

/**
 * Update blog post (admin/seller only, or author)
 */
export async function updateBlogPost(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { slug } = req.params;
    const {
      title,
      subtitle,
      category,
      thumbnail,
      excerpt,
      content,
      tags,
      featured,
      status,
      seoTitle,
      seoDescription,
      seoKeywords,
    } = req.body;

    const blogPost = await BlogPost.findOne({ slug });

    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Check permissions: admin can edit any, seller can only edit their own
    if (req.user.role !== 'admin' && blogPost.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: you can only edit your own posts' });
    }

    // Update fields
    if (title !== undefined && title !== blogPost.title) {
      blogPost.title = title;
      // Regenerate slug if title changed
      const baseSlug = generateSlug(title);
      blogPost.slug = await ensureUniqueSlug(baseSlug, blogPost._id.toString());
    }
    if (subtitle !== undefined) blogPost.subtitle = subtitle;
    if (category !== undefined) blogPost.category = category;
    if (thumbnail !== undefined) blogPost.thumbnail = thumbnail;
    if (excerpt !== undefined) blogPost.excerpt = excerpt;
    if (content !== undefined) {
      blogPost.content = content;
      blogPost.readingTime = calculateReadingTime(content);
    }
    if (tags !== undefined) blogPost.tags = tags.map((tag: string) => tag.toLowerCase().trim());
    if (featured !== undefined) blogPost.featured = featured;
    if (status !== undefined) {
      blogPost.status = status;
      // Set publishedAt when status changes to published
      if (status === 'published' && !blogPost.publishedAt) {
        blogPost.publishedAt = new Date();
      }
    }
    if (seoTitle !== undefined) blogPost.seoTitle = seoTitle;
    if (seoDescription !== undefined) blogPost.seoDescription = seoDescription;
    if (seoKeywords !== undefined) blogPost.seoKeywords = seoKeywords;

    await blogPost.save();

    // Populate author info
    await blogPost.populate('authorId', 'fullName avatarUrl bio');

    const transformedPost = {
      id: blogPost._id.toString(),
      slug: blogPost.slug,
      title: blogPost.title,
      subtitle: blogPost.subtitle,
      category: blogPost.category,
      thumbnail: blogPost.thumbnail || '',
      excerpt: blogPost.excerpt,
      content: blogPost.content,
      author: {
        name: (blogPost.authorId as any)?.fullName || 'Unknown',
        avatar: (blogPost.authorId as any)?.avatarUrl || '',
        bio: (blogPost.authorId as any)?.bio || '',
      },
      publishedAt: blogPost.publishedAt || blogPost.createdAt,
      readingTime: blogPost.readingTime,
      views: blogPost.views || 0,
      likes: blogPost.likes || 0,
      tags: blogPost.tags || [],
      featured: blogPost.featured || false,
    };

    return res.json({ post: transformedPost });
  } catch (error: any) {
    console.error('Update blog post error:', error);
    return res.status(500).json({ message: 'Failed to update blog post' });
  }
}

/**
 * Delete blog post (admin/seller only, or author)
 */
export async function deleteBlogPost(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { slug } = req.params;

    const blogPost = await BlogPost.findOne({ slug });

    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Check permissions: admin can delete any, seller can only delete their own
    if (req.user.role !== 'admin' && blogPost.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: you can only delete your own posts' });
    }

    await BlogPost.deleteOne({ _id: blogPost._id });

    return res.json({ message: 'Blog post deleted successfully' });
  } catch (error: any) {
    console.error('Delete blog post error:', error);
    return res.status(500).json({ message: 'Failed to delete blog post' });
  }
}

/**
 * Like blog post (public endpoint)
 */
export async function likeBlogPost(req: AuthenticatedRequest, res: Response) {
  try {
    const { slug } = req.params;

    const blogPost = await BlogPost.findOne({ slug, status: 'published' });

    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Increment likes
    blogPost.likes = (blogPost.likes || 0) + 1;
    await blogPost.save();

    return res.json({ likes: blogPost.likes });
  } catch (error: any) {
    console.error('Like blog post error:', error);
    return res.status(500).json({ message: 'Failed to like blog post' });
  }
}

/**
 * Add comment to blog post (public endpoint)
 */
export async function addComment(req: AuthenticatedRequest, res: Response) {
  try {
    const { slug } = req.params;
    const { name, email, content } = req.body;

    if (!name || !email || !content) {
      return res.status(400).json({ message: 'Name, email, and content are required' });
    }

    const blogPost = await BlogPost.findOne({ slug, status: 'published' });

    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Add comment (default status: pending, needs approval)
    const comment = {
      name,
      email,
      content,
      status: 'pending' as const,
      userId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
    };

    blogPost.comments.push(comment as any);
    await blogPost.save();

    return res.status(201).json({
      message: 'Comment submitted successfully. It will be reviewed before publishing.',
      comment: {
        ...comment,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Add comment error:', error);
    return res.status(500).json({ message: 'Failed to add comment' });
  }
}

/**
 * Approve/reject comment (admin only)
 */
export async function updateCommentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    const { slug, commentId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const blogPost = await BlogPost.findOne({ slug });

    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const comment = blogPost.comments.find((c: any) => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.status = status as 'pending' | 'approved' | 'rejected';
    await blogPost.save();

    return res.json({ message: 'Comment status updated', comment });
  } catch (error: any) {
    console.error('Update comment status error:', error);
    return res.status(500).json({ message: 'Failed to update comment status' });
  }
}

