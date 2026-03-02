import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Calendar, Download, CreditCard, Plus, Trash2, FileText, ArrowRight, Loader2, ArrowUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { subscriptionApi } from '@/services/subscriptionApi';
import { useToastStore } from '@/stores/toastStore';

interface Tier {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    products: string;
    storage: string;
    analytics: boolean;
  };
  current?: boolean;
  popular?: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  plan: string;
  planId: string;
  period: string;
  periodType: string;
  commission: number;
  processingFees: number;
  otherFees: number;
  adjustments: number;
  netPayout: number;
  payoutDate: string;
  payoutStatus: string;
  payoutMethod: string;
  payoutReference: string | null;
  paymentMethodId: string | null;
  paymentDate: string;
  transactionId: string | null;
  gatewayRef: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const SubscriptionTiers: React.FC = () => {
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'plan' | 'billing' | 'payment'>('plan');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [upgradeSuccessData, setUpgradeSuccessData] = useState<any>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const [deleteMethodName, setDeleteMethodName] = useState<string>('');
  const [isOnlyPaymentMethod, setIsOnlyPaymentMethod] = useState(false);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  
  // Billing history filters
  const [billingFilters, setBillingFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [billingSummary, setBillingSummary] = useState<any>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const billingHistoryContainerRef = useRef<HTMLDivElement>(null);
  const [showACHModal, setShowACHModal] = useState(false);
  const [showWireModal, setShowWireModal] = useState(false);
  const [b2bRequests, setB2bRequests] = useState<any[]>([]);
  const [submittingB2B, setSubmittingB2B] = useState(false);
  
  // B2B Form states
  const [b2bFormData, setB2bFormData] = useState({
    companyName: '',
    businessLegalName: '',
    taxId: '',
    taxIdType: 'EIN',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    annualContractValue: '',
    currency: 'USD',
    country: 'US',
    bankName: '',
    accountType: '',
    routingNumber: '',
    accountNumber: '',
    swiftCode: '',
    iban: '',
    notes: '',
  });

  // Data states
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentIcons, setPaymentIcons] = useState<{ visa?: string; mtn?: string; airtel?: string }>({});
  const [payoutSchedule, setPayoutSchedule] = useState<any>(null);

  // Loading states
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [deletingCard, setDeletingCard] = useState<string | null>(null);

  // Form states for add payment method
  const [paymentMethodType, setPaymentMethodType] = useState<'visa' | 'mtn' | 'airtel'>('visa');
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });
  const [mobileMoneyData, setMobileMoneyData] = useState({
    phoneNumber: '',
    provider: 'mtn' as 'mtn' | 'airtel',
    accountName: '',
  });
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const response = await subscriptionApi.getPlans();
        setTiers(response.plans || []);
        if (response.paymentIcons) {
          setPaymentIcons(response.paymentIcons);
        }
      } catch (error: any) {
        console.error('Error fetching plans:', error);
        showToast(error.message || 'Failed to load subscription plans', 'error');
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [showToast]);

  // Fetch current subscription
  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      try {
        setLoadingSubscription(true);
        const response = await subscriptionApi.getCurrentSubscription();
        setCurrentSubscription(response.subscription);
      } catch (error: any) {
        console.error('Error fetching current subscription:', error);
        // Don't show error if no subscription exists yet
        if (error.message && !error.message.includes('No active subscription')) {
          showToast(error.message, 'error');
        }
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchCurrentSubscription();
  }, [showToast]);

  // Fetch invoices when billing tab is active or filters change
  useEffect(() => {
    if (activeTab === 'billing') {
      const fetchInvoices = async () => {
        try {
          setLoadingInvoices(true);
          const response = await subscriptionApi.getBillingHistory(billingFilters);
          setInvoices(response.invoices || []);
          setBillingSummary(response.summary || null);
        } catch (error: any) {
          console.error('Error fetching invoices:', error);
          showToast(error.message || 'Failed to load billing history', 'error');
        } finally {
          setLoadingInvoices(false);
        }
      };

      fetchInvoices();
    }
  }, [activeTab, billingFilters, showToast]);

  // Fetch payment methods when payment tab is active
  useEffect(() => {
    if (activeTab === 'payment' && paymentMethods.length === 0) {
      const fetchPaymentMethods = async () => {
        try {
          setLoadingPaymentMethods(true);
          const response = await subscriptionApi.getPaymentMethods();
          setPaymentMethods(response.paymentMethods || []);
          if (response.paymentIcons) {
            setPaymentIcons(response.paymentIcons);
          }
        } catch (error: any) {
          console.error('Error fetching payment methods:', error);
          showToast(error.message || 'Failed to load payment methods', 'error');
        } finally {
          setLoadingPaymentMethods(false);
        }
      };

      fetchPaymentMethods();
    }
  }, [activeTab, paymentMethods.length, showToast]);

  // Fetch payout schedule when payment tab is active
  useEffect(() => {
    if (activeTab === 'payment' && !payoutSchedule) {
      const fetchPayoutSchedule = async () => {
        try {
          const response = await subscriptionApi.getPayoutSchedule();
          setPayoutSchedule(response);
        } catch (error: any) {
          console.error('Error fetching payout schedule:', error);
        }
      };

      fetchPayoutSchedule();
    }
  }, [activeTab, payoutSchedule]);

  // Fetch B2B payment requests when payment tab is active
  useEffect(() => {
    if (activeTab === 'payment') {
      const fetchB2BRequests = async () => {
        try {
          const response = await subscriptionApi.getB2BPaymentRequests();
          setB2bRequests(response.requests || []);
        } catch (error: any) {
          console.error('Error fetching B2B requests:', error);
        }
      };

      fetchB2BRequests();
    }
  }, [activeTab]);

  const renewalDate = currentSubscription?.renewalDate || '';

  const handleUpgrade = (tierId: string) => {
    setSelectedTier(tierId);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedTier) return;

    setUpgrading(true);
    
    // Use result-based pattern - no try/catch needed, no errors thrown
    const result = await subscriptionApi.upgradeSubscription(selectedTier);
    
    if (result.success && result.data) {
      // Success case - no errors thrown, no console errors
      setUpgradeSuccessData({
        tierName: tiers.find(t => t.id === selectedTier)?.name,
        price: tiers.find(t => t.id === selectedTier)?.price,
        transactionId: result.data.payment?.transactionId,
        amount: result.data.payment?.amount,
      });
      
      // Show success toast
      const planName = tiers.find(t => t.id === selectedTier)?.name || 'plan';
      showToast(`Successfully ${currentSubscription ? 'upgraded to' : 'subscribed to'} ${planName}!`, 'success');
      
      // Close upgrade modal and show success modal
      setShowUpgradeModal(false);
      setShowSuccessModal(true);
      setSelectedTier(null);
      
      // Refresh data
      const [plansRes, subscriptionRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrentSubscription(),
      ]);
      setTiers(plansRes.plans || []);
      setCurrentSubscription(subscriptionRes.subscription);
    } else if (result.error) {
      // Handle expected errors gracefully - no error thrown, no console errors
      if (result.error.requiresPaymentMethod) {
        // Payment method required - show guidance, not error
        showToast(
          'A payment method is required for paid plans. We\'ll help you add one now.',
          'info',
          6000
        );
        // Close upgrade modal first
        setShowUpgradeModal(false);
        // Then switch to payment tab
        setTimeout(() => {
          setActiveTab('payment');
          // Open add card modal after tab switch
          setTimeout(() => {
            setShowAddCard(true);
          }, 500);
        }, 200);
      } else {
        // Other errors - still no error thrown, just show message
        showToast(result.error.message || 'Failed to upgrade subscription', 'error');
        setShowUpgradeModal(false);
      }
    }
    
    setUpgrading(false);
  };

  const handleAddPaymentMethod = async () => {
    setModalMessage(null); // Clear previous messages
    
    // Validate based on payment method type
    if (paymentMethodType === 'visa') {
      if (!cardData.cardNumber || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvv || !cardData.cardholderName) {
        setModalMessage({ type: 'error', text: 'Please fill in all card details' });
        return;
      }
    } else {
      // MTN or Airtel
      if (!mobileMoneyData.phoneNumber || !mobileMoneyData.accountName) {
        setModalMessage({ type: 'error', text: 'Please fill in all mobile money details' });
        return;
      }
    }

    try {
      setAddingCard(true);
      setModalMessage(null);
      const payload = paymentMethodType === 'visa' 
        ? { ...cardData, type: 'visa' as const }
        : { ...mobileMoneyData, type: mobileMoneyData.provider as 'mtn' | 'airtel' };
      
      const response = await subscriptionApi.addPaymentMethod(payload);
      
      // Check if subscription was reactivated
      const subscriptionReactivated = response.subscriptionReactivated;
      
      // Show success message in modal
      if (subscriptionReactivated) {
        setModalMessage({ 
          type: 'success', 
          text: 'Payment method added and subscription reactivated successfully!' 
        });
        // Also show toast for reactivation
        showToast('Your subscription has been reactivated!', 'success', 5000);
      } else {
        setModalMessage({ type: 'success', text: 'Payment method added successfully!' });
      }
      
      // Clear form data
      setCardData({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardholderName: '',
      });
      setMobileMoneyData({
        phoneNumber: '',
        provider: 'mtn',
        accountName: '',
      });
      
      // Optimistically add the payment method from response
      if (response.paymentMethod) {
        setPaymentMethods(prev => {
          // Check if it's already in the list to avoid duplicates
          const exists = prev.some(pm => pm.id === response.paymentMethod.id);
          if (exists) return prev;
          return [...prev, response.paymentMethod];
        });
      }
      
      // Refresh payment methods and subscription from server to ensure sync
      // Add a small delay to ensure database has committed
      setTimeout(async () => {
        try {
          const [methodsRes, subscriptionRes] = await Promise.all([
            subscriptionApi.getPaymentMethods(),
            subscriptionReactivated ? subscriptionApi.getCurrentSubscription() : null,
          ]);
          
          setPaymentMethods(methodsRes.paymentMethods || []);
          if (methodsRes.paymentIcons) {
            setPaymentIcons(methodsRes.paymentIcons);
          }
          
          // Refresh subscription if it was reactivated
          if (subscriptionReactivated && subscriptionRes) {
            setCurrentSubscription(subscriptionRes.subscription);
          }
        } catch (refreshError) {
          console.error('Error refreshing data:', refreshError);
          // Don't show error to user, the optimistic update should be enough
        }
      }, 500);
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        setShowAddCard(false);
        setPaymentMethodType('visa');
        setModalMessage(null);
      }, 1500);
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      setModalMessage({ type: 'error', text: error.message || 'Failed to add payment method' });
    } finally {
      setAddingCard(false);
    }
  };

  const handleDeleteCard = (paymentMethodId: string) => {
    const method = paymentMethods.find(m => m.id === paymentMethodId);
    const methodName = method?.type === 'visa' || method?.type === 'card' 
      ? `${method.brand || 'Visa'} ending in ${method.last4}`
      : `${method?.type.toUpperCase()} •••• ${method?.last4 || ''}`;
    
    // Check if this is the only payment method
    // Backend already filters inactive payment methods, so all in array are active
    const onlyMethod = paymentMethods.length === 1;
    
    setDeleteMethodId(paymentMethodId);
    setDeleteMethodName(methodName);
    setIsOnlyPaymentMethod(onlyMethod);
    setShowDeleteConfirm(true);
  };

  // Verify password before deletion
  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/profile/me/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        setPasswordError(error.message || 'Invalid password');
        return false;
      }

      setPasswordError('');
      return true;
    } catch (error: any) {
      setPasswordError('Failed to verify password. Please try again.');
      return false;
    }
  };

  const confirmDeleteCard = async () => {
    if (!deleteMethodId) return;

    // Verify password first
    if (!deletePassword) {
      setPasswordError('Password is required to confirm deletion');
      return;
    }

    setVerifyingPassword(true);
    setPasswordError('');

    const isValidPassword = await verifyPassword(deletePassword);
    setVerifyingPassword(false);

    if (!isValidPassword) {
      return; // Error already set by verifyPassword
    }

    setDeletingCard(deleteMethodId);
    
    // Use result-based pattern - no try/catch needed, no errors thrown
    const result = await subscriptionApi.deletePaymentMethod(deleteMethodId, deletePassword);
    
    if (result.success) {
      // Success case - no errors thrown, no console errors
      // Close delete modal first
      setShowDeleteConfirm(false);
      const methodNameToDelete = deleteMethodName;
      const wasOnlyMethod = isOnlyPaymentMethod;
      setDeleteMethodId(null);
      setDeleteMethodName('');
      setIsOnlyPaymentMethod(false);
      setDeletePassword('');
      setPasswordError('');
      
      // Optimistically remove from list
      setPaymentMethods(prev => prev.filter(pm => pm.id !== deleteMethodId));
      
      // Refresh payment methods from server to ensure sync
      setTimeout(async () => {
        try {
          const methodsRes = await subscriptionApi.getPaymentMethods();
          setPaymentMethods(methodsRes.paymentMethods || []);
          if (methodsRes.paymentIcons) {
            setPaymentIcons(methodsRes.paymentIcons);
          }
        } catch (refreshError) {
          console.error('Error refreshing payment methods:', refreshError);
          // Don't show error to user, the optimistic update should be enough
        }
      }, 300);
      
      // Check if subscription was suspended
      const subscriptionSuspended = result.data?.subscriptionSuspended;
      
      if (subscriptionSuspended) {
        // Subscription was suspended - show important warning
        showToast(
          result.data?.warning || 'Your subscription has been suspended. Please add a payment method to reactivate it.',
          'warning',
          8000 // Longer duration for important message
        );
      } else {
        showToast(`${methodNameToDelete} has been removed successfully`, 'success');
      }
      
      // If it was the only payment method, show add payment method modal
      // Give user a moment to see the success/warning message first
      if (wasOnlyMethod || subscriptionSuspended) {
        setTimeout(() => {
          // Open add payment method modal after a short delay
          setTimeout(() => {
            setShowAddCard(true);
          }, subscriptionSuspended ? 2000 : 1000); // Longer delay if suspended
        }, 500);
      }
    } else if (result.error) {
      // Handle expected errors gracefully - no error thrown, no console errors
      if (result.error.isOnlyPaymentMethod) {
        // This should not happen if user confirmed in the warning modal
        // But handle it gracefully just in case
        showToast(
          'Unable to delete. A payment method is required for subscription billing.',
          'error'
        );
        setShowDeleteConfirm(false);
        setDeletePassword('');
        setPasswordError('');
      } else {
        // Other errors - still no error thrown, just show message
        showToast(result.error.message || 'Failed to remove payment method', 'error');
        setShowDeleteConfirm(false);
        setDeletePassword('');
        setPasswordError('');
      }
    }
    
    setDeletingCard(null);
  };


  // Download invoice
  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await subscriptionApi.downloadInvoice(invoiceId);
      
      if (response.invoiceUrl) {
        // If invoice has a URL, open it in a new tab
        window.open(response.invoiceUrl, '_blank');
        showToast('Invoice opened in new tab', 'success');
      } else {
        // Otherwise, generate a simple text invoice for download
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) {
          showToast('Invoice not found', 'error');
          return;
        }

        const invoiceContent = `
INVOICE
Invoice Number: ${invoice.invoiceNumber}
Date: ${invoice.date}
Plan: ${invoice.plan}
Period: ${invoice.period}

BILLING DETAILS
Subscription Amount: ${invoice.currency} ${invoice.amount.toFixed(2)}
Status: ${invoice.status.toUpperCase()}

COMMISSION BREAKDOWN
Gross Commission: ${invoice.currency} ${invoice.commission.toFixed(2)}
Processing Fees: -${invoice.currency} ${invoice.processingFees.toFixed(2)}
Other Fees: -${invoice.currency} ${invoice.otherFees.toFixed(2)}
Adjustments: ${invoice.currency} ${invoice.adjustments.toFixed(2)}
Net Payout: ${invoice.currency} ${invoice.netPayout.toFixed(2)}

PAYOUT INFORMATION
Payout Date: ${invoice.payoutDate}
Payout Status: ${invoice.payoutStatus}
Payout Method: ${invoice.payoutMethod}
${invoice.payoutReference ? `Payout Reference: ${invoice.payoutReference}` : ''}

PAYMENT INFORMATION
Payment Date: ${invoice.paymentDate}
${invoice.transactionId ? `Transaction ID: ${invoice.transactionId}` : ''}
${invoice.gatewayRef ? `Gateway Reference: ${invoice.gatewayRef}` : ''}
        `.trim();

        const blob = new Blob([invoiceContent], { type: 'text/plain' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `invoice-${invoiceNumber}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('Invoice downloaded successfully', 'success');
      }
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      showToast(error.message || 'Failed to download invoice', 'error');
    }
  };

  // Handle B2B Payment Request Submission
  const handleSubmitB2BRequest = async (type: 'ach' | 'wire') => {
    try {
      setSubmittingB2B(true);
      
      const payload = {
        type,
        companyName: b2bFormData.companyName,
        businessLegalName: b2bFormData.businessLegalName,
        taxId: b2bFormData.taxId,
        taxIdType: b2bFormData.taxIdType,
        contactName: b2bFormData.contactName,
        contactEmail: b2bFormData.contactEmail,
        contactPhone: b2bFormData.contactPhone,
        annualContractValue: b2bFormData.annualContractValue ? parseFloat(b2bFormData.annualContractValue) : undefined,
        currency: b2bFormData.currency,
        country: b2bFormData.country,
        bankName: b2bFormData.bankName || undefined,
        accountType: b2bFormData.accountType || undefined,
        routingNumber: b2bFormData.routingNumber || undefined,
        accountNumber: b2bFormData.accountNumber || undefined,
        swiftCode: b2bFormData.swiftCode || undefined,
        iban: b2bFormData.iban || undefined,
        notes: b2bFormData.notes || undefined,
      };

      const response = await subscriptionApi.submitB2BPaymentRequest(payload);
      
      showToast(response.message || `${type.toUpperCase()} request submitted successfully`, 'success');
      
      // Reset form
      setB2bFormData({
        companyName: '',
        businessLegalName: '',
        taxId: '',
        taxIdType: 'EIN',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        annualContractValue: '',
        currency: 'USD',
        country: 'US',
        bankName: '',
        accountType: '',
        routingNumber: '',
        accountNumber: '',
        swiftCode: '',
        iban: '',
        notes: '',
      });

      // Close modal
      if (type === 'ach') {
        setShowACHModal(false);
      } else {
        setShowWireModal(false);
      }

      // Refresh B2B requests
      const requestsRes = await subscriptionApi.getB2BPaymentRequests();
      setB2bRequests(requestsRes.requests || []);
    } catch (error: any) {
      console.error('Error submitting B2B request:', error);
      showToast(error.message || 'Failed to submit request', 'error');
    } finally {
      setSubmittingB2B(false);
    }
  };

  // Export billing history to CSV
  const handleExportCSV = () => {
    if (invoices.length === 0) {
      showToast('No billing history to export', 'error');
      return;
    }

    // CSV Headers with all fields
    const headers = [
      'Invoice ID',
      'Invoice Number',
      'Date',
      'Plan',
      'Period',
      'Period Type',
      'Amount',
      'Currency',
      'Status',
      'Gross Commission',
      'Processing Fees',
      'Other Fees',
      'Adjustments',
      'Net Payout',
      'Payout Date',
      'Payout Status',
      'Payout Method',
      'Payout Reference',
      'Payment Date',
      'Transaction ID',
      'Gateway Reference',
      'Created At',
      'Updated At',
    ];

    // CSV Rows
    const rows = invoices.map((invoice) => [
      invoice.id,
      invoice.invoiceNumber || invoice.id,
      invoice.date,
      invoice.plan,
      invoice.period,
      invoice.periodType || '',
      invoice.amount.toFixed(2),
      invoice.currency || 'USD',
      invoice.status,
      invoice.commission.toFixed(2),
      invoice.processingFees.toFixed(2),
      invoice.otherFees.toFixed(2),
      invoice.adjustments?.toFixed(2) || '0.00',
      invoice.netPayout.toFixed(2),
      invoice.payoutDate || '',
      invoice.payoutStatus || '',
      invoice.payoutMethod || '',
      invoice.payoutReference || '',
      invoice.paymentDate || '',
      invoice.transactionId || '',
      invoice.gatewayRef || '',
      invoice.createdAt || '',
      invoice.updatedAt || '',
    ]);

    // Escape CSV values
    const escapeCSV = (value: string | number) => {
      const str = String(value || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Create CSV content
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `billing-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Billing history exported successfully', 'success');
  };

  const handleSetDefaultCard = async (paymentMethodId: string) => {
    try {
      // Optimistic update - update UI immediately
      setPaymentMethods(prev => prev.map(pm => ({
        ...pm,
        isDefault: pm.id === paymentMethodId
      })));
      
      await subscriptionApi.setDefaultPaymentMethod(paymentMethodId);
      showToast('Default payment method updated', 'success');
      
      // Refresh payment methods from server to ensure sync
      setTimeout(async () => {
        try {
          const methodsRes = await subscriptionApi.getPaymentMethods();
          setPaymentMethods(methodsRes.paymentMethods || []);
          if (methodsRes.paymentIcons) {
            setPaymentIcons(methodsRes.paymentIcons);
          }
        } catch (refreshError) {
          console.error('Error refreshing payment methods:', refreshError);
          // Don't show error to user, the optimistic update should be enough
        }
      }, 300);
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      showToast(error.message || 'Failed to set default payment method', 'error');
      
      // Revert optimistic update on error
      setTimeout(async () => {
        try {
          const methodsRes = await subscriptionApi.getPaymentMethods();
          setPaymentMethods(methodsRes.paymentMethods || []);
        } catch (refreshError) {
          console.error('Error refreshing payment methods:', refreshError);
        }
      }, 300);
    }
  };

  const handlePayoutFrequencyChange = async (frequency: string) => {
    try {
      const mappedFrequency = frequency === 'Bi-weekly' ? 'bi_weekly' : frequency.toLowerCase();
      const updateResponse = await subscriptionApi.updatePayoutSchedule(mappedFrequency as 'weekly' | 'bi_weekly' | 'monthly');
      
      // Update state immediately with the response from the update
      setPayoutSchedule({
        frequency: updateResponse.frequency,
        nextPayoutDate: updateResponse.nextPayoutDate,
        lastPayoutDate: updateResponse.lastPayoutDate || payoutSchedule?.lastPayoutDate || null,
      });
      
      showToast('Payout schedule updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating payout schedule:', error);
      showToast(error.message || 'Failed to update payout schedule', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
            <Crown className="w-8 h-8 text-red-400" />
            Subscription & Billing
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Manage your subscription plan and billing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700/30">
        {[
          { id: 'plan', label: 'Current Plan' },
          { id: 'billing', label: 'Billing History' },
          { id: 'payment', label: 'Payment Methods' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium transition-colors duration-300 border-b-2 ${
              activeTab === tab.id
                ? 'border-red-500 text-red-500 dark:text-red-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Current Plan Tab */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {loadingSubscription ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-400" />
            </div>
          ) : currentSubscription ? (
            <>
              {/* Current Plan Display */}
              <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 rounded-xl p-6 border border-red-200 dark:border-red-500/30">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Crown className="w-8 h-8 text-red-400" />
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">{currentSubscription.name} Plan</h2>
                      <span className="px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-xs font-semibold border border-green-500/30">
                        Active
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mt-4 transition-colors duration-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Renewal Date: {renewalDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>Product Limit: {currentSubscription.limits?.products || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>Storage: {currentSubscription.limits?.storage || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>Analytics Access: {currentSubscription.limits?.analytics ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                      ${currentSubscription.price}
                      {currentSubscription.price > 0 && <span className="text-lg text-gray-600 dark:text-gray-400">/month</span>}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {/* Available Plans */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">Available Plans</h3>
            {loadingPlans ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tiers.map((tier, index) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border-2 ${
                    tier.popular ? 'border-red-500/50' : 'border-gray-200 dark:border-gray-700/30'
                  } relative transition-colors duration-300`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  )}
                  {tier.current && (
                    <div className="absolute top-4 right-4 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30">
                      Current Plan
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">{tier.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white transition-colors duration-300">${tier.price}</span>
                      {tier.price > 0 && <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300">/month</span>}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5 transition-colors duration-300" />
                        <span className="text-gray-700 dark:text-gray-300 transition-colors duration-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      tier.current
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                    }`}
                    disabled={tier.current}
                    onClick={() => !tier.current && handleUpgrade(tier.id)}
                  >
                    {tier.current ? 'Current Plan' : tier.price === 0 ? 'Get Started' : 'Upgrade'}
                    {!tier.current && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </motion.div>
              ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing History Tab */}
      {activeTab === 'billing' && (
        <div 
          ref={billingHistoryContainerRef}
          className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300 space-y-6 relative max-h-[calc(100vh-200px)] overflow-y-auto"
          onScroll={() => {
            if (billingHistoryContainerRef.current) {
              const scrollTop = billingHistoryContainerRef.current.scrollTop;
              setShowScrollToTop(scrollTop > 300);
            }
          }}
        >
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-400" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No billing history found</p>
            </div>
          ) : (
            <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-red-400" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                  Billing & Payout History
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
                  Transparent breakdown of subscription charges, commissions, fees, and seller payouts.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-700 text-xs"
              onClick={handleExportCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <input
                type="text"
                placeholder="Invoice #, Plan, Transaction ID..."
                value={billingFilters.search}
                onChange={(e) => setBillingFilters({ ...billingFilters, search: e.target.value })}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={billingFilters.status}
                onChange={(e) => setBillingFilters({ ...billingFilters, status: e.target.value })}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={billingFilters.startDate}
                onChange={(e) => setBillingFilters({ ...billingFilters, startDate: e.target.value })}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={billingFilters.endDate}
                onChange={(e) => setBillingFilters({ ...billingFilters, endDate: e.target.value })}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
              <p className="text-gray-500 dark:text-gray-400">Total Invoices</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {billingSummary?.totalInvoices || invoices.length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
              <p className="text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                ${(billingSummary?.totalAmount || invoices.reduce((sum, inv) => sum + inv.amount, 0)).toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
              <p className="text-gray-500 dark:text-gray-400">Total Net Payouts</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                ${(billingSummary?.totalNetPayout || invoices.reduce((sum, inv) => sum + inv.netPayout, 0)).toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
              <p className="text-gray-500 dark:text-gray-400">Total Fees</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                ${(billingSummary?.totalFees || invoices.reduce((sum, inv) => sum + inv.processingFees + inv.otherFees, 0)).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {invoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 transition-colors duration-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                        {invoice.invoiceNumber || invoice.id} • {invoice.plan}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        {invoice.date} • {invoice.period}
                        {invoice.transactionId && ` • TXN: ${invoice.transactionId.slice(-8)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white transition-colors duration-300">
                        {invoice.currency || 'USD'} {invoice.amount.toFixed(2)}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : invoice.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => handleDownloadInvoice(invoice.id, invoice.invoiceNumber || invoice.id)}
                      title="Download Invoice"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-600 dark:text-gray-300"
                      onClick={() =>
                        setExpandedInvoice(
                          expandedInvoice === invoice.id ? null : invoice.id
                        )
                      }
                    >
                      {expandedInvoice === invoice.id ? 'Hide breakdown' : 'View breakdown'}
                    </Button>
                  </div>
                </div>

                {expandedInvoice === invoice.id && (
                  <div className="mt-4 space-y-4">
                    {/* Commission Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                        <p className="text-gray-500 dark:text-gray-400">Gross Commission</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                          {invoice.currency} {invoice.commission.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                        <p className="text-gray-500 dark:text-gray-400">Processing Fees</p>
                        <p className="mt-1 font-semibold text-red-600 dark:text-red-400">
                          -{invoice.currency} {invoice.processingFees.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                        <p className="text-gray-500 dark:text-gray-400">Other Fees</p>
                        <p className="mt-1 font-semibold text-red-600 dark:text-red-400">
                          -{invoice.currency} {invoice.otherFees.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/60">
                        <p className="text-gray-600 dark:text-gray-300">Net Payout</p>
                        <p className="mt-1 font-semibold text-green-700 dark:text-green-300">
                          {invoice.currency} {invoice.netPayout.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/60 text-xs">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Payment Information</h4>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400">
                          <p>Payment Date: {invoice.paymentDate || 'N/A'}</p>
                          {invoice.transactionId && <p>Transaction ID: {invoice.transactionId}</p>}
                          {invoice.gatewayRef && <p>Gateway Ref: {invoice.gatewayRef}</p>}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Payout Information</h4>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400">
                          <p>Scheduled Date: {invoice.payoutDate || 'N/A'}</p>
                          <p>Status: <span className={`font-semibold ${
                            invoice.payoutStatus === 'completed' ? 'text-green-600 dark:text-green-400' :
                            invoice.payoutStatus === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>{invoice.payoutStatus || 'pending'}</span></p>
                          <p>Method: {invoice.payoutMethod || 'bank_transfer'}</p>
                          {invoice.payoutReference && <p>Reference: {invoice.payoutReference}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
            </>
          )}

          {/* Scroll to Top Button for Billing History */}
          {showScrollToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                if (billingHistoryContainerRef.current) {
                  billingHistoryContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              title="Scroll to top"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-red-400" />
                Payment Methods
              </h2>
              <Button 
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                onClick={() => setShowAddCard(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
            {loadingPaymentMethods ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-400" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No payment methods found</p>
                <Button 
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  onClick={() => setShowAddCard(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Payment Card
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method, index) => (
                <motion.div
                  key={method.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group relative p-4 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 ${
                    method.isDefault 
                      ? 'border-green-500 dark:border-green-600 shadow-md' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Payment Icon */}
                      <div className="flex-shrink-0">
                        {method.type === 'card' || method.type === 'visa' ? (
                          paymentIcons.visa ? (
                            <img 
                              src={`http://localhost:5000${paymentIcons.visa}`} 
                              alt="Visa" 
                              className="w-14 h-9 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : (
                            <div className="w-14 h-9 bg-blue-600 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-xs">VISA</span>
                            </div>
                          )
                        ) : method.type === 'mtn' ? (
                          paymentIcons.mtn ? (
                            <img 
                              src={`http://localhost:5000${paymentIcons.mtn}`} 
                              alt="MTN" 
                              className="w-14 h-9 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : (
                            <div className="w-14 h-9 bg-yellow-500 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-xs">MTN</span>
                            </div>
                          )
                        ) : method.type === 'airtel' ? (
                          paymentIcons.airtel ? (
                            <img 
                              src={`http://localhost:5000${paymentIcons.airtel}`} 
                              alt="Airtel" 
                              className="w-14 h-9 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : (
                            <div className="w-14 h-9 bg-red-600 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-xs">AIRTEL</span>
                            </div>
                          )
                        ) : (
                          <CreditCard className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Payment Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white text-base">
                            {method.type === 'card' || method.type === 'visa' 
                              ? `${method.brand || 'Visa'} ending in ${method.last4}`
                              : method.type === 'mtn' || method.type === 'airtel'
                              ? `${method.type.toUpperCase()} •••• ${method.last4 || method.phoneNumber?.slice(-4) || ''}`
                              : `${method.brand} ending in ${method.last4}`}
                          </p>
                          {method.isDefault && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-semibold whitespace-nowrap">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {method.type === 'card' || method.type === 'visa' 
                            ? `Expires ${method.expiry}`
                            : method.type === 'mtn' || method.type === 'airtel'
                            ? `Phone: ${method.phoneNumber || 'N/A'}`
                            : `Expires ${method.expiry}`}
                        </p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {!method.isDefault && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs border-gray-300 dark:border-gray-600"
                          onClick={() => handleSetDefaultCard(method.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => handleDeleteCard(method.id)}
                        disabled={deletingCard === method.id}
                      >
                        {deletingCard === method.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
                ))}
              
              {/* Payment Integration Note */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>💳 Payment Integration:</strong> Real payment gateway integration requires just one line of code. 
                  Replace <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">simulatePayment()</code> with your payment provider API call.
                </p>
              </div>
              </div>
            )}
          </div>

          {/* B2B Payment Options & Payouts */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              B2B Payment Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
                  ACH Bank Transfer (Annual Enterprise)
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300">
                  Lock in annual enterprise plans via ACH with reduced processing fees and auto-renewal options.
                </p>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300">
                  <p>• Currency: USD</p>
                  <p>• Settlement window: 3–5 business days</p>
                  <p>• Ideal for contracts ≥ $5,000 / year</p>
                </div>
                {(() => {
                  const achRequest = b2bRequests.find((r: any) => r.type === 'ach');
                  return (
                    <div className="space-y-2">
                      {achRequest && (
                        <div className={`p-2 rounded text-xs mb-2 ${
                          achRequest.status === 'approved' || achRequest.status === 'active'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : achRequest.status === 'pending'
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        }`}>
                          Status: <strong>{achRequest.status.charAt(0).toUpperCase() + achRequest.status.slice(1)}</strong>
                          {achRequest.instructions && (
                            <p className="mt-1 text-[10px]">{achRequest.instructions}</p>
                          )}
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        className="border-gray-300 dark:border-gray-700 text-xs w-full"
                        onClick={() => setShowACHModal(true)}
                        disabled={achRequest?.status === 'pending' || achRequest?.status === 'active'}
                      >
                        {achRequest ? 'View Request' : 'Request ACH Details'}
                      </Button>
                    </div>
                  );
                })()}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
                  Wire Transfer (Enterprise Contracts)
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300">
                  Support one-off or annual enterprise invoices via domestic or international wire transfer.
                </p>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300">
                  <p>• Currency: Multi-currency support</p>
                  <p>• Settlement window: Same-day / next-day (bank dependent)</p>
                  <p>• Recommended for large B2B deals</p>
                </div>
                {(() => {
                  const wireRequest = b2bRequests.find((r: any) => r.type === 'wire');
                  return (
                    <div className="space-y-2">
                      {wireRequest && (
                        <div className={`p-2 rounded text-xs mb-2 ${
                          wireRequest.status === 'approved' || wireRequest.status === 'active'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : wireRequest.status === 'pending'
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        }`}>
                          Status: <strong>{wireRequest.status.charAt(0).toUpperCase() + wireRequest.status.slice(1)}</strong>
                          {wireRequest.instructions && (
                            <p className="mt-1 text-[10px]">{wireRequest.instructions}</p>
                          )}
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        className="border-gray-300 dark:border-gray-700 text-xs w-full"
                        onClick={() => setShowWireModal(true)}
                        disabled={wireRequest?.status === 'pending' || wireRequest?.status === 'active'}
                      >
                        {wireRequest ? 'View Request' : 'Request Wire Instructions'}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Payout Schedule */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">Payout Schedule</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Frequency</span>
                <select 
                  className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                  value={
                    payoutSchedule?.frequency === 'bi_weekly' 
                      ? 'Bi-weekly' 
                      : payoutSchedule?.frequency === 'weekly'
                      ? 'Weekly'
                      : payoutSchedule?.frequency === 'monthly'
                      ? 'Monthly'
                      : 'Weekly'
                  }
                  onChange={(e) => handlePayoutFrequencyChange(e.target.value)}
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Next Payout</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                  {payoutSchedule?.nextPayoutDate || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Upgrade Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are about to upgrade to the {tiers.find(t => t.id === selectedTier)?.name} plan.
            </p>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Payment will be processed securely</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${tiers.find(t => t.id === selectedTier)?.price}/month
              </p>
            </div>
            
            {/* Check if payment method is needed */}
            {(() => {
              const selectedTierData = tiers.find(t => t.id === selectedTier);
              const requiresPayment = selectedTierData && selectedTierData.price > 0;
              // Backend already filters inactive payment methods, so if length > 0, we have active methods
              const hasPaymentMethod = paymentMethods.length > 0;
              
              if (requiresPayment && !hasPaymentMethod) {
                return (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                          Payment Method Required
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                          To subscribe to a paid plan, you need to add a payment method first. This ensures secure billing for your subscription.
                        </p>
                        <Button
                          className="bg-amber-600 hover:bg-amber-700 text-white text-sm"
                          onClick={() => {
                            setShowUpgradeModal(false);
                            setTimeout(() => {
                              setActiveTab('payment');
                              setTimeout(() => {
                                setShowAddCard(true);
                              }, 300);
                            }, 100);
                          }}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Add Payment Method
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUpgradeModal(false)} disabled={upgrading}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                onClick={handleConfirmUpgrade}
                disabled={upgrading || (tiers.find(t => t.id === selectedTier)?.price > 0 && paymentMethods.length === 0)}
              >
                {upgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Upgrade'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Check className="w-6 h-6 text-green-500" />
              Upgrade Successful!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/50">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                Your subscription has been upgraded successfully!
              </p>
              <div className="space-y-1 text-sm text-green-700 dark:text-green-400">
                <p><span className="font-medium">New Plan:</span> {upgradeSuccessData?.tierName}</p>
                <p><span className="font-medium">Price:</span> ${upgradeSuccessData?.price}/month</p>
                {upgradeSuccessData?.transactionId && (
                  <p><span className="font-medium">Transaction ID:</span> {upgradeSuccessData.transactionId}</p>
                )}
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> Payment processing integration will be available soon. This is a simulation.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                onClick={() => setShowSuccessModal(false)}
              >
                Got it!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Method Modal */}
      <Dialog open={showAddCard} onOpenChange={(open) => {
        setShowAddCard(open);
        if (!open) {
          setModalMessage(null);
          setPaymentMethodType('visa');
        }
      }}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">Add Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Success/Error Message */}
            {modalMessage && (
              <div className={`p-3 rounded-lg border ${
                modalMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50'
              }`}>
                <p className={`text-sm font-medium flex items-center gap-2 ${
                  modalMessage.type === 'success'
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {modalMessage.type === 'success' && <Check className="w-4 h-4" />}
                  {modalMessage.text}
                </p>
              </div>
            )}
            {/* Payment Method Type Selection - One Line */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Select Payment Method</label>
              <div className="flex gap-2">
                {/* Visa Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethodType('visa')}
                  className={`flex-1 p-2 rounded border-2 transition-all ${
                    paymentMethodType === 'visa'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-400'
                  }`}
                >
                  {paymentIcons.visa ? (
                    <img 
                      src={`http://localhost:5000${paymentIcons.visa}`} 
                      alt="Visa" 
                      className="w-full h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = (e.target as HTMLImageElement).nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-8 bg-blue-600 rounded flex items-center justify-center ${paymentIcons.visa ? 'hidden' : ''}`}>
                    <span className="text-white font-bold text-xs">VISA</span>
                  </div>
                </button>

                {/* MTN Mobile Money */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethodType('mtn');
                    setMobileMoneyData({ ...mobileMoneyData, provider: 'mtn' });
                  }}
                  className={`flex-1 p-2 rounded border-2 transition-all ${
                    paymentMethodType === 'mtn'
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-400'
                  }`}
                >
                  {paymentIcons.mtn ? (
                    <img 
                      src={`http://localhost:5000${paymentIcons.mtn}`} 
                      alt="MTN" 
                      className="w-full h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = (e.target as HTMLImageElement).nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-8 bg-yellow-500 rounded flex items-center justify-center ${paymentIcons.mtn ? 'hidden' : ''}`}>
                    <span className="text-white font-bold text-xs">MTN</span>
                  </div>
                </button>

                {/* Airtel Mobile Money */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethodType('airtel');
                    setMobileMoneyData({ ...mobileMoneyData, provider: 'airtel' });
                  }}
                  className={`flex-1 p-2 rounded border-2 transition-all ${
                    paymentMethodType === 'airtel'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-400'
                  }`}
                >
                  {paymentIcons.airtel ? (
                    <img 
                      src={`http://localhost:5000${paymentIcons.airtel}`} 
                      alt="Airtel" 
                      className="w-full h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = (e.target as HTMLImageElement).nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-8 bg-red-600 rounded flex items-center justify-center ${paymentIcons.airtel ? 'hidden' : ''}`}>
                    <span className="text-white font-bold text-xs">AIRTEL</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Visa Card Form */}
            {paymentMethodType === 'visa' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardData.cardNumber}
                    onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value.replace(/\s/g, '') })}
                    maxLength={16}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Month</label>
                    <input
                      type="text"
                      placeholder="12"
                      value={cardData.expiryMonth}
                      onChange={(e) => setCardData({ ...cardData, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                      maxLength={2}
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Year</label>
                    <input
                      type="text"
                      placeholder="2025"
                      value={cardData.expiryYear}
                      onChange={(e) => setCardData({ ...cardData, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      maxLength={4}
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      maxLength={4}
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardData.cardholderName}
                      onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                      className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Money Form (MTN/Airtel) */}
            {(paymentMethodType === 'mtn' || paymentMethodType === 'airtel') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder={paymentMethodType === 'mtn' ? '0244 123 456' : '0264 123 456'}
                    value={mobileMoneyData.phoneNumber}
                    onChange={(e) => setMobileMoneyData({ ...mobileMoneyData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={mobileMoneyData.accountName}
                    onChange={(e) => setMobileMoneyData({ ...mobileMoneyData, accountName: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => {
                setShowAddCard(false);
                setPaymentMethodType('visa');
                setCardData({ cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '', cardholderName: '' });
                setMobileMoneyData({ phoneNumber: '', provider: 'mtn', accountName: '' });
              }} disabled={addingCard}>
                Cancel
              </Button>
              <Button 
                className={`bg-gradient-to-r ${
                  paymentMethodType === 'visa'
                    ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    : paymentMethodType === 'mtn'
                    ? 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                    : 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                }`}
                onClick={handleAddPaymentMethod}
                disabled={addingCard}
              >
                {addingCard ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add ${paymentMethodType === 'visa' ? 'Card' : paymentMethodType.toUpperCase()}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => {
        setShowDeleteConfirm(open);
        if (!open) {
          setDeleteMethodId(null);
          setDeleteMethodName('');
          setIsOnlyPaymentMethod(false);
        }
      }}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {isOnlyPaymentMethod ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <Trash2 className="w-5 h-5 text-red-500" />
              )}
              {isOnlyPaymentMethod ? 'Warning: Last Payment Method' : 'Remove Payment Method'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {isOnlyPaymentMethod ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-3">
                  This is your only payment method
                </p>
                <p className="text-sm text-gray-900 dark:text-white mb-3">
                  A payment method is required for subscription billing. If you remove this payment method, you'll need to add a new one immediately to keep your subscription active.
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Are you sure you want to remove <strong>{deleteMethodName}</strong>?
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  After deletion, we'll help you add a new payment method.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700/50">
                <p className="text-sm text-gray-900 dark:text-white mb-2">
                  Are you sure you want to remove <strong>{deleteMethodName}</strong>?
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  This action cannot be undone. You'll need to add this payment method again if you want to use it later.
                </p>
              </div>
            )}
            
            {/* Password Verification */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter your password to confirm deletion
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter your password"
                className={`w-full bg-white dark:bg-gray-800 border ${
                  passwordError 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-700'
                } rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500`}
                disabled={deletingCard !== null || verifyingPassword}
                autoComplete="current-password"
              />
              {passwordError && (
                <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteMethodId(null);
                  setDeleteMethodName('');
                  setDeletePassword('');
                  setPasswordError('');
                }}
                disabled={deletingCard !== null || verifyingPassword}
              >
                Cancel
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDeleteCard}
                disabled={deletingCard !== null || verifyingPassword || !deletePassword}
              >
                {verifyingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : deletingCard ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ACH Request Modal */}
      <Dialog open={showACHModal} onOpenChange={setShowACHModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">Request ACH Bank Transfer Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> ACH transfers are ideal for annual enterprise contracts ≥ $5,000/year. Our team will review your request and provide bank details within 1-2 business days.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={b2bFormData.companyName}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, companyName: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Business Legal Name *</label>
                <input
                  type="text"
                  value={b2bFormData.businessLegalName}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, businessLegalName: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID *</label>
                <input
                  type="text"
                  value={b2bFormData.taxId}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, taxId: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID Type *</label>
                <select
                  value={b2bFormData.taxIdType}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, taxIdType: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EIN">EIN</option>
                  <option value="SSN">SSN</option>
                  <option value="VAT">VAT</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name *</label>
                <input
                  type="text"
                  value={b2bFormData.contactName}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, contactName: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email *</label>
                <input
                  type="email"
                  value={b2bFormData.contactEmail}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, contactEmail: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  value={b2bFormData.contactPhone}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, contactPhone: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Contract Value (USD)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={b2bFormData.annualContractValue}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, annualContractValue: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Country *</label>
                <input
                  type="text"
                  value={b2bFormData.country}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, country: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
              <textarea
                value={b2bFormData.notes}
                onChange={(e) => setB2bFormData({ ...b2bFormData, notes: e.target.value })}
                rows={3}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information about your business or payment requirements..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowACHModal(false)} disabled={submittingB2B}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                onClick={() => handleSubmitB2BRequest('ach')}
                disabled={submittingB2B || !b2bFormData.companyName || !b2bFormData.businessLegalName || !b2bFormData.taxId || !b2bFormData.contactName || !b2bFormData.contactEmail || !b2bFormData.contactPhone}
              >
                {submittingB2B ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wire Transfer Request Modal */}
      <Dialog open={showWireModal} onOpenChange={setShowWireModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">Request Wire Transfer Instructions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> Wire transfers support multi-currency and are recommended for large B2B deals. Our team will provide wire instructions within 1-2 business days.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={b2bFormData.companyName}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, companyName: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Business Legal Name *</label>
                <input
                  type="text"
                  value={b2bFormData.businessLegalName}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, businessLegalName: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID *</label>
                <input
                  type="text"
                  value={b2bFormData.taxId}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, taxId: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID Type *</label>
                <select
                  value={b2bFormData.taxIdType}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, taxIdType: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EIN">EIN</option>
                  <option value="SSN">SSN</option>
                  <option value="VAT">VAT</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name *</label>
                <input
                  type="text"
                  value={b2bFormData.contactName}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, contactName: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email *</label>
                <input
                  type="email"
                  value={b2bFormData.contactEmail}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, contactEmail: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  value={b2bFormData.contactPhone}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, contactPhone: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Currency *</label>
                <select
                  value={b2bFormData.currency}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, currency: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Country *</label>
                <input
                  type="text"
                  value={b2bFormData.country}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, country: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={b2bFormData.bankName}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, bankName: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">SWIFT Code</label>
                <input
                  type="text"
                  value={b2bFormData.swiftCode}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, swiftCode: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CHASUS33"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">IBAN (if applicable)</label>
                <input
                  type="text"
                  value={b2bFormData.iban}
                  onChange={(e) => setB2bFormData({ ...b2bFormData, iban: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="GB82 WEST 1234 5698 7654 32"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
              <textarea
                value={b2bFormData.notes}
                onChange={(e) => setB2bFormData({ ...b2bFormData, notes: e.target.value })}
                rows={3}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information about your business, payment requirements, or wire transfer preferences..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowWireModal(false)} disabled={submittingB2B}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                onClick={() => handleSubmitB2BRequest('wire')}
                disabled={submittingB2B || !b2bFormData.companyName || !b2bFormData.businessLegalName || !b2bFormData.taxId || !b2bFormData.contactName || !b2bFormData.contactEmail || !b2bFormData.contactPhone}
              >
                {submittingB2B ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionTiers;
