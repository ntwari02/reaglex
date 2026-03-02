import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getAnalytics, getSalesChartData } from '../controllers/analyticsController';

const router = Router();

// All routes require authentication and seller role
router.use(authenticate);
router.use(authorize('seller', 'admin'));

// Get comprehensive analytics
router.get('/', getAnalytics);

// Get sales chart data
router.get('/sales-chart', getSalesChartData);

export default router;

