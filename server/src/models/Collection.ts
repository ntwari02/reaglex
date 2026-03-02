import mongoose, { Document, Schema } from 'mongoose';

export type CollectionType = 'manual' | 'smart';

export interface ICollectionVisibility {
  storefront: boolean;
  mobile_app: boolean;
}

export interface ICollectionPlacement {
  homepage_banner: boolean;
  homepage_featured: boolean;
  homepage_tabs: boolean;
  category_page: boolean;
  navigation_menu: boolean;
}

export interface ICollectionCondition {
  type: string;
  field?: string;
  operator: string;
  value?: string;
  min?: string;
  max?: string;
}

export interface ICollection extends Document {
  sellerId: Schema.Types.ObjectId;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  type: CollectionType;
  sortOrder:
    | 'manual'
    | 'price_asc'
    | 'price_desc'
    | 'newest'
    | 'oldest'
    | 'best_selling'
    | 'name_asc'
    | 'name_desc'
    | 'featured';
  visibility: ICollectionVisibility;
  isActive: boolean;
  isFeatured: boolean;
  isDraft?: boolean;
  isTrending?: boolean;
  isSeasonal?: boolean;
  isSale?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  // For Manual collections: explicit product IDs
  productIds?: Schema.Types.ObjectId[];
  // For Automated (smart) collections: rule definitions
  conditions?: ICollectionCondition[];
  placement?: ICollectionPlacement;
  placementPriority?: number;
  publishedAt?: Date;
  scheduledPublishAt?: Date;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const collectionVisibilitySchema = new Schema<ICollectionVisibility>(
  {
    storefront: { type: Boolean, default: true },
    mobile_app: { type: Boolean, default: true },
  },
  { _id: false }
);

const collectionPlacementSchema = new Schema<ICollectionPlacement>(
  {
    homepage_banner: { type: Boolean, default: false },
    homepage_featured: { type: Boolean, default: false },
    homepage_tabs: { type: Boolean, default: false },
    category_page: { type: Boolean, default: false },
    navigation_menu: { type: Boolean, default: false },
  },
  { _id: false }
);

const collectionConditionSchema = new Schema<ICollectionCondition>(
  {
    type: { type: String, required: true },
    field: { type: String },
    operator: { type: String, required: true },
    value: { type: String },
    min: { type: String },
    max: { type: String },
  },
  { _id: false }
);

const collectionSchema = new Schema<ICollection>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, index: true },
    description: { type: String },
    imageUrl: { type: String },
    coverImageUrl: { type: String },
    type: {
      type: String,
      enum: ['manual', 'smart'],
      default: 'manual',
    },
    sortOrder: {
      type: String,
      enum: [
        'manual',
        'price_asc',
        'price_desc',
        'newest',
        'oldest',
        'best_selling',
        'name_asc',
        'name_desc',
        'featured',
      ],
      default: 'manual',
    },
    visibility: {
      type: collectionVisibilitySchema,
      default: () => ({ storefront: true, mobile_app: true }),
    },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    isDraft: { type: Boolean, default: false, index: true },
    isTrending: { type: Boolean, default: false },
    isSeasonal: { type: Boolean, default: false },
    isSale: { type: Boolean, default: false },
    seoTitle: { type: String },
    seoDescription: { type: String },
    // Manual collections: store explicit product IDs
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    // Automated collections: store rule definitions
    conditions: { type: [collectionConditionSchema], default: [] },
    placement: { type: collectionPlacementSchema },
    placementPriority: { type: Number, default: 0 },
    publishedAt: { type: Date },
    scheduledPublishAt: { type: Date },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Collection = mongoose.model<ICollection>('Collection', collectionSchema);


