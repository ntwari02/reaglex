import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  getPermissions,
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionAnalytics,
} from '../controllers/adminCollectionsController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/permissions', getPermissions);
router.get('/', getCollections);
router.get('/:collectionId', getCollection);
router.post('/', createCollection);
router.patch('/:collectionId', updateCollection);
router.delete('/:collectionId', deleteCollection);
router.get('/:collectionId/analytics', getCollectionAnalytics);

export default router;
