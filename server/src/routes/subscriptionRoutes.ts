import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getSubscriptionPlans,
  getCurrentSubscription,
  getBillingHistory,
  downloadInvoice,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  upgradeSubscription,
  getPayoutSchedule,
  updatePayoutSchedule,
  getB2BPaymentRequests,
  submitB2BPaymentRequest,
} from '../controllers/subscriptionController';

const router = Router();

// All subscription routes require authentication
router.use(authenticate);

// Public routes (authenticated but not role-specific)
router.get('/plans', getSubscriptionPlans);

// Seller-specific routes
router.use(authorize('seller'));

// Subscription management
router.get('/current', getCurrentSubscription);
router.post('/upgrade', upgradeSubscription);

// Billing history
router.get('/invoices', getBillingHistory);
router.get('/invoices/:id/download', downloadInvoice);

// Payment methods
router.get('/payment-methods', getPaymentMethods);
router.post('/payment-methods', addPaymentMethod);
router.delete('/payment-methods/:id', deletePaymentMethod);
router.patch('/payment-methods/:id/default', setDefaultPaymentMethod);

// Payout schedule
router.get('/payout-schedule', getPayoutSchedule);
router.patch('/payout-schedule', updatePayoutSchedule);

// B2B Payment Requests
router.get('/b2b-requests', getB2BPaymentRequests);
router.post('/b2b-requests', submitB2BPaymentRequest);

export default router;

