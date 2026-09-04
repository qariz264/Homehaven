import { Request, Response } from 'express';
import { sendOtpEmail } from '../../src/services/otpService.js';

/**
 * Handler for sending 6-digit OTP code to user's email during registration
 * Endpoint: POST /api/auth/send-otp
 */
export default async function sendOtpHandler(req: Request, res: Response) {
  const { email, name } = req.body || {};

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  try {
    const result = await sendOtpEmail(email.trim(), typeof name === 'string' ? name.trim() : undefined);
    if (!result.success) {
      return res.status(429).json({ error: result.message });
    }
    return res.json(result);
  } catch (err: any) {
    console.error('Send OTP Error:', err);
    return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
}

export { sendOtpHandler };
