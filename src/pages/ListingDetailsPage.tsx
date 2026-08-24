import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  ArrowLeft, 
  Calendar, 
  ShieldCheck,
  Share2,
  Heart,
  Globe2,
  Maximize2,
  Bed,
  Bath,
  ArrowUpRight,
  Home,
  Navigation,
  Mail,
  AlertTriangle,
  X,
  CheckCircle,
  Building,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ListingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const isAdminOrOwner = 
    user?.email === 'stephenkariuki955@gmail.com' || 
    profile?.email === 'stephenkariuki955@gmail.com' || 
    profile?.role === 'admin' ||
    (listing && user?.uid === listing.ownerId);

  const handleDeleteListing = async () => {
    if (!id || !listing) return;
    if (window.confirm(`Are you sure you want to PERMANENTLY delete "${listing.title}"?`)) {
      setDeleting(true);
      try {
        await deleteDoc(doc(db, 'listings', id));
        alert('Listing deleted successfully.');
        navigate(profile?.role === 'admin' ? '/admin' : '/dashboard');
      } catch (err: any) {
        console.error('Error deleting listing:', err);
        alert('Failed to delete listing: ' + (err.message || 'Permission denied'));
      } finally {
        setDeleting(false);
      }
    }
  };

  // Complaint Modal States
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('Fake / Fraudulent Listing');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState('');
  const [complaintError, setComplaintError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setListing(data);
          
          // Fetch owner info
          const ownerRef = doc(db, 'users', data.ownerId);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            setOwner(ownerSnap.data());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing || !id) return;

    setSubmittingComplaint(true);
    setComplaintError('');
    setComplaintSuccess('');

    try {
      await addDoc(collection(db, 'complaints'), {
        listingId: id,
        listingTitle: listing.title || 'Untitled Property',
        landlordId: listing.ownerId || '',
        landlordEmail: listing.landlordEmail || owner?.email || '',
        landlordPhone: listing.landlordPhone || owner?.phone || '',
        reporterName: reporterName.trim(),
        reporterEmail: reporterEmail.trim(),
        reporterPhone: reporterPhone.trim(),
        category: complaintCategory,
        details: complaintDetails.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setComplaintSuccess('Your complaint has been logged securely. Our system admins will investigate and take immediate action if fraud is detected.');
      setReporterName('');
      setReporterEmail('');
      setReporterPhone('');
      setComplaintDetails('');
      setTimeout(() => {
        setShowComplaintModal(false);
        setComplaintSuccess('');
      }, 3500);
    } catch (err: any) {
      console.error('Error submitting complaint:', err);
      setComplaintError('Failed to log complaint. Please try again.');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin mb-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hub Retrieval in progress</span>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
        <h2 className="text-3xl font-black text-slate-900 mb-6 uppercase tracking-tight">Listing not discovered</h2>
        <Link to="/" className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to Hub
        </Link>
      </div>
    );
  }

  const landlordPhone = listing.landlordPhone || owner?.phone || '';
  const landlordEmail = listing.landlordEmail || owner?.email || '';
  const unitsAvailable = listing.unitsAvailable !== undefined ? listing.unitsAvailable : 1;
  const whatsappPhone = landlordPhone ? landlordPhone.replace(/^0/, '254') : '254700000000';
  const whatsappLink = `https://wa.me/${whatsappPhone}?text=Hi, I discovered your property "${listing.title}" on HomeHaven Hub (${unitsAvailable} units available). I would like to inquire.`;

  return (
    <div className="bg-white min-h-screen pb-20 pt-28">
      {/* Immersive Header */}
      <div className="fixed top-20 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8 py-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <Link 
            to="/" 
            className="flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-slate-200 px-6 py-3 rounded-2xl shadow-xl transition-all hover:bg-white hover:scale-105 active:scale-95 text-slate-900 font-black text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Hub Search
          </Link>
          <div className="flex gap-3">
             {isAdminOrOwner && (
               <button 
                 onClick={handleDeleteListing} 
                 disabled={deleting}
                 className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg shadow-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                 title="Delete Listing Permanently"
               >
                 <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete Listing'}
               </button>
             )}
             <button onClick={() => setShowComplaintModal(true)} className="px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-2xl shadow-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Raise Complaint
             </button>
             <button className="w-12 h-12 flex items-center justify-center bg-white/70 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl transition-all hover:bg-white text-slate-400 hover:text-red-500 hover:scale-110"><Heart className="w-5 h-5" /></button>
             <button className="w-12 h-12 flex items-center justify-center bg-white/70 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl transition-all hover:bg-white text-slate-400 hover:text-blue-500 hover:scale-110"><Share2 className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Visual Showcase */}
          <div className="lg:col-span-8 space-y-12">
            {listing.expiresAt && new Date(listing.expiresAt).getTime() < Date.now() && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-800 text-xs font-bold flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Notice: This property's 30-day listing period has expired. Landlord renewal is required to reactivate public indexing.</span>
              </div>
            )}

            {listing.status !== 'active' && (!listing.expiresAt || new Date(listing.expiresAt).getTime() >= Date.now()) && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-xs font-bold flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Notice: This property is currently pending landlord Paystack payment verification before public indexing.</span>
              </div>
            )}

            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl group"
            >
              <img 
                src={listing.images[0]} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={listing.title} 
              />
              <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between">
                 <div className="flex flex-col text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Verified Hub Asset</span>
                      <span className="px-3 py-1 bg-emerald-500/90 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Home className="w-3 h-3" /> {unitsAvailable} {unitsAvailable === 1 ? 'Unit Available' : 'Units Available'}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">{listing.title}</h2>
                 </div>
                 <button className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all">
                    <Maximize2 className="w-6 h-6" />
                 </button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-slate-100">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-500" /> Geography</span>
                  <p className="text-xl font-black text-slate-900 tracking-tight leading-tight">{listing.location}</p>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Globe2 className="w-4 h-4 text-blue-500" /> Ownership</span>
                  <p className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase font-display italic underline decoration-blue-500/20">{owner?.name || 'Verified Landlord'}</p>
               </div>
               <div className="flex flex-col text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Listing Yield</span>
                  <p className="text-3xl font-black text-blue-600 tracking-tighter italic">KES {listing.price.toLocaleString()}</p>
               </div>
            </div>

            <div className="space-y-8">
               <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 p-8 bg-slate-50 rounded-[2.5rem]">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Discovery Log</h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold">
                           <span className="text-slate-500">Available Units</span>
                           <span className="font-black text-blue-600 bg-blue-100/50 px-3 py-1 rounded-full">{unitsAvailable} Units</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold">
                           <span className="text-slate-500">Registry ID</span>
                           <span className="font-black text-slate-900">{id?.slice(0, 10).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold">
                           <span className="text-slate-500">Activation</span>
                           <span className="font-black text-slate-900">{new Date(listing.createdAt?.toDate?.() || listing.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 p-8 bg-slate-900 text-white rounded-[2.5rem] flex flex-col justify-between italic">
                      <div className="flex items-center gap-3 mb-6">
                         <ShieldCheck className="w-6 h-6 text-blue-400" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Hub Security Guarantee</span>
                      </div>
                      <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                        "If you notice any fraud, false information, or unverified claims, click 'Raise Complaint' above to trigger an immediate admin audit."
                      </p>
                  </div>
               </div>

               <div className="prose prose-slate max-w-none">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6">Property Details</h3>
                  <p className="text-slate-600 font-medium leading-loose text-lg whitespace-pre-wrap">{listing.description}</p>
               </div>

               <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Units Available', val: `${unitsAvailable} Vacant`, icon: <Home /> },
                    { label: 'Bedrooms', val: '3 Bed', icon: <Bed /> },
                    { label: 'Bathrooms', val: '2 Bath', icon: <Bath /> },
                    { label: 'Security', val: 'Vanguard', icon: <ShieldCheck /> },
                  ].map(spec => (
                    <div key={spec.label} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                       <div className="text-blue-500 mb-4">{spec.icon}</div>
                       <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{spec.label}</div>
                       <div className="text-sm font-black text-slate-900">{spec.val}</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Concierge Sidebar */}
          <div className="lg:col-span-4">
             <div className="sticky top-40 space-y-8">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-slate-950 rounded-[3rem] p-8 sm:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.1)] border border-white/5 relative overflow-hidden"
                >
                  {/* Decorative background logo */}
                  <Home className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-8 pb-8 border-b border-white/10">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-blue-600/30">
                        {owner?.name?.[0].toUpperCase() || 'H'}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-lg tracking-tight leading-none mb-2">{owner?.name || 'Verified Landlord'}</h4>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-600/20">
                          <CheckCircle2 className="w-2.5 h-2.5 fill-blue-400" /> Active Landlord
                        </div>
                      </div>
                    </div>

                    {/* Direct Contact Info Box */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 space-y-3">
                      <div className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Direct Contact Details</div>
                      
                      {landlordPhone && (
                        <div className="flex items-center gap-3 text-white text-xs font-bold">
                          <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                          <span>{landlordPhone}</span>
                        </div>
                      )}

                      {landlordEmail && (
                        <div className="flex items-center gap-3 text-white text-xs font-bold truncate">
                          <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="truncate">{landlordEmail}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-white text-xs font-bold">
                        <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{unitsAvailable} {unitsAvailable === 1 ? 'Unit Available' : 'Units Available'}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {landlordPhone && (
                        <a 
                          href={`tel:${landlordPhone}`}
                          className="w-full bg-white text-slate-950 p-4 sm:p-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-[0.98] shadow-2xl"
                        >
                          <Phone className="w-4 h-4" /> Call Landlord ({landlordPhone})
                        </a>
                      )}

                      {landlordEmail && (
                        <a 
                          href={`mailto:${landlordEmail}?subject=Inquiry regarding ${encodeURIComponent(listing.title)}`}
                          className="w-full bg-slate-800 text-white p-4 sm:p-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-700 transition-all active:scale-[0.98] shadow-xl border border-white/10"
                        >
                          <Mail className="w-4 h-4 text-blue-400" /> Email Landlord
                        </a>
                      )}

                      <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-emerald-600 text-white p-4 sm:p-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all active:scale-[0.98] shadow-2xl shadow-emerald-900/40"
                      >
                        <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
                      </a>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                       <button 
                         onClick={() => setShowComplaintModal(true)} 
                         className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest inline-flex items-center gap-1.5 hover:underline"
                       >
                         <AlertTriangle className="w-3.5 h-3.5" /> Report Fraud / Raise Concern
                       </button>
                    </div>
                  </div>
                </motion.div>
             </div>
          </div>
        </div>
      </div>

      {/* Complaint Modal */}
      <AnimatePresence>
        {showComplaintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowComplaintModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Raise Listing Complaint</h3>
                  <p className="text-xs text-slate-400 font-medium">Report fraud, fake pricing, or suspicious landlord behavior.</p>
                </div>
              </div>

              {complaintSuccess ? (
                <div className="my-6 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex flex-col items-center text-center gap-3">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                  <p>{complaintSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleRaiseComplaint} className="space-y-4 mt-6">
                  {complaintError && (
                    <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold">
                      {complaintError}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Your Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Your Email</label>
                    <input 
                      type="email"
                      required
                      placeholder="e.g. tenant@example.com"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Your Phone Number (Optional)</label>
                    <input 
                      type="tel"
                      placeholder="e.g. 0712345678"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Complaint Category</label>
                    <select
                      value={complaintCategory}
                      onChange={(e) => setComplaintCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Fake / Fraudulent Listing">Fake / Fraudulent Listing</option>
                      <option value="Price Inflation / Scam">Price Inflation / Scam</option>
                      <option value="Landlord Unresponsive / Fraud">Landlord Unresponsive / Fraud</option>
                      <option value="Unsafe Property / Health Hazard">Unsafe Property / Health Hazard</option>
                      <option value="Other Misleading Information">Other Misleading Information</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Detailed Concern / Evidence</label>
                    <textarea 
                      rows={4}
                      required
                      placeholder="Describe what went wrong or why you suspect fraud..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={complaintDetails}
                      onChange={(e) => setComplaintDetails(e.target.value)}
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowComplaintModal(false)}
                      className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingComplaint}
                      className="px-6 py-3 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {submittingComplaint ? 'Logging Complaint...' : 'Submit Complaint'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CheckCircle2 = ({ className, fill }: { className?: string, fill?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill={fill} stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export default ListingDetailsPage;
