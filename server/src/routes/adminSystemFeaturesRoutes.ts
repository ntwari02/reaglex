import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/adminAccess';
import {
  getAdminSystemFeatures,
  patchAdminSystemFeatures,
  postSystemFeaturesUnlock,
} from '../controllers/adminSystemFeaturesController';
import {
  getAdminHomeLayout,
  postAdminHomeLayoutPublish,
  postAdminHomeLayoutReset,
  putAdminHomeLayoutDraft,
} from '../controllers/buyerHomeLayoutController';

const router = Router();

router.use(authenticate, authorize('admin'), requireSuperAdmin);

router.get('/', getAdminSystemFeatures);
router.post('/unlock', postSystemFeaturesUnlock);
router.patch('/', patchAdminSystemFeatures);

router.get('/home-layout', getAdminHomeLayout);
router.put('/home-layout/draft', putAdminHomeLayoutDraft);
router.post('/home-layout/publish', postAdminHomeLayoutPublish);
router.post('/home-layout/reset', postAdminHomeLayoutReset);

export default router;
