import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Save, Edit, Lock, Shield, Bell, FileText, Building2, Clock, CreditCard, Landmark, Smartphone, Upload, X, Package, CheckCircle, Users, Eye, EyeOff, File, Download, ExternalLink, Trash2, History, TrendingUp, Camera } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { profileAPI } from '@/lib/api';
import imageCompression from 'browser-image-compression';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InputDialog from '@/components/ui/InputDialog';

const ProfilePage: React.FC = () => {
  const { showToast } = useToastStore();
  const API_BASE = 'http://localhost:5000/api/seller/settings';
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'payout' | 'notifications' | 'policies' | 'team'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{
    _id?: string;
    id?: string;
    name: string;
    email: string;
    role: string;
    access: string[];
    status?: 'pending' | 'active' | 'inactive';
  }>>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    _id?: string;
    id?: string;
    name: string;
    email: string;
    role: string;
    access: string[];
  } | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'Sales Rep',
  });
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [isSavingTeamMember, setIsSavingTeamMember] = useState(false);
  const [verificationDocs, setVerificationDocs] = useState<{
    businessLicense?: { url: string; name?: string; preview?: string; type?: string };
    isoCert?: { url: string; name?: string; preview?: string; type?: string };
    auditReport?: { url: string; name?: string; preview?: string; type?: string };
    uploadedAt?: string;
  }>({});
  const [_verificationStatus, setVerificationStatus] = useState<{
    status: 'pending' | 'verified' | 'rejected' | 'under_review';
    rejectionReason?: string;
    verifiedAt?: string;
  }>({ status: 'pending' });
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{ url: string; name: string; type: string } | null>(null);

  const [profile, setProfile] = useState({
    storeName: '',
    storeLogo: '',
    sellerBio: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    workingHours: {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
    },
    storeBanner: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: '',
    },
    location: {
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined,
      address: '',
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD',
    language: 'en',
    status: 'active' as 'active' | 'inactive' | 'maintenance',
    categories: [] as string[],
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    loginHistory: [] as Array<{ date: string; ip: string; location: string; device: string }>,
  });
  const [twoFactorData, setTwoFactorData] = useState({
    qrCode: '',
    secret: '',
    manualEntryKey: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const [payoutSettings, setPayoutSettings] = useState({
    bankAccounts: [] as any[],
    mobileMoney: null as any,
  });
  const [payoutSchedule, setPayoutSchedule] = useState({
    frequency: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    nextPayoutDate: '',
    minimumPayoutAmount: 0,
    autoPayout: true,
  });
  const [payoutHistory] = useState<Array<{
    date: string;
    amount: number;
    status: string;
  }>>([]);
  const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);
  const [mobileMoneyForm, setMobileMoneyForm] = useState({
    provider: '',
    number: '',
    accountHolderName: '',
    country: '',
    currency: 'USD',
    password: '',
  });
  const [isSavingMobileMoney, setIsSavingMobileMoney] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [bankAccountForm, setBankAccountForm] = useState({
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    accountType: 'checking' as 'checking' | 'savings',
    country: '',
    currency: 'USD',
    swiftCode: '',
    iban: '',
    isDefault: false,
    password: '', // For password confirmation
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifyingMethodId, setVerifyingMethodId] = useState<string | null>(null);
  const [verifyingAccount, setVerifyingAccount] = useState<any>(null);
  const [verificationPassword, setVerificationPassword] = useState('');
  const [confirmAccountDetails, setConfirmAccountDetails] = useState(false);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
  });
  const [inputDialog, setInputDialog] = useState<{
    isOpen: boolean;
    title: string;
    label: string;
    placeholder: string;
    onConfirm: (value: string) => void;
    type?: string;
  }>({
    isOpen: false,
    title: '',
    label: '',
    placeholder: '',
    onConfirm: () => {},
    type: 'text',
  });
  const [passwordDialog, setPasswordDialog] = useState<{
    isOpen: boolean;
    onVerified: () => void;
    actionName?: string;
  }>({
    isOpen: false,
    onVerified: () => {},
    actionName: '',
  });

  const [notifications, setNotifications] = useState({
    email: {
      newOrders: true,
      newMessages: true,
      newReviews: true,
      newDisputes: true,
      lowStock: true,
      paymentReceived: true,
      marketing: false,
      securityAlerts: true,
    },
    sms: {
      newOrders: false,
      newDisputes: true,
      paymentReceived: false,
      securityAlerts: true,
    },
    push: {
      enabled: true,
      newOrders: true,
      newMessages: true,
      newReviews: true,
      newDisputes: true,
      lowStock: true,
    },
    frequency: 'instant' as 'instant' | 'daily' | 'weekly',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const [policies, setPolicies] = useState({
    shippingPolicy: 'We offer free shipping on orders over $50. Standard shipping takes 5-7 business days.',
    returnPolicy: 'Items can be returned within 30 days of purchase. Items must be in original condition.',
    refundPolicy: 'Refunds will be processed within 5-7 business days after receiving the returned item.',
    storeTerms: 'By purchasing from our store, you agree to our terms and conditions.',
  });

  const [savingPolicy, setSavingPolicy] = useState<string | null>(null);
  const [savedPolicy, setSavedPolicy] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const [bannerDragOver, setBannerDragOver] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [_hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [_profileCompletion, setProfileCompletion] = useState(0);
  
  // Avatar upload state
  const { user, setUser } = useAuthStore();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Helper to resolve avatar URL (handles both full URLs and relative paths)
  const resolveAvatarUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    // If it's a relative path, prepend the API host
    const API_HOST = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${API_HOST}${url}`;
  };

  // Load seller settings on mount
  useEffect(() => {
    const fetchSellerSettings = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}`, {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load seller settings');
        }

        const data = await response.json();
        const settings = data.settings || {};

        // Update profile state with loaded data
        setProfile((prev) => ({
          ...prev,
          storeName: settings.storeName || '',
          storeLogo: settings.storeLogo ? `http://localhost:5000${settings.storeLogo}` : '',
          sellerBio: settings.storeDescription || '',
          name: '', // This comes from user profile, not seller settings
          email: '', // This comes from user profile, not seller settings
          phone: '', // This comes from user profile, not seller settings
          address: '', // This comes from user profile, not seller settings
          workingHours: settings.workingHours || {
            monday: '',
            tuesday: '',
            wednesday: '',
            thursday: '',
            friday: '',
            saturday: '',
            sunday: '',
          },
          storeBanner: settings.storeBanner ? `http://localhost:5000${settings.storeBanner}` : '',
        }));

        // Load store contact if available
        if (settings.storeContact) {
          setProfile((prev) => ({
            ...prev,
            contactEmail: settings.storeContact?.email || '',
            contactPhone: settings.storeContact?.phone || '',
            website: settings.storeContact?.website || '',
            socialMedia: {
              facebook: settings.storeContact?.socialMedia?.facebook || '',
              twitter: settings.storeContact?.socialMedia?.twitter || '',
              instagram: settings.storeContact?.socialMedia?.instagram || '',
              linkedin: settings.storeContact?.socialMedia?.linkedin || '',
            },
            location: {
              latitude: settings.storeContact?.location?.latitude,
              longitude: settings.storeContact?.location?.longitude,
              address: settings.storeContact?.location?.address || '',
            },
          }));
        }

        // Load store settings if available
        if (settings.storeSettings) {
          setProfile((prev) => ({
            ...prev,
            timezone: settings.storeSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            currency: settings.storeSettings?.currency || 'USD',
            language: settings.storeSettings?.language || 'en',
            status: (settings.storeSettings?.status || 'active') as 'active' | 'inactive' | 'maintenance',
            categories: settings.storeSettings?.categories || [],
          }));
        }

        // Calculate profile completion
        let completed = 0;
        let total = 5;
        if (settings.storeName) completed++;
        if (settings.storeDescription) completed++;
        if (settings.storeLogo) completed++;
        if (settings.storeContact?.email || settings.storeContact?.phone) completed++;
        if (settings.storeContact?.socialMedia && Object.values(settings.storeContact.socialMedia).some((v: any) => v)) completed++;
        setProfileCompletion(Math.round((completed / total) * 100));

        // Load policies if available
        if (settings.policies) {
          setPolicies({
            shippingPolicy: settings.policies.shippingPolicy || '',
            returnPolicy: settings.policies.returnPolicy || '',
            refundPolicy: settings.policies.refundPolicy || '',
            storeTerms: settings.policies.storeTerms || '',
          });
        }

        // Load payout methods
        if (settings.payoutMethods && settings.payoutMethods.length > 0) {
          const bankAccounts = settings.payoutMethods
            .filter((method: any) => method.method === 'bank_transfer')
            .map((method: any) => ({
              id: method._id || method.id,
              bankName: method.bankName || '',
              accountNumber: method.accountNumber || '',
              routingNumber: method.routingNumber || '',
              accountHolderName: method.accountHolderName || '',
              accountType: method.accountType || 'checking',
              country: method.country || '',
              currency: method.currency || 'USD',
              verificationStatus: method.verificationStatus || 'pending',
              verificationCode: method.verificationCode || '', // Include for testing
              isDefault: method.isDefault || false,
            }));
          
          const mobileMoney = settings.payoutMethods.find((method: any) => method.method === 'mobile_money');
          setPayoutSettings({ 
            bankAccounts, 
            mobileMoney: mobileMoney ? {
              id: mobileMoney._id || mobileMoney.id,
              mobileMoneyProvider: mobileMoney.mobileMoneyProvider || '',
              mobileMoneyNumber: mobileMoney.mobileMoneyNumber || '',
              accountHolderName: mobileMoney.accountHolderName || '',
              country: mobileMoney.country || '',
              currency: mobileMoney.currency || 'USD',
              verificationStatus: mobileMoney.verificationStatus || 'pending',
            } : null 
          });
        }

        // Also fetch mobile money separately to ensure we have the latest data
        try {
          const mobileMoneyResponse = await fetch(`${API_BASE}/mobile-money`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: 'include',
          });
          if (mobileMoneyResponse.ok) {
            const mobileMoneyData = await mobileMoneyResponse.json();
            if (mobileMoneyData.mobileMoney) {
              setPayoutSettings(prev => ({
                ...prev,
                mobileMoney: mobileMoneyData.mobileMoney,
              }));
            }
          }
        } catch (error) {
          console.error('Failed to load mobile money:', error);
        }

        // Load team members
        try {
          const teamResponse = await fetch(`${API_BASE}/team`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: 'include',
          });
          if (teamResponse.ok) {
            const teamData = await teamResponse.json();
            setTeamMembers(teamData.teamMembers || []);
          }
        } catch (error) {
          console.error('Failed to load team members:', error);
        }

        // Load available permissions
        try {
          const permissionsResponse = await fetch(`${API_BASE}/team/permissions`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: 'include',
          });
          if (permissionsResponse.ok) {
            const permissionsData = await permissionsResponse.json();
            setAvailablePermissions(permissionsData.permissions || []);
          }
        } catch (error) {
          console.error('Failed to load permissions:', error);
        }
      } catch (error: any) {
        console.error('Failed to load seller settings:', error);
        showToast('Failed to load seller settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSellerSettings();
    
    // Load avatar from user profile
    if (user?.avatar_url) {
      setAvatarPreview(resolveAvatarUrl(user.avatar_url));
    }
    
    // Fetch 2FA status
    const fetch2FAStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:5000/api/profile/me/2fa/status', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setSecurity(prev => ({
            ...prev,
            twoFactorEnabled: data.twoFactorEnabled || false,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch 2FA status:', error);
      }
    };
    
    fetch2FAStatus();
    
    // Fetch login history
    const fetchLoginHistory = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:5000/api/profile/me/login-history', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const formattedHistory = (data.loginHistory || []).map((entry: any) => ({
            date: new Date(entry.date).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            ip: entry.ip,
            location: entry.location || 'Unknown',
            device: entry.device || 'Unknown',
          }));
          setSecurity(prev => ({
            ...prev,
            loginHistory: formattedHistory,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch login history:', error);
      }
    };
    
    fetchLoginHistory();

    // Fetch verification documents
    const fetchVerificationDocuments = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE}/verification-documents`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.verificationDocuments) {
            const docs: any = {};
            const baseUrl = 'http://localhost:5000';
            
            if (data.verificationDocuments.businessLicense) {
              const url = data.verificationDocuments.businessLicense.startsWith('http') 
                ? data.verificationDocuments.businessLicense 
                : `${baseUrl}${data.verificationDocuments.businessLicense}`;
              const isImage = !url.toLowerCase().endsWith('.pdf');
              docs.businessLicense = {
                url,
                name: url.split('/').pop() || 'Business License',
                preview: isImage ? url : undefined,
                type: isImage ? 'image' : 'pdf',
              };
            }
            if (data.verificationDocuments.isoCert) {
              const url = data.verificationDocuments.isoCert.startsWith('http') 
                ? data.verificationDocuments.isoCert 
                : `${baseUrl}${data.verificationDocuments.isoCert}`;
              const isImage = !url.toLowerCase().endsWith('.pdf');
              docs.isoCert = {
                url,
                name: url.split('/').pop() || 'ISO Certification',
                preview: isImage ? url : undefined,
                type: isImage ? 'image' : 'pdf',
              };
            }
            if (data.verificationDocuments.auditReport) {
              const url = data.verificationDocuments.auditReport.startsWith('http') 
                ? data.verificationDocuments.auditReport 
                : `${baseUrl}${data.verificationDocuments.auditReport}`;
              const isImage = !url.toLowerCase().endsWith('.pdf');
              docs.auditReport = {
                url,
                name: url.split('/').pop() || 'Audit Report',
                preview: isImage ? url : undefined,
                type: isImage ? 'image' : 'pdf',
              };
            }
            if (data.verificationDocuments.uploadedAt) {
              docs.uploadedAt = data.verificationDocuments.uploadedAt;
            }
            setVerificationDocs(docs);
          }
          if (data.verificationStatus) {
            setVerificationStatus(data.verificationStatus);
          }
        }
      } catch (error) {
        console.error('Failed to fetch verification documents:', error);
      }
    };

    fetchVerificationDocuments();

    // Fetch notification preferences
    const fetchNotificationPreferences = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE}/notification-preferences`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.notificationPreferences) {
            setNotifications((prev) => ({
              ...prev,
              ...data.notificationPreferences,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch notification preferences:', error);
      }
    };

    fetchNotificationPreferences();
  }, [API_BASE, showToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/store`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          storeName: profile.storeName,
          storeDescription: profile.sellerBio,
          workingHours: profile.workingHours,
          // Note: storeLogo and storeBanner are updated separately via image upload endpoints
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save store information');
      }

      await response.json();
      
      // Save store contact
      try {
        const contactResponse = await fetch(`${API_BASE}/store-contact`, {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            email: profile.contactEmail,
            phone: profile.contactPhone,
            website: profile.website,
            socialMedia: profile.socialMedia,
            location: profile.location,
          }),
        });
        if (!contactResponse.ok) {
          console.error('Failed to save store contact');
        }
      } catch (error) {
        console.error('Failed to save store contact:', error);
      }

      // Save store settings
      try {
        const settingsResponse = await fetch(`${API_BASE}/store-settings`, {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            timezone: profile.timezone,
            currency: profile.currency,
            language: profile.language,
            status: profile.status,
            categories: profile.categories,
          }),
        });
        if (!settingsResponse.ok) {
          console.error('Failed to save store settings');
        }
      } catch (error) {
        console.error('Failed to save store settings:', error);
      }

      showToast('Store information saved successfully', 'success');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to save store information:', error);
      showToast(error.message || 'Failed to save store information', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePolicy = async (policyKey: string) => {
    setSavingPolicy(policyKey);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/policies`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          [policyKey]: policies[policyKey as keyof typeof policies],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save policy');
      }

      setSavedPolicy(policyKey);
      setTimeout(() => setSavedPolicy(null), 3000);
      showToast(`${policyKey} saved successfully`, 'success');
    } catch (error: any) {
      console.error('Failed to save policy:', error);
      showToast(error.message || 'Failed to save policy', 'error');
    } finally {
      setSavingPolicy(null);
    }
  };

  const handlePolicyChange = (policyKey: string, value: string) => {
    setPolicies(prev => ({
      ...prev,
      [policyKey]: value,
    }));
  };

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size must be less than 10MB', 'error');
      return;
    }

    // Store the file for later upload
    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload avatar when save is clicked
  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setIsUploadingAvatar(true);
    try {
      // Compress the image before uploading
      const compressionOptions = {
        maxSizeMB: 0.5, // 500KB max for avatar (smaller than logo/banner)
        maxWidthOrHeight: 512, // 512px max dimension for avatar (square)
        useWebWorker: true,
        fileType: avatarFile.type,
        initialQuality: 0.85, // 85% quality for good balance
      };

      const compressedFile = await imageCompression(avatarFile, compressionOptions);
      
      // Create a new File with the original name and type for backend validation
      // File properties are read-only, so we need to create a new File object
      let fileToUpload: File;
      
      // Always create a new File to ensure correct name and type for backend validation
      try {
        // Read the compressed file as an ArrayBuffer
        const arrayBuffer = await compressedFile.arrayBuffer();
        
        // Create a new File with the correct name and type
        // File constructor is supported in all modern browsers
        fileToUpload = new File(
          [arrayBuffer],
          avatarFile.name,
          {
            type: avatarFile.type,
            lastModified: Date.now(),
          }
        );
      } catch (error) {
        // Fallback: if File constructor fails, use the compressed file as-is
        // The backend should still accept it if the MIME type is correct
        console.warn('Failed to create new File object, using compressed file as-is:', error);
        fileToUpload = compressedFile;
      }
      
      // Log compression results for debugging
      const originalSize = (avatarFile.size / 1024 / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      const compressionRatio = ((1 - compressedFile.size / avatarFile.size) * 100).toFixed(1);
      console.log(`Avatar compressed: ${originalSize}MB → ${compressedSize}MB (${compressionRatio}% reduction)`);
      
      // If file is still too large after compression, show warning
      if (compressedFile.size > 2 * 1024 * 1024) {
        showToast('Image is still large after compression. Please try a smaller image.', 'warning');
      }

      const uploadResponse = await profileAPI.uploadAvatar(fileToUpload);
      const uploadedAvatarUrl = uploadResponse.avatarUrl;
      setAvatarFile(null); // Clear the file after successful upload
      
      // Update preview with the uploaded URL
      setAvatarPreview(resolveAvatarUrl(uploadedAvatarUrl));

      // Refresh user data from backend to ensure we have the latest avatar URL
      try {
        const { authAPI } = await import('@/lib/api');
        const currentUserData = await authAPI.getCurrentUser();
        
        // Map backend user to Profile format
        const updatedUserProfile = {
          id: currentUserData.user._id?.toString() || currentUserData.user.id?.toString() || user?.id || '',
          email: currentUserData.user.email || user?.email || '',
          full_name: currentUserData.user.fullName || user?.full_name || '',
          role: currentUserData.user.role || user?.role || 'seller',
          seller_status: currentUserData.user.sellerVerificationStatus || user?.seller_status,
          seller_verified: currentUserData.user.isSellerVerified || user?.seller_verified || false,
          phone: currentUserData.user.phone || user?.phone,
          avatar_url: currentUserData.user.avatarUrl || uploadedAvatarUrl, // Use backend value or fallback to uploaded URL
          created_at: currentUserData.user.createdAt || user?.created_at || new Date().toISOString(),
          updated_at: currentUserData.user.updatedAt || new Date().toISOString(),
        };
        
        // Update Zustand store
        setUser(updatedUserProfile);
        localStorage.setItem('user', JSON.stringify(updatedUserProfile));

        // Trigger avatar update event immediately to force header re-render
        window.dispatchEvent(new CustomEvent('avatarUpdated', {
          detail: { avatarUrl: updatedUserProfile.avatar_url }
        }));
      } catch (refreshError) {
        // If refresh fails, still update with the uploaded URL
        console.warn('Failed to refresh user data, using uploaded URL:', refreshError);
        if (user) {
          const updatedUser = {
            ...user,
            avatar_url: uploadedAvatarUrl,
            updated_at: new Date().toISOString(),
          };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          window.dispatchEvent(new CustomEvent('avatarUpdated', {
            detail: { avatarUrl: uploadedAvatarUrl }
          }));
        }
      }

      showToast('Profile picture updated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      showToast(error.message || 'Failed to upload profile picture', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleImageUpload = async (file: File, key: 'storeLogo' | 'storeBanner') => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    try {
      // Compression options based on image type
      const options = {
        maxSizeMB: key === 'storeLogo' ? 1 : 2, // Logo: 1MB, Banner: 2MB
        maxWidthOrHeight: key === 'storeLogo' ? 800 : 1920, // Logo: 800px, Banner: 1920px
        useWebWorker: true,
        fileType: file.type,
        initialQuality: 0.85, // 85% quality for good balance
      };

      // Compress the image
      const compressedFile = await imageCompression(file, options);
      
      // Log compression results for debugging
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
      console.log(`Image compressed: ${originalSize}MB → ${compressedSize}MB (${compressionRatio}% reduction)`);
      
      // If file is still too large after compression, show warning
      if (compressedFile.size > 10 * 1024 * 1024) {
        showToast('Image is still large after compression. Please try a smaller image.', 'warning');
      }

      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append(key === 'storeLogo' ? 'logo' : 'banner', compressedFile, compressedFile.name);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const endpoint = key === 'storeLogo' ? `${API_BASE}/store/logo` : `${API_BASE}/store/banner`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = key === 'storeLogo' ? data.logoUrl : data.bannerUrl;
      
      // Update profile with the full URL
      setProfile(prev => ({
        ...prev,
        [key]: `http://localhost:5000${imageUrl}`,
      }));

      showToast(`${key === 'storeLogo' ? 'Logo' : 'Banner'} uploaded successfully`, 'success');
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      showToast(error.message || 'Failed to upload image', 'error');
    }
  };

  const handleVerificationDocUpload = async (file: File, docType: 'businessLicense' | 'isoCert' | 'auditReport') => {
    if (!file) {
      showToast('Please select a file', 'error');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Only PDF and image files are allowed', 'error');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be less than 10MB', 'error');
      return;
    }

    setUploadingDoc(docType);
    
    try {
      // Generate preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('document', file);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/verification-documents/${docType}`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }

      const data = await response.json();
      const baseUrl = 'http://localhost:5000';
      const fileUrl = data.documentUrl.startsWith('http') 
        ? data.documentUrl 
        : `${baseUrl}${data.documentUrl}`;

      // Update verification docs with the uploaded file
      setVerificationDocs((prev) => ({
        ...prev,
        [docType]: {
          url: fileUrl,
          name: file.name,
          preview: preview,
          type: file.type === 'application/pdf' ? 'pdf' : 'image',
        },
        uploadedAt: data.verificationDocuments?.uploadedAt || new Date().toISOString(),
      }));

      if (data.verificationStatus) {
        setVerificationStatus(data.verificationStatus);
      }

      showToast('Document uploaded successfully', 'success');
    } catch (error: any) {
      console.error('Failed to upload verification document:', error);
      showToast(error.message || 'Failed to upload document', 'error');
    } finally {
      setUploadingDoc(null);
    }
  };


  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/profile/me/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid password');
      }

      return true;
    } catch (error: any) {
      console.error('Password verification failed:', error);
      showToast(error.message || 'Password verification failed', 'error');
      return false;
    }
  };

  const handleRemoveVerificationDoc = (docType: 'businessLicense' | 'isoCert' | 'auditReport') => {
    const docName = docType === 'businessLicense' ? 'Business License' : docType === 'isoCert' ? 'ISO Certification' : 'Audit Report';
    
    // First, require password confirmation
    setPasswordDialog({
      isOpen: true,
      actionName: `remove ${docName}`,
      onVerified: () => {
        // After password is verified, show confirmation dialog
        setConfirmDialog({
          isOpen: true,
          title: 'Remove Verification Document',
          message: `Are you sure you want to remove this ${docName}? This action cannot be undone.`,
          variant: 'danger',
          onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          // Prepare update data - set the specific document to null
          const updateData: any = {};
          updateData[docType] = null;

          const response = await fetch(`${API_BASE}/verification-documents`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updateData),
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to remove document');
          }

          // Update local state to remove the document
          setVerificationDocs((prev) => {
            const updated = { ...prev };
            delete updated[docType];
            return updated;
          });

            showToast('Document removed successfully', 'success');
          } catch (error: any) {
            console.error('Failed to remove verification document:', error);
            showToast(error.message || 'Failed to remove document', 'error');
          }
        },
      });
    },
  });
};

  return (
    <React.Fragment>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
            <div className="space-y-4 sm:space-y-6">
      {/* Header with Seller Profile */}
      <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Store Logo */}
          {profile.storeLogo && (
            <div className="flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img 
                  src={profile.storeLogo} 
                  alt={profile.storeName || 'Store logo'} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          
          {/* Store Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
                  {profile.storeName ? (
                    <>
                      <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0" />
                      <span className="truncate">{profile.storeName}</span>
                    </>
                  ) : (
                    <>
                      <User className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0" />
                      <span>Profile & Settings</span>
                    </>
                  )}
                </h1>
                {profile.storeName ? (
                  <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300 line-clamp-2">
                    {profile.sellerBio || 'Manage your store settings and preferences'}
                  </p>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
                    Manage your account settings and preferences
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700/30 overflow-x-auto pb-0 scrollbar-hide -mx-2 sm:mx-0 px-2 sm:px-0">
        {[
          { id: 'profile', label: 'Profile', icon: User, fullLabel: 'Profile Settings' },
          { id: 'security', label: 'Security', icon: Shield, fullLabel: 'Security' },
          { id: 'payout', label: 'Payout', icon: CreditCard, fullLabel: 'Payout Settings' },
          { id: 'notifications', label: 'Notifications', icon: Bell, fullLabel: 'Notifications' },
          { id: 'policies', label: 'Policies', icon: FileText, fullLabel: 'Policy Pages' },
          { id: 'team', label: 'Team', icon: Users, fullLabel: 'Team & Permissions' },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium transition-colors duration-300 border-b-2 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 min-w-fit ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-500 dark:text-red-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={tab.fullLabel}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.fullLabel}</span>
              <span className="sm:hidden">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Settings Tab */}
      {activeTab === 'profile' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {isLoading && (
            <div className="col-span-full flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"
              />
            </div>
          )}
          {!isLoading && (
            <>
            <div className="lg:col-span-2 space-y-6">
            {/* Profile Picture */}
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300 flex items-center gap-2">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
                  <span>Profile Picture</span>
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                {/* Avatar Display */}
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={user?.full_name || user?.email || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-400 to-orange-500">
                        <User className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                      </div>
                    )}
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
                      />
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Profile Picture
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                          <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {avatarFile ? 'Change Picture' : 'Choose Picture'}
                          </span>
                        </div>
                      </label>
                      {avatarFile && (
                        <Button
                          onClick={handleAvatarUpload}
                          disabled={isUploadingAvatar}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          {isUploadingAvatar ? 'Uploading...' : 'Upload'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Recommended: Square image, max 10MB. JPG, PNG, or GIF.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Information */}
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300 flex items-center gap-2">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
                  <span>Store Information</span>
                </h2>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-700 w-full sm:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Store Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Store Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.storeName}
                      onChange={(e) => { setProfile({ ...profile, storeName: e.target.value }); setHasUnsavedChanges(true); }}
                      className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-300"
                      placeholder="Enter your store name"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium transition-colors duration-300">{profile.storeName}</p>
                  )}
                </div>

                {/* Store Images Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Store Logo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 transition-colors duration-300">
                      Store Logo
                    </label>
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all duration-200 group
                          ${logoDragOver ? 'border-red-400 bg-red-50 dark:bg-red-900/20 scale-105' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-red-300 dark:hover:border-red-500'}
                          ${!isEditing ? 'opacity-70 cursor-default' : ''}`}
                        onClick={() => {
                          if (!isEditing) return;
                          logoInputRef.current?.click();
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!isEditing) return;
                          setLogoDragOver(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setLogoDragOver(false);
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setLogoDragOver(false);
                          if (!isEditing) return;
                          const file = e.dataTransfer.files?.[0];
                          if (file) await handleImageUpload(file, 'storeLogo');
                        }}
                      >
                        {profile.storeLogo ? (
                          <img src={profile.storeLogo} alt="Store logo" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className={`w-8 h-8 ${isEditing ? 'text-gray-400 group-hover:text-red-400' : 'text-gray-400'}`} />
                            {isEditing && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">Click or drag</span>
                            )}
                          </div>
                        )}
                      </div>
                      {isEditing && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Recommended: 400x400px
                        </p>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleImageUpload(file, 'storeLogo');
                        // Reset input so same file can be selected again
                        if (logoInputRef.current) {
                          logoInputRef.current.value = '';
                        }
                      }}
                    />
                  </div>

                  {/* Store Banner */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 transition-colors duration-300">
                      Store Banner
                    </label>
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`w-full h-40 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all duration-200 group
                          ${bannerDragOver ? 'border-red-400 bg-red-50 dark:bg-red-900/20 scale-[1.02]' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-red-300 dark:hover:border-red-500'}
                          ${!isEditing ? 'opacity-70 cursor-default' : ''}`}
                        onClick={() => {
                          if (!isEditing) return;
                          bannerInputRef.current?.click();
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!isEditing) return;
                          setBannerDragOver(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setBannerDragOver(false);
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setBannerDragOver(false);
                          if (!isEditing) return;
                          const file = e.dataTransfer.files?.[0];
                          if (file) await handleImageUpload(file, 'storeBanner');
                        }}
                      >
                        {profile.storeBanner ? (
                          <img src={profile.storeBanner} alt="Store banner" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className={`w-10 h-10 ${isEditing ? 'text-gray-400 group-hover:text-red-400' : 'text-gray-400'}`} />
                            {isEditing && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">Click or drag to upload</span>
                            )}
                          </div>
                        )}
                      </div>
                      {isEditing && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Recommended: 1200x300px
                        </p>
                      )}
                    </div>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleImageUpload(file, 'storeBanner');
                        // Reset input so same file can be selected again
                        if (bannerInputRef.current) {
                          bannerInputRef.current.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700/30"></div>

                {/* Store Description/Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Store Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profile.sellerBio}
                      onChange={(e) => setProfile({ ...profile, sellerBio: e.target.value })}
                      rows={4}
                      className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-300 resize-none"
                      placeholder="Describe your store, products, and what makes you unique..."
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white leading-relaxed transition-colors duration-300 whitespace-pre-wrap">
                      {profile.sellerBio || <span className="text-gray-400 italic">No description provided</span>}
                    </p>
                  )}
                  {isEditing && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      Help customers understand your store and what you offer
                    </p>
                  )}
                </div>

                {/* Action Buttons (when editing) */}
                {isEditing && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700/30">
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="border-gray-300 dark:border-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2 transition-colors duration-300">
                    <User className="w-4 h-4" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-300"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white transition-colors duration-300">{profile.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2 transition-colors duration-300">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-300"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white transition-colors duration-300">{profile.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2 transition-colors duration-300">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-300"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white transition-colors duration-300">{profile.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2 transition-colors duration-300">
                    <MapPin className="w-4 h-4" />
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-300"
                      rows={2}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white transition-colors duration-300">{profile.address}</p>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

            <div className="space-y-4 sm:space-y-6">
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">Account Status</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-300">Subscription</p>
                  <p className="text-gray-900 dark:text-white font-semibold transition-colors duration-300">Premium Tier</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-300">Member Since</p>
                  <p className="text-gray-900 dark:text-white font-semibold transition-colors duration-300">Jan 2024</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-300">Total Sales</p>
                  <p className="text-green-500 dark:text-green-400 font-semibold transition-colors duration-300">$125,430</p>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300 flex items-center gap-2">
                <Clock className="w-6 h-6 text-red-400" />
                Working Hours
              </h2>
              <div className="space-y-3">
                {Object.entries(profile.workingHours).map(([day, hours]) => (
                  <div key={day} className={`flex items-center justify-between p-3 rounded-lg ${
                    day === 'sunday' ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800/30'
                  }`}>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize transition-colors duration-300">{day}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={hours}
                        onChange={(e) => setProfile({
                          ...profile,
                          workingHours: { ...profile.workingHours, [day]: e.target.value }
                        })}
                        className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">{hours}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Store Contact & Settings */}
            {isEditing && (
              <>
                <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300 flex items-center gap-2">
                    <Mail className="w-6 h-6 text-red-400" />
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={profile.contactEmail}
                        onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="contact@yourstore.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={profile.contactPhone}
                        onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="https://yourstore.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300 flex items-center gap-2">
                    <Users className="w-6 h-6 text-red-400" />
                    Social Media
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <span className="text-blue-600">f</span> Facebook
                      </label>
                      <input
                        type="url"
                        value={profile.socialMedia.facebook}
                        onChange={(e) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, facebook: e.target.value } })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <span className="text-blue-400">@</span> Twitter/X
                      </label>
                      <input
                        type="url"
                        value={profile.socialMedia.twitter}
                        onChange={(e) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, twitter: e.target.value } })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="https://twitter.com/yourhandle"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <span className="text-pink-500">📷</span> Instagram
                      </label>
                      <input
                        type="url"
                        value={profile.socialMedia.instagram}
                        onChange={(e) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, instagram: e.target.value } })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <span className="text-blue-700">in</span> LinkedIn
                      </label>
                      <input
                        type="url"
                        value={profile.socialMedia.linkedin}
                        onChange={(e) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, linkedin: e.target.value } })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="https://linkedin.com/company/yourcompany"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-red-400" />
                    Store Settings
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="Africa/Lagos">Lagos (WAT)</option>
                        <option value="Africa/Nairobi">Nairobi (EAT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Currency
                      </label>
                      <select
                        value={profile.currency}
                        onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="RWF">RWF - Rwandan Franc</option>
                        <option value="KES">KES - Kenyan Shilling</option>
                        <option value="UGX">UGX - Ugandan Shilling</option>
                        <option value="TZS">TZS - Tanzanian Shilling</option>
                        <option value="CNY">CNY - Chinese Yuan</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={profile.language}
                        onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                        <option value="es">Español</option>
                        <option value="zh">中文</option>
                        <option value="ar">العربية</option>
                        <option value="sw">Kiswahili</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Store Status
                      </label>
                      <select
                        value={profile.status}
                        onChange={(e) => setProfile({ ...profile, status: e.target.value as 'active' | 'inactive' | 'maintenance' })}
                        className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance Mode</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
            </>
          )}
        </div>

        {/* Verification Documents - Full Width */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 transition-colors duration-300">
            <FileText className="w-6 h-6 text-red-400" />
            Verification Documents
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-300">
            Upload official documents to strengthen your B2B profile. These are only visible to the platform
            and used for verification and compliance checks.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                key: 'businessLicense',
                label: 'Business License',
                helper: 'Trade / commercial registration document.',
              },
              {
                key: 'isoCert',
                label: 'ISO Certification',
                helper: 'e.g., ISO 9001, ISO 27001 certificates.',
              },
              {
                key: 'auditReport',
                label: 'Audit Report',
                helper: 'Recent financial or process audit summary.',
              },
            ].map(({ key, label, helper }) => {
              const docKey = key as 'businessLicense' | 'isoCert' | 'auditReport';
              const doc = verificationDocs[docKey];
              const isUploading = uploadingDoc === docKey;
              
              return (
                <div
                  key={key}
                  className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1 transition-colors duration-300">
                    {label}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300">
                    {helper}
                  </p>
                  
                  {/* Preview Section */}
                  {doc && (
                    <div className="mb-3 p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      {doc.type === 'image' && doc.url && (
                        <div className="relative group">
                          <img
                            src={doc.preview || doc.url}
                            alt={label}
                            className="w-full h-32 object-contain rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                            onError={(e) => {
                              // Fallback if preview fails
                              const target = e.target as HTMLImageElement;
                              if (target.src !== doc.url) {
                                target.src = doc.url;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => setPreviewModal({ url: doc.url, name: doc.name || label, type: doc.type || 'image' })}
                              className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                              title="View full size"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            </button>
                          </div>
                        </div>
                      )}
                      {doc.type === 'pdf' && (
                        <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <div className="text-center">
                            <File className="w-12 h-12 text-red-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                              {doc.name || 'PDF Document'}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate flex-1">
                          {doc.name || 'Document'}
                        </p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => window.open(doc.url, '_blank')}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="View document"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                          </button>
                          <a
                            href={doc.url}
                            download
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Download document"
                          >
                            <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                          </a>
                          <button
                            onClick={() => handleRemoveVerificationDoc(docKey)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove document"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  <label className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUploading ? (
                      <>
                        <div className="w-3 h-3 mr-2 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-2" />
                        {doc ? 'Replace file' : 'Upload file'}
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleVerificationDocUpload(file, docKey);
                        }
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}

      {/* Security Settings Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-300 flex items-center gap-2">
              <Lock className="w-6 h-6 text-red-400" />
              Change Password
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (passwordData.newPassword !== passwordData.confirmPassword) {
                  showToast('New passwords do not match', 'error');
                  return;
                }
                if (passwordData.newPassword.length < 8) {
                  showToast('New password must be at least 8 characters', 'error');
                  return;
                }
                setIsChangingPassword(true);
                try {
                  const token = localStorage.getItem('auth_token');
                  const response = await fetch('http://localhost:5000/api/profile/me/change-password', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token && { Authorization: `Bearer ${token}` }),
                    },
                    body: JSON.stringify({
                      currentPassword: passwordData.currentPassword,
                      newPassword: passwordData.newPassword,
                    }),
                    credentials: 'include',
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to change password');
                  }

                  showToast('Password changed successfully', 'success');
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                } catch (error: any) {
                  console.error('Failed to change password:', error);
                  showToast(error.message || 'Failed to change password', 'error');
                } finally {
                  setIsChangingPassword(false);
                }
              }}
              className="space-y-4 max-w-md"
            >
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    autoComplete="current-password"
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {passwordData.newPassword && (
                  <PasswordStrengthIndicator password={passwordData.newPassword} />
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
            </div>

            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-red-400" />
                    Two-Factor Authentication
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    security.twoFactorEnabled 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <Button 
                    variant="outline"
                    onClick={() => setShow2FAModal(true)}
                    className="border-gray-300 dark:border-gray-700"
                  >
                    {security.twoFactorEnabled ? 'Disable' : 'Enable'} 2FA
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-400" />
                Login History
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {security.loginHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No login history available</p>
                    <p className="text-xs mt-1">Your login history will appear here after you log in</p>
                  </div>
                ) : (
                  security.loginHistory.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">{entry.date}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{entry.device}</p>
                          <span className="text-gray-400">•</span>
                          <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{entry.location}</p>
                          <span className="text-gray-400">•</span>
                          <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{entry.ip}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Settings Tab */}
      {activeTab === 'payout' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Main Payout Settings */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300 flex items-center gap-2">
                <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
                <span>Bank Account Details</span>
              </h2>
              <div className="relative group w-full sm:w-auto">
                <Button 
                  className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                  onClick={() => setShowAddBank(true)}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Add Bank Account</span>
                    <span className="sm:hidden">Add Account</span>
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></span>
                </Button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                  <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                      <CreditCard className="w-3 h-3 text-red-400" />
                      <span>Add a new bank account to receive payments</span>
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                      <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {payoutSettings.bankAccounts.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
                  <Landmark className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base">No bank accounts added yet</p>
                </div>
              ) : (
                payoutSettings.bankAccounts.map((account) => (
                  <div key={account.id} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <Landmark className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-1">
                            <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white transition-colors duration-300 truncate">{account.bankName}</p>
                            {account.isDefault && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-xs font-semibold whitespace-nowrap">
                                Default
                              </span>
                            )}
                            {account.verificationStatus === 'verified' && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
                                <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                Verified
                              </span>
                            )}
                            {account.verificationStatus === 'pending' && (
                              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded text-xs font-semibold whitespace-nowrap">
                                Pending Verification
                              </span>
                            )}
                            {account.verificationStatus === 'failed' && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs font-semibold whitespace-nowrap">
                                Verification Failed
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 sm:space-y-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                                <span className="font-medium">Account:</span> <span className="break-all sm:break-normal">{account.accountNumber}</span>
                              </p>
                              <span className="hidden sm:inline mx-1 text-gray-400">•</span>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300 sm:ml-0">
                                <span className="font-medium">Routing:</span> <span className="break-all sm:break-normal">{account.routingNumber}</span>
                              </p>
                            </div>
                            {account.accountHolderName && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                <span className="font-medium">Holder:</span> {account.accountHolderName}
                              </p>
                            )}
                            {account.accountType && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                <span className="font-medium">Type:</span> {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)} • {account.currency || 'USD'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col sm:items-end gap-2 sm:gap-2 flex-shrink-0">
                        {account.verificationStatus === 'pending' && (
                          <div className="relative group">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVerifyingMethodId(account.id);
                                setVerifyingAccount(account);
                                setVerificationPassword('');
                                setConfirmAccountDetails(false);
                                setShowVerificationModal(true);
                              }}
                              className="text-xs sm:text-xs bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 font-semibold hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/30 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none relative overflow-hidden whitespace-nowrap"
                            >
                              <span className="relative z-10 flex items-center gap-1 sm:gap-1.5">
                                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                <span className="hidden sm:inline">Verify Account</span>
                                <span className="sm:hidden">Verify</span>
                              </span>
                              <span className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-ping opacity-75"></span>
                            </Button>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                              <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                                  <Shield className="w-3 h-3 text-yellow-400" />
                                  <span>Click to verify your bank account</span>
                                </div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                                  <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => {
                            // First, require password confirmation
                            setPasswordDialog({
                              isOpen: true,
                              actionName: 'delete this bank account',
                              onVerified: () => {
                                // After password is verified, show confirmation dialog
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'Delete Bank Account',
                                  message: 'Are you sure you want to delete this bank account? This action cannot be undone.',
                                  variant: 'danger',
                                  onConfirm: async () => {
                                    try {
                                      const token = localStorage.getItem('auth_token');
                                      const response = await fetch(`${API_BASE}/payout-methods/${account.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          ...(token && { Authorization: `Bearer ${token}` }),
                                        },
                                        body: JSON.stringify({ password: '' }), // Password already verified via endpoint
                                        credentials: 'include',
                                      });

                                      if (!response.ok) {
                                        const errorData = await response.json();
                                        throw new Error(errorData.message || 'Failed to delete bank account');
                                      }

                                      showToast('Bank account deleted successfully', 'success');

                                      // Reload payout methods
                                      const settingsResponse = await fetch(`${API_BASE}`, {
                                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                                        credentials: 'include',
                                      });
                                      if (settingsResponse.ok) {
                                        const data = await settingsResponse.json();
                                        const settings = data.settings || {};
                                        if (settings.payoutMethods && settings.payoutMethods.length > 0) {
                                          const bankAccounts = settings.payoutMethods
                                            .filter((method: any) => method.method === 'bank_transfer')
                                            .map((method: any) => ({
                                              id: method._id || method.id,
                                              bankName: method.bankName || '',
                                              accountNumber: method.accountNumber || '',
                                              routingNumber: method.routingNumber || '',
                                              accountHolderName: method.accountHolderName || '',
                                              accountType: method.accountType || 'checking',
                                              country: method.country || '',
                                              currency: method.currency || 'USD',
                                              verificationStatus: method.verificationStatus || 'pending',
                                              isDefault: method.isDefault || false,
                                            }));
                                          setPayoutSettings({ bankAccounts, mobileMoney: null });
                                        } else {
                                          // Keep existing mobile money if any
                                          setPayoutSettings(prev => ({ 
                                            bankAccounts: [], 
                                            mobileMoney: prev.mobileMoney 
                                          }));
                                        }
                                      }
                                    } catch (error: any) {
                                      console.error('Failed to delete bank account:', error);
                                      showToast(error.message || 'Failed to delete bank account', 'error');
                                    }
                                  },
                                });
                              },
                            });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
              <span>Mobile Money Payout</span>
            </h2>
            {payoutSettings.mobileMoney ? (
              <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg border-2 border-gray-200 dark:border-gray-700/50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mt-0.5 sm:mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-1">
                        <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white transition-colors duration-300 truncate">
                          {payoutSettings.mobileMoney.mobileMoneyProvider || 'Mobile Money'}
                        </p>
                        {payoutSettings.mobileMoney.verificationStatus === 'verified' && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" />
                            Verified
                          </span>
                        )}
                        {payoutSettings.mobileMoney.verificationStatus === 'pending' && (
                          <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded text-xs font-semibold whitespace-nowrap">
                            Pending Verification
                          </span>
                        )}
                        {payoutSettings.mobileMoney.verificationStatus === 'failed' && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs font-semibold whitespace-nowrap">
                            Verification Failed
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 sm:space-y-0">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300 break-words">
                          <span className="font-medium">Number:</span> {payoutSettings.mobileMoney.mobileMoneyNumber || 'N/A'}
                        </p>
                        {payoutSettings.mobileMoney.accountHolderName && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            <span className="font-medium">Holder:</span> {payoutSettings.mobileMoney.accountHolderName}
                          </p>
                        )}
                        {(payoutSettings.mobileMoney.country || payoutSettings.mobileMoney.currency) && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {payoutSettings.mobileMoney.country && <><span className="font-medium">Country:</span> {payoutSettings.mobileMoney.country}</>}
                            {payoutSettings.mobileMoney.country && payoutSettings.mobileMoney.currency && ' • '}
                            {payoutSettings.mobileMoney.currency && <><span className="font-medium">Currency:</span> {payoutSettings.mobileMoney.currency}</>}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col sm:items-end gap-2 sm:gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        // Use existing data from state first, then try to fetch latest
                        const existingData = payoutSettings.mobileMoney;
                        console.log('Existing mobile money data:', existingData);
                        
                        // Pre-fill form with existing data from state immediately
                        setMobileMoneyForm({
                          provider: existingData?.mobileMoneyProvider || '',
                          number: '', // Leave empty since it's masked for security
                          accountHolderName: existingData?.accountHolderName || '',
                          country: existingData?.country || '',
                          currency: existingData?.currency || 'USD',
                          password: '',
                        });
                        
                        // Open modal immediately with existing data
                        setShowMobileMoneyModal(true);
                        
                        // Then fetch latest data in background and update if different
                        try {
                          const token = localStorage.getItem('auth_token');
                          const response = await fetch(`${API_BASE}/mobile-money`, {
                            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                            credentials: 'include',
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            const mobileMoney = data.mobileMoney;
                            console.log('Fetched mobile money data:', mobileMoney);
                            
                            if (mobileMoney) {
                              // Update form with latest data
                              setMobileMoneyForm({
                                provider: mobileMoney.mobileMoneyProvider || existingData?.mobileMoneyProvider || '',
                                number: '', // Leave empty since it's masked for security
                                accountHolderName: mobileMoney.accountHolderName || existingData?.accountHolderName || '',
                                country: mobileMoney.country || existingData?.country || '',
                                currency: mobileMoney.currency || existingData?.currency || 'USD',
                                password: '',
                              });
                            }
                          }
                        } catch (error) {
                          console.error('Failed to fetch mobile money details:', error);
                          // Keep using existing data from state
                        }
                      }}
                      className="border-gray-300 dark:border-gray-700"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Update
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 sm:h-9 sm:w-9"
                      onClick={async () => {
                        // Show password input dialog first
                        // First, require password confirmation
                        setPasswordDialog({
                          isOpen: true,
                          actionName: 'delete this mobile money account',
                          onVerified: () => {
                            // After password is verified, show confirmation dialog
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Delete Mobile Money Account',
                              message: 'Are you sure you want to delete this mobile money account? This action cannot be undone.',
                              variant: 'danger',
                              onConfirm: async () => {
                                try {
                                  const token = localStorage.getItem('auth_token');
                                  const response = await fetch(`${API_BASE}/mobile-money`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(token && { Authorization: `Bearer ${token}` }),
                                    },
                                    body: JSON.stringify({ password: '' }), // Password already verified via endpoint
                                    credentials: 'include',
                                  });

                                  if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.message || 'Failed to delete mobile money account');
                                  }

                                  showToast('Mobile money account deleted successfully', 'success');
                                  
                                  // Update state to remove mobile money
                                  setPayoutSettings(prev => ({
                                    ...prev,
                                    mobileMoney: null,
                                  }));
                                } catch (error: any) {
                                  console.error('Failed to delete mobile money account:', error);
                                  showToast(error.message || 'Failed to delete mobile money account', 'error');
                                }
                              },
                            });
                          },
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300">
                  Configure your mobile money account for payouts
                </p>
                <div className="relative group">
                  <Button 
                    variant="outline" 
                    className="border-gray-300 dark:border-gray-700 w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={() => {
                      setMobileMoneyForm({
                        provider: '',
                        number: '',
                        accountHolderName: '',
                        country: '',
                        currency: 'USD',
                        password: '',
                      });
                      setShowMobileMoneyModal(true);
                    }}
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Configure Mobile Money
                  </Button>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                    <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3 h-3 text-red-400" />
                        <span>Add mobile money account for payouts</span>
                      </div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                        <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
              <span>Payout Schedule</span>
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {/* Frequency */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 shadow-sm">
                <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Frequency</span>
                <select 
                  value={payoutSchedule.frequency}
                  onChange={async (e) => {
                    const newFrequency = e.target.value as 'daily' | 'weekly' | 'biweekly' | 'monthly';
                    setIsSavingSchedule(true);
                    try {
                      const token = localStorage.getItem('auth_token');
                      const response = await fetch(`${API_BASE}/payout-schedule`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token && { Authorization: `Bearer ${token}` }),
                        },
                        body: JSON.stringify({
                          frequency: newFrequency,
                          dayOfWeek: newFrequency === 'weekly' || newFrequency === 'biweekly' ? payoutSchedule.dayOfWeek : undefined,
                          dayOfMonth: newFrequency === 'monthly' ? payoutSchedule.dayOfMonth : undefined,
                          minimumPayoutAmount: payoutSchedule.minimumPayoutAmount,
                          autoPayout: payoutSchedule.autoPayout,
                        }),
                        credentials: 'include',
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to update payout schedule');
                      }

                      const data = await response.json();
                      setPayoutSchedule({
                        ...payoutSchedule,
                        frequency: newFrequency,
                        nextPayoutDate: data.payoutSchedule.nextPayoutDate ? new Date(data.payoutSchedule.nextPayoutDate).toLocaleDateString() : '',
                      });
                      showToast('Payout schedule updated successfully', 'success');
                    } catch (error: any) {
                      console.error('Failed to update payout schedule:', error);
                      showToast(error.message || 'Failed to update payout schedule', 'error');
                    } finally {
                      setIsSavingSchedule(false);
                    }
                  }}
                  disabled={isSavingSchedule}
                  className="w-32 sm:w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm sm:text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjMzc0MTUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-right-3 bg-[length:12px_8px] pr-8"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Day of Week - Only show for weekly/biweekly */}
              {(payoutSchedule.frequency === 'weekly' || payoutSchedule.frequency === 'biweekly') && (
                <div className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 shadow-sm">
                  <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Day of Week</span>
                  <select 
                    value={payoutSchedule.dayOfWeek}
                    onChange={async (e) => {
                      const newDayOfWeek = parseInt(e.target.value);
                      setIsSavingSchedule(true);
                      try {
                        const token = localStorage.getItem('auth_token');
                        const response = await fetch(`${API_BASE}/payout-schedule`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token && { Authorization: `Bearer ${token}` }),
                          },
                          body: JSON.stringify({
                            frequency: payoutSchedule.frequency,
                            dayOfWeek: newDayOfWeek,
                            minimumPayoutAmount: payoutSchedule.minimumPayoutAmount,
                            autoPayout: payoutSchedule.autoPayout,
                          }),
                          credentials: 'include',
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.message || 'Failed to update payout schedule');
                        }

                        const data = await response.json();
                        setPayoutSchedule({
                          ...payoutSchedule,
                          dayOfWeek: newDayOfWeek,
                          nextPayoutDate: data.payoutSchedule.nextPayoutDate ? new Date(data.payoutSchedule.nextPayoutDate).toLocaleDateString() : '',
                        });
                        showToast('Payout schedule updated successfully', 'success');
                      } catch (error: any) {
                        console.error('Failed to update payout schedule:', error);
                        showToast(error.message || 'Failed to update payout schedule', 'error');
                      } finally {
                        setIsSavingSchedule(false);
                      }
                    }}
                    disabled={isSavingSchedule}
                    className="w-36 sm:w-44 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm sm:text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjMzc0MTUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-right-3 bg-[length:12px_8px] pr-8"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              )}

              {/* Day of Month - Only show for monthly */}
              {payoutSchedule.frequency === 'monthly' && (
                <div className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 shadow-sm">
                  <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Day of Month</span>
                  <select 
                    value={payoutSchedule.dayOfMonth}
                    onChange={async (e) => {
                      const newDayOfMonth = parseInt(e.target.value);
                      setIsSavingSchedule(true);
                      try {
                        const token = localStorage.getItem('auth_token');
                        const response = await fetch(`${API_BASE}/payout-schedule`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token && { Authorization: `Bearer ${token}` }),
                          },
                          body: JSON.stringify({
                            frequency: payoutSchedule.frequency,
                            dayOfMonth: newDayOfMonth,
                            minimumPayoutAmount: payoutSchedule.minimumPayoutAmount,
                            autoPayout: payoutSchedule.autoPayout,
                          }),
                          credentials: 'include',
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.message || 'Failed to update payout schedule');
                        }

                        const data = await response.json();
                        setPayoutSchedule({
                          ...payoutSchedule,
                          dayOfMonth: newDayOfMonth,
                          nextPayoutDate: data.payoutSchedule.nextPayoutDate ? new Date(data.payoutSchedule.nextPayoutDate).toLocaleDateString() : '',
                        });
                        showToast('Payout schedule updated successfully', 'success');
                      } catch (error: any) {
                        console.error('Failed to update payout schedule:', error);
                        showToast(error.message || 'Failed to update payout schedule', 'error');
                      } finally {
                        setIsSavingSchedule(false);
                      }
                    }}
                    disabled={isSavingSchedule}
                    className="w-32 sm:w-36 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm sm:text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjMzc0MTUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-right-3 bg-[length:12px_8px] pr-8"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Next Payout - Highlighted section */}
              <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-blue-50 via-blue-50 to-green-50 dark:from-blue-900/20 dark:via-blue-900/20 dark:to-green-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                  <span>Next Payout</span>
                </span>
                <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                  {payoutSchedule.nextPayoutDate || 'Calculating...'}
                </span>
              </div>

              {/* Loading indicator */}
              {isSavingSchedule && (
                <div className="flex items-center justify-center p-2">
                  <Clock className="w-4 h-4 animate-spin text-red-400 mr-2" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Updating schedule...</span>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Right Column - Payout History & Analytics */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Payout History */}
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
                <History className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
                <span>Recent Payouts</span>
              </h2>
              <div className="space-y-2">
                {payoutHistory.length > 0 ? (
                  payoutHistory.slice(0, 5).map((payout: { date: string; amount: number; status: string }, index: number) => (
                    <div key={index} className="p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(payout.date).toLocaleDateString()}
                        </span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          ${payout.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{payout.status}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No payout history yet</p>
                )}
              </div>
            </div>

            {/* Payout Analytics */}
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
                <span>Analytics</span>
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Paid</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {`$${payoutHistory.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0).toFixed(2)}`}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">This Month</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {`$${payoutHistory
                      .filter((p: { date: string }) => {
                        const payoutDate = new Date(p.date);
                        const now = new Date();
                        return payoutDate.getMonth() === now.getMonth() && payoutDate.getFullYear() === now.getFullYear();
                      })
                      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
                      .toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team & Permissions Tab */}
      {activeTab === 'team' && (
            <div className="space-y-4 sm:space-y-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
                <Users className="w-6 h-6 text-red-400" />
                Team & Permissions
              </h2>
              <Button
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                onClick={() => setShowInviteModal(true)}
              >
                Invite Team Member
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-300">
              Define roles for staff accounts (e.g., Warehouse, Sales Rep, Finance) and control what each person
              can access inside the seller hub.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/40">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Team member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Access
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No team members yet. Click "Invite Team Member" to get started.
                      </td>
                    </tr>
                  ) : (
                    teamMembers.map((member, index) => (
                      <motion.tr
                        key={member._id || member.id || index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-t border-gray-200 dark:border-gray-700/60 hover:bg-gray-100/70 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-800 dark:text-gray-200">{member.role}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {member.access && member.access.length > 0 ? (
                              member.access.map((scope) => (
                                <span
                                  key={scope}
                                  className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                                >
                                  {scope}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">No access defined</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400"
                              onClick={() => {
                                setSelectedMember(member);
                                setShowManageAccessModal(true);
                              }}
                            >
                              Manage Access
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => {
                                // First, require password confirmation
                                setPasswordDialog({
                                  isOpen: true,
                                  actionName: `remove ${member.name} from your team`,
                                  onVerified: () => {
                                    // After password is verified, show confirmation dialog
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: 'Remove Team Member',
                                      message: `Are you sure you want to remove ${member.name} from your team? This action cannot be undone.`,
                                      variant: 'danger',
                                      onConfirm: async () => {
                                        try {
                                      const token = localStorage.getItem('auth_token');
                                      const memberId = member._id || member.id;
                                      if (!memberId) {
                                        showToast('Invalid team member ID', 'error');
                                        return;
                                      }
                                      const response = await fetch(`${API_BASE}/team/${memberId}`, {
                                        method: 'DELETE',
                                        headers: {
                                          ...(token && { Authorization: `Bearer ${token}` }),
                                        },
                                        credentials: 'include',
                                      });

                                      if (!response.ok) {
                                        const errorData = await response.json();
                                        throw new Error(errorData.message || 'Failed to remove team member');
                                      }

                                      showToast('Team member removed successfully', 'success');
                                      // Reload team members
                                      const teamResponse = await fetch(`${API_BASE}/team`, {
                                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                                        credentials: 'include',
                                      });
                                      if (teamResponse.ok) {
                                        const teamData = await teamResponse.json();
                                        setTeamMembers(teamData.teamMembers || []);
                                      }
                                        } catch (error: any) {
                                          console.error('Failed to remove team member:', error);
                                          showToast(error.message || 'Failed to remove team member', 'error');
                                        }
                                      },
                                    });
                                  },
                                });
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Settings Tab */}
      {activeTab === 'notifications' && (
            <div className="space-y-4 sm:space-y-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <Mail className="w-6 h-6 text-red-400" />
              Email Notifications
            </h2>
            <div className="space-y-3">
              {Object.entries(notifications.email).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize transition-colors duration-300">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {key === 'marketing' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive promotional emails and updates</p>
                    )}
                    {key === 'securityAlerts' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Important security notifications</p>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => {
                        setNotifications((prev) => ({
                          ...prev,
                          email: {
                            ...prev.email,
                            [key]: e.target.checked,
                          },
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 dark:peer-focus:ring-red-400 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500 dark:peer-checked:bg-red-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-red-400" />
              SMS Alerts
            </h2>
            <div className="space-y-3">
              {Object.entries(notifications.sms).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize transition-colors duration-300">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {key === 'securityAlerts' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Critical security notifications via SMS</p>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => {
                        setNotifications((prev) => ({
                          ...prev,
                          sms: {
                            ...prev.sms,
                            [key]: e.target.checked,
                          },
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 dark:peer-focus:ring-red-400 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500 dark:peer-checked:bg-red-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <Bell className="w-6 h-6 text-red-400" />
              Push Notifications
            </h2>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">Enable Push Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.push.enabled}
                    onChange={(e) => {
                      setNotifications((prev) => ({
                        ...prev,
                        push: {
                          ...prev.push,
                          enabled: e.target.checked,
                        },
                      }));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 dark:peer-focus:ring-red-400 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500 dark:peer-checked:bg-red-600"></div>
                </label>
              </div>
              {notifications.push.enabled && (
                <>
                  {Object.entries(notifications.push).filter(([key]) => key !== 'enabled').map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg ml-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize transition-colors duration-300">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value as boolean}
                          onChange={(e) => {
                            setNotifications((prev) => ({
                              ...prev,
                              push: {
                                ...prev.push,
                                [key]: e.target.checked,
                              },
                            }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 dark:peer-focus:ring-red-400 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500 dark:peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Notification Frequency & Settings */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <Clock className="w-6 h-6 text-red-400" />
              Notification Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notification Frequency
                </label>
                <select
                  value={notifications.frequency}
                  onChange={(e) => {
                    setNotifications((prev) => ({
                      ...prev,
                      frequency: e.target.value as 'instant' | 'daily' | 'weekly',
                    }));
                  }}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="instant">Instant</option>
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={notifications.quietHours.enabled}
                    onChange={(e) => {
                      setNotifications((prev) => ({
                        ...prev,
                        quietHours: {
                          ...prev.quietHours,
                          enabled: e.target.checked,
                        },
                      }));
                    }}
                    className="rounded border-gray-300 dark:border-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Quiet Hours</span>
                </label>
                {notifications.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={notifications.quietHours.start}
                        onChange={(e) => {
                          setNotifications((prev) => ({
                            ...prev,
                            quietHours: {
                              ...prev.quietHours,
                              start: e.target.value,
                            },
                          }));
                        }}
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Time</label>
                      <input
                        type="time"
                        value={notifications.quietHours.end}
                        onChange={(e) => {
                          setNotifications((prev) => ({
                            ...prev,
                            quietHours: {
                              ...prev.quietHours,
                              end: e.target.value,
                            },
                          }));
                        }}
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                setIsSavingNotifications(true);
                try {
                  const token = localStorage.getItem('auth_token');
                  const response = await fetch(`${API_BASE}/notification-preferences`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token && { Authorization: `Bearer ${token}` }),
                    },
                    body: JSON.stringify(notifications),
                    credentials: 'include',
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save notification preferences');
                  }

                  showToast('Notification preferences saved successfully', 'success');
                } catch (error: any) {
                  console.error('Failed to save notification preferences:', error);
                  showToast(error.message || 'Failed to save notification preferences', 'error');
                } finally {
                  setIsSavingNotifications(false);
                }
              }}
              disabled={isSavingNotifications}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50"
            >
              {isSavingNotifications ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Policy Pages Tab */}
      {activeTab === 'policies' && (
            <div className="space-y-4 sm:space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <strong>Note:</strong> These policy pages will be visible to your customers. Make sure to keep them up-to-date and compliant with your business practices.
            </p>
          </div>

          {[
            { key: 'shippingPolicy', label: 'Shipping Policy', icon: Package, description: 'Define your shipping methods, costs, and delivery times.' },
            { key: 'returnPolicy', label: 'Return & Refund Policy', icon: FileText, description: 'Specify return conditions, timeframes, and procedures.' },
            { key: 'refundPolicy', label: 'Refund Policy', icon: CreditCard, description: 'Detail your refund process, timelines, and conditions.' },
            { key: 'storeTerms', label: 'Store Terms & Conditions', icon: FileText, description: 'Set the terms and conditions for using your store.' },
          ].map(({ key, label, icon: Icon, description }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300"
            >
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300 flex items-center gap-2">
                  <Icon className="w-6 h-6 text-red-400" />
                  {label}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">{description}</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Policy Content
                </label>
                <RichTextEditor
                  value={policies[key as keyof typeof policies]}
                  onChange={(value) => handlePolicyChange(key, value)}
                  placeholder={`Enter your ${label.toLowerCase()}...`}
                  className="mb-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 transition-colors duration-300">
                  {policies[key as keyof typeof policies].replace(/<[^>]*>/g, '').length} characters
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {savedPolicy === key && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 text-green-600 dark:text-green-400"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Saved successfully!</span>
                    </motion.div>
                  )}
                </div>
                <Button
                  onClick={() => handleSavePolicy(key)}
                  disabled={savingPolicy === key}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPolicy === key ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save {label}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ))}

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">Preview</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-300">
              Your policy pages will be accessible to customers at:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-900 dark:text-white transition-colors duration-300">Shipping Policy</span>
                <span className="text-xs text-gray-500 dark:text-gray-500 transition-colors duration-300">/store/shipping-policy</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-900 dark:text-white transition-colors duration-300">Return & Refund Policy</span>
                <span className="text-xs text-gray-500 dark:text-gray-500 transition-colors duration-300">/store/return-policy</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-900 dark:text-white transition-colors duration-300">Refund Policy</span>
                <span className="text-xs text-gray-500 dark:text-gray-500 transition-colors duration-300">/store/refund-policy</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-900 dark:text-white transition-colors duration-300">Terms & Conditions</span>
                <span className="text-xs text-gray-500 dark:text-gray-500 transition-colors duration-300">/store/terms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      <Dialog 
        open={show2FAModal} 
        onOpenChange={(open) => {
          setShow2FAModal(open);
          if (!open) {
            setTwoFactorData({ qrCode: '', secret: '', manualEntryKey: '' });
            setVerificationCode('');
          }
        }}
      >
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              {security.twoFactorEnabled ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {security.twoFactorEnabled ? (
              // Disable 2FA
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Are you sure you want to disable two-factor authentication? This will make your account less secure.
                </p>
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShow2FAModal(false)}
                    disabled={isDisabling}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      setIsDisabling(true);
                      try {
                        const token = localStorage.getItem('auth_token');
                        const response = await fetch('http://localhost:5000/api/profile/me/2fa/disable', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token && { Authorization: `Bearer ${token}` }),
                          },
                          credentials: 'include',
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.message || 'Failed to disable 2FA');
                        }

                        showToast('Two-factor authentication disabled successfully', 'success');
                        setSecurity(prev => ({ ...prev, twoFactorEnabled: false }));
                        setShow2FAModal(false);
                      } catch (error: any) {
                        console.error('Failed to disable 2FA:', error);
                        showToast(error.message || 'Failed to disable 2FA', 'error');
                      } finally {
                        setIsDisabling(false);
                      }
                    }}
                    disabled={isDisabling}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isDisabling ? 'Disabling...' : 'Disable 2FA'}
                  </Button>
                </div>
              </>
            ) : (
              // Enable 2FA
              <>
                {!twoFactorData.qrCode ? (
                  // Step 1: Generate QR Code
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click the button below to generate a QR code. Then scan it with your authenticator app (Google Authenticator, Authy, etc.).
                    </p>
                    <div className="flex justify-end gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setShow2FAModal(false)}
                        disabled={isGeneratingQR}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          setIsGeneratingQR(true);
                          try {
                            const token = localStorage.getItem('auth_token');
                            const response = await fetch('http://localhost:5000/api/profile/me/2fa/qr', {
                              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                              credentials: 'include',
                            });

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.message || 'Failed to generate QR code');
                            }

                            const data = await response.json();
                            setTwoFactorData({
                              qrCode: data.qrCode,
                              secret: data.secret,
                              manualEntryKey: data.manualEntryKey,
                            });
                          } catch (error: any) {
                            console.error('Failed to generate QR code:', error);
                            showToast(error.message || 'Failed to generate QR code', 'error');
                          } finally {
                            setIsGeneratingQR(false);
                          }
                        }}
                        disabled={isGeneratingQR}
                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                      >
                        {isGeneratingQR ? 'Generating...' : 'Generate QR Code'}
                      </Button>
                    </div>
                  </>
                ) : (
                  // Step 2: Show QR Code and Verify
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
                    </p>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      {twoFactorData.qrCode && (
                        <img 
                          src={twoFactorData.qrCode} 
                          alt="2FA QR Code" 
                          className="w-48 h-48 mx-auto rounded"
                        />
                      )}
                    </div>
                    {twoFactorData.manualEntryKey && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Can't scan? Enter this code manually:</p>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">{twoFactorData.manualEntryKey}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Enter 6-digit code from your app
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerificationCode(value);
                        }}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setTwoFactorData({ qrCode: '', secret: '', manualEntryKey: '' });
                          setVerificationCode('');
                        }}
                        disabled={isVerifying}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={async () => {
                          if (verificationCode.length !== 6) {
                            showToast('Please enter a 6-digit code', 'error');
                            return;
                          }
                          setIsVerifying(true);
                          try {
                            const token = localStorage.getItem('auth_token');
                            const response = await fetch('http://localhost:5000/api/profile/me/2fa/verify', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token && { Authorization: `Bearer ${token}` }),
                              },
                              body: JSON.stringify({ token: verificationCode }),
                              credentials: 'include',
                            });

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.message || 'Failed to verify code');
                            }

                            showToast('Two-factor authentication enabled successfully', 'success');
                            setSecurity(prev => ({ ...prev, twoFactorEnabled: true }));
                            setShow2FAModal(false);
                            setTwoFactorData({ qrCode: '', secret: '', manualEntryKey: '' });
                            setVerificationCode('');
                          } catch (error: any) {
                            console.error('Failed to verify 2FA code:', error);
                            showToast(error.message || 'Failed to verify code', 'error');
                          } finally {
                            setIsVerifying(false);
                          }
                        }}
                        disabled={isVerifying || verificationCode.length !== 6}
                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50"
                      >
                        {isVerifying ? 'Verifying...' : 'Verify & Enable'}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Bank Modal - Enhanced with Security */}
      <Dialog 
        open={showAddBank} 
        onOpenChange={(open) => {
          setShowAddBank(open);
          if (!open) {
            setBankAccountForm({
              bankName: '',
              accountNumber: '',
              routingNumber: '',
              accountHolderName: '',
              accountType: 'checking',
              country: '',
              currency: 'USD',
              swiftCode: '',
              iban: '',
              isDefault: false,
              password: '',
            });
          }
        }}
      >
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Add Bank Account
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              This account will receive payments from escrow. All information is encrypted and secure.
            </p>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              
              // Clear previous errors
              setFormErrors({});
              
              // Validate required fields
              const errors: Record<string, string> = {};
              
              if (!bankAccountForm.bankName?.trim()) {
                errors.bankName = 'Bank name is required';
              }
              
              if (!bankAccountForm.accountHolderName?.trim()) {
                errors.accountHolderName = 'Account holder name is required';
              }
              
              if (!bankAccountForm.accountNumber?.trim()) {
                errors.accountNumber = 'Account number is required';
              } else if (bankAccountForm.accountNumber.length < 4) {
                errors.accountNumber = 'Account number must be at least 4 digits';
              }
              
              if (!bankAccountForm.routingNumber?.trim()) {
                errors.routingNumber = 'Routing number is required';
              } else if (bankAccountForm.routingNumber.length < 4) {
                errors.routingNumber = 'Routing number must be at least 4 digits';
              }
              
              if (!bankAccountForm.password) {
                errors.password = 'Password confirmation is required for security';
              }
              
              if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                showToast('Please fix the errors in the form', 'error');
                return;
              }
              
              // Check authentication token
              const token = localStorage.getItem('auth_token');
              if (!token) {
                setFormErrors({ password: 'You are not authenticated. Please log in again.' });
                showToast('Authentication required. Please log in again.', 'error');
                return;
              }
              
              setIsAddingBank(true);
              try {
                const response = await fetch(`${API_BASE}/payout-methods`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    method: 'bank_transfer',
                    bankName: bankAccountForm.bankName.trim(),
                    accountNumber: bankAccountForm.accountNumber.trim(),
                    routingNumber: bankAccountForm.routingNumber.trim(),
                    accountHolderName: bankAccountForm.accountHolderName.trim(),
                    accountType: bankAccountForm.accountType,
                    country: bankAccountForm.country?.trim() || undefined,
                    currency: bankAccountForm.currency || 'USD',
                    swiftCode: bankAccountForm.swiftCode?.trim() || undefined,
                    iban: bankAccountForm.iban?.trim() || undefined,
                    isDefault: bankAccountForm.isDefault || payoutSettings.bankAccounts.length === 0,
                    password: bankAccountForm.password,
                  }),
                  credentials: 'include',
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  
                  // Handle specific error cases
                  if (response.status === 401) {
                    if (errorData.message?.includes('password')) {
                      setFormErrors({ password: 'Invalid password. Please enter your correct account password.' });
                    } else {
                      setFormErrors({ password: 'Authentication failed. Please log in again.' });
                    }
                    showToast(errorData.message || 'Authentication failed', 'error');
                  } else if (response.status === 400 && errorData.errors) {
                    // Validation errors from backend
                    const backendErrors: Record<string, string> = {};
                    errorData.errors.forEach((err: any) => {
                      if (err.path && err.path.length > 0) {
                        backendErrors[err.path[0]] = err.message;
                      }
                    });
                    setFormErrors(backendErrors);
                    showToast('Please fix the validation errors', 'error');
                  } else {
                    throw new Error(errorData.message || 'Failed to add bank account');
                  }
                  return;
                }

                const responseData = await response.json();
                showToast(responseData.message || 'Bank account added successfully. Please verify your account.', 'success');
                setShowAddBank(false);
                setBankAccountForm({
                  bankName: '',
                  accountNumber: '',
                  routingNumber: '',
                  accountHolderName: '',
                  accountType: 'checking',
                  country: '',
                  currency: 'USD',
                  swiftCode: '',
                  iban: '',
                  isDefault: false,
                  password: '',
                });

                // Reload payout methods
                const settingsResponse = await fetch(`${API_BASE}`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  credentials: 'include',
                });
                if (settingsResponse.ok) {
                  const data = await settingsResponse.json();
                  const settings = data.settings || {};
                  if (settings.payoutMethods && settings.payoutMethods.length > 0) {
                    const bankAccounts = settings.payoutMethods
                      .filter((method: any) => method.method === 'bank_transfer')
                      .map((method: any) => ({
                        id: method._id || method.id,
                        bankName: method.bankName || '',
                        accountNumber: method.accountNumber || '',
                        routingNumber: method.routingNumber || '',
                        accountHolderName: method.accountHolderName || '',
                        accountType: method.accountType || 'checking',
                        country: method.country || '',
                        currency: method.currency || 'USD',
                        verificationStatus: method.verificationStatus || 'pending',
                        isDefault: method.isDefault || false,
                      }));
                    setPayoutSettings({ bankAccounts, mobileMoney: null });
                  }
                }
              } catch (error: any) {
                console.error('Failed to add bank account:', error);
                if (error.message?.includes('password') || error.message?.includes('Password')) {
                  setFormErrors({ password: error.message });
                } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                  setFormErrors({ password: 'Authentication failed. Please log in again.' });
                } else {
                  setFormErrors({ _general: error.message || 'Failed to add bank account' });
                }
                showToast(error.message || 'Failed to add bank account', 'error');
              } finally {
                setIsAddingBank(false);
              }
            }}
            className="space-y-4 mt-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2"
          >
            {/* Security Notice */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-semibold mb-1">Security Notice</p>
                  <p>Your account details are encrypted and stored securely. Password confirmation is required to add financial accounts.</p>
                </div>
              </div>
            </div>

            {formErrors._general && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-300">{formErrors._general}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bank Name *
                </label>
                <input
                  id="bankName"
                  type="text"
                  value={bankAccountForm.bankName}
                  onChange={(e) => {
                    setBankAccountForm({ ...bankAccountForm, bankName: e.target.value });
                    if (formErrors.bankName) {
                      setFormErrors({ ...formErrors, bankName: '' });
                    }
                  }}
                  required
                  className={`w-full bg-gray-100 dark:bg-gray-800 border rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    formErrors.bankName 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-700 focus:ring-red-500'
                  }`}
                  placeholder="e.g. Chase Bank, Bank of America"
                />
                {formErrors.bankName && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.bankName}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the full name of your bank</p>
              </div>
              <div>
                <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Holder Name *
                </label>
                <input
                  id="accountHolderName"
                  type="text"
                  value={bankAccountForm.accountHolderName}
                  onChange={(e) => {
                    setBankAccountForm({ ...bankAccountForm, accountHolderName: e.target.value });
                    if (formErrors.accountHolderName) {
                      setFormErrors({ ...formErrors, accountHolderName: '' });
                    }
                  }}
                  required
                  className={`w-full bg-gray-100 dark:bg-gray-800 border rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    formErrors.accountHolderName 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-700 focus:ring-red-500'
                  }`}
                  placeholder="Full name as on account"
                />
                {formErrors.accountHolderName && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.accountHolderName}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must match the name on your bank account</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Number *
                </label>
                <input
                  id="accountNumber"
                  type="text"
                  value={bankAccountForm.accountNumber}
                  onChange={(e) => {
                    setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value.replace(/\D/g, '') });
                    if (formErrors.accountNumber) {
                      setFormErrors({ ...formErrors, accountNumber: '' });
                    }
                  }}
                  required
                  minLength={4}
                  maxLength={50}
                  className={`w-full bg-gray-100 dark:bg-gray-800 border rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    formErrors.accountNumber 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-700 focus:ring-red-500'
                  }`}
                  placeholder="Enter account number"
                />
                {formErrors.accountNumber && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.accountNumber}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Found on your checks or bank statement (numbers only)</p>
              </div>
              <div>
                <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Routing Number *
                </label>
                <input
                  id="routingNumber"
                  type="text"
                  value={bankAccountForm.routingNumber}
                  onChange={(e) => {
                    setBankAccountForm({ ...bankAccountForm, routingNumber: e.target.value.replace(/\D/g, '') });
                    if (formErrors.routingNumber) {
                      setFormErrors({ ...formErrors, routingNumber: '' });
                    }
                  }}
                  required
                  minLength={4}
                  maxLength={20}
                  className={`w-full bg-gray-100 dark:bg-gray-800 border rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    formErrors.routingNumber 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-700 focus:ring-red-500'
                  }`}
                  placeholder="Enter routing number"
                />
                {formErrors.routingNumber && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.routingNumber}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">9-digit number (US) or bank code (International)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Type *
                </label>
                <select
                  id="accountType"
                  value={bankAccountForm.accountType}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountType: e.target.value as 'checking' | 'savings' })}
                  required
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  value={bankAccountForm.country}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, country: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. United States"
                />
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency *
                </label>
                <select
                  id="currency"
                  value={bankAccountForm.currency}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, currency: e.target.value })}
                  required
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="RWF">RWF - Rwandan Franc</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="swiftCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SWIFT Code (International)
                </label>
                <input
                  id="swiftCode"
                  type="text"
                  value={bankAccountForm.swiftCode}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, swiftCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  maxLength={11}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. CHASUS33"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Required for international transfers</p>
              </div>
              <div>
                <label htmlFor="iban" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IBAN (International)
                </label>
                <input
                  id="iban"
                  type="text"
                  value={bankAccountForm.iban}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, iban: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  maxLength={34}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. GB82WEST12345698765432"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Required for European accounts</p>
              </div>
            </div>

            {/* Password Confirmation */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirm Password *
              </label>
              <input
                id="password"
                type="password"
                value={bankAccountForm.password}
                onChange={(e) => {
                  setBankAccountForm({ ...bankAccountForm, password: e.target.value });
                  if (formErrors.password) {
                    setFormErrors({ ...formErrors, password: '' });
                  }
                }}
                required
                autoComplete="current-password"
                className={`w-full bg-gray-100 dark:bg-gray-800 border rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                  formErrors.password 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-700 focus:ring-red-500'
                }`}
                placeholder="Enter your account password"
              />
              {formErrors.password && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {formErrors.password}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formErrors.password 
                  ? 'Enter the password you use to log into your account' 
                  : 'Required for security when adding financial accounts. Enter your account login password.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isDefault"
                type="checkbox"
                checked={bankAccountForm.isDefault}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, isDefault: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">
                Set as default payout method
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowAddBank(false);
                  setBankAccountForm({
                    bankName: '',
                    accountNumber: '',
                    routingNumber: '',
                    accountHolderName: '',
                    accountType: 'checking',
                    country: '',
                    currency: 'USD',
                    swiftCode: '',
                    iban: '',
                    isDefault: false,
                    password: '',
                  });
                }}
                disabled={isAddingBank}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                disabled={isAddingBank}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isAddingBank ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Add Bank Account
                    </>
                  )}
                </span>
                {!isAddingBank && (
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Account Verification Modal - Account Details Confirmation */}
      <Dialog 
        open={showVerificationModal} 
        onOpenChange={(open) => {
          setShowVerificationModal(open);
          if (!open) {
            setVerifyingMethodId(null);
            setVerifyingAccount(null);
            setVerificationPassword('');
            setConfirmAccountDetails(false);
          }
        }}
      >
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Verify Bank Account
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!confirmAccountDetails) {
                showToast('Please confirm that the account details are correct', 'error');
                return;
              }
              if (!verificationPassword) {
                showToast('Password confirmation is required', 'error');
                return;
              }
              if (!verifyingMethodId) {
                showToast('Invalid account', 'error');
                return;
              }
              
              setIsVerifyingAccount(true);
              try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch(`${API_BASE}/payout-methods/${verifyingMethodId}/verify`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                  body: JSON.stringify({
                    confirmAccountDetails: true,
                    password: verificationPassword,
                  }),
                  credentials: 'include',
                });

                const responseData = await response.json();

                if (!response.ok) {
                  throw new Error(responseData.message || 'Failed to verify bank account');
                }

                showToast('Bank account verified successfully', 'success');
                setShowVerificationModal(false);
                setVerifyingMethodId(null);
                setVerifyingAccount(null);
                setVerificationPassword('');
                setConfirmAccountDetails(false);

                // Reload payout methods
                const settingsResponse = await fetch(`${API_BASE}`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  credentials: 'include',
                });
                if (settingsResponse.ok) {
                  const data = await settingsResponse.json();
                  const settings = data.settings || {};
                  if (settings.payoutMethods && settings.payoutMethods.length > 0) {
                    const bankAccounts = settings.payoutMethods
                      .filter((method: any) => method.method === 'bank_transfer')
                      .map((method: any) => ({
                        id: method._id || method.id,
                        bankName: method.bankName || '',
                        accountNumber: method.accountNumber || '',
                        routingNumber: method.routingNumber || '',
                        accountHolderName: method.accountHolderName || '',
                        accountType: method.accountType || 'checking',
                        country: method.country || '',
                        currency: method.currency || 'USD',
                        verificationStatus: method.verificationStatus || 'pending',
                        isDefault: method.isDefault || false,
                      }));
                    setPayoutSettings({ bankAccounts, mobileMoney: null });
                  }
                }
              } catch (error: any) {
                console.error('Failed to verify bank account:', error);
                showToast(error.message || 'Failed to verify bank account', 'error');
              } finally {
                setIsVerifyingAccount(false);
              }
            }}
            className="space-y-4 mt-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2"
          >
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Verification Process:</strong> Please review your bank account details below and confirm they are correct. 
                This account will be used to receive payments from escrow transactions.
              </p>
            </div>

            {verifyingAccount && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-5 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Account Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Bank Name</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{verifyingAccount.bankName || 'N/A'}</span>
                  </div>
                  {verifyingAccount.accountHolderName && (
                    <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Holder</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{verifyingAccount.accountHolderName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Number</span>
                    <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        const accNum = verifyingAccount.accountNumber || '';
                        // If it's already masked (starts with ****), use it
                        if (accNum.startsWith('****')) return accNum;
                        // If it's encrypted (contains :), try to extract last 4 chars from the encrypted part
                        if (accNum.includes(':')) {
                          const parts = accNum.split(':');
                          const encrypted = parts[1] || '';
                          return '****' + encrypted.slice(-4);
                        }
                        // If it's a plain number, mask it
                        if (accNum.length >= 4) {
                          return '****' + accNum.slice(-4);
                        }
                        return '****';
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Routing Number</span>
                    <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        const routNum = verifyingAccount.routingNumber || '';
                        // If it's already masked (starts with ****), use it
                        if (routNum.startsWith('****')) return routNum;
                        // If it's encrypted (contains :), try to extract last 4 chars from the encrypted part
                        if (routNum.includes(':')) {
                          const parts = routNum.split(':');
                          const encrypted = parts[1] || '';
                          return '****' + encrypted.slice(-4);
                        }
                        // If it's a plain number, mask it
                        if (routNum.length >= 4) {
                          return '****' + routNum.slice(-4);
                        }
                        return '****';
                      })()}
                    </span>
                  </div>
                  {verifyingAccount.accountType && (
                    <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Type</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{verifyingAccount.accountType}</span>
                    </div>
                  )}
                  {verifyingAccount.currency && (
                    <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Currency</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{verifyingAccount.currency}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Note:</strong> Sensitive account details are masked for security. Please verify that the displayed information matches your bank records.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
              <input
                id="confirmAccountDetails"
                type="checkbox"
                checked={confirmAccountDetails}
                onChange={(e) => setConfirmAccountDetails(e.target.checked)}
                required
                className="mt-1 h-5 w-5 rounded border-2 border-yellow-400 text-red-500 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:border-yellow-600"
              />
              <label htmlFor="confirmAccountDetails" className="text-sm text-yellow-800 dark:text-yellow-300 cursor-pointer leading-relaxed">
                <strong className="font-semibold">I confirm that the bank account details above are correct.</strong> I understand that this account will be used to receive payments from escrow transactions and I am responsible for ensuring the information is accurate.
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="verificationPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-400" />
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="verificationPassword"
                  name="verificationPassword"
                  type="password"
                  value={verificationPassword}
                  onChange={(e) => setVerificationPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  placeholder="Enter your account password"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Required for security when verifying financial accounts
              </p>
            </div>

            {/* Fixed footer with buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerifyingMethodId(null);
                  setVerifyingAccount(null);
                  setVerificationPassword('');
                  setConfirmAccountDetails(false);
                }}
                disabled={isVerifyingAccount}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                disabled={isVerifyingAccount || !confirmAccountDetails || !verificationPassword}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isVerifyingAccount ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Verify Account
                    </>
                  )}
                </span>
                {!isVerifyingAccount && confirmAccountDetails && verificationPassword && (
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Team Member Modal (UI only) */}
      {/* Invite Team Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Invite Team Member
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              
              if (!inviteForm.name || !inviteForm.email || !inviteForm.role) {
                showToast('Please fill in all fields', 'error');
                return;
              }

              setIsSavingTeamMember(true);
              try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch(`${API_BASE}/team`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                  body: JSON.stringify({
                    name: inviteForm.name,
                    email: inviteForm.email,
                    role: inviteForm.role,
                    access: [], // Will be auto-assigned based on role
                  }),
                  credentials: 'include',
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.message || 'Failed to invite team member');
                }

                await response.json();
                showToast('Team member invited successfully', 'success');
                setShowInviteModal(false);
                setInviteForm({ name: '', email: '', role: 'Sales Rep' });
                
                // Reload team members
                const teamResponse = await fetch(`${API_BASE}/team`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  credentials: 'include',
                });
                if (teamResponse.ok) {
                  const teamData = await teamResponse.json();
                  setTeamMembers(teamData.teamMembers || []);
                }
              } catch (error: any) {
                console.error('Failed to invite team member:', error);
                showToast(error.message || 'Failed to invite team member', 'error');
              } finally {
                setIsSavingTeamMember(false);
              }
            }}
          >
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send an invitation to a staff member and assign a default role. You can fine-tune permissions
                later from the Team &amp; Permissions tab.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    required
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="staff@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    required
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Sales Rep">Sales Rep (orders, RFQs, customers)</option>
                    <option value="Warehouse">Warehouse (inventory, fulfilment)</option>
                    <option value="Finance">Finance (payouts, invoices)</option>
                    <option value="Admin">Admin (full access)</option>
                    <option value="Customer Service">Customer Service (orders, customers, messages)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteForm({ name: '', email: '', role: 'Sales Rep' });
                  }}
                  disabled={isSavingTeamMember}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  disabled={isSavingTeamMember}
                >
                  {isSavingTeamMember ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Access Modal */}
      <Dialog open={showManageAccessModal} onOpenChange={setShowManageAccessModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Manage Access - {selectedMember?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                
                setIsSavingTeamMember(true);
                try {
                  const token = localStorage.getItem('auth_token');
                  const memberId = selectedMember._id || selectedMember.id;
                  if (!memberId) {
                    showToast('Invalid team member ID', 'error');
                    return;
                  }

                  const response = await fetch(`${API_BASE}/team/${memberId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token && { Authorization: `Bearer ${token}` }),
                    },
                    body: JSON.stringify({
                      role: selectedMember.role,
                      access: selectedMember.access,
                    }),
                    credentials: 'include',
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to update team member');
                  }

                  showToast('Team member access updated successfully', 'success');
                  setShowManageAccessModal(false);
                  setSelectedMember(null);
                  
                  // Reload team members
                  const teamResponse = await fetch(`${API_BASE}/team`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    credentials: 'include',
                  });
                  if (teamResponse.ok) {
                    const teamData = await teamResponse.json();
                    setTeamMembers(teamData.teamMembers || []);
                  }
                } catch (error: any) {
                  console.error('Failed to update team member:', error);
                  showToast(error.message || 'Failed to update team member', 'error');
                } finally {
                  setIsSavingTeamMember(false);
                }
              }}
            >
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={selectedMember.role}
                    onChange={(e) => setSelectedMember({ ...selectedMember, role: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Sales Rep">Sales Rep</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Finance">Finance</option>
                    <option value="Admin">Admin</option>
                    <option value="Customer Service">Customer Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Permissions
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    {availablePermissions.length > 0 ? (
                      availablePermissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMember.access.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMember({
                                  ...selectedMember,
                                  access: [...selectedMember.access, permission],
                                });
                              } else {
                                setSelectedMember({
                                  ...selectedMember,
                                  access: selectedMember.access.filter((a) => a !== permission),
                                });
                              }
                            }}
                            className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {permission}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading permissions...</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowManageAccessModal(false);
                      setSelectedMember(null);
                    }}
                    disabled={isSavingTeamMember}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                    disabled={isSavingTeamMember}
                  >
                    {isSavingTeamMember ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant || 'danger'}
      />

      {/* Input Dialog */}
      <InputDialog
        isOpen={inputDialog.isOpen}
        onClose={() => setInputDialog({ ...inputDialog, isOpen: false })}
        onConfirm={inputDialog.onConfirm}
        title={inputDialog.title}
        label={inputDialog.label}
        placeholder={inputDialog.placeholder}
        type={inputDialog.type as 'text' | 'number'}
      />

      {/* Password Confirmation Dialog */}
      <InputDialog
        isOpen={passwordDialog.isOpen}
        onClose={() => setPasswordDialog({ ...passwordDialog, isOpen: false })}
        onConfirm={async (password) => {
          const isValid = await verifyPassword(password);
          if (isValid) {
            setPasswordDialog({ ...passwordDialog, isOpen: false });
            passwordDialog.onVerified();
          }
        }}
        title="Password Confirmation Required"
        label="Enter your password to continue"
        placeholder="Enter your account password"
        type="password"
        confirmText="Verify"
        cancelText="Cancel"
      />

      {/* Mobile Money Configuration Modal */}
      <Dialog open={showMobileMoneyModal} onOpenChange={setShowMobileMoneyModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-[95vw] sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden m-2 sm:m-0">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-red-400" />
              {payoutSettings.mobileMoney ? 'Update Mobile Money' : 'Configure Mobile Money'}
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add or update your mobile money account to receive payouts
            </p>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              
              if (!mobileMoneyForm.provider || !mobileMoneyForm.number) {
                showToast('Please fill in provider and mobile money number', 'error');
                return;
              }
              
              if (!mobileMoneyForm.password) {
                showToast('Password confirmation is required for security', 'error');
                return;
              }

              setIsSavingMobileMoney(true);
              try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch(`${API_BASE}/mobile-money`, {
                  method: payoutSettings.mobileMoney ? 'PUT' : 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                  body: JSON.stringify({
                    mobileMoneyProvider: mobileMoneyForm.provider.trim(),
                    mobileMoneyNumber: mobileMoneyForm.number.trim() || undefined, // Empty string becomes undefined
                    accountHolderName: mobileMoneyForm.accountHolderName.trim() || undefined,
                    country: mobileMoneyForm.country.trim() || undefined,
                    currency: mobileMoneyForm.currency || 'USD',
                    password: mobileMoneyForm.password,
                  }),
                  credentials: 'include',
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.message || 'Failed to save mobile money account');
                }

                const data = await response.json();
                showToast(data.message || 'Mobile money account saved successfully', 'success');
                setShowMobileMoneyModal(false);
                setMobileMoneyForm({
                  provider: '',
                  number: '',
                  accountHolderName: '',
                  country: '',
                  currency: 'USD',
                  password: '',
                });

                // Reload mobile money
                try {
                  const mobileMoneyResponse = await fetch(`${API_BASE}/mobile-money`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    credentials: 'include',
                  });
                  if (mobileMoneyResponse.ok) {
                    const mobileMoneyData = await mobileMoneyResponse.json();
                    console.log('Mobile money data loaded:', mobileMoneyData);
                    setPayoutSettings(prev => ({
                      ...prev,
                      mobileMoney: mobileMoneyData.mobileMoney,
                    }));
                  }
                } catch (error) {
                  console.error('Failed to reload mobile money:', error);
                }
              } catch (error: any) {
                console.error('Failed to save mobile money:', error);
                showToast(error.message || 'Failed to save mobile money account', 'error');
              } finally {
                setIsSavingMobileMoney(false);
              }
            }}
            className="space-y-4 mt-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2"
          >
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Security Notice:</strong> Your mobile money details are encrypted and stored securely. Password confirmation is required.
              </p>
            </div>

            <div>
              <label htmlFor="mobileProvider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mobile Money Provider *
              </label>
              <select
                id="mobileProvider"
                value={mobileMoneyForm.provider}
                onChange={(e) => setMobileMoneyForm({ ...mobileMoneyForm, provider: e.target.value })}
                required
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select provider</option>
                <option value="MTN Mobile Money">MTN Mobile Money</option>
                <option value="Airtel Money">Airtel Money</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Orange Money">Orange Money</option>
                <option value="Tigo Pesa">Tigo Pesa</option>
                <option value="Vodafone Cash">Vodafone Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mobile Money Number {!payoutSettings.mobileMoney && <span className="text-red-500">*</span>}
              </label>
              <input
                id="mobileNumber"
                type="text"
                value={mobileMoneyForm.number}
                onChange={(e) => setMobileMoneyForm({ ...mobileMoneyForm, number: e.target.value.replace(/\D/g, '') })}
                required={!payoutSettings.mobileMoney}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={payoutSettings.mobileMoney ? "Leave empty to keep existing number" : "Enter mobile money number"}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {payoutSettings.mobileMoney 
                  ? "Leave empty to keep your existing mobile money number, or enter a new one to update it"
                  : "Enter the phone number associated with your mobile money account"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mobileAccountHolder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Holder Name
                </label>
                <input
                  id="mobileAccountHolder"
                  type="text"
                  value={mobileMoneyForm.accountHolderName}
                  onChange={(e) => setMobileMoneyForm({ ...mobileMoneyForm, accountHolderName: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label htmlFor="mobileCurrency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency *
                </label>
                <select
                  id="mobileCurrency"
                  value={mobileMoneyForm.currency}
                  onChange={(e) => setMobileMoneyForm({ ...mobileMoneyForm, currency: e.target.value })}
                  required
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="RWF">RWF - Rwandan Franc</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="UGX">UGX - Ugandan Shilling</option>
                  <option value="TZS">TZS - Tanzanian Shilling</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="GHS">GHS - Ghanaian Cedi</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="mobileCountry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <input
                id="mobileCountry"
                type="text"
                value={mobileMoneyForm.country}
                onChange={(e) => setMobileMoneyForm({ ...mobileMoneyForm, country: e.target.value })}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. Rwanda, Kenya"
              />
            </div>

            <div>
              <label htmlFor="mobilePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirm Password *
              </label>
              <input
                id="mobilePassword"
                type="password"
                value={mobileMoneyForm.password}
                onChange={(e) => setMobileMoneyForm({ ...mobileMoneyForm, password: e.target.value })}
                required
                autoComplete="current-password"
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Required for security when adding financial accounts</p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowMobileMoneyModal(false);
                  setMobileMoneyForm({
                    provider: '',
                    number: '',
                    accountHolderName: '',
                    country: '',
                    currency: 'USD',
                    password: '',
                  });
                }}
                disabled={isSavingMobileMoney}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingMobileMoney || !mobileMoneyForm.provider || !mobileMoneyForm.number || !mobileMoneyForm.password}
                className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isSavingMobileMoney ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {payoutSettings.mobileMoney ? 'Update' : 'Save'} Mobile Money
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewModal} onOpenChange={() => setPreviewModal(null)}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-[95vw] sm:max-w-4xl max-h-[95vh] flex flex-col overflow-hidden m-2 sm:m-0">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-between">
              <span>{previewModal?.name || 'Document Preview'}</span>
              <button
                onClick={() => setPreviewModal(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {previewModal?.type === 'image' && previewModal && (
              <img
                src={previewModal.url}
                alt={previewModal.name}
                className="max-w-full h-auto mx-auto rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-image.png';
                }}
              />
            )}
            {previewModal?.type === 'pdf' && previewModal && (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <File className="w-24 h-24 text-red-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">{previewModal.name}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(previewModal.url, '_blank')}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewModal.url;
                      link.download = previewModal.name;
                      link.click();
                    }}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
                <iframe
                  src={previewModal.url}
                  className="w-full h-[600px] mt-4 border border-gray-300 dark:border-gray-700 rounded"
                  title={previewModal.name}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </React.Fragment>
  );
};

export default ProfilePage;
