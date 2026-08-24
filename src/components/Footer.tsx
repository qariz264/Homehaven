import React from 'react';
import { Home, Instagram, Mail, Phone, ArrowUpRight, Globe2, ShieldCheck, MapPinned } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 pt-24 pb-12 overflow-hidden relative">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <div className="absolute top-24 -right-24 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8 mb-20">
          
          <div className="md:col-span-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-900/20">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">HOME<span className="text-blue-500">HAVEN</span></span>
            </div>
            <p className="text-slate-400 font-medium leading-relaxed mb-8 max-w-xs">
              Empowering the Kenyan real estate landscape with transparency, security, and a premium digital experience.
            </p>
            <div className="flex items-center gap-4">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Hub Status</span>
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-white text-xs font-bold uppercase tracking-tight">System Operational</span>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8">Navigation</h3>
            <ul className="space-y-4">
              {['Home Hub', 'Property Search', 'Pricing Plans', 'Agent Network'].map(item => (
                <li key={item}>
                  <Link to="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-2 group">
                    {item} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8">Expertise</h3>
            <ul className="space-y-4">
              {['Market Analysis', 'Legal Support', 'Digital Marketing', 'Hub Verification'].map(item => (
                <li key={item}>
                  <Link to="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-bold flex items-center gap-2 group">
                    {item} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/5">
              <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-blue-500" /> Connect With Hub
              </h3>
              <div className="space-y-6">
                <a href="tel:0117334197" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Direct Line</span>
                    <span className="text-white font-bold leading-none">0117334197</span>
                  </div>
                </a>
                <a href="mailto:techa5080@gmail.com" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Inquiry Box</span>
                    <span className="text-white font-bold leading-none">techa5080@gmail.com</span>
                  </div>
                </a>
                <a href="https://instagram.com/alpha_tech_ke" target="_blank" rel="noreferrer" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-pink-600/10 flex items-center justify-center text-pink-500 group-hover:bg-pink-600 group-hover:text-white transition-all">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Social Feed</span>
                    <span className="text-white font-bold leading-none">@alpha_tech_ke</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">&copy; {new Date().getFullYear()} HOMEHAVEN HUB</span>
            <div className="hidden sm:flex items-center gap-6">
               {['Security', 'Privacy', 'Terms'].map(item => (
                 <a key={item} href="#" className="text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors">{item}</a>
               ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End-to-End Encryption Enabled</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
