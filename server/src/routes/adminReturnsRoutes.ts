import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { addReturnCaseStaffMessage, adminBulkUpdateReturnCases, adminListReturnCases, updateReturnCaseStatus } from '../controllers/returnsManagementController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', adminListReturnCases);
router.post('/bulk-status', adminBulkUpdateReturnCases);
router.patch('/:caseId/status', updateReturnCaseStatus);
router.post('/:caseId/messages', addReturnCaseStaffMessage);

export default router;

