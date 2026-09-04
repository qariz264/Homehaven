import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  LogOut, 
  PlusSquare, 
  LayoutDashboard, 
  Search, 
  User, 
  Shield, 
  Menu, 
  X, 
  Phone, 
  ShieldAlert, 
  MessageCircle, 
  Building2,
  ChevronRight
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import ReportFraudModal from './ReportFraudModal';

const Navbar: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFraudModal, setShowFraudModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  const handleLogout = async () => {
    await auth.signOut();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isHome = location.pathname === '/';

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || mobileMenuOpen
            ? 'py-3 sm:py-4 bg-white/90 backdrop-blur-2xl border-b border-slate-200/80 shadow-sm' 
            : 'py-4 sm:py-6 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-11 sm:h-12 items-center">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
              <div className={`p-2 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg ${
                scrolled || mobileMenuOpen ? 'bg-blue-600 scale-95' : 'bg-white/10 backdrop-blur-md border border-white/20'
              }`}>
                <Home className={`w-5 h-5 sm:w-6 sm:h-6 ${scrolled || mobileMenuOpen ? 'text-white' : 'text-blue-400'}`} />
              </div>
              <span className={`text-xl sm:text-2xl font-black tracking-tighter transition-colors duration-300 ${
                scrolled || mobileMenuOpen || !isHome ? 'text-slate-900' : 'text-white'
              }`}>
                HOME<span className="text-blue-500">HAVEN</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-8 xl:gap-10 text-[10px] font-black uppercase tracking-[0.2em]">
              <Link to="/" className={`transition-all hover:text-blue-500 py-2 border-b-2 ${
                location.pathname === '/' 
                  ? 'border-blue-500 text-blue-500' 
                  : scrolled || !isHome ? 'border-transparent text-slate-600' : 'border-transparent text-white/80'
              }`}>Browse Houses</Link>
              
              <Link to="/listings" className={`transition-all hover:text-blue-500 py-2 border-b-2 ${
                location.pathname === '/listings' 
                  ? 'border-blue-500 text-blue-500' 
                  : scrolled || !isHome ? 'border-transparent text-slate-600' : 'border-transparent text-white/80'
              }`}>All Listings</Link>
              
              {profile?.role === 'landlord' && (
                <Link to="/dashboard" className={`transition-all hover:text-blue-500 py-2 border-b-2 flex items-center gap-2 ${
                  location.pathname === '/dashboard'
                    ? 'border-blue-500 text-blue-500'
                    : scrolled || !isHome ? 'border-transparent text-slate-600' : 'border-transparent text-white/80'
                }`}>
                  <LayoutDashboard className="w-3.5 h-3.5" /> Landlord Dashboard
                </Link>
              )}
              
              {profile?.role === 'admin' && (
                <Link to="/admin" className={`transition-all hover:text-red-500 py-2 border-b-2 flex items-center gap-1.5 text-red-500 font-black ${
                  location.pathname === '/admin' ? 'border-red-500' : 'border-transparent'
                }`}>
                  <Shield className="w-3.5 h-3.5 text-red-500" /> Admin Console
                </Link>
              )}
            </div>

            {/* Right Action Icons & Mobile Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop User Actions */}
              {user ? (
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex flex-col items-end text-right mr-1">
                    <span className={`text-xs font-black uppercase tracking-widest ${scrolled || !isHome ? 'text-slate-900' : 'text-white'}`}>
                      {profile?.name ? profile.name.split(' ')[0] : 'Landlord'}
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${
                      profile?.role === 'admin' ? 'text-red-500 font-black' : 'text-blue-500'
                    }`}>
                      {profile?.role || 'landlord'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200">
                    {(profile?.role === 'landlord' || profile?.role === 'admin') && (
                      <Link 
                        to="/create-listing" 
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl transition-all flex items-center gap-1 text-xs font-bold" 
                        title="List Property"
                      >
                        <PlusSquare className="w-5 h-5 text-blue-600" />
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-slate-600 hover:text-red-500 hover:bg-white rounded-xl transition-all"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-3">
                  <Link 
                    to="/auth" 
                    className="text-[10px] font-black uppercase tracking-widest px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl transition-all flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95"
                  >
                    <User className="w-3.5 h-3.5" /> Landlord Portal
                  </Link>
                </div>
              )}

              {/* Mobile Quick Action (Create listing icon if logged in) */}
              {user && (profile?.role === 'landlord' || profile?.role === 'admin') && (
                <Link
                  to="/create-listing"
                  className="sm:hidden p-2 rounded-xl bg-blue-600 text-white shadow-md active:scale-95 transition-transform"
                  title="List New Property"
                >
                  <PlusSquare className="w-5 h-5" />
                </Link>
              )}

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-center min-w-[44px] min-h-[44px] lg:hidden ${
                  scrolled || mobileMenuOpen || !isHome
                    ? 'bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200'
                    : 'bg-white/15 backdrop-blur-md border-white/20 text-white hover:bg-white/25'
                }`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden bg-white/98 backdrop-blur-2xl border-b border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="px-4 pt-3 pb-6 space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto">
                
                {/* User Status Card if signed in */}
                {user && (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                        {(profile?.name || user.email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 truncate max-w-[160px]">
                          {profile?.name || user.email}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-blue-600">
                          {profile?.role || 'Landlord'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5 text-xs font-bold"
                      title="Log Out"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider">Exit</span>
                    </button>
                  </div>
                )}

                {/* Primary Nav Links with 44px+ touch targets */}
                <div className="space-y-1">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors min-h-[48px] ${
                      location.pathname === '/' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Home className="w-4 h-4 text-blue-500" /> Browse Houses (Home)
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    to="/listings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors min-h-[48px] ${
                      location.pathname === '/listings' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-blue-500" /> All Listings
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  {profile?.role === 'landlord' && (
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors min-h-[48px] ${
                        location.pathname === '/dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <LayoutDashboard className="w-4 h-4 text-blue-500" /> Landlord Dashboard
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  )}

                  {(profile?.role === 'landlord' || profile?.role === 'admin') && (
                    <Link
                      to="/create-listing"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors min-h-[48px] ${
                        location.pathname === '/create-listing' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <PlusSquare className="w-4 h-4 text-emerald-600" /> List New Property
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  )}

                  {profile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors min-h-[48px] ${
                        location.pathname === '/admin' ? 'bg-red-50 text-red-600' : 'text-red-600 hover:bg-red-50/50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-red-600" /> Admin Console
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  )}
                </div>

                {/* Landlord Portal Login for Guests */}
                {!user && (
                  <div className="pt-2">
                    <Link
                      to="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-98"
                    >
                      <User className="w-4 h-4" /> Sign In / Landlord Portal
                    </Link>
                  </div>
                )}

                {/* Quick Trust & Support Row */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowFraudModal(true);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-600" /> Report Scam / Fraud
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-wider">Report &rarr;</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="tel:0117334197"
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" /> Call Hub
                    </a>
                    <a
                      href="https://wa.me/254117334197?text=Hello%20HomeHaven,%20I%20need%20support"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                    </a>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Report Fraud Modal accessible from mobile nav */}
      <ReportFraudModal
        isOpen={showFraudModal}
        onClose={() => setShowFraudModal(false)}
      />
    </>
  );
};

export default Navbar;
