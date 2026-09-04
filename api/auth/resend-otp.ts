import { Request, Response } from 'express';
import { sendOtpEmail } from '../../src/services/otpService.js';
import { isResendConfigured, sendOtpWithResend } from '../../src/services/resendService.js';

/**
 * Handler for resending a 6-digit OTP code to user's email via Resend
 * Endpoint: POST /api/auth/resend-otp
 */
export default async function resendOtpHandler(req: Request, res: Response) {
  const { email, name } = req.body || {};

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  try {
    const result = await sendOtpEmail(email.trim(), typeof name === 'string' ? name.trim() : undefined);
    if (!result.success) {
      return res.status(429).json({ error: result.message });
    }
    return res.json({
      ...result,
      usedResend: isResendConfigured()
    });
  } catch (err: any) {
    console.error('Resend OTP Error:', err);
    return res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
  }
}

export { resendOtpHandler, sendOtpWithResend };
