import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useSEO } from '../hooks/useSEO';
import { Home, Mail, Lock, User, Phone, Briefcase, ArrowRight, ShieldCheck, Zap, KeyRound, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OtpVerificationStep from '../components/OtpVerificationStep';

const ADMIN_EMAIL = 'stephenkariuki955@gmail.com';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [previewOtp, setPreviewOtp] = useState<string | undefined>(undefined);
  const [verificationToken, setVerificationToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInvalidCredentialError, setIsInvalidCredentialError] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  useSEO({
    title: isForgotPassword 
      ? 'Reset Password | Landlord Portal'
      : isLogin 
        ? 'Landlord Portal Login | Manage House Listings' 
        : 'Landlord Registration | Publish Verified Houses in Kenya',
    description: 'Sign in to the HomeHaven Landlord Hub to manage your rental property portfolio, track M-Pesa verified listings, and monitor tenant inquiries.',
    robots: 'noindex, follow',
    canonicalUrl: 'https://homehaven.co.ke/auth'
  });

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const getFriendlyErrorMessage = (err: any): { text: string; isInvalidCred: boolean } => {
    if (!err) return { text: 'An unexpected error occurred. Please try again.', isInvalidCred: false };
    const code = (err.code || '').toLowerCase();
    const message = (err.message || '').toLowerCase();

    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found' ||
      code.includes('invalid-credential') ||
      message.includes('invalid-credential') ||
      message.includes('wrong-password') ||
      message.includes('user-not-found') ||
      message.includes('error-code:-26')
    ) {
      return {
        text: 'Invalid email or password. If you do not have an account yet, please click "Register" to create one or use Google Sign-In.',
        isInvalidCred: true
      };
    }
    if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
      return {
        text: 'This email address is already registered. Please switch to Sign In or request a password reset.',
        isInvalidCred: false
      };
    }
    if (code === 'auth/weak-password' || message.includes('weak-password')) {
      return {
        text: 'Password is too weak. Please use at least 6 characters.',
        isInvalidCred: false
      };
    }
    if (code === 'auth/invalid-email' || message.includes('invalid-email')) {
      return {
        text: 'Please enter a valid email address.',
        isInvalidCred: false
      };
    }
    if (code === 'auth/too-many-requests' || message.includes('too-many-requests')) {
      return {
        text: 'Too many failed attempts. Access temporarily restricted. Please try again later or reset password.',
        isInvalidCred: false
      };
    }
    if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
      return {
        text: 'Network connection error. Please check your internet connection and try again.',
        isInvalidCred: false
      };
    }
    if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
      return {
        text: 'Google sign-in popup was closed. Please try again when ready.',
        isInvalidCred: false
      };
    }
    if (code === 'auth/cancelled-popup-request') {
      return {
        text: 'Sign-in cancelled. Please try again.',
        isInvalidCred: false
      };
    }

    const cleaned = (err.message || '').replace(/^Firebase:\s*Error\s*\(auth\/[^)]+\)\.?/i, '').trim();
    return {
      text: cleaned || 'Authentication failed. Please verify your credentials and try again.',
      isInvalidCred: false
    };
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    setIsInvalidCredentialError(false);
    setSuccessMsg('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
        
        // Ensure user document exists in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Landlord',
            email: user.email || '',
            phone: user.phoneNumber || '',
            role: isAdmin ? 'admin' : 'landlord',
            createdAt: new Date().toISOString(),
          }, { merge: true });
        } else if (isAdmin && userDocSnap.data()?.role !== 'admin') {
          await setDoc(userDocRef, { role: 'admin' }, { merge: true });
        }

        if (isAdmin) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const { text, isInvalidCred } = getFriendlyErrorMessage(err);
      setError(text);
      setIsInvalidCredentialError(isInvalidCred);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address to receive a reset link.');
      setIsInvalidCredentialError(false);
      return;
    }
    setLoading(true);
    setError('');
    setIsInvalidCredentialError(false);
    setSuccessMsg('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg(`Password reset link sent to ${email}. Please check your email inbox or spam folder.`);
    } catch (err: any) {
      console.error(err);
      const { text, isInvalidCred } = getFriendlyErrorMessage(err);
      setError(text);
      setIsInvalidCredentialError(isInvalidCred);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeRegistration = async () => {
    setLoading(true);
    setError('');
    setIsInvalidCredentialError(false);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        phone: phone.trim(),
        role: isAdmin ? 'admin' : 'landlord',
        emailVerified: true,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Email Registration Finalize Error:', err);
      const { text, isInvalidCred } = getFriendlyErrorMessage(err);
      setError(text);
      setIsInvalidCredentialError(isInvalidCred);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsInvalidCredentialError(false);
    setSuccessMsg('');

    if (isLogin) {
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        console.error('Email Sign-In Error:', err);
        const { text, isInvalidCred } = getFriendlyErrorMessage(err);
        setError(text);
        setIsInvalidCredentialError(isInvalidCred);
      } finally {
        setLoading(false);
      }
    } else {
      // Input validations before sending OTP
      if (!name.trim()) {
        setError('Please enter your full name or landlord business name.');
        return;
      }
      if (!phone.trim()) {
        setError('Please enter your contact phone number (e.g. 0712345678).');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please enter a valid email address to receive your verification code.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), name: name.trim() })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send verification code.');
        }

        setPreviewOtp(data.previewOtp);
        if (data.verificationToken) {
          setVerificationToken(data.verificationToken);
        }
        setIsOtpStep(true);
        setSuccessMsg(`We've sent a 6-digit verification code to ${email.trim()}.`);
      } catch (err: any) {
        console.error('Send OTP Error:', err);
        setError(err.message || 'Failed to send verification email. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-3 sm:px-4 py-20 sm:py-28 overflow-hidden relative">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl sm:rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100"
      >
        {/* Visual Side */}
        <div className="hidden md:flex flex-col justify-between bg-slate-900 p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
             <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover" alt="" />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
          </div>
          
          <div className="relative z-10">
            <div className="bg-blue-600 p-3 rounded-2xl w-fit mb-8 shadow-xl shadow-blue-900/40">
              <Home className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-black tracking-tighter mb-4 leading-tight italic">Secure the <br /> Future of your <br /><span className="text-blue-500">Portfolio.</span></h2>
            <p className="text-slate-400 font-medium">Join 5,000+ landlords managing their assets via the HomeHaven Hub.</p>
          </div>

          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                   <ShieldCheck className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-300">Verified Marketplace</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                   <Zap className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-300">Instant Activation</span>
             </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-5 sm:p-8 md:p-12 lg:p-14">
          {!isOtpStep && (
            <div className="mb-6 text-center md:text-left">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {isForgotPassword 
                    ? 'Reset Password' 
                    : isLogin 
                      ? 'Landlord Portal Login' 
                      : 'Landlord Registration'}
                </h3>
              </div>
              <p className="text-slate-500 font-medium text-xs">
                {isForgotPassword
                  ? 'Enter your registered email address to receive a password reset link.'
                  : isLogin 
                    ? 'Sign in to manage your property listings and payment statuses.' 
                    : 'Register a landlord account with verified email OTP to publish listings.'}
              </p>
            </div>
          )}

          {/* Tab Switcher */}
          {!isForgotPassword && !isOtpStep && (
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setIsOtpStep(false);
                  setError('');
                  setIsInvalidCredentialError(false);
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  isLogin 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setIsOtpStep(false);
                  setError('');
                  setIsInvalidCredentialError(false);
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  !isLogin 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* 1-Click Google Sign-In */}
          {!isForgotPassword && !isOtpStep && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="bg-white px-3">or continue with email</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner with Interactive Fix CTA */}
          {error && !isOtpStep && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-semibold mb-6 border border-red-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-black text-red-900">{error}</p>
                  
                  {isInvalidCredentialError && (
                    <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-red-200/70">
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsLogin(false);
                            setIsOtpStep(false);
                            setError('');
                            setIsInvalidCredentialError(false);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Register New Account →
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="px-3 py-1.5 bg-white border border-red-300 hover:bg-red-100 text-red-900 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors"
                      >
                        Sign in with Google
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {successMsg && !isOtpStep && (
            <div className="bg-green-50 text-green-800 p-4 rounded-2xl text-xs font-bold mb-6 border border-green-200 flex items-center gap-3">
               <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> {successMsg}
            </div>
          )}

          {isOtpStep ? (
            <OtpVerificationStep
              email={email.trim()}
              name={name.trim()}
              onVerifiedSuccess={handleFinalizeRegistration}
              onBackToEdit={() => {
                setIsOtpStep(false);
                setError('');
                setSuccessMsg('');
              }}
              initialPreviewOtp={previewOtp}
              initialVerificationToken={verificationToken}
            />
          ) : isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="Registered Email Address" 
                  required
                  className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-100 flex items-center justify-center gap-3 group"
              >
                {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                {!loading && <KeyRound className="w-4 h-4" />}
              </button>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                    setIsInvalidCredentialError(false);
                    setSuccessMsg('');
                  }}
                  className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors"
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Landlord / Property Manager Name" 
                        required
                        className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="tel" 
                        placeholder="Contact Phone (e.g. 0712345678)" 
                        required
                        className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-3 p-3.5 bg-blue-50/80 rounded-2xl border border-blue-100 text-blue-900">
                      <Briefcase className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider">Role: Verified Landlord</div>
                        <div className="text-[10px] text-blue-700 font-medium">Create house listings, manage units, and verify payments</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  required
                  className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password" 
                    placeholder="Password (min. 6 chars)" 
                    required
                    minLength={6}
                    className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {isLogin && (
                  <div className="text-right pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                        setIsInvalidCredentialError(false);
                        setSuccessMsg('');
                      }}
                      className="text-[11px] font-black text-blue-600 hover:underline inline-block"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <button 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-100 flex items-center justify-center gap-3 group mt-3"
              >
                {loading 
                  ? (isLogin ? 'Processing...' : 'Sending Verification Code...') 
                  : (isLogin ? 'Sign In to Portal' : 'Verify Email with OTP')}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          )}

          {!isForgotPassword && !isOtpStep && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {isLogin ? "Don't have an account?" : "Already registered?"}{' '}
                <button 
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setIsOtpStep(false);
                    setError('');
                    setIsInvalidCredentialError(false);
                    setSuccessMsg('');
                  }}
                  className="text-blue-600 hover:underline font-black"
                >
                  {isLogin ? 'Register New Account' : 'Sign In'}
                </button>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
