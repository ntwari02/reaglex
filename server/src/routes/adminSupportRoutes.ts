import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  getTickets,
  getTicket,
  updateTicket,
  addTicketMessage,
  getDisputes,
  getDispute,
  resolveDispute,
  getStaff,
  getArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  getAlerts,
  createAlert,
  updateAlertStatus,
  getReportsAnalytics,
  getSettings,
  updateSettings,
  getChats,
} from '../controllers/adminSupportController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Tickets
router.get('/tickets', getTickets);
router.get('/tickets/:ticketId', getTicket);
router.put('/tickets/:ticketId', updateTicket);
router.post('/tickets/:ticketId/messages', addTicketMessage);

// Disputes
router.get('/disputes', getDisputes);
router.get('/disputes/:disputeId', getDispute);
router.post('/disputes/:disputeId/resolve', resolveDispute);

// Staff
router.get('/staff', getStaff);

// Knowledge base articles
router.get('/articles', getArticles);
router.post('/articles', createArticle);
router.put('/articles/:articleId', updateArticle);
router.delete('/articles/:articleId', deleteArticle);

// Fraud alerts
router.get('/alerts', getAlerts);
router.post('/alerts', createAlert);
router.patch('/alerts/:alertId', updateAlertStatus);

// Reports
router.get('/reports/analytics', getReportsAnalytics);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Live chat (placeholder)
router.get('/chats', getChats);

export default router;
