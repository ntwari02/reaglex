import dotenv from 'dotenv';
import path from 'path';

// Load .env first so RESEND_API_KEY and others are available when other modules load
dotenv.config({ path: path.join(__dirname, '.env') });

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import authRoutes from './src/routes/authRoutes';
import sellerRoutes from './src/routes/sellerRoutes';
import inventoryRoutes from './src/routes/inventoryRoutes';
import profileRoutes from './src/routes/profileRoutes';
import sellerSettingsRoutes from './src/routes/sellerSettingsRoutes';
import supportTicketRoutes from './src/routes/supportTicketRoutes';
import knowledgeBaseRoutes from './src/routes/knowledgeBaseRoutes';
import disputeRoutes from './src/routes/disputeRoutes';
import accountHealthRoutes from './src/routes/accountHealthRoutes';
import systemNotificationRoutes from './src/routes/systemNotificationRoutes';
import subscriptionRoutes from './src/routes/subscriptionRoutes';
import analyticsRoutes from './src/routes/analyticsRoutes';
import productRoutes from './src/routes/productRoutes';
import buyerOrderRoutes from './src/routes/buyerOrderRoutes';
import inboxRoutes from './src/routes/inboxRoutes';
import buyerInboxRoutes from './src/routes/buyerInboxRoutes';
import buyerDisputeRoutes from './src/routes/buyerDisputeRoutes';
import blogRoutes from './src/routes/blogRoutes';
import affiliateRoutes from './src/routes/affiliateRoutes';
import trackingRoutes from './src/routes/trackingRoutes';
import adminRoutes from './src/routes/adminRoutes';
import adminFinanceRoutes from './src/routes/adminFinanceRoutes';
import adminSupportRoutes from './src/routes/adminSupportRoutes';
import adminLogisticsRoutes from './src/routes/adminLogisticsRoutes';
import adminNotificationsRoutes from './src/routes/adminNotificationsRoutes';
import adminMarketingRoutes from './src/routes/adminMarketingRoutes';
import adminReviewsRoutes from './src/routes/adminReviewsRoutes';
import adminCollectionsRoutes from './src/routes/adminCollectionsRoutes';
import adminProductsRoutes from './src/routes/adminProductsRoutes';
import adminOrdersRoutes from './src/routes/adminOrdersRoutes';
import paymentRoutes from './src/routes/paymentRoutes';
import webhookRoutes from './src/routes/webhookRoutes';
import seoRoutes from './src/routes/seoRoutes';
import './src/jobs/escrowJobs';
import { websocketService } from './src/services/websocketService';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || '';

// Render and other reverse proxies set `X-Forwarded-For`.
// IMPORTANT: use a hop count (not boolean `true`) to avoid
// express-rate-limit blocking with "ERR_ERL_PERMISSIVE_TRUST_PROXY".
// `1` = trust only the first proxy hop (Render).
app.set('trust proxy', 1);

// Basic validation to help during setup
if (!MONGO_URI) {
  console.error('MONGO_URI is not set in .env');
}
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('SMTP_USER or SMTP_PASS not set; password reset and verification emails will not be sent. See server/EMAIL_SETUP.md.');
}

// Global middlewares
// Allow CORS only for known frontend origins (no wildcard because we use credentials).
const allowedCorsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,https://reaglex.vercel.app,https://reaglex.com,https://www.reaglex.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser requests (SSR/server-to-server) may not send `Origin`.
      if (!origin) return callback(null, true);
      if (allowedCorsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(helmet());
app.use(compression());
// Static files for uploaded images and audio
// Allow product images to be embedded from a different origin (e.g. Vite dev server on 5173)
// by relaxing the Cross-Origin-Resource-Policy for this path only.
app.use(
  '/uploads',
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' })
);

// B) Serve static files with proper content-type headers (especially for audio files)
// CRITICAL: Do not modify audio binary - serve exactly as uploaded
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath, stat) => {
    // B) Server must respond audio with proper headers
    // Content-Type: audio/webm or audio/ogg (matching file type)
    // Content-Length must be correct (set automatically by express.static)
    if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', stat.size.toString());
    } else if (filePath.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/ogg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', stat.size.toString());
    } else if (filePath.endsWith('.m4a') || filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', stat.size.toString());
    } else if (filePath.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', stat.size.toString());
    }
    // Express.static will handle other file types automatically
  }
}));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Reaglex API is running' });
});

// Auth routes
app.use('/api/auth', authRoutes);
// Profile routes
app.use('/api/profile', profileRoutes);
// Seller inventory routes
app.use('/api/seller/inventory', inventoryRoutes);
// Seller settings routes
app.use('/api/seller/settings', sellerSettingsRoutes);
// Seller support ticket routes
app.use('/api/seller/support', supportTicketRoutes);
// Seller knowledge base routes
app.use('/api/seller/knowledge-base', knowledgeBaseRoutes);
// Seller dispute routes
app.use('/api/seller/disputes', disputeRoutes);
// Seller account health routes
app.use('/api/seller/account-health', accountHealthRoutes);
// Seller system notification routes
app.use('/api/seller/notifications', systemNotificationRoutes);

// Seller inbox routes
app.use('/api/seller/inbox', inboxRoutes);

// Buyer inbox routes
app.use('/api/buyer/inbox', buyerInboxRoutes);
// Buyer dispute routes
app.use('/api/buyer/disputes', buyerDisputeRoutes);

// Seller routes
app.use('/api/seller', sellerRoutes);

// Subscription routes
app.use('/api/seller/subscription', subscriptionRoutes);
// Analytics routes
app.use('/api/seller/analytics', analyticsRoutes);
// Product routes (public - for buyers to view products)
app.use('/api/products', productRoutes);
// Blog routes (public - for blog posts)
app.use('/api/blog', blogRoutes);
// Affiliate routes
app.use('/api/affiliate', affiliateRoutes);
// Tracking routes
app.use('/api/track', trackingRoutes);
// Buyer order routes
app.use('/api/orders', buyerOrderRoutes);
// Admin routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/finance', adminFinanceRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/admin/logistics', adminLogisticsRoutes);
app.use('/api/admin/notifications', adminNotificationsRoutes);
app.use('/api/admin/marketing', adminMarketingRoutes);
app.use('/api/admin/reviews', adminReviewsRoutes);
app.use('/api/admin/collections', adminCollectionsRoutes);
app.use('/api/admin/products', adminProductsRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
// Payments & escrow routes
app.use('/api/payments', paymentRoutes);
// Webhooks
app.use('/api/webhooks', webhookRoutes);

// SEO endpoints (robots + sitemap)
app.use(seoRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Connect to MongoDB, then start server
const connectDB = async () => {
  try {
    if (!MONGO_URI) {
      console.error('❌ MONGO_URI is not set in .env file');
      process.exit(1);
    }

    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 30000, // Increased from 10s to 30s for better DNS resolution
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Connection timeout
      retryWrites: true,
      retryReads: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    };

    // For development: allow invalid certificates to resolve TLS handshake issues
    // Remove this in production and ensure proper SSL certificates are configured
    if (process.env.NODE_ENV !== 'production') {
      options.tlsAllowInvalidCertificates = true;
    }

    // Add retry logic for connection
    let retries = 3;
    let lastError: any;
    
    while (retries > 0) {
      try {
        await mongoose.connect(MONGO_URI, options);
        break; // Success, exit retry loop
      } catch (err: any) {
        lastError = err;
        retries--;
        if (retries > 0) {
          console.log(`⚠️  MongoDB connection attempt failed. Retrying in 3 seconds... (${3 - retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
        }
      }
    }
    
    if (retries === 0) {
      throw lastError; // Throw the last error if all retries failed
    }
    
    console.log('✅ Connected to MongoDB');
    
    // Initialize WebSocket server
    websocketService.initialize(httpServer);
    
    // Start HTTP server (WebSocket is attached to it)
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
    });
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message || err);
    process.exit(1);
  }
};

connectDB();



