import { Response, Request } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { DeliveryDestination } from '../models/DeliveryDestination';
import {
  ensureDefaultDeliveryDestinations,
  findDeliveryDestination,
} from '../services/deliveryDestination.service';

function mapDestination(doc: any) {
  return {
    id: String(doc._id),
    countryCode: doc.countryCode,
    countryName: doc.countryName,
    city: doc.city,
    region: doc.region || '',
    displayLabel: doc.displayLabel,
    extraEtaDays: doc.extraEtaDays ?? 0,
    etaDaysMin: doc.etaDaysMin,
    etaDaysMax: doc.etaDaysMax,
    lat: doc.lat,
    lng: doc.lng,
    isActive: doc.isActive !== false,
    isDefault: Boolean(doc.isDefault),
    sortOrder: doc.sortOrder ?? 0,
  };
}

/** GET /api/shipping/destinations — public list for header & pickers */
export async function listPublicDestinations(_req: unknown, res: Response) {
  try {
    await ensureDefaultDeliveryDestinations();
    const rows = await DeliveryDestination.find({ isActive: true })
      .sort({ sortOrder: 1, countryName: 1, city: 1 })
      .lean();
    const byCountry = new Map<string, { countryCode: string; countryName: string; cities: ReturnType<typeof mapDestination>[] }>();
    for (const row of rows) {
      const cc = row.countryCode;
      if (!byCountry.has(cc)) {
        byCountry.set(cc, { countryCode: cc, countryName: row.countryName, cities: [] });
      }
      byCountry.get(cc)!.cities.push(mapDestination(row));
    }
    const defaultDest =
      rows.find((r) => r.isDefault) || rows.find((r) => r.countryCode === 'RW') || rows[0];
    return res.json({
      countries: [...byCountry.values()],
      destinations: rows.map(mapDestination),
      defaultDestination: defaultDest ? mapDestination(defaultDest) : null,
    });
  } catch (e: any) {
    console.error('listPublicDestinations', e);
    return res.status(500).json({ message: 'Failed to load delivery destinations' });
  }
}

/** GET /api/admin/logistics/destinations */
export async function adminListDestinations(_req: AuthenticatedRequest, res: Response) {
  try {
    await ensureDefaultDeliveryDestinations();
    const rows = await DeliveryDestination.find().sort({ sortOrder: 1, countryName: 1, city: 1 }).lean();
    return res.json({ destinations: rows.map(mapDestination) });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to list destinations' });
  }
}

/** POST /api/admin/logistics/destinations */
export async function adminCreateDestination(req: AuthenticatedRequest, res: Response) {
  try {
    const body = req.body || {};
    const countryCode = String(body.countryCode || '').trim().toUpperCase();
    const city = String(body.city || '').trim();
    const countryName = String(body.countryName || '').trim();
    if (!countryCode || !city || !countryName) {
      return res.status(400).json({ message: 'countryCode, countryName, and city are required' });
    }
    const displayLabel =
      String(body.displayLabel || '').trim() || `${city}, ${countryName}`;
    if (body.isDefault) {
      await DeliveryDestination.updateMany({}, { $set: { isDefault: false } });
    }
    const doc = await DeliveryDestination.create({
      countryCode,
      countryName,
      city,
      region: body.region || '',
      displayLabel,
      extraEtaDays: Number(body.extraEtaDays) || 0,
      etaDaysMin: body.etaDaysMin != null ? Number(body.etaDaysMin) : undefined,
      etaDaysMax: body.etaDaysMax != null ? Number(body.etaDaysMax) : undefined,
      lat: body.lat != null ? Number(body.lat) : undefined,
      lng: body.lng != null ? Number(body.lng) : undefined,
      isActive: body.isActive !== false,
      isDefault: Boolean(body.isDefault),
      sortOrder: Number(body.sortOrder) || 0,
    });
    return res.status(201).json({ destination: mapDestination(doc) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'This country + city already exists' });
    }
    return res.status(500).json({ message: e.message || 'Failed to create destination' });
  }
}

/** PATCH /api/admin/logistics/destinations/:id */
export async function adminUpdateDestination(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const body = req.body || {};
    if (body.isDefault) {
      await DeliveryDestination.updateMany({}, { $set: { isDefault: false } });
    }
    const update: Record<string, unknown> = {};
    const fields = [
      'countryCode',
      'countryName',
      'city',
      'region',
      'displayLabel',
      'extraEtaDays',
      'etaDaysMin',
      'etaDaysMax',
      'lat',
      'lng',
      'isActive',
      'isDefault',
      'sortOrder',
    ] as const;
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (update.countryCode) update.countryCode = String(update.countryCode).toUpperCase();
    const doc = await DeliveryDestination.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!doc) return res.status(404).json({ message: 'Destination not found' });
    return res.json({ destination: mapDestination(doc) });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to update destination' });
  }
}

/** DELETE /api/admin/logistics/destinations/:id */
export async function adminDeleteDestination(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const doc = await DeliveryDestination.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: 'Destination not found' });
    const remaining = await DeliveryDestination.countDocuments();
    if (remaining === 0) await ensureDefaultDeliveryDestinations();
    return res.json({ message: 'Deleted' });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to delete destination' });
  }
}

/** GET /api/shipping/destinations/resolve?country=RW&city=Muhanga */
export async function resolveDestination(req: Request, res: Response) {
  try {
    const country = String(req.query.country || '').trim();
    const city = String(req.query.city || '').trim();
    const dest = await findDeliveryDestination(country, city);
    if (!dest) {
      return res.json({ destination: null });
    }
    return res.json({ destination: mapDestination(dest) });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to resolve destination' });
  }
}
