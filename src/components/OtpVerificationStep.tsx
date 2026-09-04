import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface OtpVerificationStepProps {
  email: string;
  name: string;
  onVerifiedSuccess: () => Promise<void>;
  onBackToEdit: () => void;
  initialPreviewOtp?: string;
  initialVerificationToken?: string;
}

export const OtpVerificationStep: React.FC<OtpVerificationStepProps> = ({
  email,
  name,
  onVerifiedSuccess,
  onBackToEdit,
  initialPreviewOtp,
  initialVerificationToken
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [previewOtp, setPreviewOtp] = useState<string | undefined>(initialPreviewOtp);
  const [verificationToken, setVerificationToken] = useState<string | undefined>(initialVerificationToken);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(45);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer for resending OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus the first empty digit on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric values
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Handle single digit input
    const singleDigit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);
    setError('');

    // Advance focus to next input if available
    if (index < 5 && singleDigit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    setError('');

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const autoFillPreviewOtp = () => {
    if (!previewOtp || previewOtp.length !== 6) return;
    setDigits(previewOtp.split(''));
    setError('');
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setCooldown(45);
      setSuccessMsg('A fresh verification code has been sent to your email.');
      if (data.previewOtp) {
        setPreviewOtp(data.previewOtp);
      }
      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Error resending code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setVerifying(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: otpCode,
          verificationToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setSuccessMsg('Email verified successfully! Finalizing your account...');
      await onVerifiedSuccess();
    } catch (err: any) {
      console.error('OTP Verification error:', err);
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setVerifying(false);
    }
  };

  const isFull = digits.every((d) => d !== '');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-black uppercase tracking-wider mb-2 border border-blue-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Step 2 of 2: Security Check</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Verify your email address
        </h3>
        <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
          We've sent a 6-digit One-Time Password (OTP) to:
        </p>
        <div className="mt-1 flex items-center justify-center md:justify-start gap-2">
          <span className="font-bold text-slate-900 text-xs sm:text-sm bg-slate-100 px-2.5 py-1 rounded-lg break-all">
            {email}
          </span>
          <button
            type="button"
            onClick={onBackToEdit}
            className="text-[11px] font-bold text-blue-600 hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      </div>

      {/* Sandbox/Preview OTP Helper */}
      {previewOtp && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-amber-900 font-medium">
              Demo Code: <strong className="font-black tracking-widest text-amber-950 font-mono text-sm">{previewOtp}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={autoFillPreviewOtp}
            className="px-2.5 py-1 bg-amber-200/70 hover:bg-amber-300 text-amber-900 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors shrink-0"
          >
            Auto-fill
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl text-xs font-semibold border border-red-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="bg-green-50 text-green-800 p-3.5 rounded-2xl text-xs font-bold border border-green-200 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 6-Digit OTP Inputs */}
      <form onSubmit={handleVerify} className="space-y-5">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2.5">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-11 h-13 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono rounded-xl sm:rounded-2xl border transition-all outline-none ${
                digit
                  ? 'border-blue-600 bg-blue-50/30 text-blue-900 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-500 focus:bg-white'
              }`}
            />
          ))}
        </div>

        {/* Resend & Timer Row */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-500 font-medium">
            Didn't receive the email?
          </span>
          {cooldown > 0 ? (
            <span className="text-slate-400 font-semibold text-[11px]">
              Resend in <strong className="text-slate-700">{cooldown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-black text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 uppercase tracking-wider text-[11px] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Sending...' : 'Resend Code'}</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={!isFull || verifying}
            className="w-full bg-blue-600 text-white py-3.5 sm:py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-100 flex items-center justify-center gap-2.5 group"
          >
            {verifying ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Verifying Code...</span>
              </div>
            ) : (
              <>
                <span>Verify & Complete Registration</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToEdit}
            disabled={verifying}
            className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Registration Details</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default OtpVerificationStep;
