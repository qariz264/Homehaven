import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { useSEO } from '../hooks/useSEO';
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

  // Dynamic SEO Configuration for Property
  const propertyTitle = listing 
    ? `${listing.title} for Rent in ${listing.location} | KES ${Number(listing.price || 0).toLocaleString()}/mo - HomeHaven Kenya`
    : 'Property Details | HomeHaven Kenya';

  const propertyDesc = listing
    ? `Rent ${listing.title} in ${listing.location}. ${listing.bedrooms ? listing.bedrooms + ' Bedrooms,' : ''} ${listing.bathrooms ? listing.bathrooms + ' Bathrooms,' : ''} monthly rent KES ${Number(listing.price || 0).toLocaleString()}. Verified Kenyan landlord listing on HomeHaven.`
    : 'View verified property details, rental pricing, and direct landlord contacts on HomeHaven Kenya.';

  const propertyImage = listing?.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&h=630&q=80';

  useSEO({
    title: propertyTitle,
    description: propertyDesc,
    ogImage: propertyImage,
    ogType: 'product',
    canonicalUrl: id ? `https://homehaven.co.ke/listing/${id}` : undefined,
    schema: listing ? {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      'name': listing.title,
      'description': listing.description || propertyDesc,
      'image': listing.images || [propertyImage],
      'url': `https://homehaven.co.ke/listing/${id}`,
      'offers': {
        '@type': 'Offer',
        'price': listing.price,
        'priceCurrency': 'KES',
        'availability': listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'priceSpecification': {
          '@type': 'UnitPriceSpecification',
          'price': listing.price,
          'priceCurrency': 'KES',
          'unitCode': 'MON'
        }
      },
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': listing.preciseLocation || listing.location,
        'addressLocality': listing.location,
        'addressRegion': listing.county || 'Nairobi County',
        'addressCountry': 'KE'
      }
    } : undefined
  });

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
          
          // Fetch owner info if authorized (fails gracefully if restricted by PII security rules)
          if (data.ownerId) {
            try {
              const ownerRef = doc(db, 'users', data.ownerId);
              const ownerSnap = await getDoc(ownerRef);
              if (ownerSnap.exists()) {
                setOwner(ownerSnap.data());
              }
            } catch (authErr) {
              // Gracefully handle PII security restriction for non-admin viewers
            }
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
  const landlordDisplayName = listing.landlordName || owner?.businessName || owner?.name || 'Verified Landlord';
  const unitsAvailable = listing.unitsAvailable !== undefined ? listing.unitsAvailable : 1;
  const whatsappPhone = landlordPhone ? landlordPhone.replace(/^0/, '254') : '254700000000';
  const whatsappLink = `https://wa.me/${whatsappPhone}?text=Hi, I discovered your property "${listing.title}" on HomeHaven Hub (${unitsAvailable} units available). I would like to inquire.`;

  return (
    <div className="bg-white min-h-screen pb-32 sm:pb-24 pt-24 sm:pt-28">
      {/* Immersive Responsive Top Header */}
      <div className="fixed top-16 sm:top-20 left-0 right-0 z-40 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto gap-2">
          <Link 
            to="/" 
            className="flex items-center gap-1.5 sm:gap-2 bg-white/85 backdrop-blur-xl border border-slate-200 px-3.5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl transition-all hover:bg-white hover:scale-105 active:scale-95 text-slate-900 font-black text-[10px] uppercase tracking-widest min-h-[42px]"
          >
            <ArrowLeft className="w-4 h-4" /> 
            <span className="hidden sm:inline">Hub Search</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
             {isAdminOrOwner && (
               <button 
                 onClick={handleDeleteListing} 
                 disabled={deleting}
                 className="px-3 py-2.5 sm:px-4 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50 min-h-[42px]"
                 title="Delete Listing Permanently"
               >
                 <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                 <span className="hidden sm:inline">{deleting ? 'Deleting...' : 'Delete Listing'}</span>
               </button>
             )}
             <button 
               onClick={() => setShowComplaintModal(true)} 
               className="px-3 py-2.5 sm:px-4 sm:py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl sm:rounded-2xl shadow-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 min-h-[42px]"
               title="Raise Complaint"
             >
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                <span className="hidden sm:inline">Raise Complaint</span>
                <span className="sm:hidden">Report</span>
             </button>
             <button 
               onClick={() => {
                 if (navigator.share) {
                   navigator.share({ title: listing.title, url: window.location.href }).catch(() => {});
                 } else {
                   navigator.clipboard.writeText(window.location.href);
                   alert('Listing link copied to clipboard!');
                 }
               }}
               aria-label="Share property link"
               className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/85 backdrop-blur-xl border border-slate-200 rounded-xl sm:rounded-2xl shadow-xl transition-all hover:bg-white text-slate-500 hover:text-blue-500 hover:scale-105 active:scale-95"
             >
               <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          
          {/* Visual Showcase */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-12">
            {listing.expiresAt && new Date(listing.expiresAt).getTime() < Date.now() && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-800 text-xs font-bold flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Notice: This property's 30-day listing period has expired. Landlord renewal is required to reactivate public indexing.</span>
              </div>
            )}

            {listing.status !== 'active' && (!listing.expiresAt || new Date(listing.expiresAt).getTime() >= Date.now()) && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-xs font-bold flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Property is in pending status ({listing.paymentStatus || 'unverified'}). Public inquiries are in review.</span>
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              <div className="relative rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 aspect-[16/10] sm:aspect-[16/9]">
                <img 
                  src={listing.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&h=630&q=80'} 
                  className="w-full h-full object-cover" 
                  alt={`${listing.title} - Main View in ${listing.location}, Kenya`}
                  fetchPriority="high"
                />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                   <div className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Verified Property
                   </div>
                   <div className="px-3 py-1.5 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                      <Home className="w-3.5 h-3.5" /> {unitsAvailable} {unitsAvailable === 1 ? 'Unit' : 'Units'} Vacant
                   </div>
                </div>
              </div>

              {/* Photo Gallery thumbnails */}
              {listing.images && listing.images.length > 1 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4">
                  {listing.images.map((img: string, idx: number) => (
                    <div key={idx} className="aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                      <img 
                        src={img} 
                        alt={`${listing.title} - Photo ${idx + 1} in ${listing.location}`} 
                        loading="lazy"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Property Core Overview */}
            <div className="space-y-6 border-b border-slate-100 pb-8 sm:pb-12">
               <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                 <div>
                   <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">
                     {listing.county ? `${listing.county} County` : 'Featured Property'}
                   </span>
                   <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                     {listing.title}
                   </h1>
                   <div className="flex items-center gap-2 text-slate-500 font-bold text-xs sm:text-sm mt-2">
                     <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                     <span>{listing.preciseLocation || listing.location}</span>
                   </div>
                 </div>

                 <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shrink-0">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Monthly Rent</span>
                   <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                     KES {Number(listing.price || 0).toLocaleString()}
                   </div>
                   <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mt-0.5">
                     Verified Market Rate
                   </span>
                 </div>
               </div>

               {/* Key Specs Pills */}
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                 <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                   <Home className="w-4 h-4 text-blue-600 shrink-0" />
                   <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Vacancy</span>
                     <span className="text-xs font-black text-slate-900">{unitsAvailable} Available</span>
                   </div>
                 </div>

                 <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                   <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                   <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Security</span>
                     <span className="text-xs font-black text-slate-900">Hub Verified</span>
                   </div>
                 </div>

                 <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 col-span-2 sm:col-span-1">
                   <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                   <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Lease Term</span>
                     <span className="text-xs font-black text-slate-900">Monthly</span>
                   </div>
                 </div>
               </div>

               {/* Description */}
               <div className="space-y-3 pt-4">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Property Description</h3>
                 <p className="text-slate-600 font-medium text-sm leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 sm:p-6 rounded-2xl border border-slate-100">
                   {listing.description || 'No detailed description provided by landlord.'}
                 </p>
               </div>

               {/* Discovery Log and Hub Security */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                 <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registry Information</h4>
                   <div className="space-y-3">
                     <div className="flex justify-between items-center text-xs font-bold">
                       <span className="text-slate-500">Available Units</span>
                       <span className="font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">{unitsAvailable} Units</span>
                     </div>
                     <div className="flex justify-between items-center text-xs font-bold">
                       <span className="text-slate-500">Registry Reference</span>
                       <span className="font-mono text-slate-900">{id?.slice(0, 10).toUpperCase()}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs font-bold">
                       <span className="text-slate-500">Listing Date</span>
                       <span className="text-slate-900">{new Date(listing.createdAt?.toDate?.() || listing.createdAt || Date.now()).toLocaleDateString()}</span>
                     </div>
                   </div>
                 </div>

                 <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-2xl flex flex-col justify-between">
                   <div className="flex items-center gap-2 mb-3">
                     <ShieldCheck className="w-5 h-5 text-blue-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Hub Security Guarantee</span>
                   </div>
                   <p className="text-xs text-slate-300 leading-relaxed italic">
                     If you encounter any fraud, incorrect pricing, or suspicious landlord activity, report immediately using the "Raise Complaint" button above.
                   </p>
                 </div>
               </div>
            </div>
          </div>

          {/* Concierge Sidebar */}
          <div className="lg:col-span-4">
             <div className="sticky top-28 sm:top-36 space-y-8">
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
                        {landlordDisplayName[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-lg tracking-tight leading-none mb-2">{landlordDisplayName}</h4>
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
      {/* Sticky Bottom Action Bar for Mobile Devices */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-3 sm:hidden shadow-[0_-10px_25px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Monthly Rent</span>
          <div className="text-base font-black text-slate-900 font-mono truncate">
            KES {Number(listing.price || 0).toLocaleString()}
          </div>
          <span className="text-[9px] font-bold text-emerald-600 truncate">
            {unitsAvailable} {unitsAvailable === 1 ? 'unit' : 'units'} left
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {landlordPhone && (
            <a
              href={`tel:${landlordPhone}`}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-black text-xs flex items-center gap-1.5 transition-colors active:scale-95"
              title="Call landlord"
            >
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Call</span>
            </a>
          )}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 uppercase tracking-wider"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};

const CheckCircle2 = ({ className, fill }: { className?: string, fill?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill={fill} stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export default ListingDetailsPage;
