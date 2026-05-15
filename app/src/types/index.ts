export interface Profile {
  id: string;
  email: string;
  email_verified?: boolean;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: 'buyer' | 'seller' | 'admin';
  seller_status?: 'pending' | 'approved' | 'rejected';
  seller_verified?: boolean;
  created_at: string;
  updated_at: string;
}
