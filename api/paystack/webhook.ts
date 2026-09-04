import { Request, Response } from 'express';
import { paystackService } from '../../src/services/paystackService.js';
import { getAdminDb, FieldValue, Timestamp } from '../../src/lib/firebaseAdmin.js';
import { handleCors } from '../_lib/cors.js';

export default async function webhookHandler(req: Request, res: Response) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers["x-paystack-signature"] as string;
  
  if (!signature) {
    console.warn("[Security Alert] Blocked unauthenticated request to webhook missing signature");
    return res.status(401).json({ error: "Missing x-paystack-signature header" });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[Security Alert] PAYSTACK_SECRET_KEY not configured for webhook verification");
    return res.status(503).json({ error: "Paystack secret key is not configured" });
  }

  const rawPayload = (req as any).rawBody || req.body;
  const isValid = paystackService.verifyWebhookSignature(rawPayload, signature);
  if (!isValid) {
    console.warn("[Security Alert] Forged or invalid Paystack webhook signature rejected!");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;
  console.log("Paystack Webhook Event Received & Verified Authenticity:", event?.event);

  if (event?.event === "charge.success") {
    const { metadata, amount, reference, customer } = event.data || {};
    const listingId = metadata?.listingId;

    if (listingId) {
      const firestore = getAdminDb();
      if (!firestore) {
        console.warn("Firestore Admin not initialized for webhook; client side verification will handle database updates.");
        return res.json({ status: "ok", message: "Admin DB not configured on server" });
      }

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

          // Record payment
          await firestore.collection("payments").add({
            listingId,
            amount: (amount || 0) / 100,
            transactionId: reference,
            customerEmail: customer?.email,
            status: "success",
            createdAt: FieldValue.serverTimestamp(),
          });

          console.log(`Listing ${listingId} activated successfully via Paystack webhook.`);
        }
      } catch (error) {
        console.error("Error processing Paystack webhook:", error);
      }
    }
  }

  return res.json({ status: "ok" });
}

export { webhookHandler };
