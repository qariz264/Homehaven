/// <reference types="vite/client" />
import axios from 'axios';

export interface PaystackPopHandler {
  openIframe: () => void;
}

export interface PaystackPopSetupOptions {
  key: string;
  email: string;
  amount: number; // In subunits (e.g. KES 1,500 = 150000)
  currency?: string;
  ref?: string;
  metadata?: Record<string, any>;
  callback: (response: { reference: string; status?: string; message?: string; trxref?: string }) => void;
  onClose: () => void;
}

export interface PaystackPopSDK {
  setup?: (options: PaystackPopSetupOptions) => PaystackPopHandler | undefined;
  newTransaction?: (options: any) => void;
  isInitialized?: boolean;
  initialize?: (options?: any) => void;
}

declare global {
  interface Window {
    PaystackPop?: PaystackPopSDK;
  }
}

export interface PaystackConfig {
  publicKey: string;
  isConfigured: boolean;
  currency: string;
  amount: number;
  mode: 'live' | 'test';
}

export interface ScriptLoadResult {
  loaded: boolean;
  blocked: boolean;
  errorMessage?: string;
}

export interface PopupFailureDetails {
  reason: string;
  error?: any;
  context?: {
    publicKeyProvided?: boolean;
    publicKeyPrefix?: string;
    scriptLoaded?: boolean;
    scriptBlocked?: boolean;
    sdkAvailableOnWindow?: boolean;
    emailProvided?: boolean;
    amount?: number;
  };
}

let cachedConfig: PaystackConfig | null = null;
let scriptLoadPromise: Promise<ScriptLoadResult> | null = null;

/**
 * Safely accesses the Paystack SDK on the window object after script execution.
 */
export function getPaystackSDK(): PaystackPopSDK | null {
  if (typeof window === 'undefined') return null;
  const sdk = window.PaystackPop || (window as any)['PaystackPop'] || (window as any)['Paystack'];
  if (sdk && (typeof sdk.setup === 'function' || typeof sdk.newTransaction === 'function')) {
    return sdk;
  }
  return null;
}

/**
 * Error handler that logs exactly why the Paystack popup failed to open
 */
export function logPaystackPopupFailure(details: PopupFailureDetails): void {
  console.error(
    `[PaystackPopup Error] Popup failed to open: ${details.reason}`,
    {
      timestamp: new Date().toISOString(),
      reason: details.reason,
      error: details.error,
      context: details.context
    }
  );
}

/**
 * Retrieve Paystack configuration from server or environment
 */
export async function getPaystackConfig(): Promise<PaystackConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  // 1. Check client-side build-time environment variables
  const envKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || '') as string;
  
  try {
    // 2. Fetch server-side configuration to ensure production sync
    const res = await axios.get<PaystackConfig>('/api/payment/config');
    if (res.data?.publicKey) {
      cachedConfig = res.data;
      return res.data;
    }
  } catch (err) {
    console.warn('[PaystackClient] Could not fetch /api/payment/config, falling back to env:', err);
  }

  const isConfigured = Boolean(
    envKey && 
    (envKey.startsWith('pk_live_') || envKey.startsWith('pk_test_')) &&
    envKey !== 'pk_live_your_live_public_key'
  );

  cachedConfig = {
    publicKey: envKey,
    isConfigured,
    currency: 'KES',
    amount: 1500,
    mode: envKey.startsWith('pk_live_') ? 'live' : 'test'
  };

  return cachedConfig;
}

/**
 * Check if the external Paystack inline.js script is loaded and verify the window object
 */
export async function ensurePaystackScriptLoaded(): Promise<ScriptLoadResult> {
  if (typeof window === 'undefined') {
    return { loaded: false, blocked: false, errorMessage: 'Non-browser environment' };
  }

  // Check if Paystack SDK is already active on window
  const existingSDK = getPaystackSDK();
  if (existingSDK) {
    return { loaded: true, blocked: false };
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<ScriptLoadResult>((resolve) => {
    let script = document.querySelector('script[src*="js.paystack.co"]') as HTMLScriptElement | null;
    
    const timeoutId = setTimeout(() => {
      const sdk = getPaystackSDK();
      if (sdk) {
        resolve({ loaded: true, blocked: false });
      } else {
        const errorMsg = 'Paystack checkout script (https://js.paystack.co/v1/inline.js) timed out after 6s. External script may be blocked by adblocker, CSP, or iframe sandbox.';
        console.warn('[PaystackClient]', errorMsg);
        resolve({
          loaded: false,
          blocked: true,
          errorMessage: errorMsg
        });
      }
    }, 6000);

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.id = 'paystack-inline-js';
      document.body.appendChild(script);
    }

    script.onload = () => {
      clearTimeout(timeoutId);
      // Wait for SDK to attach to window object
      let checkAttempts = 0;
      const verifySDK = () => {
        const sdk = getPaystackSDK();
        if (sdk) {
          console.log('[PaystackClient] Paystack SDK successfully accessed on window object');
          resolve({ loaded: true, blocked: false });
        } else if (checkAttempts < 6) {
          checkAttempts++;
          setTimeout(verifySDK, 50);
        } else {
          const errorMsg = 'Paystack script tag loaded, but Paystack SDK (window.PaystackPop) was not found on window object.';
          console.error('[PaystackClient]', errorMsg);
          resolve({
            loaded: false,
            blocked: true,
            errorMessage: errorMsg
          });
        }
      };
      verifySDK();
    };

    script.onerror = (e) => {
      clearTimeout(timeoutId);
      const errorMsg = 'Network or browser security policy blocked loading https://js.paystack.co/v1/inline.js.';
      console.error('[PaystackClient] Failed to load Paystack script:', e, errorMsg);
      resolve({
        loaded: false,
        blocked: true,
        errorMessage: errorMsg
      });
    };
  });

  return scriptLoadPromise;
}

export interface InitiateCheckoutParams {
  publicKey?: string; // Passed from component level
  email: string;
  amount: number; // in KES (e.g. 1500)
  listingId: string;
  listingTitle?: string;
  onSuccess: (reference: string) => void;
  onClose?: () => void;
  onFallbackRedirect?: (authUrl: string, reference: string) => void;
  onPopupError?: (error: PopupFailureDetails) => void;
}

export interface LaunchCheckoutResult {
  mode: 'popup' | 'redirect' | 'sandbox';
  reference: string;
  authUrl?: string;
  scriptBlocked?: boolean;
  popupFailureReason?: string;
}

/**
 * Initializes and triggers Paystack checkout using Inline Popup when available,
 * with graceful fallback to secure new-window redirect if popup or external script is blocked.
 */
export async function launchPaystackCheckout(params: InitiateCheckoutParams): Promise<LaunchCheckoutResult> {
  const { 
    publicKey: componentPublicKey, 
    email, 
    amount, 
    listingId, 
    listingTitle, 
    onSuccess, 
    onClose, 
    onFallbackRedirect,
    onPopupError 
  } = params;

  // 1. Prioritize public key passed from component level
  let resolvedPublicKey = componentPublicKey?.trim() || '';

  // 2. Initiate session on server to obtain verified reference, authorization_url, and server-configured key
  const initRes = await axios.post('/api/payment/initiate', {
    email: email.trim(),
    amount,
    listingId,
    callbackUrl: `${window.location.origin}/dashboard`
  });

  const initData = initRes.data;
  const isSandbox = Boolean(initData.isSandbox);
  const reference = initData.data?.reference || `pstk_${listingId}_${Date.now()}`;
  const authUrl = initData.data?.authorization_url;

  // If component did not pass public key, use server initiation response or probe config
  if (!resolvedPublicKey) {
    if (initData.publicKey) {
      resolvedPublicKey = initData.publicKey;
      console.log('[PaystackClient] Using public key returned from payment initiation endpoint');
    } else {
      const config = await getPaystackConfig();
      resolvedPublicKey = config.publicKey;
      console.log('[PaystackClient] Resolved public key from config fallback');
    }
  } else {
    console.log(`[PaystackClient] Using public key passed from component level (${resolvedPublicKey.slice(0, 10)}...)`);
  }

  // If in sandbox mode, simulate popup completion or redirect
  if (isSandbox) {
    if (onFallbackRedirect && authUrl) {
      onFallbackRedirect(authUrl, reference);
    }
    return {
      mode: 'sandbox',
      reference,
      authUrl
    };
  }

  // 3. Ensure inline script is loaded and probe window object
  const scriptStatus = await ensurePaystackScriptLoaded();
  const sdk = getPaystackSDK();

  const context = {
    publicKeyProvided: Boolean(componentPublicKey),
    publicKeyPrefix: resolvedPublicKey ? resolvedPublicKey.slice(0, 7) : 'missing',
    scriptLoaded: scriptStatus.loaded,
    scriptBlocked: scriptStatus.blocked,
    sdkAvailableOnWindow: Boolean(sdk && typeof sdk.setup === 'function'),
    emailProvided: Boolean(email.trim()),
    amount
  };

  let failureReason: string | null = null;
  let caughtError: any = null;

  // Validate prerequisites before attempting popup
  if (!scriptStatus.loaded || scriptStatus.blocked) {
    failureReason = scriptStatus.errorMessage || 'Paystack script was not loaded or blocked by browser/ad-blocker.';
  } else if (!sdk || typeof sdk.setup !== 'function') {
    failureReason = 'Paystack SDK (window.PaystackPop) is not properly accessible on the window object.';
  } else if (!resolvedPublicKey || !resolvedPublicKey.startsWith('pk_')) {
    failureReason = `Invalid or missing Paystack public key: "${resolvedPublicKey || 'empty'}". Expected a key starting with "pk_live_" or "pk_test_".`;
  } else if (!email.trim()) {
    failureReason = 'Customer email address is missing or empty.';
  } else if (!amount || amount <= 0) {
    failureReason = `Invalid payment amount: ${amount}. Amount must be greater than zero.`;
  }

  // 4. Try Paystack Popup if all validations pass
  if (!failureReason && sdk && typeof sdk.setup === 'function') {
    try {
      // Paystack requires amount in lowest currency denomination (Subunits: Multiply KES by 100)
      const amountInSubunits = Math.round(amount * 100);

      const handler = sdk.setup({
        key: resolvedPublicKey,
        email: email.trim(),
        amount: amountInSubunits,
        currency: 'KES',
        ref: reference,
        metadata: {
          listingId,
          listingTitle: listingTitle || 'Property Listing Activation',
          custom_fields: [
            {
              display_name: 'Listing ID',
              variable_name: 'listing_id',
              value: listingId
            }
          ]
        },
        callback: (response) => {
          console.log('[PaystackClient] Popup payment callback received:', response);
          const finalRef = response.reference || response.trxref || reference;
          onSuccess(finalRef);
        },
        onClose: () => {
          console.log('[PaystackClient] Popup closed by user');
          if (onClose) onClose();
        }
      });

      if (!handler || typeof handler.openIframe !== 'function') {
        failureReason = 'PaystackPop.setup() failed to return a valid handler with openIframe(). Parameters may have failed Paystack client validation.';
      } else {
        handler.openIframe();

        return {
          mode: 'popup',
          reference,
          authUrl
        };
      }
    } catch (popupErr: any) {
      failureReason = `Exception thrown while initializing or opening Paystack popup iframe: ${popupErr?.message || popupErr}`;
      caughtError = popupErr;
    }
  }

  // If popup could not open, log detailed failure reason
  const failureDetails: PopupFailureDetails = {
    reason: failureReason || 'Unknown failure preventing Paystack popup modal from opening',
    error: caughtError,
    context
  };

  logPaystackPopupFailure(failureDetails);
  if (onPopupError) {
    onPopupError(failureDetails);
  }

  // 5. Fallback: If popup script was blocked, failed, or inside a restricted iframe, use the direct authorization_url
  console.log('[PaystackClient] Using redirect/new-tab fallback. Reason:', failureDetails.reason);
  
  if (onFallbackRedirect && authUrl) {
    onFallbackRedirect(authUrl, reference);
  } else if (authUrl) {
    window.open(authUrl, '_blank');
  }

  return {
    mode: 'redirect',
    reference,
    authUrl,
    scriptBlocked: scriptStatus.blocked,
    popupFailureReason: failureReason || undefined
  };
}
