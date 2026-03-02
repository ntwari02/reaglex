/**
 * Payment Simulator Service
 * Simulates payment processing without actual payment gateway integration
 */

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethodId: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: 'succeeded' | 'pending' | 'failed';
  message: string;
  gatewayRef?: string;
  failureReason?: string;
}

/**
 * Simulate payment processing
 * Returns success after a short delay to simulate real payment processing
 */
export async function simulatePayment(request: PaymentRequest): Promise<PaymentResponse> {
  // Simulate processing delay (100-500ms)
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 400 + 100));

  // Simulate payment failure (5% chance for testing)
  const shouldFail = Math.random() < 0.05;

  if (shouldFail) {
    return {
      success: false,
      transactionId: generateTransactionId(),
      status: 'failed',
      message: 'Payment processing integration will be available soon. This is a simulation.',
      failureReason: 'Payment gateway not configured',
    };
  }

  // Generate mock transaction ID
  const transactionId = generateTransactionId();
  const gatewayRef = `ch_${generateRandomString(24)}`;

  return {
    success: true,
    transactionId,
    status: 'succeeded',
    message: 'Payment processed successfully (simulated)',
    gatewayRef,
  };
}

/**
 * Simulate payment method tokenization
 */
export async function simulateTokenizePaymentMethod(cardData: {
  number: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  cardholderName: string;
}): Promise<{ paymentMethodId: string; last4: string; brand: string }> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const last4 = cardData.number.slice(-4);
  const brand = detectCardBrand(cardData.number);

  return {
    paymentMethodId: `pm_${generateRandomString(24)}`,
    last4,
    brand,
  };
}

/**
 * Generate random transaction ID
 */
function generateTransactionId(): string {
  return `txn_${Date.now()}_${generateRandomString(8)}`;
}

/**
 * Generate random string
 */
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Detect card brand from card number
 */
function detectCardBrand(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (cleaned.startsWith('4')) return 'Visa';
  if (cleaned.startsWith('5')) return 'Mastercard';
  if (cleaned.startsWith('3')) return 'American Express';
  if (cleaned.startsWith('6')) return 'Discover';
  return 'Unknown';
}

/**
 * Validate card number (Luhn algorithm)
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate expiry date
 */
export function validateExpiryDate(month: number, year: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  if (month < 1 || month > 12) return false;

  return true;
}

