import axios from 'axios';
import crypto from 'crypto';

/**
 * Paystack Payment Service
 * Handles initialization, verification, and webhook signature validation for Paystack transactions.
 */

export interface PaystackMetadata {
  listingId?: string;
  custom_fields?: Array<{
    display_name: string;
    variable_name: string;
    value: string | number;
  }>;
  [key: string]: any;
}

export interface InitializeTransactionInput {
  email: string;
  amount: number; // Amount in standard currency unit (e.g. KES or NGN). Will be converted to sub-units (cents/kobo) automatically if `inSubUnits` is false.
  currency?: string; // Default: 'KES'
  reference?: string; // Optional custom reference
  callbackUrl?: string;
  metadata?: PaystackMetadata;
  listingId?: string;
  inSubUnits?: boolean; // Set to true if amount is already in sub-units (e.g. kobo/cents)
}

export interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: PaystackInitData;
}

export interface PaystackCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  customer_code: string;
  phone: string | null;
  metadata: any;
}

export interface PaystackVerifyData {
  id: number;
  domain: string;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  receipt_number: string | null;
  amount: number; // in sub-units
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: PaystackMetadata;
  customer: PaystackCustomer;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: PaystackVerifyData;
}

class PaystackService {
  private getSecretKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
      throw new Error("PAYSTACK_SECRET_KEY environment variable is not defined");
    }
    return key;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.getSecretKey()}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initializes a new Paystack payment transaction.
   * Calls POST https://api.paystack.co/transaction/initialize
   */
  async initializeTransaction(input: InitializeTransactionInput): Promise<PaystackInitResponse> {
    const {
      email,
      amount,
      currency = 'KES',
      reference,
      callbackUrl,
      metadata = {},
      listingId,
      inSubUnits = false,
    } = input;

    if (!email) {
      throw new Error('Email is required to initialize transaction');
    }
    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required to initialize transaction');
    }

    // Convert amount to sub-units (Multiply by 100) unless already provided in sub-units
    const amountInSubUnits = inSubUnits ? Math.round(amount) : Math.round(amount * 100);

    const mergedMetadata: PaystackMetadata = {
      ...metadata,
      listingId: listingId || metadata.listingId,
      custom_fields: [
        ...(metadata.custom_fields || []),
        ...(listingId
          ? [
              {
                display_name: 'Listing ID',
                variable_name: 'listing_id',
                value: listingId,
              },
            ]
          : []),
      ],
    };

    const payload: Record<string, any> = {
      email,
      amount: amountInSubUnits,
      currency,
      metadata: mergedMetadata,
    };

    if (reference) {
      payload.reference = reference;
    }

    if (callbackUrl) {
      payload.callback_url = callbackUrl;
    } else if (process.env.APP_URL) {
      payload.callback_url = `${process.env.APP_URL}/dashboard`;
    }

    try {
      const response = await axios.post<PaystackInitResponse>(
        'https://api.paystack.co/transaction/initialize',
        payload,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Paystack initialization failed';
      console.error('[PaystackService] Initialize Error:', error.response?.data || error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Verifies a Paystack payment transaction by reference.
   * Calls GET https://api.paystack.co/transaction/verify/:reference
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    if (!reference) {
      throw new Error('Transaction reference is required for verification');
    }

    try {
      const encodedRef = encodeURIComponent(reference);
      const response = await axios.get<PaystackVerifyResponse>(
        `https://api.paystack.co/transaction/verify/${encodedRef}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Paystack verification failed';
      console.error('[PaystackService] Verify Error:', error.response?.data || error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Validates the Paystack webhook signature header (x-paystack-signature)
   * using HMAC SHA512 of the request body with constant-time comparison to eliminate timing attacks.
   */
  verifyWebhookSignature(rawBody: string | Buffer | object, signature: string): boolean {
    if (!signature || typeof signature !== 'string') return false;
    try {
      const secret = this.getSecretKey();
      const bodyBuffer = Buffer.isBuffer(rawBody)
        ? rawBody
        : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), 'utf8');

      const computedHash = crypto
        .createHmac('sha512', secret)
        .update(bodyBuffer)
        .digest('hex');

      const computedBuffer = Buffer.from(computedHash, 'utf8');
      const receivedBuffer = Buffer.from(signature, 'utf8');

      if (computedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(computedBuffer, receivedBuffer);
    } catch (err) {
      console.error('[PaystackService] Webhook signature verification error:', err);
      return false;
    }
  }
}

export const paystackService = new PaystackService();
export default paystackService;
