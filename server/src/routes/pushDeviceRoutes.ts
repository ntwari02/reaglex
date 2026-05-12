import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  registerPushDevice,
  unregisterPushDevice,
  listOwnPushDevices,
  getWebPushConfig,
  subscribeWebPush,
  unsubscribeWebPush,
} from '../controllers/pushDeviceController';

const router = Router();

router.get('/web/config', getWebPushConfig);

router.use(authenticate);

router.post('/register', registerPushDevice);
router.post('/unregister', unregisterPushDevice);
router.get('/me', listOwnPushDevices);

router.post('/web/subscribe', subscribeWebPush);
router.post('/web/unsubscribe', unsubscribeWebPush);

export default router;
