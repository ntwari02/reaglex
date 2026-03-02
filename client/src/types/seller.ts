export type SellerStatus =
  | 'pending_profile'
  | 'pending_kyc'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type SellerTier = 'new' | 'verified' | 'trusted' | 'premium';

export type SellerAccountType = 'individual' | 'business';

export interface Seller {
  id: string;
  user_id: string;
  account_type: SellerAccountType;

  // Branding / identity
  store_name: string;
  store_slug: string;
  public_url: string;
  logo_url?: string | null;
  cover_url?: string | null;

  // Contact & location
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;

  // Verification / lifecycle
  status: SellerStatus;
  tier: SellerTier;
  rejection_reason?: string | null;

  // Meta
  created_at: string;
  updated_at: string;
}

export type SellerDocumentType =
  | 'national_id'
  | 'passport'
  | 'business_certificate'
  | 'tin'
  | 'address_proof'
  | 'bank_doc';

export type SellerDocumentStatus = 'pending' | 'approved' | 'rejected';

export interface SellerDocument {
  id: string;
  seller_id: string;
  type: SellerDocumentType;
  file_url: string;
  status: SellerDocumentStatus;
  rejection_reason?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerAgreement {
  id: string;
  seller_id: string;
  agreement_version: string;
  accepted_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface SellerCompliance {
  id: string;
  seller_id: string;
  last_full_review_at?: string | null;
  next_review_due_at?: string | null;
  risk_score: number;
  is_blacklisted: boolean;
  notes?: string | null;
}

export interface SellerStatusAudit {
  id: string;
  seller_id: string;
  from_status: SellerStatus;
  to_status: SellerStatus;
  changed_by: 'system' | `admin:${string}`;
  reason?: string | null;
  created_at: string;
}


