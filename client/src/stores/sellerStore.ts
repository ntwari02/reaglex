import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Seller,
  SellerStatus,
  SellerDocument,
  SellerAgreement,
  SellerTier,
  SellerDocumentType,
} from '../types/seller';

interface SellerOnboardingState {
  seller: Seller | null;
  documents: SellerDocument[];
  agreement: SellerAgreement | null;

  loading: boolean;
  error: string | null;
}

interface SellerOnboardingActions {
  fetchSeller: () => Promise<void>;
  upsertSellerProfile: (input: {
    account_type: Seller['account_type'];
    store_name: string;
    country: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    logo_url?: string | null;
    cover_url?: string | null;
  }) => Promise<void>;
  uploadDocument: (type: SellerDocumentType, file: File) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  acceptAgreement: (version: string) => Promise<void>;

  setStatusLocally: (status: SellerStatus) => void;
  setTierLocally: (tier: SellerTier) => void;
  clearError: () => void;
}

type SellerStore = SellerOnboardingState &
  SellerOnboardingActions & {
    isVerified: () => boolean;
    canCreateProducts: () => boolean;
  };

export const useSellerStore = create<SellerStore>()(
  devtools((set, get) => ({
    seller: null,
    documents: [],
    agreement: null,

    loading: false,
    error: null,

    isVerified: () => {
      const s = get().seller;
      return !!s && s.status === 'approved';
    },

    canCreateProducts: () => {
      const s = get().seller;
      return !!s && s.status === 'approved';
    },

    async fetchSeller() {
      set({ loading: true, error: null });
      try {
        const res = await fetch('/api/seller/me');
        if (!res.ok) throw new Error('Failed to load seller');
        const data = (await res.json()) as {
          seller: Seller | null;
          documents: SellerDocument[];
          agreement: SellerAgreement | null;
        };
        set({
          seller: data.seller,
          documents: data.documents,
          agreement: data.agreement,
          loading: false,
        });
      } catch (err: any) {
        set({ error: err.message ?? 'Unknown error', loading: false });
      }
    },

    async upsertSellerProfile(input) {
      set({ loading: true, error: null });
      try {
        const res = await fetch('/api/seller/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error('Failed to save seller profile');
        const updated = (await res.json()) as Seller;
        set({ seller: updated, loading: false });
      } catch (err: any) {
        set({ error: err.message ?? 'Unknown error', loading: false });
      }
    },

    async uploadDocument(type, file) {
      set({ loading: true, error: null });
      try {
        const form = new FormData();
        form.append('type', type);
        form.append('file', file);
        const res = await fetch('/api/seller/documents', {
          method: 'POST',
          body: form,
        });
        if (!res.ok) throw new Error('Failed to upload document');
        const docs = (await res.json()) as SellerDocument[];
        set({ documents: docs, loading: false });
      } catch (err: any) {
        set({ error: err.message ?? 'Unknown error', loading: false });
      }
    },

    async refreshDocuments() {
      try {
        const res = await fetch('/api/seller/documents');
        if (!res.ok) throw new Error('Failed to fetch documents');
        const docs = (await res.json()) as SellerDocument[];
        set({ documents: docs });
      } catch (err: any) {
        set({ error: err.message ?? 'Unknown error' });
      }
    },

    async acceptAgreement(version) {
      set({ loading: true, error: null });
      try {
        const res = await fetch('/api/seller/agreements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version }),
        });
        if (!res.ok) throw new Error('Failed to accept agreement');
        const agr = (await res.json()) as SellerAgreement;
        set({ agreement: agr, loading: false });
      } catch (err: any) {
        set({ error: err.message ?? 'Unknown error', loading: false });
      }
    },

    setStatusLocally(status) {
      const seller = get().seller;
      if (!seller) return;
      set({ seller: { ...seller, status } });
    },

    setTierLocally(tier) {
      const seller = get().seller;
      if (!seller) return;
      set({ seller: { ...seller, tier } });
    },

    clearError() {
      set({ error: null });
    },
  }))
);


