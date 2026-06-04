import mongoose, { Document, Model, Schema } from 'mongoose';
import type { HomeLayoutSectionId, HomeSectionLayoutEntry } from '../constants/buyerHomeLayoutDefaults';

export interface IBuyerHomeLayoutConfig extends Omit<Document, '_id'> {
  _id: 'default';
  /** @deprecated use publishedSections */
  sections?: Partial<Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>>;
  publishedSections: Partial<Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>>;
  draftSections: Partial<Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>>;
  publishedAt?: Date;
  updatedAt: Date;
  createdAt: Date;
}

const layoutSettingsSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ['grid', 'trending_rail', 'horizontal_carousel', 'ai_hero'],
    },
    railCount: { type: Number, min: 1, max: 8 },
    gridColumns: { type: Number, enum: [2, 3, 4] },
    autoScroll: { type: Boolean },
    autoScrollStep: { type: Number, min: 0.1, max: 10 },
    duplicateLoop: { type: Boolean },
    cardDensity: {
      type: String,
      enum: ['standard', 'compact', 'compact_expandable'],
    },
  },
  { _id: false },
);

const viewportEntrySchema = new Schema(
  {
    mobile: { type: layoutSettingsSchema },
    desktop: { type: layoutSettingsSchema },
  },
  { _id: false },
);

const buyerHomeLayoutConfigSchema = new Schema<IBuyerHomeLayoutConfig>(
  {
    _id: { type: String, default: 'default' },
    sections: { type: Schema.Types.Mixed },
    publishedSections: { type: Schema.Types.Mixed, default: {} },
    draftSections: { type: Schema.Types.Mixed, default: {} },
    publishedAt: { type: Date },
  },
  { timestamps: true, collection: 'buyerhomelayoutconfigs' },
);

export const BuyerHomeLayoutConfig: Model<IBuyerHomeLayoutConfig> = mongoose.model<IBuyerHomeLayoutConfig>(
  'BuyerHomeLayoutConfig',
  buyerHomeLayoutConfigSchema,
);
