import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import PropertyCard from '../components/PropertyCard';
import ReportFraudModal from '../components/ReportFraudModal';
import { KENYA_COUNTIES } from '../lib/counties';
import { Search, MapPin, SlidersHorizontal, ArrowRight, Building2, Users2, ShieldCheck, Zap, X, RotateCcw, DollarSign, Home as HomeIcon, Filter, Navigation, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFraudModal, setShowFraudModal] = useState(false);
  
  // Search & Filter state
  const [selectedCounty, setSelectedCounty] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minUnits, setMinUnits] = useState<string>('');

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(
          collection(db, 'listings'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(24)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setListings(fetched);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const filteredListings = listings.filter(l => {
    // 30-day listing expiry check
    const isExpired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
    if (isExpired) return false;

    const matchesCounty = !selectedCounty || 
      (l.county && l.county.toLowerCase() === selectedCounty.toLowerCase()) ||
      (l.location && l.location.toLowerCase().includes(selectedCounty.toLowerCase()));

    const matchesLoc = !locationSearch || 
      (l.preciseLocation && l.preciseLocation.toLowerCase().includes(locationSearch.toLowerCase())) ||
      (l.location && l.location.toLowerCase().includes(locationSearch.toLowerCase())) ||
      (l.title && l.title.toLowerCase().includes(locationSearch.toLowerCase()));

    const price = Number(l.price) || 0;
    const matchesMinPrice = !minPrice || price >= Number(minPrice);
    const matchesMaxPrice = !maxPrice || price <= Number(maxPrice);

    const units = l.unitsAvailable !== undefined ? Number(l.unitsAvailable) : 1;
    const matchesMinUnits = !minUnits || units >= Number(minUnits);

    return matchesCounty && matchesLoc && matchesMinPrice && matchesMaxPrice && matchesMinUnits;
  });

  const clearFilters = () => {
    setSelectedCounty('');
    setLocationSearch('');
    setMinPrice('');
    setMaxPrice('');
    setMinUnits('');
  };

  const hasActiveFilters = Boolean(selectedCounty || locationSearch || minPrice || maxPrice || minUnits);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      {/* Immersive Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80" 
            className="w-full h-full object-cover"
            alt="Hero"
          />
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-600/20 backdrop-blur-md border border-blue-400/30 text-blue-100 text-xs font-bold uppercase tracking-widest mb-6">
              Welcome to the Hub
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-8 drop-shadow-2xl">
              HomeHaven <br /> Real Estate <span className="text-blue-400">Hub</span>
            </h1>
            
            <div className="max-w-4xl mx-auto glass-card p-4 rounded-3xl shadow-2xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* County Selector */}
                <div className="flex items-center gap-2 px-3 py-3.5 bg-white/10 rounded-2xl border border-white/10">
                  <Navigation className="w-4 h-4 text-blue-400 shrink-0" />
                  <select
                    className="w-full text-xs outline-none font-bold text-white bg-transparent cursor-pointer appearance-none [&>option]:text-slate-900"
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                  >
                    <option value="">All 47 Counties</option>
                    {KENYA_COUNTIES.map(c => (
                      <option key={c} value={c}>{c} County</option>
                    ))}
                  </select>
                </div>

                {/* Location / Keyword Search */}
                <div className="flex items-center gap-3 px-4 py-3.5 bg-white/10 rounded-2xl border border-white/10">
                  <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Area / Estate / Title..."
                    className="w-full text-xs outline-none font-bold text-white placeholder:text-white/50 bg-transparent"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                  {locationSearch && (
                    <button onClick={() => setLocationSearch('')} className="text-white/40 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Price Filter */}
                <div className="flex items-center gap-2 px-3 py-3.5 bg-white/10 rounded-2xl border border-white/10">
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input 
                    type="number" 
                    placeholder="Max Rent (KES)"
                    className="w-full text-xs outline-none font-bold text-white placeholder:text-white/50 bg-transparent"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>

                {/* Units Available */}
                <div className="flex items-center gap-2 px-3 py-3.5 bg-white/10 rounded-2xl border border-white/10">
                  <HomeIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <select 
                    className="w-full text-xs outline-none font-bold text-white bg-transparent appearance-none cursor-pointer [&>option]:text-slate-900"
                    value={minUnits}
                    onChange={(e) => setMinUnits(e.target.value)}
                  >
                    <option value="">Any Vacancy</option>
                    <option value="1">1+ Unit</option>
                    <option value="2">2+ Units</option>
                    <option value="3">3+ Units</option>
                    <option value="5">5+ Units</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 px-1">
                <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-blue-400" /> Filter by County, Area, Price & Vacant Units
                </span>
                {hasActiveFilters && (
                  <button 
                    onClick={clearFilters}
                    className="text-[10px] font-black uppercase text-red-300 hover:text-red-100 flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Filters
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Stats Hub */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden lg:flex gap-8 px-12 py-6 glass-card rounded-3xl z-20">
          <div className="flex flex-col">
            <span className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">Total Properties</span>
            <span className="text-white text-2xl font-black">2.5k+</span>
          </div>
          <div className="w-[1px] bg-white/10" />
          <div className="flex flex-col">
            <span className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">Active Users</span>
            <span className="text-white text-2xl font-black">15k</span>
          </div>
          <div className="w-[1px] bg-white/10" />
          <div className="flex flex-col">
            <span className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">Weekly Deals</span>
            <span className="text-white text-2xl font-black">120+</span>
          </div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-900 mb-2">Our Key Features</h2>
          <p className="text-slate-500 font-medium">Why landlords and tenants choose HomeHaven</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <Zap className="w-10 h-10 text-yellow-500 mb-6" />
              <h3 className="text-2xl font-black text-slate-900 mb-4">Fast Listing</h3>
              <p className="text-slate-500 leading-relaxed font-medium max-w-md">
                Post your property and get it seen by thousands of people instantly. No delays, no stress.
              </p>
            </div>
            <div className="mt-8 flex gap-3">
              <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black rounded-lg uppercase tracking-tight">Easy Sync</span>
              <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black rounded-lg uppercase tracking-tight">Real-time</span>
            </div>
          </div>
          <div className="bg-blue-600 p-8 rounded-3xl text-white flex flex-col justify-between shadow-xl shadow-blue-100">
            <div>
              <ShieldCheck className="w-10 h-10 text-blue-200 mb-6" />
              <h3 className="text-2xl font-black text-white mb-4">Safe & Trusted</h3>
              <p className="text-blue-100 leading-relaxed font-medium">
                We verify every user on our platform. Encountered a suspicious landlord or scam account? Report them directly to Admin.
              </p>
            </div>
            <button
              onClick={() => setShowFraudModal(true)}
              className="mt-8 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-[1.02]"
            >
              <ShieldAlert className="w-4 h-4" /> Report Fraudulent Account
            </button>
          </div>
        </div>
      </section>

      {/* Featured Grid */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Toolbar for Tenants */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xl mb-10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* County Dropdown */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">
                  Select County
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                  <select 
                    className="w-full text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                  >
                    <option value="">All 47 Counties</option>
                    {KENYA_COUNTIES.map(c => (
                      <option key={c} value={c}>{c} County</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location or Title Search */}
              <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">
                  Area / Estate / Title
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="e.g. Kilimani, School Lane..."
                    className="w-full text-xs font-bold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                  {locationSearch && (
                    <button onClick={() => setLocationSearch('')} className="text-slate-400 hover:text-slate-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Min Price */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">
                  Min Rent (KES)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-400">KES</span>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full text-xs font-bold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  {minPrice && (
                    <button onClick={() => setMinPrice('')} className="text-slate-400 hover:text-slate-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Max Price */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">
                  Max Rent (KES)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-400">KES</span>
                  <input 
                    type="number" 
                    placeholder="Any price"
                    className="w-full text-xs font-bold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                  {maxPrice && (
                    <button onClick={() => setMaxPrice('')} className="text-slate-400 hover:text-slate-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Units Available */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">
                  Vacant Units Needed
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <HomeIcon className="w-4 h-4 text-amber-500 shrink-0" />
                  <select 
                    className="w-full text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                    value={minUnits}
                    onChange={(e) => setMinUnits(e.target.value)}
                  >
                    <option value="">Any Vacancy</option>
                    <option value="1">At least 1 Unit</option>
                    <option value="2">At least 2 Units</option>
                    <option value="3">At least 3 Units</option>
                    <option value="5">At least 5 Units</option>
                    <option value="10">At least 10 Units</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Filter status row & active chips */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black rounded-lg text-[10px] uppercase tracking-wider">
                  {filteredListings.length} {filteredListings.length === 1 ? 'House Found' : 'Houses Found'}
                </span>

                {selectedCounty && (
                  <span className="px-3 py-1 bg-blue-600 text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5">
                    County: {selectedCounty}
                    <button onClick={() => setSelectedCounty('')} className="hover:text-blue-200"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {locationSearch && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-lg text-[10px] flex items-center gap-1.5">
                    Area: "{locationSearch}"
                    <button onClick={() => setLocationSearch('')} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {minPrice && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-[10px] flex items-center gap-1.5">
                    Min KES {Number(minPrice).toLocaleString()}
                    <button onClick={() => setMinPrice('')} className="hover:text-emerald-900"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {maxPrice && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-[10px] flex items-center gap-1.5">
                    Max KES {Number(maxPrice).toLocaleString()}
                    <button onClick={() => setMaxPrice('')} className="hover:text-emerald-900"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {minUnits && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-lg text-[10px] flex items-center gap-1.5">
                    {minUnits}+ Units Vacant
                    <button onClick={() => setMinUnits('')} className="hover:text-amber-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>

              {hasActiveFilters && (
                <button 
                  onClick={clearFilters} 
                  className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest flex items-center gap-1.5 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                </button>
              )}
            </div>
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-slate-100" />
              ))
            ) : filteredListings.length > 0 ? (
              filteredListings.map(listing => (
                <PropertyCard key={listing.id} listing={listing} />
              ))
            ) : (
              <div className="col-span-full text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200">
                <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 mb-2">No matching properties found</h3>
                <p className="text-slate-400 font-medium">Try clearing or adjusting your filter options.</p>
                <button onClick={clearFilters} className="inline-block mt-8 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider">Clear Filters</button>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Hub CTA Section */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-[40px] p-12 md:p-20 relative overflow-hidden text-center md:text-left">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
             <Building2 className="w-full h-full text-white" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">Ready to become a HomeHaven <span className="text-blue-500">partner</span>?</h2>
            <p className="text-slate-400 text-lg font-medium mb-10 leading-relaxed">
              Join Kenya's fastest growing real estate hub. List your property in minutes and reach thousands of verified tenants instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/create-listing" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-center transition-all hover:bg-blue-700">List Your Property</Link>
              <Link to="/auth" className="bg-white/10 text-white border border-white/10 backdrop-blur-md px-8 py-4 rounded-xl font-black text-center transition-all hover:bg-white/20">Create Free Account</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Button for Fraud Report */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowFraudModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-3.5 rounded-full font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2.5 border-2 border-white transition-all hover:scale-105 active:scale-95"
          title="Report Fraudulent Account or Scam"
        >
          <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
          <span>Report Fraud Account</span>
        </button>
      </div>

      {/* Fraud Report Modal */}
      <ReportFraudModal
        isOpen={showFraudModal}
        onClose={() => setShowFraudModal(false)}
      />
    </div>
  );
};

export default HomePage;
