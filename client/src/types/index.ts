export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: 'buyer' | 'seller' | 'admin';
  // Seller-specific fields (for MongoDB-backed auth)
  seller_status?: 'pending' | 'approved' | 'rejected';
  seller_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  category_id?: string;
  collection_id?: string;
  title: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  is_shippable: boolean;
  weight?: number;
  dimensions?: Record<string, unknown>;
  stock_quantity: number;
  low_stock_threshold: number;
  sku?: string;
  status: 'draft' | 'active' | 'archived';
  tags?: string[];
  location?: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string;
  price?: number;
  stock_quantity: number;
  options: Record<string, string>;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  position: number;
  is_primary?: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  image_url?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'disputed';
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  total: number;
  coupon_id?: string;
  shipping_method?: string;
  shipping_address: Record<string, string>;
  billing_address?: Record<string, string>;
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  is_shippable: boolean;
  meeting_details?: Record<string, unknown>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
  product?: Product;
}

export interface OrderTracking {
  id: string;
  order_id: string;
  status: string;
  location?: string;
  description?: string;
  tracking_number?: string;
  carrier?: string;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  order_id?: string;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  seller_response?: string;
  responded_at?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionAnswer {
  id: string;
  product_id: string;
  user_id: string;
  question: string;
  answer?: string;
  answered_by?: string;
  answered_at?: string;
  helpful_count: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface CollectionCondition {
  type: 'tag' | 'title' | 'price' | 'category' | 'vendor' | 'stock' | 'attribute';
  field?: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in_stock' | 'out_of_stock';
  value?: string;
  min?: string;
  max?: string;
}

export interface CollectionVisibility {
  storefront: boolean;
  mobile_app: boolean;
}

export interface Collection {
  id: string;
  seller_id: string;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  type: 'manual' | 'smart';
  conditions?: CollectionCondition[];
  sort_order: 'manual' | 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'best_selling' | 'name_asc' | 'name_desc' | 'featured';
  visibility: CollectionVisibility;
  is_active: boolean;
  is_featured: boolean;
  is_trending?: boolean;
  is_seasonal?: boolean;
  is_sale?: boolean;
  is_draft?: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_image_url?: string;
  published_at?: string;
  scheduled_publish_at?: string;
  created_at: string;
  updated_at?: string;
  product_count?: number;
  products?: Product[];
  // Analytics
  views_count?: number;
  conversion_rate?: number;
  total_sales?: number;
  // Restrictions
  max_collections_allowed?: number;
  can_create_automated?: boolean;
}

export interface ProductCollection {
  id: string;
  product_id: string;
  collection_id: string;
  position: number;
  added_at: string;
  product?: Product;
  collection?: Collection;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  banner_image?: string;
  description?: string;
  bio?: string;
  country?: string;
  country_code?: string;
  website?: string;
  email?: string;
  phone?: string;
  seller_id?: string;
  seller_rating?: number;
  product_count: number;
  follower_count?: number;
  is_verified: boolean;
  is_top_brand: boolean;
  is_trusted_seller: boolean;
  is_featured: boolean;
  is_trending?: boolean;
  is_local?: boolean;
  is_new?: boolean;
  is_wholesale?: boolean;
  offers_free_shipping?: boolean;
  categories?: string[];
  tags?: string[];
  policies?: {
    returns?: string;
    warranty?: string;
    shipping?: string;
  };
  performance_stats?: {
    response_time?: string;
    fulfillment_rate?: number;
    on_time_delivery?: number;
  };
  created_at: string;
  updated_at: string;
}
