import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Star, ShieldCheck, Home, Phone, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  county?: string;
  preciseLocation?: string;
  description?: string;
  images: string[];
  status: string;
  unitsAvailable?: number;
  landlordPhone?: string;
  landlordEmail?: string;
}

const PropertyCard: React.FC<{ listing: Listing }> = ({ listing }) => {
  const units = listing.unitsAvailable !== undefined ? listing.unitsAvailable : 1;
  const locationText = listing.county 
    ? `${listing.county} County${listing.preciseLocation ? ` • ${listing.preciseLocation}` : ''}`
    : listing.location;

  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -6 }}
      className="bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 border border-slate-100 group flex flex-col h-full"
    >
      <Link to={`/listing/${listing.id}`} className="flex flex-col h-full">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img 
            src={listing.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'} 
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
          />
          {/* Top Overlays */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-blue-400" /> Verified
            </span>
            <span className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-1">
              <Home className="w-3 h-3" /> {units} {units === 1 ? 'Unit' : 'Units'} Available
            </span>
          </div>
          <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-500">
             <div className="bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg">
                <HeartIcon />
             </div>
          </div>
          
          {/* Bottom Price Bar */}
          <div className="absolute bottom-4 left-4 right-4">
             <div className="glass-card bg-white/90 p-3 rounded-2xl flex justify-between items-center shadow-2xl">
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Monthly Rent</span>
                   <span className="text-sm font-black text-slate-900">KES {listing.price.toLocaleString()}</span>
                </div>
                <div className="bg-blue-600 text-white p-2 rounded-xl group-hover:px-4 transition-all duration-300">
                   <ArrowRight className="w-4 h-4" />
                </div>
             </div>
          </div>
        </div>
        
        <div className="p-6 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase tracking-widest">
              <Star className="w-3 h-3 fill-blue-600" /> Premium Listing
            </div>
            {units > 0 && (
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase">
                {units} Vacant
              </span>
            )}
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{listing.title}</h3>
          
          {/* Location details */}
          <div className="flex items-center gap-1.5 text-slate-600 text-xs font-bold mb-3">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="line-clamp-1">{locationText}</span>
          </div>

          {/* Landlord Description */}
          {listing.description && (
            <p className="text-xs text-slate-500 font-medium line-clamp-3 mb-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
              "{listing.description}"
            </p>
          )}

          {(listing.landlordPhone || listing.landlordEmail) && (
            <div className="flex flex-col gap-1 text-[11px] text-slate-500 font-medium mt-auto bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              {listing.landlordPhone && (
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <Phone className="w-3 h-3 text-blue-500" /> {listing.landlordPhone}
                </div>
              )}
              {listing.landlordEmail && (
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] truncate">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {listing.landlordEmail}
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

const HeartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

export default PropertyCard;
