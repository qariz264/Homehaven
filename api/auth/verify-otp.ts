import { Request, Response } from 'express';
import { verifySubmittedOtp } from '../../src/services/otpService.js';

/**
 * Handler for verifying submitted 6-digit OTP code for user email
 * Endpoint: POST /api/auth/verify-otp
 */
export default async function verifyOtpHandler(req: Request, res: Response) {
  const { email, otp, verificationToken } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email address is required' });
  }

  if (!otp || typeof otp !== 'string') {
    return res.status(400).json({ error: 'Verification code is required' });
  }

  try {
    const token = typeof verificationToken === 'string' ? verificationToken.trim() : undefined;
    const result = verifySubmittedOtp(email.trim(), otp.trim(), token);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, verified: true, message: result.message });
  } catch (err: any) {
    console.error('Verify OTP Error:', err);
    return res.status(500).json({ error: 'Failed to verify code. Please try again.' });
  }
}

export { verifyOtpHandler };
