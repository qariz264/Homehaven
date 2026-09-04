import { Request, Response } from 'express';
import { paystackService } from '../../src/services/paystackService.js';
import { handleCors } from '../_lib/cors.js';

export default async function initiatePaymentHandler(req: Request, res: Response) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { email, amount, listingId, callbackUrl } = req.body || {};

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0 || numAmount > 10000000) {
    return res.status(400).json({ error: "Valid amount between 1 and 10,000,000 is required" });
  }

  if (!listingId || typeof listingId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(listingId) || listingId.length > 128) {
    return res.status(400).json({ error: "Invalid listingId parameter format" });
  }

  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const publicKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "";
    const isLiveKey = Boolean(
      secretKey && 
      (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_')) &&
      secretKey !== 'sk_live_your_live_secret_key' &&
      secretKey !== 'your_secret_key'
    );

    // If a valid Paystack secret key is provided, initialize transaction with official Paystack API
    if (isLiveKey) {
      try {
        const response = await paystackService.initializeTransaction({
          email: email.trim(),
          amount: numAmount,
          listingId,
          callbackUrl,
          reference: `pstk_${listingId}_${Date.now()}`
        });

        return res.json({
          ...response,
          publicKey,
          isSandbox: false
        });
      } catch (paystackApiErr: any) {
        console.warn("Paystack Live API initialization error, falling back to sandbox:", paystackApiErr.message);
      }
    }

    // Sandbox / Demo Checkout Fallback
    const demoRef = `pstk_demo_${listingId}_${Date.now()}`;
    const targetCallback = callbackUrl || '/dashboard';
    const sep = targetCallback.includes('?') ? '&' : '?';
    const redirectUrl = `${targetCallback}${sep}reference=${demoRef}&isSandbox=true&listingId=${listingId}`;

    return res.json({
      status: true,
      message: "Paystack checkout initialized in test sandbox mode.",
      isSandbox: true,
      publicKey,
      data: {
        authorization_url: redirectUrl,
        access_code: `demo_${Date.now()}`,
        reference: demoRef
      }
    });
  } catch (error: any) {
    console.error("Paystack Initiation Error:", error.message || error);
    return res.status(500).json({ error: error.message || "Failed to initiate Paystack payment" });
  }
}

export { initiatePaymentHandler };
