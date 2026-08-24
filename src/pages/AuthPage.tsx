import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Home, Mail, Lock, User, Phone, Briefcase, ArrowRight, ShieldCheck, Zap, KeyRound, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const role = 'landlord'; // Registration is strictly for Landlords

  const getFriendlyErrorMessage = (err: any): string => {
    if (!err) return 'An unexpected error occurred. Please try again.';
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
      return 'Invalid email or password. If you do not have an account yet, please click "Register" below to create one.';
    }
    if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
      return 'This email address is already registered. Please sign in instead or request a password reset.';
    }
    if (code === 'auth/weak-password' || message.includes('weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (code === 'auth/invalid-email' || message.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/too-many-requests' || message.includes('too-many-requests')) {
      return 'Too many failed login attempts. Access temporarily restricted. Please try again later.';
    }
    if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }

    const cleaned = (err.message || '').replace(/^Firebase:\s*Error\s*\(auth\/[^)]+\)\.?/i, '').trim();
    return cleaned || 'Authentication failed. Please check your login credentials and try again.';
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address to receive a reset link.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg(`Password reset link sent to ${email}. Please check your email inbox.`);
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          if (email.trim().toLowerCase() === 'stephenkariuki955@gmail.com') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        } catch (err: any) {
          console.error(err);
          setError(getFriendlyErrorMessage(err));
        }
      } else {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          const isAdmin = email.trim().toLowerCase() === 'stephenkariuki955@gmail.com';

          await setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            name,
            email,
            phone,
            role: isAdmin ? 'admin' : 'landlord',
            createdAt: new Date().toISOString(),
          });

          if (isAdmin) {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } catch (err: any) {
          console.error(err);
          setError(getFriendlyErrorMessage(err));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 py-28 overflow-hidden relative">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100"
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
        <div className="p-8 md:p-12 lg:p-16">
          <div className="mb-8 text-center md:text-left">
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
              {isForgotPassword 
                ? 'Reset Password' 
                : isLogin 
                  ? 'Landlord Portal Login' 
                  : 'Landlord Registration'}
            </h3>
            <p className="text-slate-400 font-medium text-sm">
              {isForgotPassword
                ? 'Enter your registered email address to receive a password reset link.'
                : isLogin 
                  ? 'Sign in to manage your property listings and payment statuses.' 
                  : 'Registration is reserved for landlords & property managers.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest mb-6 border border-red-100 flex items-center gap-3">
               <AlertCircleIcon /> {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-xs font-bold mb-6 border border-green-200 flex items-center gap-3">
               <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> {successMsg}
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="email" 
                  placeholder="Registered Email Address" 
                  required
                  className="w-full pl-14 pr-5 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-100 flex items-center justify-center gap-3 group"
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
                    setSuccessMsg('');
                  }}
                  className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
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
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        type="text" 
                        placeholder="Landlord / Property Name" 
                        required
                        className="w-full pl-14 pr-5 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        type="tel" 
                        placeholder="Contact Number (e.g. 0712345678)" 
                        required
                        className="w-full pl-14 pr-5 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-blue-50/80 rounded-2xl border border-blue-100 text-blue-900">
                      <Briefcase className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider">Account Role: Landlord</div>
                        <div className="text-[10px] text-blue-600/80 font-medium">Allows creating property listings & accepting payments</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  required
                  className="w-full pl-14 pr-5 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required
                    className="w-full pl-14 pr-5 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300"
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
                        setSuccessMsg('');
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline inline-block"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <button 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-100 flex items-center justify-center gap-3 group mt-2"
              >
                {loading ? 'Processing...' : (isLogin ? 'Landlord Login' : 'Register Landlord Account')}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          )}

          {!isForgotPassword && (
            <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {isLogin ? "No registry record?" : "Existing member account?"}{' '}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-blue-600 hover:underline"
              >
                {isLogin ? 'Register Hub' : 'Auth Login'}
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const AlertCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default AuthPage;
