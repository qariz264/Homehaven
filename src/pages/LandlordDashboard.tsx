import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Layout,
  Settings,
  PieChart,
  Home,
  Map as MapIcon,
  CreditCard,
  FileText,
  ShieldCheck,
  Search,
  Filter,
  X,
  RotateCcw,
  Building2,
  Award,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import ManualPaymentModal from '../components/ManualPaymentModal';
import RentalIncomeTrendsChart from '../components/RentalIncomeTrendsChart';
import LandlordRegistry from '../components/LandlordRegistry';
import { useSEO } from '../hooks/useSEO';
import axios from 'axios';
import { launchPaystackCheckout, getPaystackConfig, PaystackConfig } from '../services/paystackClient';

const LandlordDashboard: React.FC = () => {
  const { profile, setProfile } = useAuth();

  useSEO({
    title: 'Landlord Dashboard | Manage Rental Portfolio | HomeHaven',
    description: 'HomeHaven Landlord Control Hub for managing rental listings, monitoring vacant units, and tracking M-Pesa payments.',
    robots: 'noindex, nofollow'
  });

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'analytics' | 'registry'>('overview');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig | null>(null);
  
  // Listing filter states inside dashboard
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Active Paystack modal state (opens in new tab and provides direct retry/verify actions)
  const [activePaystackModal, setActivePaystackModal] = useState<{
    listing: any;
    authUrl: string;
    reference: string;
  } | null>(null);

  // Manual payment modal state
  const [manualModalListing, setManualModalListing] = useState<any | null>(null);

  useEffect(() => {
    fetchListings();
    getPaystackConfig().then(cfg => setPaystackConfig(cfg)).catch(() => {});

    // Check for Paystack payment callback reference in URL params
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (reference) {
      verifyPaystackPayment(reference);
    }
  }, [profile]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // Factual real-time calculations from verified landlord listings
  const activeCount = useMemo(() => {
    return listings.filter(l => {
      const isExpired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
      return l.status === 'active' && !isExpired;
    }).length;
  }, [listings]);

  const totalUnitsCount = useMemo(() => {
    return listings.reduce((sum, l) => sum + (Number(l.unitsAvailable) || 1), 0);
  }, [listings]);

  const totalPortfolioRent = useMemo(() => {
    return listings.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  }, [listings]);

  const activePortfolioRent = useMemo(() => {
    return listings
      .filter(l => {
        const isExpired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
        return l.status === 'active' && !isExpired;
      })
      .reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  }, [listings]);

  const verifyPaystackPayment = async (reference: string, overrideListingId?: string) => {
    setVerifyingRef(reference);
    setMessage({ type: 'success', text: 'Autoverifying Paystack transaction reference...' });
    
    try {
      const response = await axios.get(`/api/payment/verify/${reference}`);
      if (response.data?.status && response.data?.data?.status === 'success') {
        const searchParams = new URLSearchParams(window.location.search);
        let targetListingId = overrideListingId || response.data.data?.metadata?.listingId || searchParams.get('listingId');
        if (!targetListingId && reference.startsWith('pstk_')) {
          const parts = reference.split('_');
          if (parts.length >= 2) targetListingId = parts[1];
        }

        if (targetListingId) {
          try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await updateDoc(doc(db, 'listings', targetListingId), {
              status: 'active',
              updatedAt: serverTimestamp(),
              expiresAt: expiresAt.toISOString()
            });
          } catch (clientUpdateErr) {
            console.warn("Client side doc update note:", clientUpdateErr);
          }
        }

        setMessage({ 
          type: 'success', 
          text: '🎉 Paystack payment verified automatically! Your listing is now active and published for tenants.' 
        });
        // Clear query parameters from URL cleanly
        window.history.replaceState({}, document.title, window.location.pathname);
        // Refresh listings
        fetchListings();
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Payment verification returned pending or incomplete. Please check with Paystack.' 
        });
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setMessage({ 
        type: 'error', 
        text: 'Paystack verification failed: ' + (err.response?.data?.error || err.message || 'Unknown error') 
      });
    } finally {
      setVerifyingRef(null);
    }
  };

  const initiatePayment = async (listingId: string) => {
    if (!profile?.email) {
      setMessage({ type: 'error', text: 'Email is required for payment' });
      return;
    }
    
    setPaymentLoading(listingId);
    setMessage(null);
    try {
      const targetListing = listings.find(l => l.id === listingId);
      // Pass public key directly from component level
      const componentPublicKey = paystackConfig?.publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.PAYSTACK_PUBLIC_KEY || '';

      const checkoutResult = await launchPaystackCheckout({
        publicKey: componentPublicKey,
        email: profile.email,
        amount: 1500, // Fixed package price KES 1,500
        listingId,
        listingTitle: targetListing?.title || 'Property Listing',
        onSuccess: async (verifiedReference) => {
          await verifyPaystackPayment(verifiedReference, listingId);
        },
        onPopupError: (failure) => {
          console.warn('[LandlordDashboard] Paystack popup failed to open:', failure.reason, failure.context);
        },
        onFallbackRedirect: (authUrl, ref) => {
          setActivePaystackModal({
            listing: targetListing || { id: listingId, title: 'Property Listing' },
            authUrl,
            reference: ref
          });
          const newWin = window.open(authUrl, '_blank');
          if (!newWin) {
            setMessage({
              type: 'success',
              text: 'Paystack checkout session created. Please use the checkout dialog to complete payment.'
            });
          }
        }
      });

      if (checkoutResult.authUrl) {
        setActivePaystackModal({
          listing: targetListing || { id: listingId, title: 'Property Listing' },
          authUrl: checkoutResult.authUrl,
          reference: checkoutResult.reference
        });
      }

      if (checkoutResult.scriptBlocked) {
        setMessage({
          type: 'error',
          text: 'Notice: External Paystack script (js.paystack.co) was blocked by your browser/ad-blocker. A direct checkout tab has been opened.'
        });
      }
    } catch (err: any) {
      console.error('Paystack initiate error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to initiate Paystack payment.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setPaymentLoading(null);
    }
  };

  const fetchListings = async () => {
    if (!profile) return;
    try {
      const q = query(
        collection(db, 'listings'),
        where('ownerId', '==', profile.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = l.title?.toLowerCase().includes(q);
        const matchLoc = l.location?.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc) return false;
      }
      if (statusFilter === 'active') {
        const isExpired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
        return l.status === 'active' && !isExpired;
      }
      if (statusFilter === 'pending_payment') {
        return l.status === 'pending' || (!l.status && !l.paymentStatus);
      }
      if (statusFilter === 'pending_verification') {
        return l.paymentStatus === 'pending_manual_verification';
      }
      if (statusFilter === 'expired') {
        return l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
      }
      return true;
    });
  }, [listings, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / itemsPerPage));
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredListings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredListings, currentPage]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'expired': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hub Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-[2px] bg-blue-600" />
                <span className="text-blue-600 text-xs font-black uppercase tracking-widest">Property Management</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Landlord <span className="italic text-blue-600">Dashboard</span></h1>
              <p className="text-slate-500 font-medium mt-1">
                Hello, {profile?.businessName || profile?.name}. Real-time management and property accreditation ledger.
              </p>
              
              {profile?.suspended && (
                <div className="mt-4 p-5 rounded-2xl bg-red-600 text-white shadow-xl flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 shrink-0 text-white" />
                  <div>
                    <strong className="font-black uppercase tracking-wider block text-sm">Account Suspended by Admin:</strong>
                    <p className="text-xs font-medium text-red-100 mt-0.5">Your landlord account has been suspended due to tenant complaints or fraud reports. Contact admin (stephenkariuki955@gmail.com) for details.</p>
                  </div>
                </div>
              )}

              {message && (
                <div className={`mt-4 p-4 rounded-xl text-xs font-bold uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {message.text}
                </div>
              )}
            </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('registry')}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
              title="View Registry & Accreditation"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="hidden sm:inline">Registry Profile</span>
            </button>
            {!profile?.suspended && (
              <Link 
                to="/create-listing" 
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-100"
              >
                <Plus className="w-5 h-5" /> New Listing
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Responsive Sidebar Nav / Mobile Tab Bar */}
          <div className="lg:col-span-1 flex lg:flex-col overflow-x-auto no-scrollbar gap-2 lg:gap-2 pb-2 lg:pb-0">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`whitespace-nowrap flex-shrink-0 lg:w-full flex items-center gap-2.5 sm:gap-3 px-4 py-3 sm:p-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-100'}`}
            >
              <Layout className="w-4 h-4 shrink-0" /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('registry')}
              className={`whitespace-nowrap flex-shrink-0 lg:w-full flex items-center gap-2.5 sm:gap-3 px-4 py-3 sm:p-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'registry' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-100'}`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> Landlord Registry
            </button>
            <button 
              onClick={() => setActiveTab('listings')}
              className={`whitespace-nowrap flex-shrink-0 lg:w-full flex items-center gap-2.5 sm:gap-3 px-4 py-3 sm:p-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'listings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-100'}`}
            >
              <Home className="w-4 h-4 shrink-0" /> My Listings ({listings.length})
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`whitespace-nowrap flex-shrink-0 lg:w-full flex items-center gap-2.5 sm:gap-3 px-4 py-3 sm:p-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-100'}`}
            >
              <PieChart className="w-4 h-4 shrink-0" /> Rental Analytics
            </button>
          </div>

          {/* Main Content Pane */}
          <div className="lg:col-span-3 space-y-6 sm:space-y-8">
            
            {/* If Registry tab is selected */}
            {activeTab === 'registry' && (
              <LandlordRegistry 
                profile={profile} 
                listings={listings} 
                onProfileUpdated={(updated) => {
                  if (setProfile && profile) {
                    setProfile({ ...profile, ...updated });
                  }
                }}
              />
            )}

            {/* If Overview or Analytics tab is selected */}
            {activeTab !== 'registry' && (
              <>
                {/* Strictly Factual Stats Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Published</span>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {listings.length > 0 ? Math.round((activeCount / listings.length) * 100) : 0}% Active
                      </span>
                    </div>
                    <div className="flex flex-col">
                       <div className="text-3xl font-black text-slate-900 mb-1 font-mono">
                         {activeCount} / {listings.length}
                       </div>
                       <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-500" 
                            style={{ width: `${(activeCount / (listings.length || 1)) * 100}%` }} 
                          />
                       </div>
                       <span className="text-[9px] text-slate-400 font-bold mt-1">
                         {totalUnitsCount} Total Physical Units Managed
                       </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col justify-between h-40 shadow-xl shadow-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Portfolio Value</span>
                    <div className="flex flex-col">
                      <div className="text-3xl font-black text-white font-mono">
                        KES {totalPortfolioRent.toLocaleString()}
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Gross Monthly Rent Across All {listings.length} Registered
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-600 p-8 rounded-[2rem] text-white flex flex-col justify-between h-40 shadow-xl shadow-emerald-600/20">
                    <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Realized Active Yield</span>
                    <div className="flex flex-col">
                      <div className="text-3xl font-black text-white font-mono">
                        KES {activePortfolioRent.toLocaleString()}
                      </div>
                      <span className="text-[8px] font-black text-emerald-100 uppercase tracking-widest mt-1">
                        From {activeCount} Published Properties
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recharts Monthly Rental Income Trends Bar Chart */}
                {(activeTab === 'overview' || activeTab === 'analytics') && (
                  <RentalIncomeTrendsChart listings={listings} />
                )}

                {/* Content Display / Listing Table */}
                {(activeTab === 'overview' || activeTab === 'listings') && (
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-8 py-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Listing Inventory</h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Manage your property units, verify payments, and monitor expiration status.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setActiveTab('registry')}
                          className="text-[10px] font-black text-slate-700 uppercase tracking-widest hover:text-slate-900 transition-colors bg-slate-100 px-4 py-2 rounded-xl"
                        >
                          View Registry
                        </button>
                        <button 
                          onClick={fetchListings}
                          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 px-4 py-2 rounded-xl"
                        >
                          Sync Hub
                        </button>
                      </div>
                    </div>

                    {/* Filter Section for Landlord Inventory */}
                    <div className="p-6 bg-slate-50/70 border-b border-slate-100">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        {/* Search Field */}
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                          <input 
                            type="text"
                            placeholder="Filter by title, estate or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-black placeholder:text-black/60 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          />
                          {searchQuery && (
                            <button 
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black hover:opacity-70"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Status Dropdown */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl">
                            <Filter className="w-4 h-4 text-black shrink-0" />
                            <label className="text-[10px] font-black uppercase text-black tracking-wider whitespace-nowrap">
                              Status:
                            </label>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="text-xs font-black text-black bg-transparent outline-none cursor-pointer"
                            >
                              <option value="all" className="text-black font-bold">All Listings ({listings.length})</option>
                              <option value="active" className="text-black font-bold">Active ({activeCount})</option>
                              <option value="pending_payment" className="text-black font-bold">Pending Payment</option>
                              <option value="pending_verification" className="text-black font-bold">Pending Admin Verification</option>
                              <option value="expired" className="text-black font-bold">Expired</option>
                            </select>
                          </div>

                          {(searchQuery || statusFilter !== 'all') && (
                            <button 
                              onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                              }}
                              className="p-3 bg-white border border-slate-200 rounded-2xl text-black hover:bg-slate-100 transition-colors"
                              title="Reset filter"
                            >
                              <RotateCcw className="w-4 h-4 text-black" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filter Active Summary */}
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-black text-black uppercase tracking-wider">
                          Showing {listings.filter(l => {
                            if (searchQuery.trim()) {
                              const q = searchQuery.toLowerCase();
                              const matchTitle = l.title?.toLowerCase().includes(q);
                              const matchLoc = l.location?.toLowerCase().includes(q);
                              if (!matchTitle && !matchLoc) return false;
                            }
                            if (statusFilter === 'active') {
                              const isExpired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
                              return l.status === 'active' && !isExpired;
                            }
                            if (statusFilter === 'pending_payment') {
                              return l.status === 'pending' || (!l.status && !l.paymentStatus);
                            }
                            if (statusFilter === 'pending_verification') {
                              return l.paymentStatus === 'pending_manual_verification';
                            }
                            if (statusFilter === 'expired') {
                              return l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
                            }
                            return true;
                          }).length} of {listings.length} listings
                        </span>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-8 py-5 text-[10px] font-black text-black uppercase tracking-[0.2em]">Listing Identity</th>
                            <th className="px-8 py-5 text-[10px] font-black text-black uppercase tracking-[0.2em]">Vital Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-black uppercase tracking-[0.2em]">Financials</th>
                            <th className="px-8 py-5 text-[10px] font-black text-black uppercase tracking-[0.2em] text-right">Access</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {loading ? (
                            Array(3).fill(0).map((_, i) => (
                              <tr key={i} className="animate-pulse">
                                <td colSpan={4} className="px-8 py-10 h-16 bg-slate-50/10" />
                              </tr>
                            ))
                          ) : listings.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-8 py-24 text-center">
                                <div className="flex flex-col items-center">
                                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-slate-200">
                                     <Briefcase className="w-8 h-8" />
                                  </div>
                                  <p className="text-slate-900 font-black text-lg mb-2">Portfolio is empty</p>
                                  <p className="text-slate-400 font-medium mb-8">Ready to add your first property to the HomeHaven hub?</p>
                                  <Link to="/create-listing" className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black shadow-xl shadow-slate-100 flex items-center gap-2">
                                    Create Listing <ArrowUpRight className="w-4 h-4" />
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ) : filteredListings.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-8 py-16 text-center">
                                <p className="text-slate-900 font-black text-base">No listings match your filter criteria.</p>
                                <button 
                                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                  className="mt-3 text-xs font-black text-black underline uppercase tracking-wider"
                                >
                                  Reset filters
                                </button>
                              </td>
                            </tr>
                          ) : paginatedListings.map(listing => {
                            const isExpired = listing.expiresAt ? new Date(listing.expiresAt).getTime() < Date.now() : false;
                            const daysLeft = listing.expiresAt 
                              ? Math.max(0, Math.ceil((new Date(listing.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                              : 0;
                            const isFullyActive = listing.status === 'active' && !isExpired;

                            return (
                              <tr key={listing.id} className="hover:bg-slate-50/50 transition-all group">
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
                                       <img 
                                        src={listing.images[0]} 
                                        className="w-full h-full object-cover" 
                                        alt=""
                                      />
                                    </div>
                                    <div>
                                       <div className="font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{listing.title}</div>
                                       <div className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-1">
                                          <MapPinned className="w-3 h-3 text-slate-500" /> {listing.location}
                                       </div>
                                       <div className="text-[10px] font-mono text-blue-600 font-bold mt-0.5">
                                         PROP-REG-{listing.id.substring(0,6).toUpperCase()}
                                       </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                   {isFullyActive ? (
                                     <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-green-50 border-green-200 text-green-700">
                                       <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                       <span className="text-[10px] font-black uppercase tracking-widest">
                                         Active ({daysLeft} {daysLeft === 1 ? 'day' : 'days'} left)
                                       </span>
                                     </div>
                                   ) : listing.paymentStatus === 'pending_manual_verification' ? (
                                     <div className="space-y-1">
                                       <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-purple-50 border-purple-200 text-purple-700">
                                         <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                         <span className="text-[10px] font-black uppercase tracking-widest">
                                           Pending Admin Verification
                                         </span>
                                       </div>
                                       {listing.paymentRef && (
                                         <div className="text-[9px] text-purple-700 font-bold font-mono">
                                           Ref: {listing.paymentRef}
                                         </div>
                                       )}
                                     </div>
                                   ) : listing.paymentStatus === 'rejected' ? (
                                     <div className="space-y-1">
                                       <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-red-50 border-red-200 text-red-700">
                                         <div className="w-2 h-2 rounded-full bg-red-500" />
                                         <span className="text-[10px] font-black uppercase tracking-widest">
                                           Payment Verification Rejected
                                         </span>
                                       </div>
                                       <div className="text-[9px] text-red-600 font-bold">
                                         Please re-submit valid M-Pesa ref or pay online
                                       </div>
                                     </div>
                                   ) : isExpired ? (
                                     <div className="space-y-1">
                                       <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-red-50 border-red-200 text-red-700">
                                         <div className="w-2 h-2 rounded-full bg-red-500" />
                                         <span className="text-[10px] font-black uppercase tracking-widest">
                                           Expired (30-Day Period Ended)
                                         </span>
                                       </div>
                                       <div className="text-[9px] text-red-600 font-bold">
                                         Renew payment required to re-publish
                                       </div>
                                     </div>
                                   ) : (
                                     <div className="space-y-1">
                                       <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                                         <div className="w-2 h-2 rounded-full bg-amber-500" />
                                         <span className="text-[10px] font-black uppercase tracking-widest">
                                           Pending Activation Fee
                                         </span>
                                       </div>
                                       <div className="text-[9px] text-amber-600 font-bold">
                                         KES 1,500 required to publish
                                       </div>
                                     </div>
                                   )}
                                </td>
                                <td className="px-8 py-6">
                                  <div className="text-lg font-black text-slate-900 tracking-tighter">KES {Number(listing.price).toLocaleString()}</div>
                                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Monthly Rent</div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                                    {(!isFullyActive || isExpired) && (
                                      <>
                                        <button 
                                          onClick={() => initiatePayment(listing.id)}
                                          disabled={paymentLoading === listing.id || verifyingRef !== null}
                                          className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                                          title="Pay KES 1,500 listing fee online via Paystack with instant auto-verification"
                                        >
                                          {paymentLoading === listing.id ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                          ) : (
                                            <CreditCard className="w-3.5 h-3.5" />
                                          )}
                                          Pay KES 1,500 (Paystack)
                                        </button>

                                        <button
                                          onClick={() => setManualModalListing(listing)}
                                          className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
                                          title="Or submit M-Pesa transaction code for manual admin approval"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                          Manual M-Pesa Ref
                                        </button>
                                      </>
                                    )}
                                    <Link 
                                      to={`/listing/${listing.id}`} 
                                      className="inline-flex items-center justify-center w-10 h-10 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm hover:shadow-md shrink-0"
                                    >
                                       <ArrowUpRight className="w-4 h-4" />
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Pagination Bar with Previous and Next Page */}
                    {filteredListings.length > 0 && (
                      <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-bold text-slate-500">
                          Showing <span className="text-slate-900 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                          <span className="text-slate-900 font-black">{Math.min(currentPage * itemsPerPage, filteredListings.length)}</span> of{' '}
                          <span className="text-slate-900 font-black">{filteredListings.length}</span> properties
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Previous Page
                          </button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                          >
                            Next Page
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Paystack Modal in case popups are blocked or user needs to verify */}
      <AnimatePresence>
        {activePaystackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative"
            >
              <button
                type="button"
                onClick={() => setActivePaystackModal(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                Paystack Checkout Active
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                A secure checkout session has been initialized for <strong className="text-slate-900">{activePaystackModal.listing?.title}</strong>. Click below if your browser blocked the window or verify your payment when done.
              </p>

              <div className="space-y-3">
                <a
                  href={activePaystackModal.authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Paystack Checkout Tab
                </a>

                <button
                  type="button"
                  onClick={async () => {
                    await verifyPaystackPayment(activePaystackModal.reference);
                    setActivePaystackModal(null);
                  }}
                  disabled={verifyingRef === activePaystackModal.reference}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {verifyingRef === activePaystackModal.reference ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  I Finished Payment (Verify Now)
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-400 mt-4">
                Transaction Reference: <span className="font-mono font-bold text-slate-600">{activePaystackModal.reference}</span>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Payment Verification Modal */}
      <ManualPaymentModal
        isOpen={!!manualModalListing}
        onClose={() => setManualModalListing(null)}
        listing={manualModalListing}
        onSuccess={() => {
          fetchListings();
          setMessage({
            type: 'success',
            text: '🎉 Payment proof submitted! Admin will verify your code and activate the listing shortly.'
          });
        }}
      />
    </div>
  );
};

const MapPinned = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0Z"/><circle cx="12" cy="8" r="2"/><path d="M8.835 14H5a1 1 0 0 0-.9.7l-2 6c-.1.1-.1.2-.1.3 0 .6.4 1 1 1h18c.6 0 1-.4 1-1 0-.1 0-.2-.1-.3l-2-6a1 1 0 0 0-.9-.7h-3.835"/>
  </svg>
);

export default LandlordDashboard;
