import { Resend } from 'resend';

let resendClient: Resend | null = null;

/**
 * Lazily initialize the Resend client to prevent startup crashes when the API key is not configured.
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 're_your_resend_api_key') {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey.trim());
  }
  return resendClient;
}

export function isResendConfigured(): boolean {
  const apiKey = process.env.RESEND_API_KEY;
  return Boolean(apiKey && apiKey.trim().startsWith('re_'));
}

export interface SendOtpWithResendParams {
  email: string;
  otp: string;
  name?: string;
  from?: string;
}

export interface SendOtpWithResendResult {
  success: boolean;
  id?: string;
  error?: string;
  message: string;
}

/**
 * Generates the responsive, high-contrast HTML email template for the OTP code.
 */
export function getOtpEmailHtml(otp: string, name?: string): string {
  const greeting = name ? `Hello ${name},` : 'Hello,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HomeHaven Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
    }
    .header {
      background: #0f172a;
      padding: 28px 32px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      text-decoration: none;
    }
    .logo span {
      color: #3b82f6;
    }
    .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .body {
      padding: 36px 32px;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .text {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .otp-box {
      background: #eff6ff;
      border: 2px dashed #93c5fd;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 800;
      color: #3b82f6;
      margin-bottom: 8px;
    }
    .otp-code {
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #1d4ed8;
      font-family: 'Courier New', Courier, monospace;
      margin: 0;
    }
    .expiry {
      font-size: 12px;
      color: #64748b;
      margin-top: 10px;
      font-weight: 600;
    }
    .security-note {
      font-size: 12px;
      color: #64748b;
      background: #f8fafc;
      border-radius: 12px;
      padding: 14px;
      border: 1px solid #f1f5f9;
      margin-top: 24px;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Home<span>Haven</span> Kenya</div>
      <div class="badge">Verified Landlord Hub</div>
    </div>
    <div class="body">
      <h2 class="title">Verify your email address</h2>
      <p class="text">
        ${greeting}<br>
        Welcome to HomeHaven! Please use the 6-digit verification code below to verify your email address and activate your landlord portal account.
      </p>
      
      <div class="otp-box">
        <div class="otp-label">One-Time Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry">Valid for 10 minutes</div>
      </div>

      <p class="text">
        If you did not request this verification code, you can safely ignore this email. Someone may have typed your email address by mistake.
      </p>

      <div class="security-note">
        <strong>Security reminder:</strong> HomeHaven staff will never ask for your verification code or password via phone, SMS, or WhatsApp.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} HomeHaven Kenya Ltd. All rights reserved.<br>
      P.O. Box Nairobi, Kenya &bull; Support: support@myhomehaven.co.ke
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends a 6-digit OTP verification code via Resend.
 */
export async function sendOtpWithResend({
  email,
  otp,
  name,
  from
}: SendOtpWithResendParams): Promise<SendOtpWithResendResult> {
  const client = getResendClient();

  if (!client) {
    return {
      success: false,
      error: 'RESEND_API_KEY environment variable is not configured',
      message: 'Resend API key missing. Please configure RESEND_API_KEY.'
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const fromAddress = from || process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'HomeHaven <onboarding@resend.dev>';
  const subject = `${otp} is your HomeHaven verification code`;
  const html = getOtpEmailHtml(otp, name);
  const text = `Hello${name ? ` ${name}` : ''},\n\nYour HomeHaven verification code is: ${otp}\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`;

  try {
    const response = await client.emails.send({
      from: fromAddress,
      to: [normalizedEmail],
      subject,
      html,
      text
    });

    if (response.error) {
      console.error('[Resend Error]:', response.error);
      return {
        success: false,
        error: response.error.message,
        message: response.error.message || 'Failed to send email via Resend'
      };
    }

    console.log(`[Resend Success] Sent OTP ${otp} to ${normalizedEmail}, messageId: ${response.data?.id}`);
    return {
      success: true,
      id: response.data?.id,
      message: `Verification code sent to ${normalizedEmail}`
    };
  } catch (err: any) {
    console.error('[Resend Exception]:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Unexpected error sending via Resend',
      message: err?.message || 'Error transmitting email via Resend'
    };
  }
}

export default {
  getResendClient,
  isResendConfigured,
  sendOtpWithResend,
  getOtpEmailHtml
};
