import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { defaultReaglexSellerShipping } from '../types/reaglexShipping.types';
import { resolveSellerShippingConfig } from '../services/reaglexShipping.service';

export async function getSellerShippingSettings(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const u = await User.findById(req.user.id).select('reaglexSellerShipping').lean();
    const raw = (u as { reaglexSellerShipping?: unknown })?.reaglexSellerShipping;
    const merged = resolveSellerShippingConfig(raw);
    return res.json({ settings: merged, saved: Boolean(raw) });
  } catch (e: any) {
    console.error('getSellerShippingSettings', e);
    return res.status(500).json({ message: 'Failed to load shipping settings' });
  }
}

export async function putSellerShippingSettings(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const body = req.body as { settings?: unknown };
    const incoming = body?.settings;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ message: 'settings object required' });
    }

    const base = defaultReaglexSellerShipping();
    const inc = incoming as Record<string, unknown>;
    const warehousesRaw = Array.isArray(inc.warehouses) ? inc.warehouses : base.warehouses;
    const warehouses = warehousesRaw.map((w: any) => ({
      warehouseId: String(w.warehouseId || 'default').slice(0, 64),
      label: String(w.label || 'Warehouse').slice(0, 120),
      street: w.street ? String(w.street).slice(0, 200) : undefined,
      city: w.city ? String(w.city).slice(0, 100) : undefined,
      state: w.state ? String(w.state).slice(0, 100) : undefined,
      postalCode: w.postalCode ? String(w.postalCode).slice(0, 32) : undefined,
      country: w.country ? String(w.country).slice(0, 100) : undefined,
      lat: Number(w.lat),
      lng: Number(w.lng),
      pickupAvailable: Boolean(w.pickupAvailable),
    }));

    for (const w of warehouses) {
      if (!Number.isFinite(w.lat) || !Number.isFinite(w.lng)) {
        return res.status(400).json({ message: `Invalid lat/lng for warehouse ${w.warehouseId}` });
      }
    }

    const d = (inc.defaults as any) || {};
    const defaults = {
      baseFee: Math.max(0, Number(d.baseFee ?? base.defaults.baseFee)),
      ratePerKm: Math.max(0, Number(d.ratePerKm ?? base.defaults.ratePerKm)),
      handlingFee: Math.max(0, Number(d.handlingFee ?? base.defaults.handlingFee)),
      minShippingFee: Math.max(0, Number(d.minShippingFee ?? base.defaults.minShippingFee)),
      freeShippingThreshold:
        d.freeShippingThreshold != null && String(d.freeShippingThreshold) !== ''
          ? Math.max(0, Number(d.freeShippingThreshold))
          : undefined,
    };

    const zones = Array.isArray(inc.zones)
      ? (inc.zones as any[]).map((z) => ({
          id: String(z.id || 'z').slice(0, 64),
          name: String(z.name || '').slice(0, 120),
          countryCodes: (z.countryCodes || []).map((c: string) => String(c).toUpperCase().slice(0, 3)),
          surcharge: Math.max(0, Number(z.surcharge || 0)),
        }))
      : [];

    const methods = Array.isArray(inc.methods)
      ? (inc.methods as any[]).map((m) => ({
          key: m.key,
          enabled: m.enabled !== false,
          label: m.label ? String(m.label).slice(0, 80) : undefined,
          etaDaysMin: Math.max(0, Math.min(60, Number(m.etaDaysMin ?? 3))),
          etaDaysMax: Math.max(0, Math.min(90, Number(m.etaDaysMax ?? 7))),
          baseFee: m.baseFee != null ? Number(m.baseFee) : undefined,
          ratePerKm: m.ratePerKm != null ? Number(m.ratePerKm) : undefined,
          handlingFee: m.handlingFee != null ? Number(m.handlingFee) : undefined,
          minShippingFee: m.minShippingFee != null ? Number(m.minShippingFee) : undefined,
          freeShippingThreshold: m.freeShippingThreshold != null ? Number(m.freeShippingThreshold) : undefined,
          expressDistanceMultiplier:
            m.expressDistanceMultiplier != null ? Number(m.expressDistanceMultiplier) : undefined,
          pickupFee: m.pickupFee != null ? Number(m.pickupFee) : undefined,
        }))
      : base.methods;

    for (const m of methods) {
      if (!['standard', 'express', 'pickup'].includes(String(m.key))) {
        return res.status(400).json({ message: `Invalid method key: ${m.key}` });
      }
    }

    const settings = {
      enabled: inc.enabled !== false,
      currency: String(inc.currency || 'USD')
        .toUpperCase()
        .slice(0, 8),
      warehouses,
      defaults,
      zones,
      methods,
    };

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(req.user.id) },
      { $set: { reaglexSellerShipping: settings } }
    );

    return res.json({ success: true, settings });
  } catch (e: any) {
    console.error('putSellerShippingSettings', e);
    return res.status(500).json({ message: 'Failed to save shipping settings' });
  }
}
