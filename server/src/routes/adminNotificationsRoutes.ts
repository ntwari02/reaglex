import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  sendNotification,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getScheduled,
  createScheduled,
  updateScheduled,
  deleteScheduled,
  getAnalytics,
  getUserControlSettings,
  updateUserControlSettings,
  getLogs,
  getIntegrationSettings,
  updateIntegrationSettings,
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  getPermissions,
  updatePermission,
  getSystemAlerts,
  createSystemAlert,
  updateSystemAlert,
  deleteSystemAlert,
} from '../controllers/adminNotificationsController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Send notification
router.post('/send', sendNotification);

// Templates
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.patch('/templates/:templateId', updateTemplate);
router.delete('/templates/:templateId', deleteTemplate);

// Scheduled
router.get('/scheduled', getScheduled);
router.post('/scheduled', createScheduled);
router.patch('/scheduled/:scheduledId', updateScheduled);
router.delete('/scheduled/:scheduledId', deleteScheduled);

// Analytics
router.get('/analytics', getAnalytics);

// User control settings
router.get('/settings/user-control', getUserControlSettings);
router.put('/settings/user-control', updateUserControlSettings);

// Logs
router.get('/logs', getLogs);

// Integration settings
router.get('/settings/integrations', getIntegrationSettings);
router.put('/settings/integrations', updateIntegrationSettings);

// Automation rules
router.get('/automation-rules', getAutomationRules);
router.post('/automation-rules', createAutomationRule);
router.patch('/automation-rules/:ruleId', updateAutomationRule);
router.delete('/automation-rules/:ruleId', deleteAutomationRule);

// Permissions
router.get('/permissions', getPermissions);
router.patch('/permissions/:permissionId', updatePermission);

// System alerts
router.get('/alerts', getSystemAlerts);
router.post('/alerts', createSystemAlert);
router.patch('/alerts/:alertId', updateSystemAlert);
router.delete('/alerts/:alertId', deleteSystemAlert);

export default router;
