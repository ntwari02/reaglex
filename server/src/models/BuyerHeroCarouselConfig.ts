import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IHeroCarouselSlide {
  eyebrow: string;
  line1: string;
  line2: string;
  detail: string;
  cta: string;
  href: string;
  imageUrl: string;
  videoUrl?: string;
  imgPosition: string;
  enabled: boolean;
  sortOrder: number;
  scheduledFrom?: Date | null;
  scheduledTo?: Date | null;
}

export interface IBuyerHeroCarouselConfig extends Omit<Document, '_id'> {
  _id: string;
  slides: IHeroCarouselSlide[];
}

const slideSchema = new Schema<IHeroCarouselSlide>(
  {
    eyebrow: { type: String, default: '' },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: '' },
    detail: { type: String, default: '' },
    cta: { type: String, default: 'Shop now' },
    href: { type: String, default: '/' },
    imageUrl: { type: String, required: true },
    videoUrl: { type: String, default: '' },
    imgPosition: { type: String, default: 'center center' },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    scheduledFrom: { type: Date, default: null },
    scheduledTo: { type: Date, default: null },
  },
  { _id: false },
);

const buyerHeroCarouselConfigSchema = new Schema<IBuyerHeroCarouselConfig>(
  {
    _id: { type: String, default: 'default' },
    slides: { type: [slideSchema], default: [] },
  },
  { collection: 'buyer_hero_carousel_config' },
);

export const BuyerHeroCarouselConfig: Model<IBuyerHeroCarouselConfig> =
  mongoose.model<IBuyerHeroCarouselConfig>('BuyerHeroCarouselConfig', buyerHeroCarouselConfigSchema);
