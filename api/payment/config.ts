import { Request, Response } from 'express';
import { handleCors } from '../_lib/cors.js';

export default function configHandler(req: Request, res: Response) {
  if (handleCors(req, res)) return;

  const publicKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "";
  const isConfigured = Boolean(
    publicKey &&
    (publicKey.startsWith("pk_live_") || publicKey.startsWith("pk_test_")) &&
    publicKey !== "pk_live_your_live_public_key"
  );

  return res.json({
    publicKey,
    isConfigured,
    currency: "KES",
    amount: 1500,
    mode: publicKey.startsWith("pk_live_") ? "live" : "test"
  });
}

export { configHandler };
