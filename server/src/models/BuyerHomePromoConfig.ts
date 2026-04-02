import mongoose, { Document, Schema } from 'mongoose';

export interface IHomePromoBanner {
  title: string;
  sub: string;
  cta: string;
  href: string;
  bg: string;
  emoji: string;
  enabled: boolean;
  sortOrder: number;
}

export interface IBuyerHomePromoConfig extends Document {
  _id: string;
  banners: IHomePromoBanner[];
}

const bannerSchema = new Schema<IHomePromoBanner>(
  {
    title: { type: String, required: true, trim: true },
    sub: { type: String, default: '' },
    cta: { type: String, default: 'Shop' },
    href: { type: String, default: '/' },
    bg: { type: String, default: 'linear-gradient(135deg,#6c63ff 0%,#4f46e5 100%)' },
    emoji: { type: String, default: '✨' },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const buyerHomePromoConfigSchema = new Schema<IBuyerHomePromoConfig>(
  {
    _id: { type: String, default: 'default' },
    banners: { type: [bannerSchema], default: [] },
  },
  { collection: 'buyer_home_promo_config' },
);

export const BuyerHomePromoConfig = mongoose.model<IBuyerHomePromoConfig>(
  'BuyerHomePromoConfig',
  buyerHomePromoConfigSchema,
);
