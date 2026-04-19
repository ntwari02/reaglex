import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import {
  getDashboard,
  getPayouts,
  approvePayout,
  rejectPayout,
  getTransactions,
  getGateways,
  updateGateway,
  revealGatewayCredentials,
  saveGatewayCredentials,
  testGatewayConnection,
  getRefunds,
  approveRefund,
  rejectRefund,
  getChargebacks,
  getTaxRules,
  createTaxRule,
  updateTaxRule,
  deleteTaxRule,
  getReports,
  generateReport,
  exportTransactionLogs,
  getFinanceSettings,
  updateFinanceSettings,
  getSellersList,
} from '../controllers/adminFinanceController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Payouts
router.get('/payouts', getPayouts);
router.post('/payouts/:id/approve', approvePayout);
router.post('/payouts/:id/reject', rejectPayout);

// Transactions
router.get('/transactions', getTransactions);
router.post('/transactions/export', exportTransactionLogs);

// Payment gateways
router.get('/gateways', getGateways);
router.patch('/gateways/:id', updateGateway);
router.post('/gateways/:id/reveal', revealGatewayCredentials);
router.put('/gateways/:id/credentials', saveGatewayCredentials);
router.post('/gateways/:id/test', testGatewayConnection);

// Refunds
router.get('/refunds', getRefunds);
router.post('/refunds/:id/approve', approveRefund);
router.post('/refunds/:id/reject', rejectRefund);

// Chargebacks
router.get('/chargebacks', getChargebacks);

// Tax rules
router.get('/tax-rules', getTaxRules);
router.post('/tax-rules', createTaxRule);
router.put('/tax-rules/:id', updateTaxRule);
router.delete('/tax-rules/:id', deleteTaxRule);

// Reports
router.get('/reports', getReports);
router.post('/reports/generate', generateReport);

// Settings
router.get('/settings', getFinanceSettings);
router.put('/settings', updateFinanceSettings);

// Sellers list (for dropdowns)
router.get('/sellers', getSellersList);

export default router;
