import React, { useState } from 'react';
import { 
  Home, 
  Instagram, 
  Mail, 
  Phone, 
  ArrowUpRight, 
  Globe2, 
  ShieldCheck, 
  MessageCircle, 
  ShieldAlert, 
  Sparkles,
  Building2,
  FileCheck2,
  Lock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import InfoModal, { InfoModalTopic } from './InfoModal';
import ReportFraudModal from './ReportFraudModal';

const Footer: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeInfoTopic, setActiveInfoTopic] = useState<InfoModalTopic | null>(null);
  const [showFraudModal, setShowFraudModal] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSection = (sectionId: string) => {
    if (window.location.pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <>
      <footer className="bg-slate-950 pt-24 pb-12 overflow-hidden relative border-t border-slate-900">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="absolute top-24 -right-24 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8 mb-20">
            
            {/* Brand Information */}
            <div className="md:col-span-4">
              <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 mb-8 group inline-flex">
                <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-black text-white tracking-tighter">
                  HOME<span className="text-blue-500">HAVEN</span>
                </span>
              </Link>
              <p className="text-slate-400 font-medium leading-relaxed mb-8 max-w-sm text-sm">
                Kenya's premier digital real estate hub. Connecting verified landlords and prospective tenants across all 47 counties with zero viewing fee extortion.
              </p>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Hub Security & Status</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-white text-xs font-bold uppercase tracking-tight">System Fully Operational</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Section 1: Navigation */}
            <div className="md:col-span-2">
              <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-blue-500" /> Navigation
              </h3>
              <ul className="space-y-3.5">
                <li>
                  <Link 
                    to="/" 
                    onClick={scrollToTop}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group"
                  >
                    Home Hub
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={() => navigateToSection('listings')}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group text-left"
                  >
                    Property Search
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
                <li>
                  <Link 
                    to={user ? (profile?.role === 'landlord' ? '/create-listing' : '/dashboard') : '/auth'}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group"
                  >
                    List Property
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link 
                    to={user ? '/dashboard' : '/auth'}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group"
                  >
                    Landlord Registry
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                {profile?.role === 'admin' && (
                  <li>
                    <Link 
                      to="/admin"
                      className="text-red-400 hover:text-red-300 transition-colors text-sm font-black flex items-center gap-1.5 group"
                    >
                      Admin Console
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                )}
                <li>
                  <button 
                    onClick={() => setShowFraudModal(true)}
                    className="text-red-400 hover:text-red-300 transition-colors text-sm font-bold flex items-center gap-1.5 group text-left"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Report Scam / Fraud
                  </button>
                </li>
              </ul>
            </div>

            {/* Section 2: Hub Expertise & Plans */}
            <div className="md:col-span-2">
              <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <FileCheck2 className="w-3.5 h-3.5 text-purple-500" /> Hub Expertise
              </h3>
              <ul className="space-y-3.5">
                <li>
                  <button 
                    onClick={() => setActiveInfoTopic('pricing')}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group text-left"
                  >
                    Pricing & Rates
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveInfoTopic('market_analysis')}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group text-left"
                  >
                    Market Analysis
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveInfoTopic('legal_support')}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group text-left"
                  >
                    Legal & Tenancy
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveInfoTopic('verification')}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group text-left"
                  >
                    Hub Verification
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveInfoTopic('digital_marketing')}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-1.5 group text-left"
                  >
                    Digital Marketing
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              </ul>
            </div>

            {/* Section 3: Connect With Hub */}
            <div className="md:col-span-4">
              <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-7 border border-white/10 shadow-2xl">
                <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-blue-500" /> Connect With Hub
                </h3>
                <div className="space-y-4">
                  {/* Phone Call */}
                  <a href="tel:0117334197" className="flex items-center gap-4 group p-2 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Direct Line</span>
                      <span className="text-white font-bold leading-none text-sm group-hover:text-blue-400 transition-colors">0117334197</span>
                    </div>
                  </a>

                  {/* WhatsApp Support */}
                  <a 
                    href="https://wa.me/254117334197?text=Hello%20HomeHaven%20Hub,%20I%20have%20an%20inquiry%20regarding%20property%20listing%20and%20tenancy." 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-4 group p-2 rounded-2xl hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Official WhatsApp</span>
                      <span className="text-white font-bold leading-none text-sm group-hover:text-emerald-400 transition-colors">+254 117 334 197</span>
                    </div>
                  </a>

                  {/* Email Support */}
                  <a href="mailto:techa5080@gmail.com" className="flex items-center gap-4 group p-2 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Inquiry Box</span>
                      <span className="text-white font-bold leading-none text-sm group-hover:text-purple-400 transition-colors">techa5080@gmail.com</span>
                    </div>
                  </a>

                  {/* Social Feed */}
                  <a href="https://www.instagram.com/myhomehaven.ke/" target="_blank" rel="noreferrer" className="flex items-center gap-4 group p-2 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-pink-600/10 flex items-center justify-center text-pink-500 group-hover:bg-pink-600 group-hover:text-white transition-all shrink-0">
                      <Instagram className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Instagram</span>
                      <span className="text-white font-bold leading-none text-sm group-hover:text-pink-400 transition-colors">@myhomehaven.ke</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar with Functional Legal Links & Encryption Badge */}
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                &copy; {new Date().getFullYear()} HOMEHAVEN HUB &bull; ALL RIGHTS RESERVED
              </span>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveInfoTopic('security')}
                  className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                >
                  Security
                </button>
                <button
                  onClick={() => setActiveInfoTopic('privacy')}
                  className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                >
                  Privacy
                </button>
                <button
                  onClick={() => setActiveInfoTopic('terms')}
                  className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                >
                  Terms
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveInfoTopic('security')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors"
                title="View Security & Protection Specs"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  End-to-End Encryption & RBAC
                </span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Info & Legal Topic Modal */}
      <InfoModal
        topic={activeInfoTopic}
        onClose={() => setActiveInfoTopic(null)}
      />

      {/* Report Fraud Modal */}
      <ReportFraudModal
        isOpen={showFraudModal}
        onClose={() => setShowFraudModal(false)}
      />
    </>
  );
};

export default Footer;
