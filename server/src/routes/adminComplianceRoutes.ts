import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  evaluateClassificationChecklist,
  exportRegistrationPack,
  exportRegistrationPackPdf,
  getComplianceDefinitions,
  getComplianceProfile,
  getRegistrationReadiness,
  uploadComplianceDocument,
  upsertComplianceProfile,
} from '../controllers/adminComplianceController';
import { cloudinaryUploadBuffers } from '../middleware/cloudinaryMemoryUpload';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('officedocument');
    if (extname || mimetype) cb(null, true);
    else cb(new Error('Invalid file type for compliance upload.'));
  },
});

router.use(authenticate);
router.use(authorize('admin'));

router.get('/definitions', getComplianceDefinitions);
router.get('/profile', getComplianceProfile);
router.put('/profile', upsertComplianceProfile);
router.post('/classification/evaluate', evaluateClassificationChecklist);
router.get('/readiness', getRegistrationReadiness);
router.get('/export-pack', exportRegistrationPack);
router.get('/export-pack/pdf', exportRegistrationPackPdf);
router.post('/upload', upload.single('file'), cloudinaryUploadBuffers('spacilly/compliance'), uploadComplianceDocument);

export default router;

