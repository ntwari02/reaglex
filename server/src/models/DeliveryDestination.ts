import mongoose, { Document, Schema } from 'mongoose';

export interface IDeliveryDestination extends Document {
  countryCode: string;
  countryName: string;
  city: string;
  region?: string;
  displayLabel: string;
  /** Added to seller ETA when quoting (e.g. remote districts). */
  extraEtaDays: number;
  etaDaysMin?: number;
  etaDaysMax?: number;
  lat?: number;
  lng?: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryDestinationSchema = new Schema<IDeliveryDestination>(
  {
    countryCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    countryName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    region: { type: String, trim: true },
    displayLabel: { type: String, required: true, trim: true },
    extraEtaDays: { type: Number, default: 0, min: 0, max: 30 },
    etaDaysMin: { type: Number, min: 0, max: 60 },
    etaDaysMax: { type: Number, min: 0, max: 90 },
    lat: { type: Number },
    lng: { type: Number },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

deliveryDestinationSchema.index({ countryCode: 1, city: 1 }, { unique: true });

export const DeliveryDestination = mongoose.model<IDeliveryDestination>(
  'DeliveryDestination',
  deliveryDestinationSchema,
);
