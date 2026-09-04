/// <reference types="vite/client" />
import axios from 'axios';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // In subunits (e.g. KES 1,500 = 150000)
        currency?: string;
        ref?: string;
        metadata?: Record<string, any>;
        callback: (response: { reference: string; status?: string; message?: string; trxref?: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
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

let cachedConfig: PaystackConfig | null = null;
let scriptLoadPromise: Promise<ScriptLoadResult> | null = null;

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
 * Check if the external Paystack inline.js script is loaded or blocked
 */
export async function ensurePaystackScriptLoaded(): Promise<ScriptLoadResult> {
  if (typeof window === 'undefined') {
    return { loaded: false, blocked: false };
  }

  // Already loaded and available on window
  if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
    return { loaded: true, blocked: false };
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<ScriptLoadResult>((resolve) => {
    // Check if script tag is already in DOM
    let script = document.querySelector('script[src*="js.paystack.co"]') as HTMLScriptElement | null;
    
    const timeoutId = setTimeout(() => {
      // If after 6 seconds window.PaystackPop is still missing, it was likely blocked by ad-blocker or CSP
      if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
        resolve({ loaded: true, blocked: false });
      } else {
        console.warn('[PaystackClient] Paystack inline.js load timed out. External script may be blocked by adblocker, CSP, or sandbox.');
        resolve({
          loaded: false,
          blocked: true,
          errorMessage: 'Paystack checkout script (https://js.paystack.co/v1/inline.js) timed out. Ad-blockers or strict browser security settings may be blocking external payment scripts.'
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
      if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
        resolve({ loaded: true, blocked: false });
      } else {
        // Script loaded but object not available
        resolve({
          loaded: false,
          blocked: true,
          errorMessage: 'Paystack script loaded but PaystackPop was not initialized in window.'
        });
      }
    };

    script.onerror = (e) => {
      clearTimeout(timeoutId);
      console.error('[PaystackClient] Failed to load Paystack script:', e);
      resolve({
        loaded: false,
        blocked: true,
        errorMessage: 'Network or browser security blocked loading https://js.paystack.co/v1/inline.js. Please check your ad-blocker or privacy shields.'
      });
    };
  });

  return scriptLoadPromise;
}

export interface InitiateCheckoutParams {
  email: string;
  amount: number; // in KES (e.g. 1500)
  listingId: string;
  listingTitle?: string;
  onSuccess: (reference: string) => void;
  onClose?: () => void;
  onFallbackRedirect?: (authUrl: string, reference: string) => void;
}

/**
 * Initializes and triggers Paystack checkout using Inline Popup when available,
 * with graceful fallback to secure new-window redirect if popup or external script is blocked.
 */
export async function launchPaystackCheckout(params: InitiateCheckoutParams): Promise<{
  mode: 'popup' | 'redirect' | 'sandbox';
  reference: string;
  authUrl?: string;
  scriptBlocked?: boolean;
}> {
  const { email, amount, listingId, listingTitle, onSuccess, onClose, onFallbackRedirect } = params;

  // 1. Initiate on server to get verified reference, authorization_url, and server-configured public key
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

  // 2. Check public key configuration
  const config = await getPaystackConfig();
  const publicKey = initData.publicKey || config.publicKey;

  // 3. Ensure inline script is loaded and not blocked
  const scriptStatus = await ensurePaystackScriptLoaded();

  // 4. Try Paystack Popup if script is loaded, public key is present, and PaystackPop is defined
  const canUsePopup = 
    scriptStatus.loaded && 
    !scriptStatus.blocked && 
    window.PaystackPop && 
    typeof window.PaystackPop.setup === 'function' &&
    Boolean(publicKey && publicKey.startsWith('pk_'));

  if (canUsePopup && window.PaystackPop) {
    try {
      // Note: Paystack requires amount in lowest currency denomination (Subunits: Multiply KES by 100)
      const amountInSubunits = Math.round(amount * 100);

      const handler = window.PaystackPop.setup({
        key: publicKey,
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

      handler.openIframe();

      return {
        mode: 'popup',
        reference,
        authUrl
      };
    } catch (popupErr) {
      console.warn('[PaystackClient] Error triggering Paystack popup, falling back to redirect:', popupErr);
    }
  }

  // 5. Fallback: If popup script was blocked, failed, or inside a restricted iframe, use the direct authorization_url
  console.log('[PaystackClient] Using redirect/new-tab fallback. Script blocked:', scriptStatus.blocked);
  
  if (onFallbackRedirect && authUrl) {
    onFallbackRedirect(authUrl, reference);
  } else if (authUrl) {
    window.open(authUrl, '_blank');
  }

  return {
    mode: 'redirect',
    reference,
    authUrl,
    scriptBlocked: scriptStatus.blocked
  };
}
