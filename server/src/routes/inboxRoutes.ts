import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { cloudinaryUploadBuffers } from '../middleware/cloudinaryMemoryUpload';
import {
  getThreads,
  getThread,
  createThread,
  sendMessage,
  markThreadAsRead,
  updateThread,
  deleteThread,
  getInboxStats,
  editMessage,
  deleteMessage,
  reactToMessage,
  forwardMessage,
  updateMessageStatus,
  getAvailableBuyers,
  seedTestThreads,
} from '../controllers/inboxController';

const router = Router();

const inboxUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    // Allowed extensions: images, documents, and webm
    const allowedExtensions = [
      // Images
      '.jpg',
      '.jpeg',
      '.png',
      // Text files
      '.txt',
      '.rtf',
      // Word processing
      '.doc',
      '.docx',
      '.odt',
      // Spreadsheets
      '.xls',
      '.xlsx',
      '.ods',
      // Presentations
      '.ppt',
      '.pptx',
      '.odp',
      // PDF & ebook
      '.pdf',
      '.epub',
      '.mobi',
      // Data & code files
      '.csv',
      '.json',
      '.xml',
      '.yaml',
      '.yml',
      '.sql',
      // Compressed archives
      '.zip',
      '.rar',
      '.7z',
      '.tar',
      '.gz',
      // Other formats
      '.md',
      '.tex',
      '.log',
      // Audio formats
      '.webm',
      '.ogg',
      '.mp3',
      '.m4a',
      '.wav',
    ];
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      // Text files
      'text/plain',
      'text/rtf',
      'application/rtf',
      // Word processing
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.oasis.opendocument.text', // .odt
      // Spreadsheets
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.oasis.opendocument.spreadsheet', // .ods
      // Presentations
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.oasis.opendocument.presentation', // .odp
      // PDF & ebook
      'application/pdf',
      'application/epub+zip', // .epub
      'application/x-mobipocket-ebook', // .mobi
      // Data & code files
      'text/csv',
      'application/json',
      'application/xml',
      'text/xml',
      'text/yaml',
      'text/x-yaml',
      'application/x-yaml',
      'application/sql',
      'text/x-sql',
      // Compressed archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-gzip',
      // Other formats
      'text/markdown',
      'text/x-markdown',
      'application/x-tex',
      'text/x-log',
      // Audio formats
      'audio/webm',
      'audio/ogg',
      'audio/opus',
      'audio/mpeg', // .mp3
      'audio/mp3',
      'audio/mp4', // .m4a
      'audio/x-m4a',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'video/webm',
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const extnameValid = allowedExtensions.includes(ext);
    const mimetypeValid = allowedMimeTypes.includes(file.mimetype);

    if (extnameValid || mimetypeValid) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.originalname}. Only images (.jpg, .jpeg, .png), documents (.txt, .doc, .docx, .pdf, .xls, .xlsx, .ppt, .pptx, .csv, .json, .xml, .md, etc.), archives (.zip, .rar, .7z), and audio files (.webm, .ogg, .mp3, .m4a, .wav) are allowed.`
        )
      );
    }
  },
});

// All routes require authentication and seller role
router.use(authenticate);
router.use(authorize('seller', 'admin'));

// Get inbox statistics
router.get('/stats', getInboxStats);

// Get available buyers (for creating new threads)
router.get('/buyers', getAvailableBuyers);

// Seed test threads for current seller (for testing)
router.post('/seed-test-threads', seedTestThreads);

// Get all threads
router.get('/threads', getThreads);

// Get a single thread with messages
router.get('/threads/:threadId', getThread);

// Create a new thread
router.post('/threads', createThread);

// Upload attachments for messages (including voice notes)
router.post(
  '/upload',
  inboxUpload.array('attachments', 5),
  cloudinaryUploadBuffers('reaglex/inbox'),
  (req: AuthenticatedRequest, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = (req.files as Express.Multer.File[]).map((file) => {
      const isAudio = file.mimetype.startsWith('audio/');
      const isImage = file.mimetype.startsWith('image/');
      
      // Log file details for debugging (especially for voice notes)
      console.log('[File Upload] File received:', {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        isAudio,
        isImage,
        duration: req.body.duration,
      });
      
      // Verify file size is not zero (especially important for voice notes)
      if (file.size === 0) {
        console.error('[File Upload] WARNING: File size is 0 bytes!', file.originalname);
      }
      
      return {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        type: isAudio ? 'voice' : isImage ? 'image' : 'file',
        uploadedAt: new Date().toISOString(),
        duration: req.body.duration ? parseFloat(req.body.duration) : undefined, // Duration for voice notes
      };
    });

    console.log('[File Upload] Successfully processed', files.length, 'file(s)');
    return res.json({
      message: 'Files uploaded successfully',
      files,
    });
  } catch (error: any) {
    console.error('[File Upload] Error:', error);
    return res.status(500).json({ message: 'Failed to upload files', error: error.message });
  }
});

// Send a message in a thread (with optional file attachments)
router.post(
  '/threads/:threadId/messages',
  inboxUpload.array('attachments', 5),
  cloudinaryUploadBuffers('reaglex/inbox'),
  async (req: AuthenticatedRequest, res) => {
  try {
    // Handle file uploads first - convert to attachment objects with full metadata
    const attachments: any[] = [];
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      attachments.push(
        ...(req.files as Express.Multer.File[]).map((file) => {
          const isAudio = file.mimetype.startsWith('audio/');
          const isImage = file.mimetype.startsWith('image/');
          return {
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            type: isAudio ? 'voice' : isImage ? 'image' : 'file',
            uploadedAt: new Date().toISOString(),
          };
        })
      );
    }

    // If attachments are in body (from previous upload), parse them
    if (req.body.attachments) {
      let previousAttachments: any[] = [];
      
      // Check if it's a JSON string (from FormData)
      if (typeof req.body.attachments === 'string') {
        try {
          previousAttachments = JSON.parse(req.body.attachments);
        } catch (e) {
          console.error('Failed to parse attachments JSON:', e);
        }
      } 
      // Or if it's already an array
      else if (Array.isArray(req.body.attachments)) {
        previousAttachments = req.body.attachments;
      }
      
      // Process the attachments
      const processedAttachments = previousAttachments.map((att: any) => {
        if (typeof att === 'string') {
          // String path
          return {
            filename: att.split('/').pop() || '',
            originalName: att.split('/').pop() || '',
            path: att,
            size: 0,
            mimetype: 'application/octet-stream',
            type: 'file',
            uploadedAt: new Date().toISOString(),
          };
        }
        // Already an object - ensure it has all required fields
        return {
          filename: att.filename || att.path?.split('/').pop() || '',
          originalName: att.originalName || att.originalName || att.filename || '',
          path: att.path || att.filename || '',
          size: att.size || 0,
          mimetype: att.mimetype || 'application/octet-stream',
          type: att.type || (att.mimetype?.startsWith('audio/') ? 'voice' : att.mimetype?.startsWith('image/') ? 'image' : 'file'),
          duration: att.duration,
          uploadedAt: att.uploadedAt || new Date().toISOString(),
        };
      });
      attachments.push(...processedAttachments);
    }

    // Add attachments to request body
    // CRITICAL: Ensure attachments is always an array, even if empty
    req.body.attachments = Array.isArray(attachments) ? attachments : [];
    console.log('[Route] Total attachments after processing:', req.body.attachments.length);
    console.log('[Route] Attachments type:', typeof req.body.attachments, 'isArray:', Array.isArray(req.body.attachments));

    // Get message from body or form data - ensure content exists (can be empty string)
    if (req.body.content === undefined && req.body.message) {
      req.body.content = req.body.message;
    }
    // Ensure content is always a string (even if empty) - WhatsApp style
    if (req.body.content === undefined || req.body.content === null) {
      req.body.content = '';
    }
    
    // Ensure content is a string type
    req.body.content = String(req.body.content || '');
    console.log('[Route] Final content:', req.body.content, '(length:', req.body.content.length, ')');
    console.log('[Route] Final attachments count:', req.body.attachments.length);
    console.log('[Route] Final attachments:', JSON.stringify(req.body.attachments));
    console.log('[Route] Validation check - hasContent:', req.body.content.trim().length > 0, 'hasAttachments:', req.body.attachments.length > 0);

    // CRITICAL: Pre-validate before sending to controller to catch issues early
    if (!req.body.content.trim() && (!req.body.attachments || req.body.attachments.length === 0)) {
      console.error('[Route] PRE-VALIDATION FAILED: No content and no attachments');
      return res.status(400).json({
        message: 'Please add a message text or attach a file/image/voice note. You cannot send an empty message.',
      });
    }

    // Call the sendMessage controller
    return sendMessage(req, res);
  } catch (error: any) {
    console.error('Send message with attachments error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

// Mark thread as read
router.post('/threads/:threadId/read', markThreadAsRead);

// Update thread
router.put('/threads/:threadId', updateThread);

// Delete thread
router.delete('/threads/:threadId', deleteThread);

// Message operations
router.put('/threads/:threadId/messages/:messageId', editMessage);
router.delete('/threads/:threadId/messages/:messageId', deleteMessage);
router.post('/threads/:threadId/messages/:messageId/react', reactToMessage);
router.post('/threads/:threadId/messages/:messageId/forward', forwardMessage);
router.put('/threads/:threadId/messages/:messageId/status', updateMessageStatus);

export default router;

