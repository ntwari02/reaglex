import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { SellerSettings } from '../models/SellerSettings';
import {
  getSellerSettings,
  updateStoreInfo,
  updateBusinessInfo,
  updateStorePolicies,
  getPayoutMethods,
  addPayoutMethod,
  updatePayoutMethod,
  deletePayoutMethod,
  verifyPayoutMethod,
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getAvailablePermissions,
  getVerificationDocuments,
  updateVerificationDocuments,
  getMobileMoney,
  addOrUpdateMobileMoney,
  deleteMobileMoney,
  getPayoutSchedule,
  updatePayoutSchedule,
  getNotificationPreferences,
  updateNotificationPreferences,
  getStoreContact,
  updateStoreContact,
  getStoreSettings,
  updateStoreSettings,
} from '../controllers/sellerSettingsController';

// Helper to get seller ID from request
const getSellerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

const router = Router();

// Configure Multer storage for store images (logo and banner)
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'store');
const verificationUploadDir = path.join(__dirname, '..', '..', 'uploads', 'store', 'verification');

const storeImageStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    const prefix = file.fieldname === 'logo' ? 'logo' : 'banner';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

const verificationDocStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    fs.mkdirSync(verificationUploadDir, { recursive: true });
    cb(null, verificationUploadDir);
  },
  filename: (req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.pdf';
    const docType = req.params?.docType || 'document';
    cb(null, `${docType}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storeImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB)
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  },
});

const uploadVerificationDoc = multer({
  storage: verificationDocStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed for verification documents'));
    }
  },
});

// All routes require authentication and seller role
router.use(authenticate);
router.use(authorize('seller', 'admin'));

// Get seller settings
router.get('/', getSellerSettings);

// Update store information
router.put('/store', updateStoreInfo);

// Error handling middleware for Multer errors
const handleMulterError = (err: any, req: any, res: Response, next: any) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum file size is 10MB. Please compress your image or use a smaller file.' 
      });
    }
    if (err.message && err.message.includes('Only image files')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(400).json({ message: err.message || 'File upload error' });
  }
  next();
};

// Upload store logo
router.post(
  '/store/logo',
  (req: AuthenticatedRequest, res: Response, next: any) => {
    upload.single('logo')(req, res, (err: any) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const sellerId = getSellerId(req);
      if (!sellerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const fileUrl = `/uploads/store/${req.file.filename}`;

      // Update seller settings with the logo URL
      let settings = await SellerSettings.findOne({ sellerId });
      if (!settings) {
        settings = await SellerSettings.create({
          sellerId,
          storeLogo: fileUrl,
        });
      } else {
        settings.storeLogo = fileUrl;
        await settings.save();
      }

      return res.json({
        message: 'Logo uploaded successfully',
        logoUrl: fileUrl,
        settings,
      });
    } catch (error: any) {
      console.error('Upload logo error:', error);
      
      // Handle Multer errors specifically
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: 'File too large. Maximum file size is 10MB. Please compress your image or use a smaller file.' 
        });
      }
      
      if (error.message && error.message.includes('Only image files')) {
        return res.status(400).json({ message: error.message });
      }
      
      // Return more detailed error message
      return res.status(500).json({ 
        message: error.message || 'Failed to upload logo',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// Upload store banner
router.post(
  '/store/banner',
  (req: AuthenticatedRequest, res: Response, next: any) => {
    upload.single('banner')(req, res, (err: any) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const sellerId = getSellerId(req);
      if (!sellerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const fileUrl = `/uploads/store/${req.file.filename}`;

      // Update seller settings with the banner URL
      let settings = await SellerSettings.findOne({ sellerId });
      if (!settings) {
        settings = await SellerSettings.create({
          sellerId,
          storeBanner: fileUrl,
        });
      } else {
        settings.storeBanner = fileUrl;
        await settings.save();
      }

      return res.json({
        message: 'Banner uploaded successfully',
        bannerUrl: fileUrl,
        settings,
      });
    } catch (error: any) {
      console.error('Upload banner error:', error);
      
      // Handle Multer errors specifically
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: 'File too large. Maximum file size is 10MB. Please compress your image or use a smaller file.' 
        });
      }
      
      if (error.message && error.message.includes('Only image files')) {
        return res.status(400).json({ message: error.message });
      }
      
      // Return more detailed error message
      return res.status(500).json({ 
        message: error.message || 'Failed to upload banner',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// Update business information
router.put('/business', updateBusinessInfo);

// Update store policies
router.put('/policies', updateStorePolicies);

// Payout methods
router.get('/payout-methods', getPayoutMethods);
router.post('/payout-methods', addPayoutMethod);
router.put('/payout-methods/:methodId', updatePayoutMethod);
router.delete('/payout-methods/:methodId', deletePayoutMethod);
router.post('/payout-methods/:methodId/verify', verifyPayoutMethod);

// Mobile Money management
router.get('/mobile-money', getMobileMoney);
router.post('/mobile-money', addOrUpdateMobileMoney);
router.put('/mobile-money', addOrUpdateMobileMoney);
router.delete('/mobile-money', deleteMobileMoney);

// Payout Schedule
router.get('/payout-schedule', getPayoutSchedule);
router.put('/payout-schedule', updatePayoutSchedule);

// Team management
router.get('/team', getTeamMembers);
router.post('/team', addTeamMember);
router.put('/team/:memberId', updateTeamMember);
router.delete('/team/:memberId', deleteTeamMember);
router.get('/team/permissions', getAvailablePermissions);

// Verification documents
router.get('/verification-documents', getVerificationDocuments);
router.put('/verification-documents', updateVerificationDocuments);

// Notification preferences
router.get('/notification-preferences', getNotificationPreferences);
router.put('/notification-preferences', updateNotificationPreferences);

// Store contact
router.get('/store-contact', getStoreContact);
router.put('/store-contact', updateStoreContact);

// Store settings
router.get('/store-settings', getStoreSettings);
router.put('/store-settings', updateStoreSettings);

// Upload verification document
router.post(
  '/verification-documents/:docType',
  (req: AuthenticatedRequest, res: Response, next: any) => {
    uploadVerificationDoc.single('document')(req, res, (err: any) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const sellerId = getSellerId(req);
      if (!sellerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { docType } = req.params;
      const allowedTypes = ['businessLicense', 'isoCert', 'auditReport'];
      
      if (!allowedTypes.includes(docType)) {
        return res.status(400).json({ message: 'Invalid document type' });
      }

      const fileUrl = `/uploads/store/verification/${req.file.filename}`;

      // Update seller settings with the document URL
      let settings = await SellerSettings.findOne({ sellerId });
      if (!settings) {
        settings = await SellerSettings.create({
          sellerId,
          verificationDocuments: {
            [docType]: fileUrl,
            uploadedAt: new Date(),
          },
        });
      } else {
        if (!settings.verificationDocuments) {
          settings.verificationDocuments = {};
        }
        (settings.verificationDocuments as any)[docType] = fileUrl;
        settings.verificationDocuments.uploadedAt = new Date();
        
        // Reset verification status to pending when new documents are uploaded
        if (!settings.verificationStatus) {
          settings.verificationStatus = {
            status: 'pending',
          };
        } else {
          settings.verificationStatus.status = 'pending';
          settings.verificationStatus.rejectionReason = undefined;
        }
        
        await settings.save();
      }

      return res.json({
        message: 'Document uploaded successfully',
        documentUrl: fileUrl,
        documentType: docType,
        verificationDocuments: settings.verificationDocuments,
        verificationStatus: settings.verificationStatus,
      });
    } catch (error: any) {
      console.error('Upload verification document error:', error);
      return res.status(500).json({ 
        message: error.message || 'Failed to upload document',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

export default router;

