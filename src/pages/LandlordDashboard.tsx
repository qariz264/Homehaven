import React, { useEffect, useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import ManualPaymentModal from '../components/ManualPaymentModal';
import axios from 'axios';

const LandlordDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Manual payment modal state
  const [manualModalListing, setManualModalListing] = useState<any | null>(null);

  useEffect(() => {
    fetchListings();

    // Check for Paystack payment callback reference in URL params
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (reference) {
      verifyPaystackPayment(reference);
    }
  }, [profile]);

  const verifyPaystackPayment = async (reference: string) => {
    setVerifyingRef(reference);
    setMessage({ type: 'success', text: 'Autoverifying Paystack transaction reference...' });
    
    try {
      const response = await axios.get(`/api/payment/verify/${reference}`);
      if (response.data?.status && response.data?.data?.status === 'success') {
        const searchParams = new URLSearchParams(window.location.search);
        let targetListingId = response.data.data?.metadata?.listingId || searchParams.get('listingId');
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
      const callbackUrl = `${window.location.origin}/dashboard`;
      const response = await axios.post('/api/payment/initiate', {
        email: profile.email,
        amount: 1500, // Fixed package price KES 1,500
        listingId,
        callbackUrl
      });
      
      if (response.data.data?.authorization_url) {
        // Redirect to Paystack checkout
        window.location.href = response.data.data.authorization_url;
      } else {
        setMessage({ type: 'error', text: 'Failed to generate checkout link' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to initiate payment. Try again.' });
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
              <p className="text-slate-400 font-medium mt-1">Hello, {profile?.name}. Manage your property listings here.</p>
              
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
            <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
              <Settings className="w-5 h-5" />
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Nav */}
          <div className="lg:col-span-1 space-y-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'}`}
            >
              <Layout className="w-4 h-4" /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('listings')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'listings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'}`}
            >
              <Home className="w-4 h-4" /> My Listings
            </button>
            <button 
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-white text-slate-400 opacity-50 cursor-not-allowed border border-slate-100`}
            >
              <PieChart className="w-4 h-4" /> Analytics
            </button>
          </div>

          {/* Main Content Pane */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Ratio</span>
                <div className="flex flex-col">
                   <div className="text-3xl font-black text-slate-900 mb-1">{listings.filter(l => l.status === 'active').length} / {listings.length}</div>
                   <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full" 
                        style={{ width: `${(listings.filter(l => l.status === 'active').length / (listings.length || 1)) * 100}%` }} 
                      />
                   </div>
                </div>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col justify-between h-40 shadow-xl shadow-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Portfolio Value</span>
                <div className="flex flex-col">
                  <div className="text-3xl font-black text-white italic">KES {listings.reduce((sum, l) => sum + (l.price || 0), 0).toLocaleString()}</div>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estimated Monthly Yield</span>
                </div>
              </div>
              <div className="bg-blue-600 p-8 rounded-[2rem] text-white flex flex-col justify-between h-40 shadow-xl shadow-blue-100 italic">
                <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Expansion Potential</span>
                <div className="flex flex-col">
                  <div className="text-3xl font-black text-white">+ {Math.floor(Math.random() * 5) + 1}</div>
                  <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest">Neighborhood Opportunities</span>
                </div>
              </div>
            </div>

            {/* Content Display */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Listing Inventory</h2>
                <button 
                  onClick={fetchListings}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 px-4 py-2 rounded-xl"
                >
                  Sync Hub
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Listing Identity</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vital Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financials</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Access</th>
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
                    ) : listings.map(listing => {
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
                                 <div className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-1">
                                    <MapPinned className="w-3 h-3" /> {listing.location}
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
                            <div className="text-lg font-black text-slate-900 tracking-tighter">KES {listing.price.toLocaleString()}</div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Monthly Rent</div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                              {(!isFullyActive || isExpired) && (
                                <>
                                  <button 
                                    onClick={() => initiatePayment(listing.id)}
                                    disabled={paymentLoading === listing.id || verifyingRef !== null}
                                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                                    title="Pay online via Paystack with instant automatic verification"
                                  >
                                    {paymentLoading === listing.id ? (
                                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <CreditCard className="w-3.5 h-3.5" />
                                    )}
                                    Pay Online (Instant)
                                  </button>

                                  <button
                                    onClick={() => setManualModalListing(listing)}
                                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-md"
                                    title="Submit M-Pesa transaction code for manual admin approval"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                    M-Pesa Code (Manual)
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
            </div>
          </div>
        </div>
      </div>

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
)

export default LandlordDashboard;
