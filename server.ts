import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { paystackService } from "./src/services/paystackService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: any = null;

function getDb() {
  if (!db) {
    try {
      let firebaseConfig: any = null;
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig?.projectId || "gen-lang-client-0750978639";
      const databaseId = firebaseConfig?.firestoreDatabaseId || "ai-studio-8e7b370f-a125-45b3-9073-afa4676db100";
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!clientEmail || !privateKey) {
        console.warn("Firebase Admin service account key (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) not provided. Skipping server-side admin Firestore initialization.");
        return null;
      }

      if (clientEmail && !clientEmail.includes(projectId)) {
        console.warn(`FIREBASE_CLIENT_EMAIL (${clientEmail}) project does not match target projectId (${projectId}). Skipping server-side Admin Firestore initialization.`);
        return null;
      }

      const existingApps = getApps();
      let app: any;

      if (existingApps.length === 0) {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        app = existingApps[0];
      }

      if (databaseId && app) {
        db = getFirestore(app, databaseId);
      } else if (app) {
        db = getFirestore(app);
      } else {
        db = getFirestore();
      }
    } catch (err) {
      console.error("Firebase Admin initialization error:", err);
      return null;
    }
  }
  return db;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Paystack Payment Initiation
  app.post("/api/payment/initiate", async (req, res) => {
    const { email, amount, listingId, callbackUrl } = req.body;
    
    if (!email || !amount || !listingId) {
      return res.status(400).json({ error: "Missing required fields (email, amount, listingId)" });
    }

    try {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey || secretKey === 'your_secret_key' || secretKey.trim() === '') {
        return res.status(400).json({ 
          error: "Paystack Secret Key is not configured. Please set PAYSTACK_SECRET_KEY in environment variables or use the 'M-Pesa Code (Manual)' option to submit your real M-Pesa transaction reference for admin approval." 
        });
      }

      const response = await paystackService.initializeTransaction({
        email,
        amount,
        listingId,
        callbackUrl,
        reference: `pstk_${listingId}_${Date.now()}`
      });

      res.json(response);
    } catch (error: any) {
      console.error("Paystack Initiation Error:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to initiate Paystack payment" });
    }
  });

  // Paystack Payment Verification
  app.get("/api/payment/verify/:reference", async (req, res) => {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({ error: "Missing required parameter: reference" });
    }

    try {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey || secretKey.trim() === '' || secretKey === 'your_secret_key') {
        return res.status(400).json({
          error: "Paystack API key is missing. Set PAYSTACK_SECRET_KEY to verify live Paystack transactions."
        });
      }

      // Live/Real Paystack verification against Paystack official API
      const response = await paystackService.verifyTransaction(reference);

      // Activate listing immediately if verified successfully
      if (response.status && response.data?.status === "success") {
        let listingId = response.data.metadata?.listingId || (req.query.listingId as string);

        if (!listingId && reference.startsWith("pstk_")) {
          const parts = reference.split("_");
          if (parts.length >= 2) {
            listingId = parts[1];
          }
        }

        let firestore: any = null;
        try {
          firestore = getDb();
        } catch (dbInitErr) {
          console.warn("Firestore Admin not available on server:", dbInitErr);
        }

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

      res.json(response);
    } catch (error: any) {
      console.error("Paystack Verification Error:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to verify payment" });
    }
  });

  // Paystack Webhook Callback
  app.post("/api/paystack/webhook", async (req, res) => {
    const signature = req.headers["x-paystack-signature"] as string;
    
    // Verify signature if header is present
    if (signature && process.env.PAYSTACK_SECRET_KEY) {
      const isValid = paystackService.verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        console.warn("Invalid Paystack webhook signature received");
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const event = req.body;
    console.log("Paystack Webhook Event Received:", event?.event);

    if (event?.event === "charge.success") {
      const { metadata, amount, reference, customer } = event.data || {};
      const listingId = metadata?.listingId;

      if (listingId) {
        const firestore = getDb();
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

    res.json({ status: "ok" });
  });

  // Automated Expiry Check (Can be triggered manually or run on startup)
  app.get("/api/admin/check-expiry", async (req, res) => {
    const firestore = getDb();
    if (!firestore) return res.json({ message: "Firebase Admin DB not configured on server", expiredCount: 0 });

    try {
      const now = Timestamp.now();
      const snapshot = await firestore.collection("listings")
        .where("status", "==", "active")
        .where("expiresAt", "<", now)
        .get();

      const batch = firestore.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, { status: "expired" });
      });

      await batch.commit();
      res.json({ message: `Expired ${snapshot.size} listings` });
    } catch (error) {
      console.error("Expiry Error:", error);
      res.status(500).json({ error: "Failed to check expiry" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Simple "cron" simulation: check expiry every hour
    setInterval(async () => {
      console.log("Running scheduled expiry check...");
      try {
        await axios.get(`http://localhost:${PORT}/api/admin/check-expiry`);
      } catch (err) {
        console.error("Scheduled Expiry Check failed");
      }
    }, 1000 * 60 * 60);
  });
}

startServer();
