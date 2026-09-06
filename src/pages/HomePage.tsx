import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import PropertyCard from '../components/PropertyCard';
import ReportFraudModal from '../components/ReportFraudModal';
import LocationPermissionCard from '../components/LocationPermissionCard';
import { KENYA_COUNTIES } from '../lib/counties';
import { useSEO } from '../hooks/useSEO';
import { Search, MapPin, SlidersHorizontal, ArrowRight, Building2, Users2, ShieldCheck, Zap, X, RotateCcw, DollarSign, Home as HomeIcon, Filter, Navigation, ShieldAlert, Crosshair, HelpCircle, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';

const KENYA_RENTAL_FAQS = [
  {
    q: "How do I find verified houses and apartments for rent on HomeHaven?",
    a: "Browse verified rental listings across all 47 counties in Kenya including Nairobi, Mombasa, Kiambu, and Nakuru. Filter by price, vacant units, or specific estates (such as Kilimani, Westlands, Roysambu, or Juja). You can review real photos, amenities, and contact verified landlords directly via WhatsApp or direct phone call."
  },
  {
    q: "How does HomeHaven verify landlords and prevent rental scams?",
    a: "Every landlord listing is activated through verified Kenyan M-Pesa payment records. In addition, tenants can submit anonymous reports directly to our Admin Security Operations team, who swiftly investigate and suspend scam or impersonator accounts."
  },
  {
    q: "Are there middleman, broker, or viewing fees on HomeHaven?",
    a: "No! HomeHaven connects tenants directly with verified property owners and building managers. You can view property details, examine exact vacant unit counts, and call or message the landlord without paying broker middleman fees."
  },
  {
    q: "What types of rental properties are listed on HomeHaven Kenya?",
    a: "HomeHaven lists all property types across Kenya: affordable student bedsitters, modern 1, 2, and 3-bedroom apartments, executive penthouses, family maisonettes, townhouses, and commercial spaces in Nairobi, Mombasa, Kisumu, Eldoret, Nakuru, and beyond."
  },
  {
    q: "How can landlords list and activate their rental houses with M-Pesa?",
    a: "Landlords can create an account, upload property details and high-resolution photos, and activate their listing within seconds using automated M-Pesa STK Push or Paybill receipt verification."
  }
];

const POPULAR_SEARCHES = [
  { label: "Nairobi Apartments", county: "Nairobi", query: "" },
  { label: "Kilimani Rentals", county: "Nairobi", query: "Kilimani" },
  { label: "Westlands Flats", county: "Nairobi", query: "Westlands" },
  { label: "Roysambu Bedsitters", county: "Nairobi", query: "Roysambu" },
  { label: "Mombasa Beach Houses", county: "Mombasa", query: "" },
  { label: "Kiambu / Thika Road", county: "Kiambu", query: "" },
  { label: "Juja Student Bedsitters", county: "Kiambu", query: "Juja" },
  { label: "Nakuru Town Rentals", county: "Nakuru", query: "" },
  { label: "Kisumu Lakeview", county: "Kisumu", query: "" },
  { label: "Eldoret Town Flats", county: "Uasin Gishu", query: "" },
];

const HomePage: React.FC = () => {
  const location = useLocation();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFraudModal, setShowFraudModal] = useState(false);
  const [showLocationCard, setShowLocationCard] = useState(false);
  const [detectedLocationInfo, setDetectedLocationInfo] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Search & Filter state
  const [selectedCounty, setSelectedCounty] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minUnits, setMinUnits] = useState<string>('');

  // Check if geographic location access has been previously decided
  useEffect(() => {
    const geoStatus = localStorage.getItem('geo_permission_status');
    if (!geoStatus) {
      const timer = setTimeout(() => {
        setShowLocationCard(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Dynamic SEO configuration for Home and County Searches with Google Schema & FAQPage
  useSEO({
    title: selectedCounty 
      ? `Verified Houses & Apartments for Rent in ${selectedCounty} County | HomeHaven Kenya`
      : 'HomeHaven | Verified Real Estate & House Listings in Kenya',
    description: selectedCounty
      ? `Browse verified rental properties in ${selectedCounty} County, Kenya. Direct landlord contacts, transparent monthly rent, and real-time vacant unit counters.`
      : 'A premium real estate marketplace connecting landlords and tenants with real M-Pesa payment-activated listings across Nairobi, Mombasa, Kisumu, and all 47 counties in Kenya.',
    keywords: 'HomeHaven, HomeHaven Kenya, houses for rent Kenya, Nairobi apartments, real estate Kenya, bedsitters Nairobi, Kilimani rentals, Westlands apartments, rent houses Mombasa, verified landlord listings, Kenyan real estate, Roysambu bedsitters, Juja rentals, Kiambu houses',
    canonicalUrl: selectedCounty ? `https://www.myhomehaven.co.ke/?county=${encodeURIComponent(selectedCounty)}` : 'https://www.myhomehaven.co.ke/',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': 'https://www.myhomehaven.co.ke/#website',
          'name': 'HomeHaven',
          'alternateName': ['Home Haven', 'HomeHaven Kenya', 'Home Haven Kenya', 'HomeHaven Real Estate'],
          'url': 'https://www.myhomehaven.co.ke',
          'potentialAction': {
            '@type': 'SearchAction',
            'target': 'https://www.myhomehaven.co.ke/?search={search_term_string}',
            'query-input': 'required name=search_term_string'
          },
          'inLanguage': 'en-KE'
        },
        {
          '@type': 'RealEstateAgent',
          '@id': 'https://www.myhomehaven.co.ke/#organization',
          'name': 'HomeHaven Kenya',
          'alternateName': ['HomeHaven', 'Home Haven Kenya'],
          'url': 'https://www.myhomehaven.co.ke',
          'sameAs': [
            'https://www.instagram.com/myhomehaven.ke/'
          ],
          'description': "Kenya's premier verified real estate portal for rental houses and apartments.",
          'address': {
            '@type': 'PostalAddress',
            'addressLocality': 'Nairobi',
            'addressRegion': selectedCounty || 'Nairobi County',
            'addressCountry': 'KE'
          },
          'areaServed': {
            '@type': 'Country',
            'name': 'Kenya'
          },
          'knowsAbout': [
            'Houses for rent in Kenya',
            'Apartments for rent in Nairobi',
            'Bedsitters in Nairobi',
            'Kilimani apartments for rent',
            'Westlands apartments for rent'
          ]
        },
        {
          '@type': 'FAQPage',
          'mainEntity': KENYA_RENTAL_FAQS.map(faq => ({
            '@type': 'Question',
            'name': faq.q,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': faq.a
            }
          }))
        }
      ]
    }
  });

  // Smooth scroll to anchor on navigation
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    } else if (location.pathname === '/' && !location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);

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
      <section id="hero" className="relative h-[80vh] flex items-center justify-center overflow-hidden">
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
            
            {/* Hero Filter Card with Black Text */}
            <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-2xl space-y-3 border border-white/40">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* County Selector */}
                <div className="flex items-center gap-2 px-3 py-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <Navigation className="w-4 h-4 text-black shrink-0" />
                  <select
                    className="w-full text-xs outline-none font-black text-black bg-transparent cursor-pointer appearance-none"
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                  >
                    <option value="" className="text-black font-bold">All 47 Counties</option>
                    {KENYA_COUNTIES.map(c => (
                      <option key={c} value={c} className="text-black font-bold">{c} County</option>
                    ))}
                  </select>
                </div>

                {/* Location / Keyword Search */}
                <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <MapPin className="w-5 h-5 text-black shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Area / Estate / Title..."
                    className="w-full text-xs outline-none font-black text-black placeholder:text-black/60 bg-transparent"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                  {locationSearch && (
                    <button onClick={() => setLocationSearch('')} className="text-black hover:opacity-70">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Price Filter */}
                <div className="flex items-center gap-2 px-3 py-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <DollarSign className="w-4 h-4 text-black shrink-0" />
                  <input 
                    type="number" 
                    placeholder="Max Rent (KES)"
                    className="w-full text-xs outline-none font-black text-black placeholder:text-black/60 bg-transparent"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>

                {/* Units Available */}
                <div className="flex items-center gap-2 px-3 py-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <HomeIcon className="w-4 h-4 text-black shrink-0" />
                  <select 
                    className="w-full text-xs outline-none font-black text-black bg-transparent appearance-none cursor-pointer"
                    value={minUnits}
                    onChange={(e) => setMinUnits(e.target.value)}
                  >
                    <option value="" className="text-black font-bold">Any Vacancy</option>
                    <option value="1" className="text-black font-bold">1+ Unit</option>
                    <option value="2" className="text-black font-bold">2+ Units</option>
                    <option value="3" className="text-black font-bold">3+ Units</option>
                    <option value="5" className="text-black font-bold">5+ Units</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 px-1 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-black" /> Filter by County, Area, Price & Vacant Units
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLocationCard(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                    title="Geographic location access request"
                  >
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>Near Me</span>
                  </button>
                </div>
                {hasActiveFilters && (
                  <button 
                    onClick={clearFilters}
                    className="text-[10px] font-black uppercase text-black hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3 text-black" /> Reset Filters
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

      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <section id="listings" className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Quick Search Hub for High-Ranking Kenyan Google Searches */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 py-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Popular Google Searches:
            </span>
            {POPULAR_SEARCHES.map(item => {
              const isSelected = (selectedCounty === item.county && (item.query ? locationSearch === item.query : true));
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setSelectedCounty(item.county);
                    setLocationSearch(item.query);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Filter Toolbar for Tenants */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xl mb-10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* County Dropdown */}
              <div>
                <label className="text-[10px] font-black uppercase text-black tracking-wider mb-1.5 block">
                  Select County
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <Navigation className="w-4 h-4 text-black shrink-0" />
                  <select 
                    className="w-full text-xs font-black text-black bg-transparent outline-none cursor-pointer"
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                  >
                    <option value="" className="text-black font-bold">All 47 Counties</option>
                    {KENYA_COUNTIES.map(c => (
                      <option key={c} value={c} className="text-black font-bold">{c} County</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location or Title Search */}
              <div className="relative">
                <label className="text-[10px] font-black uppercase text-black tracking-wider mb-1.5 block">
                  Area / Estate / Title
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <MapPin className="w-4 h-4 text-black shrink-0" />
                  <input 
                    type="text" 
                    placeholder="e.g. Kilimani, School Lane..."
                    className="w-full text-xs font-black text-black placeholder:text-black/60 bg-transparent outline-none"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                  {locationSearch && (
                    <button onClick={() => setLocationSearch('')} className="text-black hover:opacity-70">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Min Price */}
              <div>
                <label className="text-[10px] font-black uppercase text-black tracking-wider mb-1.5 block">
                  Min Rent (KES)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className="text-xs font-black text-black">KES</span>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full text-xs font-black text-black placeholder:text-black/60 bg-transparent outline-none"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  {minPrice && (
                    <button onClick={() => setMinPrice('')} className="text-black hover:opacity-70">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Max Price */}
              <div>
                <label className="text-[10px] font-black uppercase text-black tracking-wider mb-1.5 block">
                  Max Rent (KES)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className="text-xs font-black text-black">KES</span>
                  <input 
                    type="number" 
                    placeholder="Any price"
                    className="w-full text-xs font-black text-black placeholder:text-black/60 bg-transparent outline-none"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                  {maxPrice && (
                    <button onClick={() => setMaxPrice('')} className="text-black hover:opacity-70">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Units Available */}
              <div>
                <label className="text-[10px] font-black uppercase text-black tracking-wider mb-1.5 block">
                  Vacant Units Needed
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                  <HomeIcon className="w-4 h-4 text-black shrink-0" />
                  <select 
                    className="w-full text-xs font-black text-black bg-transparent outline-none cursor-pointer"
                    value={minUnits}
                    onChange={(e) => setMinUnits(e.target.value)}
                  >
                    <option value="" className="text-black font-bold">Any Vacancy</option>
                    <option value="1" className="text-black font-bold">At least 1 Unit</option>
                    <option value="2" className="text-black font-bold">At least 2 Units</option>
                    <option value="3" className="text-black font-bold">At least 3 Units</option>
                    <option value="5" className="text-black font-bold">At least 5 Units</option>
                    <option value="10" className="text-black font-bold">At least 10 Units</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Filter status row & active chips */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-black text-white font-black rounded-lg text-[10px] uppercase tracking-wider">
                  {filteredListings.length} {filteredListings.length === 1 ? 'House Found' : 'Houses Found'}
                </span>

                <button
                  type="button"
                  onClick={() => setShowLocationCard(true)}
                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Geographic location access request"
                >
                  <Navigation className="w-3 h-3 text-blue-600" />
                  <span>{detectedLocationInfo ? `Nearby: ${detectedLocationInfo}` : 'Use My Location'}</span>
                </button>

                {selectedCounty && (
                  <span className="px-3 py-1 bg-slate-100 text-black border border-slate-300 font-black rounded-lg text-[10px] flex items-center gap-1.5">
                    County: {selectedCounty}
                    <button onClick={() => setSelectedCounty('')} className="text-black hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {locationSearch && (
                  <span className="px-3 py-1 bg-slate-100 text-black border border-slate-300 font-black rounded-lg text-[10px] flex items-center gap-1.5">
                    Area: "{locationSearch}"
                    <button onClick={() => setLocationSearch('')} className="text-black hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {minPrice && (
                  <span className="px-3 py-1 bg-slate-100 text-black border border-slate-300 font-black rounded-lg text-[10px] flex items-center gap-1.5">
                    Min KES {Number(minPrice).toLocaleString()}
                    <button onClick={() => setMinPrice('')} className="text-black hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {maxPrice && (
                  <span className="px-3 py-1 bg-slate-100 text-black border border-slate-300 font-black rounded-lg text-[10px] flex items-center gap-1.5">
                    Max KES {Number(maxPrice).toLocaleString()}
                    <button onClick={() => setMaxPrice('')} className="text-black hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {minUnits && (
                  <span className="px-3 py-1 bg-slate-100 text-black border border-slate-300 font-black rounded-lg text-[10px] flex items-center gap-1.5">
                    {minUnits}+ Units Vacant
                    <button onClick={() => setMinUnits('')} className="text-black hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>

              {hasActiveFilters && (
                <button 
                  onClick={clearFilters} 
                  className="text-[10px] font-black text-black hover:underline uppercase tracking-widest flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-black" /> Clear All Filters
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

      {/* Frequently Asked Questions & Kenya House Hunting Guide (Google SEO & Rich Results) */}
      <section id="faq" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 mb-3 border border-blue-100">
              <HelpCircle className="w-3.5 h-3.5" /> Tenant & Landlord Guide
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 text-sm sm:text-base font-medium mt-3 max-w-xl mx-auto">
              Everything you need to know about searching, verifying, and renting houses across Kenya with zero middleman broker fees.
            </p>
          </div>

          <div className="space-y-3.5">
            {KENYA_RENTAL_FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-200/90 overflow-hidden transition-all bg-slate-50/50 hover:border-slate-300"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-black text-slate-900 text-sm sm:text-base cursor-pointer select-none"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center shrink-0 font-black">
                        {index + 1}
                      </span>
                      <span>{faq.q}</span>
                    </span>
                    <div className={`w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 transition-transform ${isOpen ? 'rotate-180 bg-blue-50 border-blue-200 text-blue-600' : 'text-slate-500'}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-100/80 bg-white">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Quick Help Footer Card */}
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h4 className="text-sm font-black text-slate-900">Looking for a specific estate in Kenya?</h4>
              <p className="text-xs font-medium text-slate-600 mt-0.5">Explore apartments in Kilimani, Westlands, Roysambu, Juja, Mombasa, and Nakuru.</p>
            </div>
            <a
              href="#listings"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 shadow-md shadow-blue-500/20"
            >
              Browse All Properties
            </a>
          </div>
        </div>
      </section>

      {/* Hub CTA Section */}
      <section id="partner" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      {/* Floating Quick Action Button for Mobile & Desktop */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => setShowFraudModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-full font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 border-2 border-white transition-all hover:scale-105 active:scale-95"
          title="Report Fraudulent Account or Scam"
        >
          <ShieldAlert className="w-4 h-4 text-white animate-pulse shrink-0" />
          <span>Report Fraud Account</span>
        </button>
      </div>

      {/* Fraud Report Modal */}
      <ReportFraudModal
        isOpen={showFraudModal}
        onClose={() => setShowFraudModal(false)}
      />

      {/* Geographic Location Access Request Card */}
      <LocationPermissionCard
        isOpen={showLocationCard}
        onClose={() => setShowLocationCard(false)}
        onLocationGranted={({ county }) => {
          if (county) {
            setSelectedCounty(county);
            setDetectedLocationInfo(county);
            const listingsEl = document.getElementById('listings');
            if (listingsEl) {
              setTimeout(() => {
                listingsEl.scrollIntoView({ behavior: 'smooth' });
              }, 1200);
            }
          }
        }}
      />
    </div>
  );
};

export default HomePage;
