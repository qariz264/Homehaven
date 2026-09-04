import crypto from 'crypto';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { sendOtpWithResend, isResendConfigured } from './resendService.js';

interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  name?: string;
}

// In-memory OTP storage keyed by normalized email (for single-instance / local dev fallback)
const otpStore = new Map<string, StoredOtp>();

function getOtpSecret(): string {
  return (
    process.env.OTP_SECRET ||
    process.env.RESEND_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    'homehaven-kenya-secure-otp-auth-secret-key-2025'
  );
}

/**
 * Creates a cryptographically signed verification token containing the expiration timestamp and HMAC signature.
 * This ensures verification works seamlessly across isolated Vercel Serverless Function instances.
 */
export function createOtpSignature(email: string, code: string, expiresAt: number): string {
  const secret = getOtpSecret();
  const normalizedEmail = email.trim().toLowerCase();
  const cleanedCode = code.trim().replace(/\s+/g, '');
  const data = `${normalizedEmail}:${cleanedCode}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${expiresAt}.${hmac}`;
}

/**
 * Validates the HMAC signature and timestamp of the verification token against the submitted code and email.
 */
export function verifyOtpSignature(
  email: string,
  submittedCode: string,
  token: string
): { valid: boolean; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing verification token.' };
  }

  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) {
    return { valid: false, error: 'Invalid verification token structure.' };
  }

  const expiresAtStr = token.substring(0, dotIndex);
  const sig = token.substring(dotIndex + 1);
  const expiresAt = Number(expiresAtStr);

  if (isNaN(expiresAt) || !expiresAt) {
    return { valid: false, error: 'Invalid verification token timestamp.' };
  }

  if (Date.now() > expiresAt) {
    return { valid: false, error: 'Verification code has expired. Please click Resend Code.' };
  }

  const secret = getOtpSecret();
  const normalizedEmail = email.trim().toLowerCase();
  const cleanedCode = submittedCode.trim().replace(/\s+/g, '');
  const data = `${normalizedEmail}:${cleanedCode}:${expiresAt}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(data).digest('hex');

  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expectedHmac, 'hex');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'Invalid verification code. Please check the 6-digit code and try again.' };
    }
  } catch {
    return { valid: false, error: 'Invalid verification code signature.' };
  }

  return { valid: true };
}

// Clean up expired OTPs periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

export function generateNumericOtp(): string {
  // 6-digit numeric string between 100000 and 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send an OTP verification email to the user.
 * Supports SMTP (Gmail, Zoho, SendGrid, Amazon SES) and Resend API.
 * Falls back to sandbox/console mode if credentials are not configured.
 */
export async function sendOtpEmail(email: string, name?: string): Promise<{
  success: boolean;
  message: string;
  previewOtp?: string;
  isSandbox?: boolean;
  verificationToken?: string;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();

  // Rate-limiting check: max 1 email every 30 seconds
  const existing = otpStore.get(normalizedEmail);
  if (existing && now - existing.lastSentAt < 30 * 1000) {
    const waitSeconds = Math.ceil((30 * 1000 - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${waitSeconds} seconds before requesting a new code.`
    };
  }

  const code = generateNumericOtp();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes
  const verificationToken = createOtpSignature(normalizedEmail, code, expiresAt);

  otpStore.set(normalizedEmail, {
    code,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    name
  });

  const subject = `${code} is your HomeHaven verification code`;
  const greeting = name ? `Hello ${name},` : 'Hello,';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #0f172a; padding: 28px 32px; text-align: center; }
          .logo { color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
          .logo span { color: #3b82f6; }
          .body { padding: 32px; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          .text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .otp-box { background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; }
          .expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 600; }
          .security-note { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; }
          .footer { background: #f8fafc; padding: 16px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Home<span>Haven</span> Kenya</div>
          </div>
          <div class="body">
            <h2 class="title">Verify your email address</h2>
            <p class="text">${greeting}<br>Welcome to HomeHaven! Use the verification code below to verify your email and complete your registration.</p>
            
            <div class="otp-box">
              <div class="otp-code">${code}</div>
              <div class="expiry">Valid for 10 minutes</div>
            </div>

            <p class="text">If you did not request this code, you can safely ignore this email. Someone may have typed your email address by mistake.</p>
            
            <div class="security-note">
              <strong>Security tip:</strong> Never share this code with anyone. HomeHaven staff will never ask for your verification code.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} HomeHaven Kenya. All rights reserved.<br>Nairobi, Kenya
          </div>
        </div>
      </body>
    </html>
  `;

  // 1. Try Resend SDK if configured
  if (isResendConfigured()) {
    const resendResult = await sendOtpWithResend({
      email: normalizedEmail,
      otp: code,
      name
    });

    if (resendResult.success) {
      return {
        success: true,
        message: `Verification code sent to ${normalizedEmail}`,
        verificationToken
      };
    } else {
      console.warn('[OTP] Resend delivery failed, falling back to SMTP/Sandbox:', resendResult.error);
    }
  }

  // 2. Try Nodemailer / SMTP if credentials are configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const fromAddress = process.env.SMTP_FROM || `"HomeHaven Kenya" <${smtpUser}>`;

      await transporter.sendMail({
        from: fromAddress,
        to: normalizedEmail,
        subject,
        html: htmlContent,
        text: `Your HomeHaven verification code is: ${code}. Valid for 10 minutes.`
      });

      console.log(`[OTP] Sent verification email via SMTP to ${normalizedEmail}`);
      return {
        success: true,
        message: `Verification code sent to ${normalizedEmail}`,
        verificationToken
      };
    } catch (smtpErr: any) {
      console.warn('[OTP] SMTP transmission error:', smtpErr.message);
    }
  }

  // 3. Sandbox / Preview mode: Log code and return for easy testing
  console.log(`\n======================================================`);
  console.log(`[HOMEHAVEN OTP VERIFICATION CODE]`);
  console.log(`Target Email : ${normalizedEmail}`);
  console.log(`Code         : ${code}`);
  console.log(`Valid Until  : ${new Date(expiresAt).toLocaleTimeString()}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}`,
    previewOtp: code,
    verificationToken,
    isSandbox: true
  };
}

/**
 * Verify a submitted OTP code for an email.
 * Supports cryptographic stateless tokens (for Vercel serverless functions) with in-memory fallback.
 */
export function verifySubmittedOtp(
  email: string,
  submittedCode: string,
  verificationToken?: string
): {
  success: boolean;
  message: string;
} {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanedCode = submittedCode.trim().replace(/\s+/g, '');

  if (!cleanedCode || cleanedCode.length !== 6) {
    return {
      success: false,
      message: 'Please enter a valid 6-digit verification code.'
    };
  }

  // 1. Primary for Vercel Serverless: Cryptographic verificationToken check
  if (verificationToken && typeof verificationToken === 'string' && verificationToken.trim()) {
    const tokenResult = verifyOtpSignature(normalizedEmail, cleanedCode, verificationToken.trim());
    if (!tokenResult.valid) {
      return {
        success: false,
        message: tokenResult.error || 'Invalid verification code. Please check the code sent to your email.'
      };
    }

    // Successfully verified via cryptographic signature! Remove in-memory record if exists
    otpStore.delete(normalizedEmail);
    return {
      success: true,
      message: 'Email successfully verified!'
    };
  }

  // 2. Fallback: In-memory store (for single-instance dev or requests without token)
  const record = otpStore.get(normalizedEmail);
  if (!record) {
    return {
      success: false,
      message: 'No verification request found for this email. Please click "Resend Code" to receive a fresh verification code.'
    };
  }

  const now = Date.now();
  if (record.expiresAt < now) {
    otpStore.delete(normalizedEmail);
    return {
      success: false,
      message: 'Verification code has expired. Please click Resend Code.'
    };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(normalizedEmail);
    return {
      success: false,
      message: 'Too many incorrect attempts. Please request a new verification code.'
    };
  }

  if (record.code !== cleanedCode) {
    const remaining = 5 - record.attempts;
    return {
      success: false,
      message: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    };
  }

  // OTP is correct! Clear it from store so it cannot be re-used
  otpStore.delete(normalizedEmail);

  return {
    success: true,
    message: 'Email successfully verified!'
  };
}
