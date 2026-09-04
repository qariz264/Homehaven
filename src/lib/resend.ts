/**
 * Re-export of Resend OTP email sending utility
 */
export {
  getResendClient,
  isResendConfigured,
  sendOtpWithResend,
  getOtpEmailHtml,
  type SendOtpWithResendParams,
  type SendOtpWithResendResult
} from '../services/resendService.js';

export { default } from '../services/resendService.js';
