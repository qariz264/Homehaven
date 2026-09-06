import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { 
  Shield, 
  Trash2, 
  Users, 
  CreditCard, 
  Layout, 
  AlertTriangle, 
  Ban, 
  CheckCircle2, 
  Eye, 
  Phone, 
  Mail, 
  Search, 
  RefreshCw,
  Home,
  Check,
  X,
  UserX,
  UserCheck,
  Globe,
  ExternalLink,
  Copy,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const AdminPanel: React.FC = () => {
  const { profile, user } = useAuth();

  useSEO({
    title: 'Admin Console | HomeHaven Root Control',
    description: 'HomeHaven Administrative Security Console for fraud prevention and listing moderation.',
    robots: 'noindex, nofollow'
  });

  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'complaints' | 'payments' | 'users' | 'listings' | 'seo'>('complaints');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const [googleVerificationInput, setGoogleVerificationInput] = useState(() => {
    try {
      return localStorage.getItem('homehaven_google_verification') || 'homehaven-kenya-search-console-verification';
    } catch {
      return 'homehaven-kenya-search-console-verification';
    }
  });
  
  // Custom Delete Modal state
  const [deleteModal, setDeleteModal] = useState<{ type: 'listing' | 'user'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch listings with fallback if index or query fails
      let listingsDocs: any[] = [];
      try {
        const listingsSnap = await getDocs(query(collection(db, 'listings'), orderBy('createdAt', 'desc')));
        listingsDocs = listingsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      } catch (e) {
        const listingsSnap = await getDocs(collection(db, 'listings'));
        listingsDocs = listingsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      }

      // Fetch users
      let usersDocs: any[] = [];
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersDocs = usersSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      } catch (e) {
        console.warn('Could not fetch users:', e);
      }

      // Fetch complaints
      let complaintsDocs: any[] = [];
      try {
        const complaintsSnap = await getDocs(query(collection(db, 'complaints'), orderBy('createdAt', 'desc')));
        complaintsDocs = complaintsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      } catch (e) {
        try {
          const complaintsSnap = await getDocs(collection(db, 'complaints'));
          complaintsDocs = complaintsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        } catch (err) {
          console.warn('Could not fetch complaints:', err);
        }
      }

      // Fetch payments
      let paymentsDocs: any[] = [];
      try {
        const paymentsSnap = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')));
        paymentsDocs = paymentsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      } catch (e) {
        try {
          const paymentsSnap = await getDocs(collection(db, 'payments'));
          paymentsDocs = paymentsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        } catch (err) {
          console.warn('Could not fetch payments:', err);
        }
      }

      setListings(listingsDocs);
      setUsers(usersDocs);
      setComplaints(complaintsDocs);
      setPayments(paymentsDocs);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Suspend Landlord and all their listings
  const handleSuspendLandlord = async (landlordId: string, landlordEmail?: string) => {
    if (!landlordId) return;
    if (window.confirm(`Are you sure you want to SUSPEND landlord (${landlordEmail || landlordId})? All their property listings will be suspended immediately.`)) {
      try {
        // Update user doc
        await updateDoc(doc(db, 'users', landlordId), {
          suspended: true,
          updatedAt: new Date().toISOString()
        });

        // Suspend all listings belonging to landlord
        const userListings = listings.filter(l => l.ownerId === landlordId);
        for (const listing of userListings) {
          await updateDoc(doc(db, 'listings', listing.id), {
            status: 'suspended'
          });
        }

        // Update local states
        setUsers(users.map(u => u.id === landlordId ? { ...u, suspended: true } : u));
        setListings(listings.map(l => l.ownerId === landlordId ? { ...l, status: 'suspended' } : l));
        
        showToast('success', `Landlord ${landlordEmail || landlordId} and their ${userListings.length} listing(s) have been SUSPENDED.`);
      } catch (err: any) {
        console.error('Error suspending landlord:', err);
        showToast('error', 'Failed to suspend landlord: ' + err.message);
      }
    }
  };

  // Reinstate Landlord
  const handleUnsuspendLandlord = async (landlordId: string, landlordEmail?: string) => {
    if (!landlordId) return;
    if (window.confirm(`Reactivate landlord account (${landlordEmail || landlordId})?`)) {
      try {
        await updateDoc(doc(db, 'users', landlordId), {
          suspended: false,
          updatedAt: new Date().toISOString()
        });

        setUsers(users.map(u => u.id === landlordId ? { ...u, suspended: false } : u));
        showToast('success', `Landlord ${landlordEmail || landlordId} has been REACTIVATED.`);
      } catch (err: any) {
        console.error('Error reactivating landlord:', err);
        showToast('error', 'Failed to reactivate landlord: ' + err.message);
      }
    }
  };

  // Suspend individual listing
  const handleSuspendListing = async (listingId: string) => {
    try {
      await updateDoc(doc(db, 'listings', listingId), {
        status: 'suspended'
      });
      setListings(listings.map(l => l.id === listingId ? { ...l, status: 'suspended' } : l));
      showToast('success', `Listing ${listingId} has been suspended.`);
    } catch (err: any) {
      showToast('error', 'Failed to suspend listing: ' + err.message);
    }
  };

  // Activate individual listing & grant 30-day listing status
  const handleActivateListing = async (listingId: string) => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await updateDoc(doc(db, 'listings', listingId), {
        status: 'active',
        paymentStatus: 'verified',
        updatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      });
      setListings(listings.map(l => l.id === listingId ? { ...l, status: 'active', paymentStatus: 'verified', expiresAt: expiresAt.toISOString() } : l));
      showToast('success', `Listing ${listingId} is now VERIFIED & ACTIVE for 30 days.`);
    } catch (err: any) {
      showToast('error', 'Failed to activate listing: ' + err.message);
    }
  };

  // Approve Manual Payment Verification
  const handleApproveManualPayment = async (payment: any) => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Update payment record in Firestore
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'verified',
        verifiedBy: user?.email || profile?.email || 'admin',
        verifiedAt: new Date().toISOString()
      });

      // Activate corresponding listing
      if (payment.listingId) {
        await updateDoc(doc(db, 'listings', payment.listingId), {
          status: 'active',
          paymentStatus: 'verified',
          paymentRef: payment.reference || 'MANUAL-ADMIN',
          updatedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString()
        });
      }

      setPayments(payments.map(p => p.id === payment.id ? { ...p, status: 'verified', verifiedBy: user?.email } : p));
      setListings(listings.map(l => l.id === payment.listingId ? { ...l, status: 'active', paymentStatus: 'verified', expiresAt: expiresAt.toISOString() } : l));
      
      showToast('success', `Payment ${payment.reference || payment.id} APPROVED! Property listing activated for 30 days.`);
    } catch (err: any) {
      console.error('Error approving payment:', err);
      showToast('error', 'Failed to approve payment: ' + err.message);
    }
  };

  // Reject Manual Payment Verification
  const handleRejectManualPayment = async (payment: any) => {
    const reason = window.prompt('Enter reason for declining payment verification (e.g. Invalid M-Pesa Code):', 'Invalid transaction code provided');
    if (reason === null) return; // User cancelled prompt

    try {
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.email || profile?.email || 'admin'
      });

      if (payment.listingId) {
        await updateDoc(doc(db, 'listings', payment.listingId), {
          paymentStatus: 'rejected',
          updatedAt: new Date().toISOString()
        });
      }

      setPayments(payments.map(p => p.id === payment.id ? { ...p, status: 'rejected', rejectionReason: reason } : p));
      setListings(listings.map(l => l.id === payment.listingId ? { ...l, paymentStatus: 'rejected' } : l));

      showToast('success', `Payment ${payment.reference || payment.id} REJECTED.`);
    } catch (err: any) {
      console.error('Error rejecting payment:', err);
      showToast('error', 'Failed to reject payment: ' + err.message);
    }
  };

  // Update complaint status
  const handleComplaintStatus = async (complaintId: string, status: 'pending' | 'resolved' | 'dismissed') => {
    try {
      await updateDoc(doc(db, 'complaints', complaintId), {
        status
      });
      setComplaints(complaints.map(c => c.id === complaintId ? { ...c, status } : c));
      showToast('success', `Complaint status updated to ${status}.`);
    } catch (err: any) {
      showToast('error', 'Failed to update complaint: ' + err.message);
    }
  };

  // Open confirm modal for user deletion
  const triggerDeleteUser = (userId: string, userEmail?: string, userName?: string) => {
    if (!userId) return;
    setDeleteModal({
      type: 'user',
      id: userId,
      name: userEmail || userName || userId
    });
  };

  // Open confirm modal for listing deletion
  const triggerDeleteListing = (id: string, title?: string) => {
    if (!id) return;
    setDeleteModal({
      type: 'listing',
      id,
      name: title || id
    });
  };

  // Execute deletion confirmed from modal
  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    const { type, id, name } = deleteModal;
    setIsDeleting(true);
    try {
      if (type === 'listing') {
        await deleteDoc(doc(db, 'listings', id));
        setListings(prev => prev.filter(l => l.id !== id));
        showToast('success', `Property listing "${name}" deleted permanently.`);
      } else if (type === 'user') {
        await deleteDoc(doc(db, 'users', id));
        setUsers(prev => prev.filter(u => u.id !== id));
        showToast('success', `User record (${name}) deleted permanently.`);
      }
      setDeleteModal(null);
    } catch (err: any) {
      console.error(`Error deleting ${type}:`, err);
      showToast('error', `Failed to delete ${type}: ` + (err.message || 'Permission denied'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Admin Privilege Guard for admin emails
  const isAdmin = 
    user?.email === 'stephenkariuki955@gmail.com' || 
    user?.email === 'techa5080@gmail.com' || 
    profile?.email === 'stephenkariuki955@gmail.com' || 
    profile?.email === 'techa5080@gmail.com' || 
    profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center pt-28">
        <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 font-medium text-sm mt-2 max-w-md">
          This system console is reserved for administrative privileges. Please log in with admin credentials.
        </p>
        <Link to="/" className="mt-6 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest">
          Return to Hub Home
        </Link>
      </div>
    );
  }

  const pendingComplaints = complaints.filter(c => c.status === 'pending' || !c.status);
  const suspendedLandlords = users.filter(u => u.suspended);
  const pendingManualPayments = payments.filter(p => p.status === 'pending_verification' || p.status === 'pending');
  const verifiedPayments = payments.filter(p => p.status === 'verified' || p.status === 'success');
  const totalRevenue = verifiedPayments.reduce((acc, p) => acc + (p.amount || 1500), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-28 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-[2px] bg-red-600" />
              <span className="text-red-600 text-xs font-black uppercase tracking-widest">Root System Control</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin <span className="italic text-red-600">Dashboard</span></h1>
            <p className="text-slate-400 font-medium mt-1">
              Logged in as <strong className="text-slate-700 font-mono">{user?.email || profile?.email}</strong>
            </p>
          </div>
          
          <button 
            onClick={fetchAdminData}
            className="self-start md:self-auto px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 hover:text-slate-900 text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-2 transition-all hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Database
          </button>
        </div>

        {/* Global Toast Message */}
        {actionMessage && (
          <div className={`mb-8 p-5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-3 ${
            actionMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tenant Complaints</span>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900">{complaints.length}</div>
              <span className="text-xs font-bold text-red-600">{pendingComplaints.length} Action Needed</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <UserX className="w-6 h-6 text-orange-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Suspended Landlords</span>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900">{suspendedLandlords.length}</div>
              <span className="text-xs font-bold text-slate-400">Flagged for Fraud</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <Layout className="w-6 h-6 text-blue-600" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Properties</span>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900">{listings.length}</div>
              <span className="text-xs font-bold text-emerald-600">{listings.filter(l => l.status === 'active').length} Published</span>
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-[2rem] text-white flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <CreditCard className="w-6 h-6 text-emerald-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Listing Payments</span>
            </div>
            <div>
              <div className="text-2xl font-black text-white italic">KES {totalRevenue.toLocaleString()}</div>
              <span className="text-xs font-bold text-emerald-400">{verifiedPayments.length} Verified ({pendingManualPayments.length} Pending Approval)</span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8 border-b border-slate-200 pb-3 sm:pb-4">
          <button
            onClick={() => setActiveTab('complaints')}
            className={`whitespace-nowrap flex-shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'complaints'
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" /> Complaints & Fraud ({pendingComplaints.length})
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`whitespace-nowrap flex-shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" /> Payments ({pendingManualPayments.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap flex-shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" /> Landlords & Users ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className={`whitespace-nowrap flex-shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'listings'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layout className="w-4 h-4 shrink-0" /> Properties ({listings.length})
          </button>

          <button
            onClick={() => setActiveTab('seo')}
            className={`whitespace-nowrap flex-shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'seo'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" /> Google Search & SEO Hub
          </button>
        </div>

        {/* TAB 1: COMPLAINTS & FRAUD ENFORCEMENT */}
        {activeTab === 'complaints' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tenant Complaints & Fraud Reports</h2>
                  <p className="text-xs text-slate-400 font-medium">Review reported concerns and suspend fraudulent landlords.</p>
                </div>
                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {complaints.length} Total Logged
                </span>
              </div>

              {complaints.length === 0 ? (
                <div className="p-16 text-center text-slate-400 font-medium text-sm">
                  No tenant complaints submitted yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {complaints.map(c => {
                    const reportedLandlord = users.find(u => 
                      (c.landlordId && u.id === c.landlordId) || 
                      (c.reportedAccountEmail && u.email?.toLowerCase() === c.reportedAccountEmail.toLowerCase()) ||
                      (c.landlordEmail && u.email?.toLowerCase() === c.landlordEmail.toLowerCase())
                    );
                    const isLandlordSuspended = reportedLandlord?.suspended;
                    const isAccountReport = c.type === 'account_fraud' || c.listingId === 'ACCOUNT_REPORT';

                    return (
                      <div key={c.id} className={`p-4 sm:p-6 lg:p-8 transition-colors ${isAccountReport ? 'bg-red-50/20' : 'hover:bg-slate-50/50'}`}>
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                          
                          <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                isAccountReport ? 'bg-red-600 text-white shadow-sm' : 'bg-red-100 text-red-700'
                              }`}>
                                <AlertTriangle className="w-3 h-3" /> {isAccountReport ? 'Account Fraud & Scam Report' : (c.category || 'Fraud Report')}
                              </span>

                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                c.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                                c.status === 'dismissed' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                              }`}>
                                Status: {c.status || 'pending'}
                              </span>

                              <span className="text-xs text-slate-400 font-mono">
                                Logged: {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : 'Recent'}
                              </span>
                            </div>

                            <h3 className="text-lg font-black text-slate-900">
                              {isAccountReport ? (
                                <span className="text-red-700">
                                  Reported Account: <strong className="text-slate-900">{c.reportedAccountName || c.reportedAccountEmail || c.reportedAccountPhone || 'Unknown Account'}</strong>
                                </span>
                              ) : (
                                <>
                                  Property: <Link to={`/listing/${c.listingId}`} className="text-blue-600 hover:underline">{c.listingTitle || c.listingId}</Link>
                                </>
                              )}
                            </h3>

                            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed shadow-sm">
                              <strong className="text-slate-900 block mb-1">Incident / Scam Description:</strong>
                              <p className="whitespace-pre-wrap text-slate-700">{c.details}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium pt-2">
                              {/* Reported Account Box */}
                              <div className="bg-red-50/70 p-4 rounded-2xl border border-red-100 space-y-1">
                                <span className="font-black text-red-700 uppercase tracking-wider text-[10px] block mb-2">
                                  🚨 Reported Account Info:
                                </span>
                                <div><strong className="text-slate-800">Name:</strong> {c.reportedAccountName || 'N/A'}</div>
                                <div><strong className="text-slate-800">Email:</strong> <span className="font-mono text-slate-900 font-bold">{c.reportedAccountEmail || c.landlordEmail || 'N/A'}</span></div>
                                <div><strong className="text-slate-800">Phone:</strong> <span className="font-bold text-slate-900">{c.reportedAccountPhone || c.landlordPhone || 'N/A'}</span></div>
                                {c.reason && <div><strong className="text-slate-800">Reason:</strong> <span className="text-red-600 font-bold">{c.reason}</span></div>}
                                <div className="pt-1">
                                  <strong className="text-slate-800">Registered User Status:</strong>{' '}
                                  <strong className={isLandlordSuspended ? 'text-red-600 uppercase font-black' : 'text-emerald-600 uppercase font-bold'}>
                                    {isLandlordSuspended ? 'SUSPENDED' : reportedLandlord ? 'ACTIVE USER' : 'UNREGISTERED / EXTERNAL'}
                                  </strong>
                                </div>
                              </div>

                              {/* Complainant Info */}
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px] block mb-2">
                                  🛡️ Reporter Identity:
                                </span>
                                {(!c.reporterName || c.reporterName === 'Anonymous Reporter' || c.reporterEmail === 'Anonymous') ? (
                                  <div className="text-emerald-700 font-bold flex items-center gap-1.5 text-xs">
                                    <span>🔒 100% Anonymous Report (Identity Protected)</span>
                                  </div>
                                ) : (
                                  <>
                                    <div><strong className="text-slate-800">Name:</strong> {c.reporterName}</div>
                                    <div><strong className="text-slate-800">Email:</strong> <span className="font-mono">{c.reporterEmail || c.complainantEmail || 'N/A'}</span></div>
                                    {c.reporterPhone && <div><strong className="text-slate-800">Phone:</strong> {c.reporterPhone}</div>}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                            {reportedLandlord && (
                              !isLandlordSuspended ? (
                                <button
                                  onClick={() => {
                                    handleSuspendLandlord(reportedLandlord.id, reportedLandlord.email || c.reportedAccountEmail || c.landlordEmail);
                                    handleComplaintStatus(c.id, 'resolved');
                                  }}
                                  className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                                >
                                  <UserX className="w-4 h-4" /> Suspend Fraud Account
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnsuspendLandlord(reportedLandlord.id, reportedLandlord.email)}
                                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                                >
                                  <UserCheck className="w-4 h-4" /> Reactivate Account
                                </button>
                              )
                            )}

                            {!isAccountReport && (
                              <button
                                onClick={() => {
                                  handleSuspendListing(c.listingId);
                                  handleComplaintStatus(c.id, 'resolved');
                                }}
                                className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
                              >
                                <Ban className="w-4 h-4" /> Suspend Listing
                              </button>
                            )}

                            {c.status !== 'resolved' && (
                              <button
                                onClick={() => handleComplaintStatus(c.id, 'resolved')}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-1.5"
                              >
                                <Check className="w-4 h-4 text-emerald-600" /> Mark Resolved
                              </button>
                            )}

                            {c.status !== 'dismissed' && (
                              <button
                                onClick={() => handleComplaintStatus(c.id, 'dismissed')}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-1.5"
                              >
                                <X className="w-4 h-4 text-slate-400" /> Dismiss Report
                              </button>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENTS & MANUAL VERIFICATION QUEUE */}
        {activeTab === 'payments' && (
          <div className="space-y-8">
            {/* Pending Manual Verification Queue */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                      Action Required
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Manual Payment Verification Queue</h2>
                  <p className="text-xs text-slate-500 font-medium">Verify submitted M-Pesa transaction codes to instantly publish landlord listings.</p>
                </div>
                <span className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                  {pendingManualPayments.length} Pending Approval
                </span>
              </div>

              {pendingManualPayments.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium text-sm">
                  ✨ All manual payment verifications are caught up! No pending payment approvals.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingManualPayments.map(p => {
                    const targetListing = listings.find(l => l.id === p.listingId);

                    return (
                      <div key={p.id} className="p-8 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                          
                          <div className="space-y-4 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                <CreditCard className="w-3 h-3" /> Method: {p.method?.toUpperCase() || 'M-PESA'}
                              </span>

                              <span className="px-3.5 py-1 bg-slate-900 text-emerald-400 font-mono text-xs font-black rounded-xl">
                                Code: {p.reference || 'N/A'}
                              </span>

                              <span className="text-sm font-black text-slate-900">
                                KES {(p.amount || 1500).toLocaleString()}
                              </span>

                              <span className="text-xs text-slate-400 font-mono">
                                Submitted: {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : 'Recently'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Listing details */}
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1 text-xs">
                                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                                  🏠 Target Property Listing:
                                </span>
                                <div className="font-black text-slate-900 text-sm">
                                  {p.listingTitle || targetListing?.title || 'Property Listing'}
                                </div>
                                <div className="text-slate-500">{targetListing?.location || 'Location N/A'}</div>
                                {p.listingId && (
                                  <Link to={`/listing/${p.listingId}`} target="_blank" className="text-blue-600 font-bold hover:underline block text-[11px] pt-1">
                                    View Property Details ↗
                                  </Link>
                                )}
                              </div>

                              {/* Landlord Info */}
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1 text-xs">
                                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                                  👤 Landlord / Payer Info:
                                </span>
                                <div><strong className="text-slate-800">Name:</strong> {p.landlordName || p.payerName || 'Landlord'}</div>
                                <div><strong className="text-slate-800">Email:</strong> <span className="font-mono">{p.landlordEmail || 'N/A'}</span></div>
                                <div><strong className="text-slate-800">Phone:</strong> {p.landlordPhone || p.payerPhone || 'N/A'}</div>
                                {p.notes && <div className="text-slate-600 italic mt-1 pt-1 border-t border-slate-200">"{p.notes}"</div>}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                            <button
                              onClick={() => handleApproveManualPayment(p)}
                              className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve & Publish Listing
                            </button>

                            <button
                              onClick={() => handleRejectManualPayment(p)}
                              className="px-6 py-3.5 rounded-2xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            >
                              <Ban className="w-4 h-4" /> Decline Payment Code
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historical Payment Audit Log */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Payment Verification Audit Log</h2>
                  <p className="text-xs text-slate-400 font-medium">All historical automatic & approved manual payment records ({payments.length} Total Records).</p>
                </div>
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search transaction code, landlord..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Code</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property / Listing</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Landlord</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {payments
                      .filter(p => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
                        return (
                          (p.reference && p.reference.toLowerCase().includes(term)) ||
                          (p.transactionId && p.transactionId.toLowerCase().includes(term)) ||
                          (p.landlordName && p.landlordName.toLowerCase().includes(term)) ||
                          (p.landlordEmail && p.landlordEmail.toLowerCase().includes(term)) ||
                          (p.listingTitle && p.listingTitle.toLowerCase().includes(term))
                        );
                      })
                      .map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 font-mono font-black text-slate-900">
                            {p.reference || p.transactionId || p.id}
                          </td>
                          <td className="px-8 py-5 font-bold text-slate-800">
                            {p.listingTitle || p.listingId || 'Listing'}
                          </td>
                          <td className="px-8 py-5">
                            <div className="font-bold text-slate-900">{p.landlordName || 'Landlord'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.landlordEmail || p.customerEmail || ''}</div>
                          </td>
                          <td className="px-8 py-5 font-black text-slate-900">
                            KES {(p.amount || 1500).toLocaleString()}
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                              {p.verificationType || p.method || 'automatic'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              p.status === 'verified' || p.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                              p.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USER & LANDLORD ACCOUNTS */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registered Landlords & User Accounts</h2>
                <p className="text-xs text-slate-400 font-medium">View all registered accounts on the site ({users.length} Total Users).</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="Search name, email, role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name & Role</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Properties</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users
                    .filter(u => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      return (
                        (u.name && u.name.toLowerCase().includes(term)) ||
                        (u.email && u.email.toLowerCase().includes(term)) ||
                        (u.role && u.role.toLowerCase().includes(term)) ||
                        (u.phone && u.phone.includes(term))
                      );
                    })
                    .map(u => {
                      const userListingsCount = listings.filter(l => l.ownerId === u.id || l.landlordEmail === u.email).length;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="font-black text-slate-900">{u.name || 'Unnamed User'}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin' ? 'text-red-600 font-black' : 'text-blue-600'
                            }`}>
                              {u.role || 'landlord'}
                            </div>
                          </td>
                          <td className="px-8 py-5 font-mono text-slate-600">{u.email}</td>
                          <td className="px-8 py-5 text-slate-600">{u.phone || 'N/A'}</td>
                          <td className="px-8 py-5 font-bold text-slate-700">
                            {userListingsCount} {userListingsCount === 1 ? 'Listing' : 'Listings'}
                          </td>
                          <td className="px-8 py-5">
                            {u.suspended ? (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                                <UserX className="w-3 h-3" /> Suspended
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> Active
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                            {u.suspended ? (
                              <button
                                onClick={() => handleUnsuspendLandlord(u.id, u.email)}
                                className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-xs"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspendLandlord(u.id, u.email)}
                                className="px-3.5 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all text-xs"
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              onClick={() => triggerDeleteUser(u.id, u.email, u.name)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete User Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PROPERTY INVENTORY */}
        {activeTab === 'listings' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">All Property Listings</h2>
                <p className="text-xs text-slate-400 font-medium">Audit active, pending, or suspended listings across the hub ({listings.length} Listings).</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="Search title, location, landlord..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price / Rent</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Units Available</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Landlord Contact</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {listings
                    .filter(l => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      return (
                        (l.title && l.title.toLowerCase().includes(term)) ||
                        (l.location && l.location.toLowerCase().includes(term)) ||
                        (l.county && l.county.toLowerCase().includes(term)) ||
                        (l.landlordEmail && l.landlordEmail.toLowerCase().includes(term))
                      );
                    })
                    .map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <Link to={`/listing/${l.id}`} className="font-black text-slate-900 hover:text-blue-600 uppercase tracking-tight block">
                            {l.title}
                          </Link>
                          <span className="text-slate-400 text-[10px]">{l.location}</span>
                        </td>
                        <td className="px-8 py-5 font-black text-slate-900">KES {l.price?.toLocaleString()}</td>
                        <td className="px-8 py-5 font-bold text-blue-600">{l.unitsAvailable !== undefined ? l.unitsAvailable : 1} Units</td>
                        <td className="px-8 py-5">
                          <div className="font-medium text-slate-800">{l.landlordPhone || 'No Phone'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{l.landlordEmail || 'No Email'}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="space-y-1">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                              l.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              l.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {l.status}
                            </span>
                            {l.paymentStatus && (
                              <div className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                                Pay: <span className={l.paymentStatus === 'verified' ? 'text-emerald-600' : l.paymentStatus === 'pending_manual_verification' ? 'text-purple-600 font-black' : 'text-amber-600'}>
                                  {l.paymentStatus.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                          {l.status !== 'active' && (
                            <button
                              onClick={() => handleActivateListing(l.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                              title="1-Click Admin Verification & Activation"
                            >
                              Verify & Activate
                            </button>
                          )}
                          {l.status === 'active' && (
                            <button
                              onClick={() => handleSuspendListing(l.id)}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => triggerDeleteListing(l.id, l.title)}
                            className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
                            title="Delete Listing Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: GOOGLE SEARCH & SEO COMMAND CENTER */}
        {activeTab === 'seo' && (
          <div className="space-y-8">
            {/* SEO Health Matrix */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 100% SEO Search Engine Ready
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                    Google Search Visibility & Autocomplete Command Center
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Live telemetry, search crawler protocols, Schema.org entities, and step-by-step ranking strategy for HomeHaven Kenya.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
                  >
                    <span>Google Search Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Protocol Checklist Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">XML Sitemap</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-sm font-black text-slate-900">/sitemap.xml</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Includes all 47 Kenyan county landing pages + Google Image tags for fast rich indexing.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Robots.txt</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-sm font-black text-slate-900">/robots.txt</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Googlebot & Bingbot explicitly allowed; private admin/dashboard paths blocked.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Structured Data</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-sm font-black text-slate-900">Schema.org JSON-LD</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    WebSite, RealEstateAgent, Single Property, and FAQPage with Kenya alternate names.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Local SEO</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-sm font-black text-slate-900">Kenya Geo Tags</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ICBM coordinates (-1.286389, 36.817223) and ISO 3166-2:KE country metadata.
                  </p>
                </div>
              </div>
            </div>

            {/* Google Search Console Verification & Sitemap Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Site Verification Box */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Google Site Verification</h3>
                    <p className="text-xs text-slate-400 font-medium">Verify ownership in Google Search Console</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  When you add your site to <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Google Search Console</a>, choose <strong>HTML tag</strong> verification. Paste the code or tag value below:
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Google Verification Meta Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={googleVerificationInput}
                      onChange={(e) => setGoogleVerificationInput(e.target.value)}
                      placeholder="e.g. google-site-verification=abc123..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.setItem('homehaven_google_verification', googleVerificationInput.trim());
                          // update meta tag directly in head
                          let meta = document.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement;
                          if (!meta) {
                            meta = document.createElement('meta');
                            meta.name = 'google-site-verification';
                            document.head.appendChild(meta);
                          }
                          meta.content = googleVerificationInput.trim();
                          showToast('success', 'Google Search Console verification code saved and active in <head>!');
                        } catch (e: any) {
                          showToast('error', 'Could not save: ' + e.message);
                        }
                      }}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                  <strong>Active in live HTML:</strong> <code>&lt;meta name="google-site-verification" content="{googleVerificationInput}" /&gt;</code>
                </div>
              </div>

              {/* Sitemap Submission Quick Box */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Submit Sitemap to Google</h3>
                      <p className="text-xs text-slate-400 font-medium">Domain: www.myhomehaven.co.ke</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-medium mb-3">
                    <strong>⚠️ Why Search Console says "Invalid sitemap address":</strong><br />
                    In Google Search Console under <em>Add a new sitemap</em>, Google already fills in <code>https://www.myhomehaven.co.ke/</code> in front of the box. You only need to enter <span className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded text-amber-950">sitemap.xml</span> (not the full address)!
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Paste this into Google Search Console box:
                    </label>
                    <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between font-mono text-sm">
                      <span className="text-slate-400 text-xs">https://www.myhomehaven.co.ke/</span>
                      <span className="text-emerald-400 font-black px-1.5 py-0.5 bg-emerald-950/60 rounded border border-emerald-500/40">sitemap.xml</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('sitemap.xml');
                          setCopiedSitemap(true);
                          setTimeout(() => setCopiedSitemap(false), 2000);
                          showToast('success', 'Copied "sitemap.xml" to clipboard! Paste this into Google Search Console.');
                        }}
                        className="ml-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 transition-all"
                      >
                        {copiedSitemap ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSitemap ? 'Copied!' : 'Copy Path'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Full URL: <code>https://www.myhomehaven.co.ke/sitemap.xml</code></span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('https://www.myhomehaven.co.ke/sitemap.xml');
                        showToast('success', 'Copied full sitemap URL!');
                      }}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Copy Full URL
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                  <a
                    href="https://search.google.com/search-console/sitemaps"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                  >
                    <span>Open Google Sitemaps Tool</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://search.google.com/test/rich-results?url=https%3A%2F%2Fwww.myhomehaven.co.ke"
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
                  >
                    <span>Test Rich Snippets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* How to Get Suggested on Google (Autocomplete & Knowledge Graph) */}
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Google Algorithm Blueprint</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-2">
                How to Make HomeHaven Suggested on Google Search (Autocomplete & Top 3)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-3xl leading-relaxed mb-8">
                Google Autocomplete suggests searches (e.g. typing "HomeHaven" or "houses for rent Kenya" and seeing HomeHaven pop up) based on real user search volume, entity establishment, high click-through rates, and fresh indexation. Follow these 4 steps:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm space-y-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center">1</div>
                  <h4 className="text-sm font-black text-white">Google Search Console</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Submit <code>sitemap.xml</code> in Search Console. Googlebot will crawl every county hub (Nairobi, Mombasa, Kiambu, etc.) and begin indexing your verified house listings.
                  </p>
                </div>

                <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm space-y-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center">2</div>
                  <h4 className="text-sm font-black text-white">Google Business Profile</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Register a free <strong>Google Business Profile</strong> for "HomeHaven Kenya" under "Real Estate Agency / Marketplace" in Nairobi. This immediately triggers Google's Knowledge Graph card and maps suggestions.
                  </p>
                </div>

                <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm space-y-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center">3</div>
                  <h4 className="text-sm font-black text-white">Search Volume & CTR</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    When tenants and landlords search "HomeHaven Kenya" on Google and click your link, Google learns that HomeHaven is a trending search term in Kenya and starts auto-completing it in the search bar.
                  </p>
                </div>

                <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm space-y-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center">4</div>
                  <h4 className="text-sm font-black text-white">Social & WhatsApp Traffic</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Share property links into Kenyan rental WhatsApp groups, Facebook Marketplace, and Twitter/X. Social backlinks signal to Google's ranking algorithm that the domain is actively visited.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* CONFIRMATION MODAL FOR DELETION */}
      <AnimatePresence>
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Confirm Deletion</h3>
                  <p className="text-xs font-bold text-red-600">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                Are you sure you want to permanently delete the {deleteModal.type === 'listing' ? 'listing' : 'user account'}:
                <div className="font-black text-slate-900 mt-1 truncate">"{deleteModal.name}"</div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
