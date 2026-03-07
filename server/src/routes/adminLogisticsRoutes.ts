import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getPartners,
  createPartner,
  updatePartner,
  getZones,
  createZone,
  updateZone,
  deleteZone,
  getDrivers,
  createDriver,
  updateDriver,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  getShipments,
  getAnalytics,
  getReturns,
  createReturn,
  updateReturn,
  getAutomationSettings,
  updateAutomationSettings,
  getRoles,
  createRole,
  updateRole,
  getIntegrations,
  createIntegration,
  updateIntegration,
  getExceptions,
  createException,
  updateExceptionStatus,
} from '../controllers/adminLogisticsController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// Delivery partners
router.get('/partners', getPartners);
router.post('/partners', createPartner);
router.patch('/partners/:partnerId', updatePartner);

// Shipping zones
router.get('/zones', getZones);
router.post('/zones', createZone);
router.patch('/zones/:zoneId', updateZone);
router.delete('/zones/:zoneId', deleteZone);

// Fleet drivers
router.get('/drivers', getDrivers);
router.post('/drivers', createDriver);
router.patch('/drivers/:driverId', updateDriver);

// Warehouses
router.get('/warehouses', getWarehouses);
router.post('/warehouses', createWarehouse);
router.patch('/warehouses/:warehouseId', updateWarehouse);

// Live tracking (shipments)
router.get('/shipments', getShipments);

// Analytics
router.get('/analytics', getAnalytics);

// Returns
router.get('/returns', getReturns);
router.post('/returns', createReturn);
router.patch('/returns/:returnId', updateReturn);

// Automation settings
router.get('/settings/automation', getAutomationSettings);
router.put('/settings/automation', updateAutomationSettings);

// Access control (roles)
router.get('/roles', getRoles);
router.post('/roles', createRole);
router.patch('/roles/:roleId', updateRole);

// Integrations
router.get('/integrations', getIntegrations);
router.post('/integrations', createIntegration);
router.patch('/integrations/:integrationId', updateIntegration);

// Exceptions
router.get('/exceptions', getExceptions);
router.post('/exceptions', createException);
router.patch('/exceptions/:exceptionId/status', updateExceptionStatus);

export default router;
