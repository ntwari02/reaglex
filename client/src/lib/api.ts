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
   * Login user
   */
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ user: any; token: string }>(response);
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

