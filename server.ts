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
import sendOtpHandler from "./api/auth/send-otp.js";
import verifyOtpHandler from "./api/auth/verify-otp.js";
import resendOtpHandler from "./api/auth/resend-otp.js";

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

  // Defensive HTTP Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // Preserve raw body buffer for cryptographically exact HMAC signature validation
  app.use(express.json({
    limit: "1mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));

  // API Routes
  
  // Auth OTP Verification Endpoints (api/auth/send-otp.ts & api/auth/verify-otp.ts)
  app.post("/api/auth/send-otp", sendOtpHandler);
  app.post("/api/auth/verify-otp", verifyOtpHandler);
  app.post("/api/auth/resend-otp", resendOtpHandler);

  // Paystack Payment Initiation with strict input validation
  app.post("/api/payment/initiate", async (req, res) => {
    const { email, amount, listingId, callbackUrl } = req.body;
    
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
      if (!secretKey || secretKey === 'your_secret_key' || secretKey.trim() === '') {
        return res.status(400).json({ 
          error: "Paystack Secret Key is not configured. Please set PAYSTACK_SECRET_KEY in environment variables or use the 'M-Pesa Code (Manual)' option to submit your real M-Pesa transaction reference for admin approval." 
        });
      }

      const response = await paystackService.initializeTransaction({
        email: email.trim(),
        amount: numAmount,
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

  // Paystack Payment Verification with parameterized validation
  app.get("/api/payment/verify/:reference", async (req, res) => {
    const { reference } = req.params;
    
    if (!reference || typeof reference !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(reference) || reference.length > 128) {
      return res.status(400).json({ error: "Missing or invalid reference parameter" });
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

  // Paystack Webhook Callback with mandatory HMAC-SHA512 verification (No Bypass)
  app.post("/api/paystack/webhook", async (req, res) => {
    const signature = req.headers["x-paystack-signature"] as string;
    
    // Strict authentication: reject any request without signature
    if (!signature) {
      console.warn("[Security Alert] Blocked unauthenticated request to /api/paystack/webhook missing signature");
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

  // Automated Expiry Check (Protected against unauthorized public execution)
  app.get("/api/admin/check-expiry", async (req, res) => {
    // Restrict access to internal loopback calls or valid admin token
    const clientIp = req.ip || req.socket.remoteAddress || '';
    const isLoopback = clientIp.includes('127.0.0.1') || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
    const authHeader = req.headers["x-admin-key"] as string;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!isLoopback && (!adminSecret || authHeader !== adminSecret)) {
      return res.status(403).json({ error: "Forbidden: Unauthorized administrative endpoint access" });
    }

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
