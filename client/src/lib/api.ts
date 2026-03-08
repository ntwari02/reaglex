/**
 * API Configuration and Service
 * Centralized API client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get authentication headers with token
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Profile API Service
 */
export const profileAPI = {
  /**
   * Get current user's profile
   */
  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{ user: any }>(response);
  },

  /**
   * Upload avatar image
   */
  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - browser will set it with boundary

    const response = await fetch(`${API_BASE_URL}/profile/me/avatar`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });
    return handleResponse<{ message: string; avatarUrl: string; user: any }>(response);
  },

  /**
   * Get public profile by user ID
   */
  async getPublicProfile(userId: string) {
    const response = await fetch(`${API_BASE_URL}/profile/public/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{ user: any }>(response);
  },

  /**
   * Update profile
   */
  async updateProfile(data: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    location?: string;
    website?: string;
    dateOfBirth?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; user: any }>(response);
  },

  /**
   * Add address
   */
  async addAddress(address: {
    label: string;
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
    isDefault?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/addresses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(address),
    });
    return handleResponse<{ message: string; addresses: any[] }>(response);
  },

  /**
   * Update address by index
   */
  async updateAddress(index: number, address: {
    label: string;
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
    isDefault?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/addresses/${index}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(address),
    });
    return handleResponse<{ message: string; addresses: any[] }>(response);
  },

  /**
   * Delete address by index
   */
  async deleteAddress(index: number) {
    const response = await fetch(`${API_BASE_URL}/profile/me/addresses/${index}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{ message: string; addresses: any[] }>(response);
  },

  /**
   * Add payment method
   */
  async addPaymentMethod(paymentMethod: {
    type: 'card' | 'bank' | 'mobile_money' | 'crypto';
    provider?: string;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
    billingAddress?: any;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/payment-methods`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(paymentMethod),
    });
    return handleResponse<{ message: string; paymentMethods: any[] }>(response);
  },

  /**
   * Update payment method by index
   */
  async updatePaymentMethod(index: number, paymentMethod: {
    type: 'card' | 'bank' | 'mobile_money' | 'crypto';
    provider?: string;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
    billingAddress?: any;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/payment-methods/${index}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(paymentMethod),
    });
    return handleResponse<{ message: string; paymentMethods: any[] }>(response);
  },

  /**
   * Delete payment method by index
   */
  async deletePaymentMethod(index: number) {
    const response = await fetch(`${API_BASE_URL}/profile/me/payment-methods/${index}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{ message: string; paymentMethods: any[] }>(response);
  },

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: {
    email?: {
      orderUpdates?: boolean;
      promotions?: boolean;
      securityAlerts?: boolean;
      newsletter?: boolean;
    };
    push?: {
      orderUpdates?: boolean;
      promotions?: boolean;
      messages?: boolean;
      securityAlerts?: boolean;
    };
    sms?: {
      orderUpdates?: boolean;
      securityAlerts?: boolean;
      promotions?: boolean;
    };
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/notifications`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    return handleResponse<{ message: string; notifications: any }>(response);
  },

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: {
    profileVisibility?: 'public' | 'private' | 'friends';
    showEmail?: boolean;
    showPhone?: boolean;
    allowMessages?: boolean;
    showActivity?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/privacy`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    return handleResponse<{ message: string; privacy: any }>(response);
  },

  /**
   * Update preferences
   */
  async updatePreferences(preferences: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    currency?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/preferences`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(preferences),
    });
    return handleResponse<{ message: string; preferences: any }>(response);
  },

  /**
   * Change password
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * Update security settings
   */
  async updateSecuritySettings(settings: {
    twoFactorEnabled?: boolean;
    twoFactorMethod?: 'email' | 'sms' | 'app' | null;
  }) {
    const response = await fetch(`${API_BASE_URL}/profile/me/security`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    return handleResponse<{ message: string; security: any }>(response);
  },

  /**
   * Get login history
   */
  async getLoginHistory() {
    const response = await fetch(`${API_BASE_URL}/profile/me/login-history`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{ loginHistory: Array<{ date: string; ip: string; location?: string; device?: string }> }>(response);
  },
};

/**
 * Auth API Service
 */
export const authAPI = {
  /**
   * Register new user
   */
  async register(data: {
    fullName: string;
    email: string;
    password: string;
    role?: 'buyer' | 'seller' | 'admin';
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ user: any; token: string }>(response);
  },

  /**
   * Login user. Returns token+user for buyers; for seller/admin may return requires2FA or requires2FASetup.
   */
  async login(email: string, password: string): Promise<
    | { user: any; token: string }
    | { requires2FA: true; tempToken: string; email: string; role: string }
    | { requires2FASetup: true; tempToken: string; email: string; role: string }
  > {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * Complete login with 2FA code (seller/admin who already have 2FA enabled)
   */
  async verify2FA(tempToken: string, code: string) {
    const response = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tempToken, code }),
    });
    return handleResponse<{ user: any; token: string }>(response);
  },

  /**
   * Start 2FA setup (get QR code) for seller/admin without 2FA
   */
  async setup2FAStart(tempToken: string) {
    const response = await fetch(`${API_BASE_URL}/auth/setup-2fa/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tempToken }),
    });
    return handleResponse<{ qrCode: string; manualEntryKey: string }>(response);
  },

  /**
   * Confirm 2FA setup with code, then get full auth token
   */
  async setup2FAConfirm(tempToken: string, code: string) {
    const response = await fetch(`${API_BASE_URL}/auth/setup-2fa/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tempToken, code }),
    });
    return handleResponse<{ user: any; token: string }>(response);
  },

  /**
   * Resend verification email (for unverified accounts)
   */
  async resendVerificationEmail(email: string) {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * Request a 6-digit verification code sent to email (alternative to link)
   */
  async requestVerificationOtp(email: string) {
    const response = await fetch(`${API_BASE_URL}/auth/request-verification-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * Verify email using the 6-digit code
   */
  async verifyEmailWithOtp(email: string, code: string) {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{ user: any }>(response);
  },
};

/**
 * Admin API Service
 */
export const adminAPI = {
  /**
   * Get user statistics for dashboard
   */
  async getUserStats() {
    const response = await fetch(`${API_BASE_URL}/admin/users/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{
      totalCustomers: number;
      avgOrdersPerCustomer: number;
      riskAccounts: number;
      verifiedKYC: number;
      customerChange: number;
    }>(response);
  },

  /**
   * Get all buyers with statistics
   */
  async getBuyers(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/admin/buyers${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{
      customers: Array<{
        id: string;
        name: string;
        email: string;
        phone: string;
        avatarUrl?: string;
        status: 'active' | 'pending' | 'banned' | 'warned' | 'inactive';
        kyc: 'verified' | 'pending' | 'rejected';
        orders: number;
        totalSpent: number;
        lastOrder: string;
        tickets: number;
        notes: string;
        userId?: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(response);
  },

  /**
   * Get user details by ID
   */
  async getUserDetails(userId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
        location: string;
        avatarUrl?: string;
        status: 'active' | 'pending' | 'banned' | 'warned' | 'inactive';
        warningCount: number;
        role: string;
        createdAt: string;
        orders: number;
        totalSpent: number;
        lastOrder: string;
      };
    }>(response);
  },

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: 'active' | 'pending' | 'banned' | 'warned' | 'inactive', reason?: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ status, reason }),
    });
    return handleResponse<{
      message: string;
      user: {
        id: string;
        status: string;
        warningCount: number;
      };
    }>(response);
  },

  /**
   * Create a new user
   */
  async createUser(data: {
    fullName: string;
    email: string;
    phone?: string;
    role?: 'buyer' | 'seller' | 'admin';
    password?: string;
    location?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{
      message: string;
      user: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        role: string;
        status: string;
      };
    }>(response);
  },

  /**
   * Update user information
   */
  async updateUser(userId: string, data: {
    fullName?: string;
    email?: string;
    phone?: string;
    role?: 'buyer' | 'seller' | 'admin';
    location?: string;
    accountStatus?: 'active' | 'pending' | 'banned' | 'warned';
    password?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{
      message: string;
      user: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        role: string;
        location?: string;
        status: string;
        warningCount: number;
      };
    }>(response);
  },

  /**
   * Delete a user
   */
  async deleteUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{
      message: string;
      deletedUser: {
        id: string;
        name: string;
        email: string;
        ordersCount: number;
      };
    }>(response);
  },

  /**
   * Get seller statistics for dashboard
   */
  async getSellerStats() {
    const response = await fetch(`${API_BASE_URL}/admin/sellers/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{
      totalSellers: number;
      avgProductsPerSeller: number;
      pendingSellers: number;
      sellersWithIssues: number;
      sellerChange: number;
    }>(response);
  },

  /**
   * Get all sellers with statistics
   */
  async getSellers(params?: {
    status?: string;
    verificationStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.verificationStatus) queryParams.append('verificationStatus', params.verificationStatus);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/admin/sellers${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{
      sellers: Array<{
        id: string;
        sellerName: string;
        storeName: string;
        email: string;
        phone: string;
        avatarUrl?: string;
        status: 'active' | 'pending' | 'banned' | 'warned' | 'inactive' | 'suspended';
        kycStatus: 'verified' | 'pending' | 'rejected';
        totalProducts: number;
        totalOrders: number;
        earnings: number;
        joinDate: string;
        country: string;
        hasDisputes: boolean;
        hasPayoutIssues: boolean;
        userId?: string;
        warningCount?: number;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(response);
  },

  /**
   * Get seller details by ID
   */
  async getSellerDetails(sellerId: string) {
    const url = `${API_BASE_URL}/admin/sellers/${sellerId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{
      seller: {
        id: string;
        sellerName: string;
        storeName: string;
        email: string;
        phone: string;
        location: string;
        avatarUrl?: string;
        status: 'active' | 'pending' | 'banned' | 'warned' | 'inactive' | 'suspended';
        warningCount: number;
        verificationStatus: 'pending' | 'approved' | 'rejected';
        isVerified: boolean;
        role: string;
        createdAt: string;
        totalProducts: number;
        totalOrders: number;
        earnings: number;
        disputes: number;
        tickets: number;
        lastOrder: string;
      };
    }>(response);
  },

  /**
   * Update seller status
   */
  async updateSellerStatus(
    sellerId: string,
    status?: 'active' | 'pending' | 'banned' | 'warned' | 'inactive' | 'suspended',
    verificationStatus?: 'pending' | 'approved' | 'rejected',
    reason?: string
  ) {
    const url = `${API_BASE_URL}/admin/sellers/${sellerId}/status`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, verificationStatus, reason }),
    });
    return handleResponse<{
      message: string;
      seller: { id: string; status: string; verificationStatus: string; warningCount: number };
    }>(response);
  },

  /**
   * Create a new seller
   */
  async createSeller(sellerData: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    accountStatus?: 'active' | 'pending' | 'banned' | 'warned' | 'inactive' | 'suspended';
    sellerVerificationStatus?: 'pending' | 'approved' | 'rejected';
    password?: string;
  }) {
    const url = `${API_BASE_URL}/admin/sellers`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(sellerData),
    });
    return handleResponse<{ message: string; seller: any }>(response);
  },

  /**
   * Update seller details
   */
  async updateSeller(
    sellerId: string,
    sellerData: {
      fullName?: string;
      email?: string;
      phone?: string;
      location?: string;
      accountStatus?: 'active' | 'pending' | 'banned' | 'warned' | 'inactive' | 'suspended';
      sellerVerificationStatus?: 'pending' | 'approved' | 'rejected';
      password?: string;
    }
  ) {
    const url = `${API_BASE_URL}/admin/sellers/${sellerId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(sellerData),
    });
    return handleResponse<{ message: string; seller: any }>(response);
  },

  /**
   * Delete a seller
   */
  async deleteSeller(sellerId: string) {
    const url = `${API_BASE_URL}/admin/sellers/${sellerId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse<{
      message: string;
      deletedSeller: { id: string; sellerName: string; email: string; productsCount: number; ordersCount: number };
    }>(response);
  },
};

/**
 * Admin Finance API Service
 */
const FINANCE_BASE = `${API_BASE_URL}/admin/finance`;

export const adminFinanceAPI = {
  getDashboard: (params?: { timeRange?: 'daily' | 'weekly' | 'monthly' }) => {
    const q = params?.timeRange ? `?timeRange=${params.timeRange}` : '';
    return fetch(`${FINANCE_BASE}/dashboard${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      metrics: Record<string, number>;
      revenueData: { date: string; value: number }[];
      revenueStreams: Record<string, number>;
    }>);
  },
  getPayouts: (params?: { section?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.section) sp.append('section', params.section);
    if (params?.status) sp.append('status', params.status);
    if (params?.search) sp.append('search', params.search);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${FINANCE_BASE}/payouts${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ payouts: any[]; total: number; page: number; limit: number }>);
  },
  approvePayout: (id: string) =>
    fetch(`${FINANCE_BASE}/payouts/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string; payout: any }>),
  rejectPayout: (id: string) =>
    fetch(`${FINANCE_BASE}/payouts/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string; payout: any }>),
  getTransactions: (params?: { status?: string; paymentMethod?: string; sellerId?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.paymentMethod) sp.append('paymentMethod', params.paymentMethod);
    if (params?.sellerId) sp.append('sellerId', params.sellerId);
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);
    if (params?.search) sp.append('search', params.search);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${FINANCE_BASE}/transactions${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ transactions: any[]; total: number; page: number; limit: number }>);
  },
  exportTransactionLogs: (body: { startDate?: string; endDate?: string; paymentStatus?: string; paymentMethod?: string; sellerId?: string; orderId?: string; format?: string }) =>
    fetch(`${FINANCE_BASE}/transactions/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; format: string; rowCount: number; data: any[] }>),
  getGateways: () =>
    fetch(`${FINANCE_BASE}/gateways`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ gateways: any[] }>),
  updateGateway: (id: string, body: { isEnabled?: boolean; apiKeyMasked?: string; webhookUrl?: string; testMode?: boolean }) =>
    fetch(`${FINANCE_BASE}/gateways/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ gateway: any }>),
  getRefunds: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.search) sp.append('search', params.search);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${FINANCE_BASE}/refunds${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ refunds: any[]; total: number; page: number; limit: number }>);
  },
  approveRefund: (id: string) =>
    fetch(`${FINANCE_BASE}/refunds/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ refund: any }>),
  rejectRefund: (id: string) =>
    fetch(`${FINANCE_BASE}/refunds/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ refund: any }>),
  getChargebacks: () =>
    fetch(`${FINANCE_BASE}/chargebacks`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ chargebacks: any[] }>),
  getTaxRules: () =>
    fetch(`${FINANCE_BASE}/tax-rules`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ taxRules: any[] }>),
  createTaxRule: (body: { name?: string; type?: string; rate?: number; location?: string; category?: string; appliesTo?: string; status?: string }) =>
    fetch(`${FINANCE_BASE}/tax-rules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ taxRule: any }>),
  updateTaxRule: (id: string, body: { name?: string; type?: string; rate?: number; location?: string; category?: string; appliesTo?: string; status?: string }) =>
    fetch(`${FINANCE_BASE}/tax-rules/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ taxRule: any }>),
  deleteTaxRule: (id: string) =>
    fetch(`${FINANCE_BASE}/tax-rules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),
  getReports: () =>
    fetch(`${FINANCE_BASE}/reports`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ reports: any[] }>),
  generateReport: (body: { reportType?: string; month?: number; year?: number; sellerId?: string; paymentMethod?: string; format?: string; emailReport?: boolean }) =>
    fetch(`${FINANCE_BASE}/reports/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; summary: any }>),
  getFinanceSettings: () =>
    fetch(`${FINANCE_BASE}/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ settings: any }>),
  updateFinanceSettings: (body: Record<string, unknown>) =>
    fetch(`${FINANCE_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ settings: any }>),
  getSellersList: () =>
    fetch(`${FINANCE_BASE}/sellers`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ sellers: { id: string; name: string }[] }>),
};

/**
 * Admin Support API Service
 */
const SUPPORT_BASE = `${API_BASE_URL}/admin/support`;

export const adminSupportAPI = {
  getDashboard: () =>
    fetch(`${SUPPORT_BASE}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      metrics: Record<string, number | string>;
      realTime: Record<string, number>;
      distribution: {
        ticketsByCategory: { label: string; value: number }[];
        disputesByReason: { label: string; value: number }[];
        frequentProductIssues: { label: string; value: number }[];
        problematicSellers: { label: string; value: number }[];
      };
    }>),

  getTickets: (params?: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.category) sp.append('category', params.category);
    if (params?.priority) sp.append('priority', params.priority);
    if (params?.search) sp.append('search', params.search);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    if (params?.sortBy) sp.append('sortBy', params.sortBy);
    if (params?.sortOrder) sp.append('sortOrder', params.sortOrder);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${SUPPORT_BASE}/tickets${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ tickets: any[]; pagination: { page: number; limit: number; total: number; pages: number } }>);
  },

  getTicket: (ticketId: string) =>
    fetch(`${SUPPORT_BASE}/tickets/${ticketId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ ticket: any }>),

  updateTicket: (ticketId: string, body: { status?: string; priority?: string; assignedTo?: string | null }) =>
    fetch(`${SUPPORT_BASE}/tickets/${ticketId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; ticket: any }>),

  addTicketMessage: (ticketId: string, body: { message: string; isInternal?: boolean; attachments?: string[] }) =>
    fetch(`${SUPPORT_BASE}/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; ticket: any }>),

  getDisputes: (params?: { status?: string; type?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.type) sp.append('type', params.type);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${SUPPORT_BASE}/disputes${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ disputes: any[]; pagination: { page: number; limit: number; total: number; pages: number } }>);
  },

  getDispute: (disputeId: string) =>
    fetch(`${SUPPORT_BASE}/disputes/${disputeId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ dispute: any }>),

  resolveDispute: (disputeId: string, body: { decision: 'approved' | 'rejected' | 'resolved'; resolution?: string }) =>
    fetch(`${SUPPORT_BASE}/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; dispute: any }>),

  getStaff: () =>
    fetch(`${SUPPORT_BASE}/staff`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ staff: any[] }>),

  getArticles: (params?: { search?: string; category?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.category) sp.append('category', params.category);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${SUPPORT_BASE}/articles${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ articles: any[]; pagination: { page: number; limit: number; total: number; pages: number } }>);
  },

  createArticle: (body: { title: string; content: string; category: string; visibility?: 'public' | 'internal' }) =>
    fetch(`${SUPPORT_BASE}/articles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; article: any }>),

  updateArticle: (articleId: string, body: { title?: string; content?: string; category?: string; visibility?: string }) =>
    fetch(`${SUPPORT_BASE}/articles/${articleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; article: any }>),

  deleteArticle: (articleId: string) =>
    fetch(`${SUPPORT_BASE}/articles/${articleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getAlerts: (params?: { status?: string; severity?: string; type?: string; search?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.severity) sp.append('severity', params.severity);
    if (params?.type) sp.append('type', params.type);
    if (params?.search) sp.append('search', params.search);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${SUPPORT_BASE}/alerts${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ alerts: any[]; pagination: { page: number; limit: number; total: number; pages: number } }>);
  },

  createAlert: (body: { type: string; severity: string; title: string; description: string; entityName: string; entityId: string }) =>
    fetch(`${SUPPORT_BASE}/alerts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; alert: any }>),

  updateAlertStatus: (alertId: string, body: { status: string }) =>
    fetch(`${SUPPORT_BASE}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; alert: any }>),

  getReportsAnalytics: (params?: { dateRange?: string }) => {
    const q = params?.dateRange ? `?dateRange=${params.dateRange}` : '';
    return fetch(`${SUPPORT_BASE}/reports/analytics${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      totalTickets: number;
      avgResponseTimeHours: number;
      ticketVolume: { label: string; value: number }[];
      responseTimeByWeek: { label: string; value: number }[];
      commonIssues: { label: string; value: number }[];
    }>);
  },

  getSettings: () =>
    fetch(`${SUPPORT_BASE}/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ settings: any }>),

  updateSettings: (body: { autoReplyTimeHours?: number; autoCloseInactiveDays?: number; slaResponseTimeHours?: number }) =>
    fetch(`${SUPPORT_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; settings: any }>),

  getChats: () =>
    fetch(`${SUPPORT_BASE}/chats`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ chats: any[]; pagination: any }>),
};

/**
 * Admin Logistics API Service
 */
const LOGISTICS_BASE = `${API_BASE_URL}/admin/logistics`;

export const adminLogisticsAPI = {
  getPartners: (params?: { search?: string }) => {
    const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    return fetch(`${LOGISTICS_BASE}/partners${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ partners: any[] }>);
  },
  createPartner: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/partners`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ partner: any }>),
  updatePartner: (partnerId: string, body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/partners/${partnerId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ partner: any }>),

  getZones: () =>
    fetch(`${LOGISTICS_BASE}/zones`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ zones: any[] }>),
  createZone: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/zones`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ zone: any }>),
  updateZone: (zoneId: string, body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/zones/${zoneId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ zone: any }>),
  deleteZone: (zoneId: string) =>
    fetch(`${LOGISTICS_BASE}/zones/${zoneId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getDrivers: (params?: { search?: string }) => {
    const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    return fetch(`${LOGISTICS_BASE}/drivers${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ drivers: any[] }>);
  },
  createDriver: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/drivers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ driver: any }>),
  updateDriver: (driverId: string, body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/drivers/${driverId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ driver: any }>),

  getWarehouses: () =>
    fetch(`${LOGISTICS_BASE}/warehouses`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ warehouses: any[] }>),
  createWarehouse: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/warehouses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ warehouse: any }>),
  updateWarehouse: (warehouseId: string, body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/warehouses/${warehouseId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ warehouse: any }>),

  getShipments: (params?: { status?: string; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${LOGISTICS_BASE}/shipments${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ shipments: any[] }>);
  },

  getAnalytics: () =>
    fetch(`${LOGISTICS_BASE}/analytics`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      metrics: Record<string, number | string>;
      zoneData: { label: string; value: number }[];
      partnerData: { label: string; value: number }[];
    }>),

  getReturns: (params?: { search?: string }) => {
    const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    return fetch(`${LOGISTICS_BASE}/returns${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ returns: any[] }>);
  },
  createReturn: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/returns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ return: any }>),
  updateReturn: (returnId: string, body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/returns/${returnId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ return: any }>),

  getAutomationSettings: () =>
    fetch(`${LOGISTICS_BASE}/settings/automation`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ settings: any }>),
  updateAutomationSettings: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/settings/automation`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; settings: any }>),

  getRoles: () =>
    fetch(`${LOGISTICS_BASE}/roles`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ roles: any[] }>),
  createRole: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ role: any }>),
  updateRole: (roleId: string, body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/roles/${roleId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ role: any }>),

  getIntegrations: () =>
    fetch(`${LOGISTICS_BASE}/integrations`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ integrations: any[] }>),
  createIntegration: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/integrations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ integration: any }>),
  updateIntegration: (integrationId: string, body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/integrations/${integrationId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ integration: any }>),

  getExceptions: (params?: { type?: string; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.append('type', params.type);
    if (params?.search) sp.append('search', params.search);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${LOGISTICS_BASE}/exceptions${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ exceptions: any[] }>);
  },
  createException: (body: Record<string, unknown>) =>
    fetch(`${LOGISTICS_BASE}/exceptions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ exception: any }>),
  updateExceptionStatus: (exceptionId: string, body: { status: string }) =>
    fetch(`${LOGISTICS_BASE}/exceptions/${exceptionId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ exception: any }>),
};

/**
 * Admin Notifications API Service
 */
const NOTIFICATIONS_BASE = `${API_BASE_URL}/admin/notifications`;

export const adminNotificationsAPI = {
  getDashboard: () =>
    fetch(`${NOTIFICATIONS_BASE}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      stats: Record<string, number | string>;
      recentNotifications: any[];
    }>),

  sendNotification: (body: { targetGroup?: string; types?: string[]; subject?: string; message?: string; recipient?: string }) =>
    fetch(`${NOTIFICATIONS_BASE}/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; logs: any[] }>),

  getTemplates: (params?: { search?: string; category?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.category) sp.append('category', params.category);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${NOTIFICATIONS_BASE}/templates${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ templates: any[] }>);
  },
  createTemplate: (body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ template: any }>),
  updateTemplate: (templateId: string, body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/templates/${templateId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ template: any }>),
  deleteTemplate: (templateId: string) =>
    fetch(`${NOTIFICATIONS_BASE}/templates/${templateId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getScheduled: () =>
    fetch(`${NOTIFICATIONS_BASE}/scheduled`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ scheduled: any[] }>),
  createScheduled: (body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/scheduled`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ scheduled: any }>),
  updateScheduled: (scheduledId: string, body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/scheduled/${scheduledId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ scheduled: any }>),
  deleteScheduled: (scheduledId: string) =>
    fetch(`${NOTIFICATIONS_BASE}/scheduled/${scheduledId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getAnalytics: () =>
    fetch(`${NOTIFICATIONS_BASE}/analytics`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      metrics: Record<string, number>;
      channelData: { label: string; value: number }[];
      geoData: { label: string; value: number }[];
      failedNotifications: { reason: string; count: number }[];
    }>),

  getUserControlSettings: () =>
    fetch(`${NOTIFICATIONS_BASE}/settings/user-control`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      customerSettings: Record<string, boolean>;
      sellerSettings: Record<string, boolean>;
      channelPreferences: Record<string, boolean>;
    }>),
  updateUserControlSettings: (body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/settings/user-control`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string }>),

  getLogs: (params?: { search?: string; status?: string; type?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.status) sp.append('status', params.status);
    if (params?.type) sp.append('type', params.type);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${NOTIFICATIONS_BASE}/logs${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ logs: any[] }>);
  },

  getIntegrationSettings: () =>
    fetch(`${NOTIFICATIONS_BASE}/settings/integrations`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ smtp: any; sms: any; push: any; webhooks: any[] }>),
  updateIntegrationSettings: (body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/settings/integrations`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string }>),

  getAutomationRules: () =>
    fetch(`${NOTIFICATIONS_BASE}/automation-rules`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ rules: any[] }>),
  createAutomationRule: (body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/automation-rules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ rule: any }>),
  updateAutomationRule: (ruleId: string, body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/automation-rules/${ruleId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ rule: any }>),
  deleteAutomationRule: (ruleId: string) =>
    fetch(`${NOTIFICATIONS_BASE}/automation-rules/${ruleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getPermissions: () =>
    fetch(`${NOTIFICATIONS_BASE}/permissions`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ permissions: any[] }>),
  updatePermission: (permissionId: string, body: { allowed: string[] }) =>
    fetch(`${NOTIFICATIONS_BASE}/permissions/${permissionId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ permission: any }>),

  getAlerts: (params?: { search?: string; severity?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.severity) sp.append('severity', params.severity);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${NOTIFICATIONS_BASE}/alerts${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ alerts: any[] }>);
  },
  createAlert: (body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/alerts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ alert: any }>),
  updateAlert: (alertId: string, body: Record<string, unknown>) =>
    fetch(`${NOTIFICATIONS_BASE}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ alert: any }>),
  deleteAlert: (alertId: string) =>
    fetch(`${NOTIFICATIONS_BASE}/alerts/${alertId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),
};

/**
 * Admin Collections API Service
 */
const COLLECTIONS_BASE = `${API_BASE_URL}/admin/collections`;

export const adminCollectionsAPI = {
  getDashboard: () =>
    fetch(`${COLLECTIONS_BASE}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      stats: Record<string, number | string>;
      performance: { date: string; value: number }[];
      mostViewedCollections: { name: string; views: number; products: number }[];
    }>),

  getCollections: (params?: { search?: string; status?: string; type?: string; visibility?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.status) sp.append('status', params.status);
    if (params?.type) sp.append('type', params.type);
    if (params?.visibility) sp.append('visibility', params.visibility);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${COLLECTIONS_BASE}${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ collections: any[]; pagination: { page: number; limit: number; total: number; pages: number } }>);
  },

  getCollection: (collectionId: string) =>
    fetch(`${COLLECTIONS_BASE}/${collectionId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ collection: any }>),

  createCollection: (body: Record<string, unknown>) =>
    fetch(`${COLLECTIONS_BASE}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ collection: any }>),

  updateCollection: (collectionId: string, body: Record<string, unknown>) =>
    fetch(`${COLLECTIONS_BASE}/${collectionId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ collection: any }>),

  deleteCollection: (collectionId: string) =>
    fetch(`${COLLECTIONS_BASE}/${collectionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getCollectionAnalytics: (collectionId: string) =>
    fetch(`${COLLECTIONS_BASE}/${collectionId}/analytics`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      collectionId: string;
      collectionName: string;
      metrics: { totalViews: number; clickThroughRate: number; salesGenerated: number };
      performance: { date: string; value: number }[];
    }>),

  getPermissions: () =>
    fetch(`${COLLECTIONS_BASE}/permissions`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ permissions: any[] }>),
};

/**
 * Admin Products API Service
 */
const ADMIN_PRODUCTS_BASE = `${API_BASE_URL}/admin/products`;

export const adminProductsAPI = {
  getDashboard: () =>
    fetch(`${ADMIN_PRODUCTS_BASE}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      totalProducts: number;
      outOfStock: number;
      published: number;
      draft: number;
      inStock: number;
      lowStock: number;
    }>),

  getProducts: (params?: {
    search?: string;
    category?: string;
    status?: string;
    visibility?: string;
    sellerId?: string;
    minPrice?: number;
    maxPrice?: number;
    minStock?: number;
    maxStock?: number;
    hasDiscount?: 'has' | 'none';
    page?: number;
    limit?: number;
    sortBy?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.category) sp.append('category', params.category);
    if (params?.status) sp.append('status', params.status);
    if (params?.visibility) sp.append('visibility', params.visibility);
    if (params?.sellerId) sp.append('sellerId', params.sellerId);
    if (params?.minPrice != null) sp.append('minPrice', String(params.minPrice));
    if (params?.maxPrice != null) sp.append('maxPrice', String(params.maxPrice));
    if (params?.minStock != null) sp.append('minStock', String(params.minStock));
    if (params?.maxStock != null) sp.append('maxStock', String(params.maxStock));
    if (params?.hasDiscount) sp.append('hasDiscount', params.hasDiscount);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    if (params?.sortBy) sp.append('sortBy', params.sortBy);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${ADMIN_PRODUCTS_BASE}${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ products: any[]; pagination: { page: number; limit: number; total: number; pages: number } }>);
  },

  getProduct: (productId: string) =>
    fetch(`${ADMIN_PRODUCTS_BASE}/${productId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ product: any }>),

  createProduct: (body: Record<string, unknown>) =>
    fetch(`${ADMIN_PRODUCTS_BASE}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ product: any }>),

  updateProduct: (productId: string, body: Record<string, unknown>) =>
    fetch(`${ADMIN_PRODUCTS_BASE}/${productId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ product: any }>),

  deleteProduct: (productId: string) =>
    fetch(`${ADMIN_PRODUCTS_BASE}/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  bulkProducts: (body: { productIds: string[]; action: string; payload?: any }) =>
    fetch(`${ADMIN_PRODUCTS_BASE}/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ message: string; deletedCount?: number; modifiedCount?: number }>),

  getProductAnalytics: (productId: string) =>
    fetch(`${ADMIN_PRODUCTS_BASE}/${productId}/analytics`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ productId: string; productName: string; views: number; metrics: any }>),

  getProductLogs: (productId: string) =>
    fetch(`${ADMIN_PRODUCTS_BASE}/${productId}/logs`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ productId: string; logs: any[] }>),

  getFacets: () =>
    fetch(`${ADMIN_PRODUCTS_BASE}/facets`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ categories: string[]; sellers: { id: string; name: string }[] }>),
};

/**
 * Admin Orders API Service
 */
const ADMIN_ORDERS_BASE = `${API_BASE_URL}/admin/orders`;

export const adminOrdersAPI = {
  getDashboard: () =>
    fetch(`${ADMIN_ORDERS_BASE}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      totalOrdersToday: number;
      pendingOrders: number;
      revenueToday: number;
      cancelledOrders: number;
    }>),

  getFacets: () =>
    fetch(`${ADMIN_ORDERS_BASE}/facets`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ sellers: { id: string; name: string }[]; cities: string[] }>),

  getOrders: (params?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    sellerId?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    cod?: string;
    fulfilled?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.status) sp.append('status', params.status);
    if (params?.paymentStatus) sp.append('paymentStatus', params.paymentStatus);
    if (params?.paymentMethod) sp.append('paymentMethod', params.paymentMethod);
    if (params?.sellerId) sp.append('sellerId', params.sellerId);
    if (params?.city) sp.append('city', params.city);
    if (params?.dateFrom) sp.append('dateFrom', params.dateFrom);
    if (params?.dateTo) sp.append('dateTo', params.dateTo);
    if (params?.minAmount != null) sp.append('minAmount', String(params.minAmount));
    if (params?.maxAmount != null) sp.append('maxAmount', String(params.maxAmount));
    if (params?.cod) sp.append('cod', params.cod);
    if (params?.fulfilled) sp.append('fulfilled', params.fulfilled);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    if (params?.sortBy) sp.append('sortBy', params.sortBy);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${ADMIN_ORDERS_BASE}${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ orders: any[]; pagination: { page: number; limit: number; total: number; pages: number } }>);
  },

  getOrder: (orderId: string) =>
    fetch(`${ADMIN_ORDERS_BASE}/${orderId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ order: any }>),

  updateOrderStatus: (orderId: string, body: { status?: string; trackingNumber?: string }) =>
    fetch(`${ADMIN_ORDERS_BASE}/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ order: any }>),

  getOrderLogs: (orderId: string) =>
    fetch(`${ADMIN_ORDERS_BASE}/${orderId}/logs`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ orderId: string; logs: { id: string; action: string; performedBy: string; date: string; type: string }[] }>),
};

/**
 * Admin Marketing API Service
 */
const MARKETING_BASE = `${API_BASE_URL}/admin/marketing`;

export const adminMarketingAPI = {
  getDashboard: () =>
    fetch(`${MARKETING_BASE}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      metrics: Record<string, number>;
      campaignPerformance: { label: string; value: number }[];
      insights: string[];
    }>),

  getCampaigns: () =>
    fetch(`${MARKETING_BASE}/campaigns`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ campaigns: any[] }>),
  createCampaign: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/campaigns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ campaign: any }>),
  updateCampaign: (campaignId: string, body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ campaign: any }>),
  deleteCampaign: (campaignId: string) =>
    fetch(`${MARKETING_BASE}/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getCoupons: () =>
    fetch(`${MARKETING_BASE}/coupons`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ coupons: any[] }>),
  createCoupon: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/coupons`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ coupon: any }>),
  updateCoupon: (couponId: string, body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/coupons/${couponId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ coupon: any }>),
  deleteCoupon: (couponId: string) =>
    fetch(`${MARKETING_BASE}/coupons/${couponId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getSegments: () =>
    fetch(`${MARKETING_BASE}/segments`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ segments: any[] }>),
  createSegment: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/segments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ segment: any }>),
  updateSegment: (segmentId: string, body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/segments/${segmentId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ segment: any }>),
  deleteSegment: (segmentId: string) =>
    fetch(`${MARKETING_BASE}/segments/${segmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getMessageCampaigns: () =>
    fetch(`${MARKETING_BASE}/message-campaigns`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ campaigns: any[] }>),
  createMessageCampaign: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/message-campaigns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ campaign: any }>),
  updateMessageCampaign: (campaignId: string, body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/message-campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ campaign: any }>),
  deleteMessageCampaign: (campaignId: string) =>
    fetch(`${MARKETING_BASE}/message-campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getAbandonedCarts: () =>
    fetch(`${MARKETING_BASE}/abandoned-carts`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ carts: any[] }>),
  getAbandonedCartSettings: () =>
    fetch(`${MARKETING_BASE}/abandoned-carts/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ autoReminderEnabled: boolean; reminderTiming: string }>),
  updateAbandonedCartSettings: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/abandoned-carts/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ autoReminderEnabled: boolean; reminderTiming: string }>),

  getPromotions: () =>
    fetch(`${MARKETING_BASE}/promotions`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ promotions: any[] }>),
  createPromotion: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/promotions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ promotion: any }>),
  updatePromotion: (promotionId: string, body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/promotions/${promotionId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ promotion: any }>),
  deletePromotion: (promotionId: string) =>
    fetch(`${MARKETING_BASE}/promotions/${promotionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getAdIntegrations: () =>
    fetch(`${MARKETING_BASE}/ad-integrations`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ integrations: any[] }>),
  createAdIntegration: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/ad-integrations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ integration: any }>),
  updateAdIntegration: (integrationId: string, body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/ad-integrations/${integrationId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ integration: any }>),
  deleteAdIntegration: (integrationId: string) =>
    fetch(`${MARKETING_BASE}/ad-integrations/${integrationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getPixels: () =>
    fetch(`${MARKETING_BASE}/pixels`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ pixels: any[] }>),
  createPixel: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/pixels`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ pixel: any }>),
  updatePixel: (pixelId: string, body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/pixels/${pixelId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ pixel: any }>),
  deletePixel: (pixelId: string) =>
    fetch(`${MARKETING_BASE}/pixels/${pixelId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getCreatives: () =>
    fetch(`${MARKETING_BASE}/creatives`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ creatives: any[] }>),
  createCreative: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/creatives`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ creative: any }>),
  updateCreative: (creativeId: string, body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/creatives/${creativeId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ creative: any }>),
  deleteCreative: (creativeId: string) =>
    fetch(`${MARKETING_BASE}/creatives/${creativeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getReferralSettings: () =>
    fetch(`${MARKETING_BASE}/referral/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ rewardType: string; rewardAmount: number; maxReferralsPerUser: number; fraudDetection: boolean }>),
  updateReferralSettings: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/referral/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ rewardType: string; rewardAmount: number; maxReferralsPerUser: number; fraudDetection: boolean }>),
  getReferralStats: () =>
    fetch(`${MARKETING_BASE}/referral/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ totalReferrals: number; activeReferrers: number; rewardsPaid: number }>),

  getAnalytics: () =>
    fetch(`${MARKETING_BASE}/analytics`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      campaignRevenue: number;
      emailOpenRate: number;
      adSpend: number;
      roas: number;
      trafficSources: { label: string; value: number }[];
      campaignRevenueData: { label: string; value: number }[];
    }>),

  getAISettings: () =>
    fetch(`${MARKETING_BASE}/ai-settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ aiEnabled: boolean; features: any[] }>),
  updateAISettings: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/ai-settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ aiEnabled: boolean; features: any[] }>),

  getMarketingSettings: () =>
    fetch(`${MARKETING_BASE}/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ budgetLimit: number; spamProtection: boolean; smtp: any; sms: any; push: any }>),
  updateMarketingSettings: (body: Record<string, unknown>) =>
    fetch(`${MARKETING_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ budgetLimit: number; spamProtection: boolean; smtp: any; sms: any; push: any }>),
};

/**
 * Admin Reviews API Service
 */
const REVIEWS_BASE = `${API_BASE_URL}/admin/reviews`;

export const adminReviewsAPI = {
  getDashboard: () =>
    fetch(`${REVIEWS_BASE}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      stats: Record<string, number>;
      reviewActivity: { label: string; value: number }[];
      mostReviewed: { name: string; reviews: number; rating: number }[];
    }>),

  getReviews: (params?: { status?: string; rating?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.rating) sp.append('rating', params.rating);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${REVIEWS_BASE}/reviews${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ reviews: any[] }>);
  },
  updateReviewStatus: (reviewId: string, status: string) =>
    fetch(`${REVIEWS_BASE}/reviews/${reviewId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ status }),
    }).then(handleResponse<{ review: any }>),

  getModerationQueue: () =>
    fetch(`${REVIEWS_BASE}/moderation/queue`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ reviews: any[] }>),
  getModerationSettings: () =>
    fetch(`${REVIEWS_BASE}/moderation/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ autoModeration: boolean }>),
  updateModerationSettings: (body: { autoModeration?: boolean }) =>
    fetch(`${REVIEWS_BASE}/moderation/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ autoModeration: boolean }>),

  getSuspicious: () =>
    fetch(`${REVIEWS_BASE}/suspicious`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ suspicious: any[] }>),
  removeSuspicious: (id: string) =>
    fetch(`${REVIEWS_BASE}/suspicious/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ message: string }>),

  getSellerRatings: () =>
    fetch(`${REVIEWS_BASE}/seller-ratings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ sellers: any[] }>),

  getSellerResponses: (params?: { status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return fetch(`${REVIEWS_BASE}/seller-responses${q}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ responses: any[] }>);
  },
  updateSellerResponseStatus: (responseId: string, status: string) =>
    fetch(`${REVIEWS_BASE}/seller-responses/${responseId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ status }),
    }).then(handleResponse<{ response: any }>),

  getMedia: () =>
    fetch(`${REVIEWS_BASE}/media`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ media: any[] }>),

  getAnalytics: () =>
    fetch(`${REVIEWS_BASE}/analytics`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{
      highestRated: number;
      lowestRated: number;
      mostReviewedCount: number;
      reviewRatio: number;
      productRatings: { label: string; value: number }[];
      sellerPerformance: { label: string; value: number }[];
    }>),

  getReviewRequestSettings: () =>
    fetch(`${REVIEWS_BASE}/review-requests/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ autoRequestEnabled: boolean; delayDays: number; requestsSent: number; reviewsReceived: number }>),
  updateReviewRequestSettings: (body: Record<string, unknown>) =>
    fetch(`${REVIEWS_BASE}/review-requests/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ autoRequestEnabled: boolean; delayDays: number; requestsSent: number; reviewsReceived: number }>),

  getAISettings: () =>
    fetch(`${REVIEWS_BASE}/ai-settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ aiEnabled: boolean; features: any[] }>),
  updateAISettings: (body: Record<string, unknown>) =>
    fetch(`${REVIEWS_BASE}/ai-settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ aiEnabled: boolean; features: any[] }>),

  getIntegrationSettings: () =>
    fetch(`${REVIEWS_BASE}/integration-settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<{ verifiedPurchaseOnly: boolean; helpfulScoring: boolean; thirdPartyIntegrations: any[] }>),
  updateIntegrationSettings: (body: Record<string, unknown>) =>
    fetch(`${REVIEWS_BASE}/integration-settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<{ verifiedPurchaseOnly: boolean; helpfulScoring: boolean; thirdPartyIntegrations: any[] }>),

  getModuleSettings: () =>
    fetch(`${REVIEWS_BASE}/module-settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }).then(handleResponse<Record<string, unknown>>),
  updateModuleSettings: (body: Record<string, unknown>) =>
    fetch(`${REVIEWS_BASE}/module-settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse<Record<string, unknown>>),
};

