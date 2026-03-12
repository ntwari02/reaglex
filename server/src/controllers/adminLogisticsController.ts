import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { DeliveryPartner } from '../models/DeliveryPartner';
import { ShippingZone } from '../models/ShippingZone';
import { FleetDriver } from '../models/FleetDriver';
import { LogisticsWarehouse } from '../models/LogisticsWarehouse';
import { ReturnShipment } from '../models/ReturnShipment';
import { LogisticsSettings } from '../models/LogisticsSettings';
import { LogisticsRole } from '../models/LogisticsRole';
import { LogisticsIntegration } from '../models/LogisticsIntegration';
import { LogisticsException } from '../models/LogisticsException';
import { Shipment } from '../models/Tracking';
import mongoose from 'mongoose';

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

function toId(doc: { _id: mongoose.Types.ObjectId }): string {
  return doc._id.toString();
}

/** Map shipment status to frontend expected value */
function mapShipmentStatus(s: string): string {
  if (s === 'failed_delivery') return 'failed';
  return s;
}

// ---------- Delivery Partners ----------
export async function getPartners(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const query = search ? { name: new RegExp(search, 'i') } : {};
    const list = await DeliveryPartner.find(query).lean().sort({ name: 1 });
    const partners = list.map((p: any) => {
      const { _id, ...rest } = p;
      return { ...rest, id: toId(p) };
    });
    res.json({ partners });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch partners' });
  }
}

export async function createPartner(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const partner = await DeliveryPartner.create({
      name: body.name,
      type: body.type || 'courier',
      status: body.status ?? 'active',
      onTimeDelivery: body.onTimeDelivery ?? 0,
      avgDeliveryTime: body.avgDeliveryTime ?? '-',
      failedDeliveryRate: body.failedDeliveryRate ?? 0,
      apiStatus: body.apiStatus ?? 'disconnected',
      totalShipments: body.totalShipments ?? 0,
    } as any) as any;
    const p = partner.toObject();
    res.status(201).json({ partner: { ...p, id: toId(partner) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create partner' });
  }
}

export async function updatePartner(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { partnerId } = req.params;
    const partner = await DeliveryPartner.findByIdAndUpdate(
      partnerId,
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!partner) return res.status(404).json({ message: 'Partner not found' });
    const { _id, ...rest } = partner as any;
    res.json({ partner: { ...rest, id: _id.toString() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update partner' });
  }
}

// ---------- Shipping Zones ----------
export async function getZones(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await ShippingZone.find({}).lean().sort({ name: 1 });
    const zones = list.map((z: any) => {
      const { _id, ...rest } = z;
      return { ...rest, id: toId(z) };
    });
    res.json({ zones });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch zones' });
  }
}

export async function createZone(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const zone = await ShippingZone.create({
      name: body.name,
      type: body.type || 'local',
      rateType: body.rateType || 'flat',
      baseRate: body.baseRate ?? 0,
      freeShippingThreshold: body.freeShippingThreshold,
      codAvailable: body.codAvailable ?? false,
      countries: body.countries,
    } as any) as any;
    const z = zone.toObject();
    res.status(201).json({ zone: { ...z, id: toId(zone) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create zone' });
  }
}

export async function updateZone(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { zoneId } = req.params;
    const zone = await ShippingZone.findByIdAndUpdate(zoneId, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    const { _id, ...rest } = zone as any;
    res.json({ zone: { ...rest, id: _id.toString() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update zone' });
  }
}

export async function deleteZone(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const deleted = await ShippingZone.findByIdAndDelete(req.params.zoneId);
    if (!deleted) return res.status(404).json({ message: 'Zone not found' });
    res.json({ message: 'Zone deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete zone' });
  }
}

// ---------- Fleet Drivers ----------
export async function getDrivers(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const query: any = {};
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { vehicle: new RegExp(search, 'i') },
      ];
    }
    const list = await FleetDriver.find(query).lean().sort({ name: 1 });
    const drivers = list.map((d: any) => {
      const { _id, ...rest } = d;
      return { ...rest, id: toId(d) };
    });
    res.json({ drivers });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch drivers' });
  }
}

export async function createDriver(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const driver = await FleetDriver.create({
      name: body.name,
      phone: body.phone,
      vehicle: body.vehicle,
      status: body.status ?? 'offline',
      onTimeDelivery: body.onTimeDelivery ?? 0,
      totalDeliveries: body.totalDeliveries ?? 0,
      avgDeliveryTime: body.avgDeliveryTime ?? '-',
      currentLocation: body.currentLocation,
    } as any) as any;
    const d = driver.toObject();
    res.status(201).json({ driver: { ...d, id: toId(driver) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create driver' });
  }
}

export async function updateDriver(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const driver = await FleetDriver.findByIdAndUpdate(req.params.driverId, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    const { _id, ...rest } = driver as any;
    res.json({ driver: { ...rest, id: _id.toString() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update driver' });
  }
}

// ---------- Warehouses ----------
export async function getWarehouses(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await LogisticsWarehouse.find({}).lean().sort({ name: 1 });
    const warehouses = list.map((w: any) => {
      const { _id, ...rest } = w;
      return { ...rest, id: toId(w) };
    });
    res.json({ warehouses });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch warehouses' });
  }
}

export async function createWarehouse(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const warehouse = await LogisticsWarehouse.create({
      name: body.name,
      location: body.location,
      totalStock: body.totalStock ?? 0,
      lowStockItems: body.lowStockItems ?? 0,
      inboundShipments: body.inboundShipments ?? 0,
      outboundShipments: body.outboundShipments ?? 0,
      damagedItems: body.damagedItems ?? 0,
    } as any) as any;
    const w = warehouse.toObject();
    res.status(201).json({ warehouse: { ...w, id: toId(warehouse) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create warehouse' });
  }
}

export async function updateWarehouse(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const warehouse = await LogisticsWarehouse.findByIdAndUpdate(req.params.warehouseId, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
    const { _id, ...rest } = warehouse as any;
    res.json({ warehouse: { ...rest, id: _id.toString() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update warehouse' });
  }
}

// ---------- Live Tracking (Shipments) ----------
export async function getShipments(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const status = (req.query.status as string)?.trim();
    const search = (req.query.search as string)?.trim() || '';
    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      const orConditions: any[] = [{ trackingNumber: new RegExp(search, 'i') }];
      if (/^[a-fA-F0-9]{24}$/.test(search)) {
        orConditions.push({ orderId: new mongoose.Types.ObjectId(search) });
      }
      query.$or = orConditions;
    }
    const shipments = await Shipment.find(query)
      .populate('orderId', 'orderNumber customer')
      .lean()
      .sort({ updatedAt: -1 })
      .limit(100);

    const list = (shipments as any[]).map((s) => {
      const order = s.orderId as any;
      const orderNumber = order?.orderNumber ?? s.orderId?.toString?.() ?? '-';
      const customerName = order?.customer ?? 'Unknown';
      const loc = s.currentLocation?.address;
      const eta = s.estimatedDelivery
        ? new Date(s.estimatedDelivery).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : s.status === 'delivered'
          ? 'Delivered'
          : '-';
      const lastUpdate = s.updatedAt
        ? new Date(s.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : '-';
      return {
        id: toId(s),
        trackingNumber: s.trackingNumber,
        orderId: orderNumber,
        customerName,
        status: mapShipmentStatus(s.status),
        currentLocation: loc,
        estimatedDelivery: eta,
        partner: s.courierName || '—',
        lastUpdate,
      };
    });

    // If search is not an ObjectId, also search by orderNumber via Order
    if (search && list.length === 0) {
      const { Order } = await import('../models/Order');
      const orders = await Order.find({
        $or: [
          { orderNumber: new RegExp(search, 'i') },
          { customer: new RegExp(search, 'i') },
        ],
      })
        .select('_id orderNumber customer')
        .limit(20)
        .lean();
      const orderIds = orders.map((o: any) => o._id);
      const extra = await Shipment.find({ orderId: { $in: orderIds } })
        .populate('orderId', 'orderNumber customer')
        .lean()
        .sort({ updatedAt: -1 });
      for (const s of extra as any[]) {
        const order = s.orderId;
        const orderNumber = order?.orderNumber ?? '-';
        const customerName = order?.customer ?? 'Unknown';
        const loc = s.currentLocation?.address;
        const eta = s.estimatedDelivery
          ? new Date(s.estimatedDelivery).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })
          : s.status === 'delivered' ? 'Delivered' : '-';
        const lastUpdate = s.updatedAt
          ? new Date(s.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
          : '-';
        list.push({
          id: toId(s),
          trackingNumber: s.trackingNumber,
          orderId: orderNumber,
          customerName,
          status: mapShipmentStatus(s.status),
          currentLocation: loc,
          estimatedDelivery: eta,
          partner: s.courierName || '—',
          lastUpdate,
        });
      }
    }

    res.json({ shipments: list });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch shipments' });
  }
}

// ---------- Analytics ----------
export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalShipments,
      deliveredCount,
      failedCount,
      zoneAgg,
      partnerAgg,
    ] = await Promise.all([
      Shipment.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Shipment.countDocuments({
        status: 'delivered',
        actualDelivery: { $gte: startOfMonth },
      }),
      Shipment.countDocuments({
        status: 'failed_delivery',
        updatedAt: { $gte: startOfMonth },
      }),
      Shipment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: '$shippingMethod', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { label: '$_id', value: '$count' } },
      ]).then((r) =>
        r.map((x: any) => ({
          label: x.label === 'express' ? 'Local' : x.label === 'priority' ? 'International' : x.label === 'standard' ? 'National' : x.label || 'Other',
          value: x.value,
        }))
      ),
      Shipment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: '$courierName', count: { $sum: 1 } } },
        { $match: { _id: { $exists: true, $ne: null } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { label: '$_id', value: '$count' } },
      ]),
    ]);

    const total = totalShipments || 1;
    const onTimePercent = totalShipments ? Math.round((deliveredCount / total) * 1000) / 10 : 0;
    const failedShipmentsCount = failedCount;

    const zoneData = zoneAgg.length
      ? zoneAgg.map((z: any) => ({ label: z.label || 'Other', value: z.value }))
      : [
          { label: 'Local', value: 0 },
          { label: 'National', value: 0 },
          { label: 'International', value: 0 },
        ];
    const partnerData = partnerAgg.length
      ? partnerAgg.map((p: any) => ({ label: p.label || 'Unknown', value: p.value }))
      : [
          { label: 'FedEx', value: 0 },
          { label: 'DHL', value: 0 },
          { label: 'In-House', value: 0 },
          { label: 'Other', value: 0 },
        ];

    res.json({
      metrics: {
        totalShipments,
        onTimeDeliveryPercent: onTimePercent,
        avgDeliveryTimeDays: 2.1,
        failedShipments: failedShipmentsCount,
        failedShipmentsChange: '-0.3',
        onTimeChange: '+2.3',
        totalChange: '+15',
      },
      zoneData,
      partnerData,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch analytics' });
  }
}

// ---------- Returns ----------
export async function getReturns(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const query: any = {};
    if (search) {
      query.$or = [
        { returnNumber: new RegExp(search, 'i') },
        { orderId: new RegExp(search, 'i') },
      ];
    }
    const list = await ReturnShipment.find(query).lean().sort({ createdAt: -1 });
    const returns = list.map((r: any) => {
      const { _id, ...rest } = r;
      return {
        ...rest,
        id: toId(r),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '',
      };
    });
    res.json({ returns });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch returns' });
  }
}

export async function createReturn(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    let returnNumber = (body.returnNumber as string)?.trim();
    if (!returnNumber) {
      const count = await ReturnShipment.countDocuments();
      returnNumber = `RET-${String(Date.now()).slice(-6)}${String(count).padStart(4, '0')}`;
    }
    const ret = await ReturnShipment.create({
      returnNumber: returnNumber.toUpperCase(),
      orderId: body.orderId ?? '',
      customerName: body.customerName ?? '',
      status: body.status ?? 'pending',
      returnReason: body.returnReason ?? '',
      pickupDriver: body.pickupDriver,
      refundAmount: body.refundAmount ?? 0,
      returnCost: body.returnCost ?? 0,
    } as any) as any;
    const r = ret.toObject();
    res.status(201).json({ return: { ...r, id: toId(ret), createdAt: ret.createdAt?.toISOString?.()?.slice(0, 10) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create return' });
  }
}

export async function updateReturn(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const ret = await ReturnShipment.findByIdAndUpdate(req.params.returnId, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!ret) return res.status(404).json({ message: 'Return not found' });
    const { _id, ...rest } = ret as any;
    res.json({
      return: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt ? new Date(rest.createdAt).toISOString().slice(0, 10) : '',
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update return' });
  }
}

// ---------- Automation Settings ----------
export async function getAutomationSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await LogisticsSettings.findOne().lean();
    if (!doc) {
      await LogisticsSettings.create({});
      doc = await LogisticsSettings.findOne().lean();
    }
    const { _id, ...rest } = (doc as any) || {};
    res.json({ settings: rest });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch settings' });
  }
}

export async function updateAutomationSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await LogisticsSettings.findOneAndUpdate(
      {},
      {
        autoAssignEnabled: body.autoAssignEnabled,
        autoAssignMethod: body.autoAssignMethod,
        autoApproveEnabled: body.autoApproveEnabled,
        autoNotifyEnabled: body.autoNotifyEnabled,
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    const { _id, ...rest } = (doc as any) || {};
    res.json({ message: 'Settings updated', settings: rest });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update settings' });
  }
}

// ---------- Access Control (Roles) ----------
export async function getRoles(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await LogisticsRole.find({}).lean().sort({ name: 1 });
    const roles = list.map((r: any) => {
      const { _id, ...rest } = r;
      return { ...rest, id: toId(r) };
    });
    res.json({ roles });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch roles' });
  }
}

export async function createRole(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const perms = (body.permissions as Record<string, boolean>) || {};
    const role = await LogisticsRole.create({
      name: body.name,
      permissions: {
        manageDrivers: perms.manageDrivers ?? false,
        viewOrders: perms.viewOrders ?? false,
        editOrders: perms.editOrders ?? false,
        manageWarehouses: perms.manageWarehouses ?? false,
        editShippingRates: perms.editShippingRates ?? false,
        viewAnalytics: perms.viewAnalytics ?? false,
      },
      userCount: 0,
    } as any) as any;
    const r = role.toObject();
    res.status(201).json({ role: { ...r, id: toId(role) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create role' });
  }
}

export async function updateRole(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const perms = body.permissions as Record<string, boolean> | undefined;
    const update: any = {};
    if (body.name !== undefined) update.name = body.name;
    if (perms) update.permissions = perms;
    const role = await LogisticsRole.findByIdAndUpdate(req.params.roleId, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!role) return res.status(404).json({ message: 'Role not found' });
    const { _id, ...rest } = role as any;
    res.json({ role: { ...rest, id: _id.toString() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update role' });
  }
}

// ---------- Integrations ----------
export async function getIntegrations(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await LogisticsIntegration.find({}).lean().sort({ name: 1 });
    const integrations = list.map((i: any) => {
      const { _id, ...rest } = i;
      const lastSync = i.lastSync
        ? new Date(i.lastSync).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : undefined;
      return { ...rest, id: toId(i), lastSync: lastSync || rest.lastSync };
    });
    res.json({ integrations });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch integrations' });
  }
}

export async function createIntegration(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const integration = await LogisticsIntegration.create({
      name: body.name,
      type: body.type || 'api',
      status: body.status ?? 'disconnected',
      lastSync: body.lastSync ? new Date(body.lastSync as string) : undefined,
      errorCount: body.errorCount ?? 0,
    } as any) as any;
    const i = integration.toObject();
    res.status(201).json({ integration: { ...i, id: toId(integration) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create integration' });
  }
}

export async function updateIntegration(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const update: any = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.status !== undefined) update.status = body.status;
    if (body.errorCount !== undefined) update.errorCount = body.errorCount;
    if (body.lastSync !== undefined) update.lastSync = body.lastSync ? new Date(body.lastSync as string) : null;
    const integration = await LogisticsIntegration.findByIdAndUpdate(req.params.integrationId, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!integration) return res.status(404).json({ message: 'Integration not found' });
    const { _id, ...rest } = integration as any;
    res.json({ integration: { ...rest, id: _id.toString() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update integration' });
  }
}

// ---------- Exceptions ----------
export async function getExceptions(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const type = (req.query.type as string)?.trim();
    const search = (req.query.search as string)?.trim() || '';
    const query: any = {};
    if (type && type !== 'all') query.type = type;
    if (search) {
      query.$or = [
        { shipmentId: new RegExp(search, 'i') },
        { orderId: new RegExp(search, 'i') },
      ];
    }
    const list = await LogisticsException.find(query).lean().sort({ createdAt: -1 });
    const exceptions = list.map((e: any) => {
      const { _id, ...rest } = e;
      return { ...rest, id: toId(e), createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : '' };
    });
    res.json({ exceptions });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch exceptions' });
  }
}

export async function createException(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const exception = await LogisticsException.create({
      type: body.type,
      shipmentId: body.shipmentId ?? '',
      orderId: body.orderId ?? '',
      partner: body.partner ?? '',
      description: body.description ?? '',
      status: body.status ?? 'open',
    } as any) as any;
    const ex = exception.toObject();
    res.status(201).json({
      exception: {
        ...ex,
        id: toId(exception),
        createdAt: exception.createdAt?.toISOString?.() ?? '',
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create exception' });
  }
}

export async function updateExceptionStatus(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const exception = await LogisticsException.findByIdAndUpdate(
      req.params.exceptionId,
      { status: req.body.status },
      { new: true, runValidators: true }
    ).lean();
    if (!exception) return res.status(404).json({ message: 'Exception not found' });
    const { _id, ...rest } = exception as any;
    res.json({
      exception: { ...rest, id: _id.toString(), createdAt: rest.createdAt ? new Date(rest.createdAt).toISOString() : '' },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update exception' });
  }
}
