import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { cloudinaryUploadBuffers } from '../middleware/cloudinaryMemoryUpload';
import {
  getTickets,
  getTicket,
  createTicket,
  addMessage,
  updateTicket,
  submitSatisfaction,
  getTicketStats,
} from '../controllers/supportTicketController';

const router = Router();

const ticketUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.xls'];
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const extnameValid = allowedExtensions.includes(ext);
    const mimetypeValid = allowedMimeTypes.includes(file.mimetype);

    if (extnameValid || mimetypeValid) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.originalname}. Only images, PDFs, and documents are allowed.`));
    }
  },
});

// All routes require authentication and seller role
router.use(authenticate);
router.use(authorize('seller', 'admin'));

// Get ticket statistics
router.get('/stats', getTicketStats);

// Get all tickets
router.get('/', getTickets);

// Get a single ticket
router.get('/:ticketId', getTicket);

// Create a new ticket
router.post('/', createTicket);

// Upload attachments for ticket creation
router.post(
  '/upload',
  ticketUpload.array('attachments', 5),
  cloudinaryUploadBuffers('reaglex/tickets'),
  (req: AuthenticatedRequest, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = (req.files as Express.Multer.File[]).map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
    }));

    return res.json({
      message: 'Files uploaded successfully',
      files,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return res.status(500).json({ message: 'Failed to upload files' });
  }
});

// Add a message to a ticket
router.post(
  '/:ticketId/messages',
  ticketUpload.array('attachments', 5),
  cloudinaryUploadBuffers('reaglex/tickets'),
  async (req: AuthenticatedRequest, res) => {
  try {
    // Handle file uploads first
    const attachments: string[] = [];
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      attachments.push(
        ...(req.files as Express.Multer.File[]).map((file) => file.path)
      );
    }

    // If attachments are in body (from previous upload), merge them
    if (req.body.attachments && Array.isArray(req.body.attachments)) {
      attachments.push(...req.body.attachments);
    }

    // Add attachments to request body
    req.body.attachments = attachments;

    // Get message from body or form data
    if (!req.body.message && req.body.messageText) {
      req.body.message = req.body.messageText;
    }

    // Call the addMessage controller
    return addMessage(req, res);
  } catch (error: any) {
    console.error('Add message with attachments error:', error);
    return res.status(500).json({ message: 'Failed to add message' });
  }
});

// Update ticket
router.put('/:ticketId', updateTicket);

// Submit satisfaction rating
router.post('/:ticketId/satisfaction', submitSatisfaction);

export default router;

