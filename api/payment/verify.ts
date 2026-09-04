import { Request, Response } from 'express';
import { paystackService } from '../../src/services/paystackService.js';
import { getAdminDb, FieldValue, Timestamp } from '../../src/lib/firebaseAdmin.js';
import { handleCors } from '../_lib/cors.js';

export default async function verifyPaymentHandler(req: Request, res: Response) {
  if (handleCors(req, res)) return;

  const rawReference = (req.params?.reference as string) || (req.query?.reference as string) || '';
  const reference = rawReference ? decodeURIComponent(rawReference) : '';

  if (!reference || typeof reference !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(reference) || reference.length > 128) {
    return res.status(400).json({ error: "Missing or invalid reference parameter" });
  }

  try {
    let listingId = req.query?.listingId as string;
    if (!listingId && (reference.startsWith("pstk_") || reference.startsWith("pstk_demo_"))) {
      const parts = reference.split("_");
      if (reference.startsWith("pstk_demo_") && parts.length >= 3) {
        listingId = parts[2];
      } else if (parts.length >= 2) {
        listingId = parts[1];
      }
    }

    // Handle Sandbox / Demo Verification
    if (reference.startsWith('pstk_demo_')) {
      const firestore = getAdminDb();
      if (firestore && listingId) {
        try {
          const listingRef = firestore.collection("listings").doc(listingId);
          const listingDoc = await listingRef.get();
          if (listingDoc.exists) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await listingRef.update({
              status: "active",
              updatedAt: FieldValue.serverTimestamp(),
              expiresAt: Timestamp.fromDate(expiresAt)
            });
          }
        } catch (serverDbErr) {
          console.warn("Server-side demo update skipped:", serverDbErr);
        }
      }

      return res.json({
        status: true,
        message: "Payment verified successfully (Sandbox Mode)",
        data: {
          status: "success",
          reference,
          amount: 150000,
          currency: "KES",
          metadata: { listingId }
        }
      });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const isLiveKey = Boolean(
      secretKey && 
      (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_')) &&
      secretKey !== 'sk_live_your_live_secret_key' &&
      secretKey !== 'your_secret_key'
    );

    if (!isLiveKey) {
      return res.status(400).json({
        error: "Paystack API key is not configured. Set PAYSTACK_SECRET_KEY in production to verify live transactions."
      });
    }

    // Live/Real Paystack verification against Paystack official API
    const response = await paystackService.verifyTransaction(reference);

    // Activate listing immediately if verified successfully
    if (response.status && response.data?.status === "success") {
      if (!listingId) {
        listingId = response.data.metadata?.listingId;
      }

      const firestore = getAdminDb();
      if (firestore && listingId) {
        try {
          const listingRef = firestore.collection("listings").doc(listingId);
          const listingDoc = await listingRef.get();

          if (listingDoc.exists) {
            const now = new Date();
            const expiresAt = new Date();
            expiresAt.setDate(now.getDate() + 30);

            await listingRef.update({
              status: "active",
              updatedAt: FieldValue.serverTimestamp(),
              expiresAt: Timestamp.fromDate(expiresAt)
            });

            await firestore.collection("payments").add({
              listingId,
              amount: (response.data.amount || 150000) / 100,
              transactionId: response.data.reference || reference,
              customerEmail: response.data.customer?.email,
              status: "success",
              createdAt: FieldValue.serverTimestamp(),
            });

            console.log(`Listing ${listingId} activated successfully via Paystack verification.`);
          }
        } catch (dbErr: any) {
          console.warn("Server-side Firestore update skipped (Client-side frontend SDK will finalize activation):", dbErr?.message || dbErr);
        }
      }
    }

    return res.json(response);
  } catch (error: any) {
    console.error("Paystack Verification Error:", error.message || error);
    return res.status(500).json({ error: error.message || "Failed to verify payment" });
  }
}

export { verifyPaymentHandler };
