import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, LogOut, PlusSquare, LayoutDashboard, Globe, Search, User, Shield } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';

const Navbar: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const isHome = location.pathname === '/';

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'py-4 bg-white/70 backdrop-blur-2xl border-b border-slate-200 shadow-sm' 
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12 items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className={`p-2 rounded-2xl transition-all duration-500 shadow-lg ${
              scrolled ? 'bg-blue-600 scale-90' : 'bg-white/10 backdrop-blur-md border border-white/20'
            }`}>
              <Home className={`w-6 h-6 ${scrolled ? 'text-white' : 'text-blue-400'}`} />
            </div>
            <span className={`text-2xl font-black tracking-tighter transition-colors duration-500 ${
              scrolled || !isHome ? 'text-slate-900' : 'text-white'
            }`}>
              HOME<span className="text-blue-500">HAVEN</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em]">
            <Link to="/" className={`transition-all hover:text-blue-500 py-2 border-b-2 ${
              location.pathname === '/' 
                ? 'border-blue-500 text-blue-500' 
                : scrolled || !isHome ? 'border-transparent text-slate-500' : 'border-transparent text-white/70'
            }`}>Browse Houses</Link>
            <Link to="/listings" className={`transition-all hover:text-blue-500 py-2 border-b-2 border-transparent ${
              location.pathname === '/listings' ? 'border-blue-500 text-blue-500' : scrolled || !isHome ? 'text-slate-500' : 'text-white/70'
            }`}>All Listings</Link>
            {profile?.role === 'landlord' && (
              <Link to="/dashboard" className={`transition-all hover:text-blue-500 py-2 border-b-2 border-transparent flex items-center gap-2 ${
                scrolled || !isHome ? 'text-slate-500' : 'text-white/70'
              }`}>
                <LayoutDashboard className="w-3 h-3" /> Landlord Dashboard
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

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className={`flex flex-col items-end hidden sm:flex text-right mr-2`}>
                   <span className={`text-xs font-black uppercase tracking-widest ${scrolled || !isHome ? 'text-slate-900' : 'text-white'}`}>
                     {profile?.name ? profile.name.split(' ')[0] : 'Admin'}
                   </span>
                   <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${
                     profile?.role === 'admin' ? 'text-red-500 font-black' : 'text-blue-500'
                   }`}>
                     {profile?.role || 'user'}
                   </span>
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {(profile?.role === 'landlord' || profile?.role === 'admin') && (
                    <Link to="/create-listing" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl transition-all flex items-center gap-1 text-xs font-bold" title="List Property">
                      <PlusSquare className="w-5 h-5 text-blue-600" />
                    </Link>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-white rounded-xl transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/auth" className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all flex items-center gap-2 ${
                  scrolled || !isHome 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } shadow-xl shadow-blue-500/20`}>
                  <User className="w-3.5 h-3.5" /> Landlord Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
