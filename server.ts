import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import { getAdminDb, Timestamp } from "./src/lib/firebaseAdmin.js";
import sendOtpHandler from "./api/auth/send-otp.js";
import verifyOtpHandler from "./api/auth/verify-otp.js";
import resendOtpHandler from "./api/auth/resend-otp.js";
import configHandler from "./api/payment/config.js";
import initiatePaymentHandler from "./api/payment/initiate.js";
import verifyPaymentHandler from "./api/payment/verify.js";
import webhookHandler from "./api/paystack/webhook.js";
import healthHandler from "./api/health.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Paystack Payment & Configuration Endpoints
  app.get("/api/payment/config", configHandler);
  app.post("/api/payment/initiate", initiatePaymentHandler);
  app.get("/api/payment/verify/:reference", verifyPaymentHandler);
  app.get("/api/payment/verify", verifyPaymentHandler);
  app.post("/api/paystack/webhook", webhookHandler);

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

    const firestore = getAdminDb();
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
