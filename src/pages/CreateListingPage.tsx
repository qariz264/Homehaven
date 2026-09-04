import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../App';
import { KENYA_COUNTIES } from '../lib/counties';
import { 
  MapPin, 
  DollarSign, 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Sparkles, 
  Building, 
  Info, 
  ShieldCheck, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Plus,
  CreditCard,
  ExternalLink,
  FileText,
  Check,
  RotateCcw,
  Smartphone,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSEO } from '../hooks/useSEO';
import axios from 'axios';
import { 
  launchPaystackCheckout, 
  getPaystackConfig, 
  ensurePaystackScriptLoaded, 
  PaystackConfig 
} from '../services/paystackClient';

const PROPERTY_TYPES = [
  '1 Bedroom Apartment',
  '2 Bedroom Apartment',
  '3 Bedroom Apartment',
  'Bedsitter / Studio',
  'Maisonette / Villa',
  'Townhouse',
  'Single Room',
  'Commercial / Office Space'
];

const compressAndConvertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image file"));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const CreateListingPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useSEO({
    title: 'Publish New Property Listing | HomeHaven Landlord Hub',
    description: 'List your rental apartment, maisonette, or house on Kenya\'s verified real estate portal.',
    robots: 'noindex, follow'
  });

  // Step state: 1 = Basic Info, 2 = Location & Contact, 3 = Description & Photos, 4 = Paystack Activation & Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState('1 Bedroom Apartment');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [county, setCounty] = useState('Nairobi');
  const [preciseLocation, setPreciseLocation] = useState('');
  const [unitsAvailable, setUnitsAvailable] = useState('1');
  const [landlordPhone, setLandlordPhone] = useState(profile?.phone || '');
  const [landlordEmail, setLandlordEmail] = useState(profile?.email || '');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // Step 4 Paystack & Payment state
  const [paymentMode, setPaymentMode] = useState<'paystack' | 'manual'>('paystack');
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [paystackAuthUrl, setPaystackAuthUrl] = useState<string | null>(null);
  const [paystackReference, setPaystackReference] = useState<string | null>(null);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paystackConfig, setPaystackConfig] = useState<PaystackConfig | null>(null);
  const [scriptBlocked, setScriptBlocked] = useState(false);

  // Probe Paystack environment and script availability on mount
  React.useEffect(() => {
    getPaystackConfig().then(cfg => setPaystackConfig(cfg)).catch(() => {});
    ensurePaystackScriptLoaded().then(res => {
      if (res.blocked) setScriptBlocked(true);
    }).catch(() => {});
  }, []);

  // Manual payment state
  const [manualCode, setManualCode] = useState('');
  const [manualPhone, setManualPhone] = useState(profile?.phone || '');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError('');

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const base64 = await compressAndConvertToBase64(file);
        uploadedUrls.push(base64);
      }
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      console.error("Image upload error:", err);
      setError("Failed to process one or more images. Please try again.");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImages(prev => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Step validation helpers
  const validateStep1 = (): boolean => {
    setError('');
    if (!title.trim()) {
      setError('Please enter a descriptive Property Title (e.g. Skyline Luxury Apartments).');
      return false;
    }
    const numPrice = parseFloat(price);
    if (!numPrice || numPrice <= 0) {
      setError('Please enter a valid monthly rental price (in KES).');
      return false;
    }
    const numUnits = parseInt(unitsAvailable);
    if (!numUnits || numUnits < 1) {
      setError('Please enter at least 1 vacant unit available.');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setError('');
    if (!county) {
      setError('Please select a county.');
      return false;
    }
    if (!preciseLocation.trim()) {
      setError('Please enter a specific estate or neighborhood (e.g. Kilimani, Argwings Kodhek Rd).');
      return false;
    }
    if (!landlordPhone.trim() || landlordPhone.trim().length < 9) {
      setError('Please provide a valid contact phone number for tenant inquiries.');
      return false;
    }
    if (!landlordEmail.trim() || !landlordEmail.includes('@')) {
      setError('Please provide a valid contact email address.');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    setError('');
    if (!description.trim() || description.trim().length < 15) {
      setError('Please provide a descriptive overview of the property (at least 15 characters).');
      return false;
    }
    return true;
  };

  const goToNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Helper to save listing to Firestore
  const saveListingRecord = async (status: 'pending' | 'active' = 'pending'): Promise<string> => {
    const currentUserId = auth.currentUser?.uid || profile?.id;
    if (!currentUserId) {
      throw new Error('Your session has expired. Please log in again.');
    }

    const finalImages = images.length > 0 
      ? images 
      : ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80'];

    const fullLocationString = `${county} County${preciseLocation.trim() ? ` - ${preciseLocation.trim()}` : ''}`;

    const listingData = {
      title: title.trim(),
      propertyType,
      description: description.trim(),
      price: parseFloat(price) || 0,
      county,
      preciseLocation: preciseLocation.trim(),
      location: fullLocationString,
      unitsAvailable: parseInt(unitsAvailable) || 1,
      landlordName: profile?.businessName || profile?.name || 'Verified Landlord',
      landlordPhone: landlordPhone.trim() || profile?.phone || '',
      landlordEmail: landlordEmail.trim() || profile?.email || '',
      lat: lat.trim() ? parseFloat(lat) : -1.2921,
      lng: lng.trim() ? parseFloat(lng) : 36.8219,
      images: finalImages,
      ownerId: currentUserId,
      status,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (createdListingId) {
      await updateDoc(doc(db, 'listings', createdListingId), listingData);
      return createdListingId;
    } else {
      const docRef = await addDoc(collection(db, 'listings'), listingData);
      setCreatedListingId(docRef.id);
      return docRef.id;
    }
  };

  // Verify payment manually or after returning from Paystack
  const handleVerifyPayment = async (overrideRef?: string, overrideListingId?: string) => {
    const refToVerify = overrideRef || paystackReference;
    if (!refToVerify) return;
    setVerifyingPayment(true);
    setError('');

    try {
      const res = await axios.get(`/api/payment/verify/${refToVerify}`);
      if (res.data?.status && res.data?.data?.status === 'success') {
        setPaymentSuccess(true);
        const lId = overrideListingId || createdListingId;
        if (lId) {
          try {
            await updateDoc(doc(db, 'listings', lId), {
              status: 'active',
              updatedAt: serverTimestamp()
            });
          } catch (updateErr) {
            console.warn('Client doc update notice:', updateErr);
          }
        }
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError('Payment verification returned pending or incomplete. If you completed payment, please wait a moment and click verify again.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.response?.data?.error || err.message || 'Verification failed. Please check your reference.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Paystack checkout initiator supporting inline popup and fallback window
  const handleInitiatePaystack = async () => {
    setError('');
    setPaystackLoading(true);

    try {
      const listingId = await saveListingRecord('pending');

      // Pass public key directly from component state instead of relying on window variables
      const componentPublicKey = paystackConfig?.publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.PAYSTACK_PUBLIC_KEY || '';

      const checkoutResult = await launchPaystackCheckout({
        publicKey: componentPublicKey,
        email: landlordEmail.trim() || profile?.email || 'landlord@example.com',
        amount: 1500, // Fixed KES 1,500 activation fee
        listingId,
        listingTitle: title.trim() || 'HomeHaven Listing',
        onSuccess: async (verifiedReference) => {
          setPaystackReference(verifiedReference);
          await handleVerifyPayment(verifiedReference, listingId);
        },
        onPopupError: (failure) => {
          console.warn('[CreateListingPage] Paystack popup failed to open:', failure.reason, failure.context);
        },
        onFallbackRedirect: (authUrl, ref) => {
          setPaystackAuthUrl(authUrl);
          setPaystackReference(ref);
          const win = window.open(authUrl, '_blank');
          if (!win) {
            setError('Popup was blocked by your browser. Please click the "Open Checkout Window" button below.');
          }
        }
      });

      if (checkoutResult.authUrl) {
        setPaystackAuthUrl(checkoutResult.authUrl);
      }
      if (checkoutResult.reference) {
        setPaystackReference(checkoutResult.reference);
      }

      if (checkoutResult.scriptBlocked) {
        setScriptBlocked(true);
        setError('Notice: External script (https://js.paystack.co/v1/inline.js) was blocked by browser privacy/adblocker settings. Direct checkout tab opened.');
      }
    } catch (err: any) {
      console.error('Paystack initiation error:', err);
      setError(err.response?.data?.error || err.message || 'Could not load Paystack checkout. Please try again or use manual M-Pesa submission.');
    } finally {
      setPaystackLoading(false);
    }
  };

  // Submit manual M-Pesa transaction code
  const handleManualMpesaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError('Please enter your 10-character M-Pesa transaction confirmation code.');
      return;
    }

    setManualSubmitting(true);
    setError('');

    try {
      const listingId = await saveListingRecord('pending');
      const cleanRef = manualCode.trim().toUpperCase();

      // Record in payments collection
      await addDoc(collection(db, 'payments'), {
        listingId,
        listingTitle: title.trim(),
        ownerId: profile?.id || auth.currentUser?.uid || '',
        landlordName: profile?.businessName || profile?.name || 'Landlord',
        landlordEmail: landlordEmail.trim() || profile?.email || '',
        landlordPhone: manualPhone.trim() || landlordPhone.trim() || '',
        amount: 1500,
        method: 'mpesa_manual',
        reference: cleanRef,
        payerPhone: manualPhone.trim() || landlordPhone.trim() || '',
        status: 'pending_admin_approval',
        createdAt: serverTimestamp(),
      });

      // Update listing payment status
      await updateDoc(doc(db, 'listings', listingId), {
        paymentStatus: 'pending_manual_verification',
        paymentRef: cleanRef,
        updatedAt: serverTimestamp()
      });

      setPaymentSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Manual payment error:', err);
      setError(err.message || 'Failed to submit manual payment. Please try again.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // Save as Draft & Pay Later
  const handleSaveDraft = async () => {
    setLoading(true);
    setError('');
    try {
      await saveListingRecord('pending');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Save draft error:', err);
      setError(err.message || 'Failed to save listing draft.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Indicator Header */}
        <div className="mb-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {[
              { num: 1, label: 'Property Details' },
              { num: 2, label: 'Location & Contact' },
              { num: 3, label: 'Photos & Intel' },
              { num: 4, label: 'Paystack & Activate' },
            ].map((s) => {
              const isCurrent = currentStep === s.num;
              const isCompleted = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep) {
                      setCurrentStep(s.num as 1 | 2 | 3 | 4);
                    }
                  }}
                  className={`flex-1 text-left py-3 px-2 sm:px-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                      : isCompleted
                      ? 'bg-white text-slate-800 border-emerald-300 hover:border-blue-400 cursor-pointer'
                      : 'bg-slate-100/80 text-slate-400 border-transparent cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isCurrent 
                        ? 'bg-white text-blue-600' 
                        : isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
                      Step {s.num}
                    </span>
                  </div>
                  <div className="text-xs font-black truncate">{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Info & Value Pillar Side */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-[2px] bg-blue-600" />
                <span className="text-blue-600 text-xs font-black uppercase tracking-widest">
                  Step {currentStep} of 4
                </span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                {currentStep === 1 && <>Describe Your <br /><span className="text-blue-600">Rental Asset.</span></>}
                {currentStep === 2 && <>Pinpoint Asset <br /><span className="text-blue-600">Location.</span></>}
                {currentStep === 3 && <>Showcase Visual <br /><span className="text-blue-600">Gallery.</span></>}
                {currentStep === 4 && <>Paystack <br /><span className="text-emerald-600">Activation.</span></>}
              </h1>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                {currentStep === 1 && "Start with the asset name, property classification, and target monthly rent."}
                {currentStep === 2 && "Specify the exact Kenyan county, neighborhood, and your contact phone for tenant inquiries."}
                {currentStep === 3 && "Upload high-resolution property photos to boost tenant booking inquiries by up to 340%."}
                {currentStep === 4 && "Activate your listing with Paystack via M-Pesa or Card for instant 30-day tenant visibility."}
              </p>
            </motion.div>

            {/* Value Props */}
            <div className="space-y-3 pt-2">
              {[
                { icon: <Sparkles className="w-4 h-4" />, title: 'Paystack Secured', desc: 'Instant M-Pesa & Card processing' },
                { icon: <ShieldCheck className="w-4 h-4" />, title: 'Verified Badge', desc: 'High tenant trust score' },
                { icon: <Building className="w-4 h-4" />, title: 'Direct Leads', desc: 'Direct WhatsApp and calls from tenants' },
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-900">{item.title}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Pricing Box */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-xl">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300 font-bold uppercase tracking-wider">Fixed Activation</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">Official Fee</span>
              </div>
              <div className="text-3xl font-black tracking-tight text-white mb-1">KES 1,500</div>
              <p className="text-xs text-slate-400">Includes 30 days full marketing, verified landlord badge, and tenant inquiry management.</p>
            </div>
          </div>

          {/* Form Content Side */}
          <div className="lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden"
            >
              <div className="p-6 sm:p-10 md:p-12">
                
                {error && (
                  <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-200 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* STEP 1: PROPERTY IDENTITY & FINANCIALS */}
                {currentStep === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Step 1 of 4</span>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Asset Identity & Financials</h2>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Asset Name / Property Title *
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. SKYLINE APARTMENTS, KILIMANI" 
                        required
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all placeholder:text-slate-300 uppercase tracking-tight"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                      <p className="text-[11px] text-slate-400">Give your property a distinctive, clear title recognized by tenants.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Property Category *
                        </label>
                        <select
                          value={propertyType}
                          onChange={(e) => setPropertyType(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all cursor-pointer"
                        >
                          {PROPERTY_TYPES.map((pt) => (
                            <option key={pt} value={pt}>{pt}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Units Vacant / Available *
                        </label>
                        <input 
                          type="number" 
                          min="1"
                          placeholder="e.g. 2" 
                          required
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                          value={unitsAvailable}
                          onChange={(e) => setUnitsAvailable(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Monthly Rent (KES) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="number" 
                          placeholder="e.g. 45000" 
                          required
                          className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all tracking-tight"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">Total monthly rental amount tenants will pay.</p>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: LOCATION & CONTACT */}
                {currentStep === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Step 2 of 4</span>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Location & Landlord Contact</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Select County *</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 pointer-events-none" />
                          <select
                            required
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all uppercase tracking-tight cursor-pointer"
                            value={county}
                            onChange={(e) => setCounty(e.target.value)}
                          >
                            {KENYA_COUNTIES.map(c => (
                              <option key={c} value={c}>{c} County</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Precise Location / Estate / Street *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Kilimani, Wood Avenue near Yaya" 
                          required
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                          value={preciseLocation}
                          onChange={(e) => setPreciseLocation(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Landlord Phone Number (for Tenant Inquiries) *</label>
                        <input 
                          type="tel" 
                          placeholder="e.g. 0712345678" 
                          required
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                          value={landlordPhone}
                          onChange={(e) => setLandlordPhone(e.target.value)}
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Landlord Contact Email *</label>
                        <input 
                          type="email" 
                          placeholder="e.g. landlord@example.com" 
                          required
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                          value={landlordEmail}
                          onChange={(e) => setLandlordEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Latitude (Optional for Map)</label>
                        <input 
                          type="number" 
                          step="any"
                          placeholder="e.g. -1.2921" 
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                          value={lat}
                          onChange={(e) => setLat(e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Longitude (Optional for Map)</label>
                        <input 
                          type="number" 
                          step="any"
                          placeholder="e.g. 36.8219" 
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                          value={lng}
                          onChange={(e) => setLng(e.target.value)}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: MEDIA & INTEL */}
                {currentStep === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Step 3 of 4</span>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Property Photos & Intel</h2>
                    </div>

                    {/* Image Upload & Management Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Photos & Media ({images.length} added)
                        </label>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                          Upload Files or Add Link
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Device File Upload Box */}
                        <label className="relative border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 transition-all rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer text-center group">
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={handleFileUpload} 
                            className="hidden" 
                            disabled={uploadingImage}
                          />
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            {uploadingImage ? (
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Upload className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                            {uploadingImage ? 'Processing Photos...' : 'Upload Photos from Device'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Select one or multiple photos (JPG, PNG, WebP)
                          </span>
                        </label>

                        {/* URL Import Box */}
                        <div className="border border-slate-200 bg-slate-50 rounded-2xl p-6 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                              Add Photo via URL Link
                            </span>
                            <div className="relative">
                              <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                type="url" 
                                placeholder="https://example.com/apartment.jpg" 
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                                value={imageUrlInput}
                                onChange={(e) => setImageUrlInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddImageUrl();
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddImageUrl}
                            disabled={!imageUrlInput.trim()}
                            className="mt-3 w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Image URL
                          </button>
                        </div>
                      </div>

                      {/* Image Preview Grid */}
                      {images.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Property Photos ({images.length})
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {images.map((img, idx) => (
                              <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video shadow-sm">
                                <img 
                                  src={img} 
                                  alt={`Property upload ${idx + 1}`} 
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center opacity-90 hover:opacity-100 shadow-md hover:scale-110 transition-all"
                                  title="Remove photo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                {idx === 0 && (
                                  <span className="absolute bottom-2 left-2 bg-slate-900/85 backdrop-blur-md text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                                    Cover
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Asset Intel & Features (Description) *
                      </label>
                      <textarea 
                        placeholder="Detail all features: e.g. 24/7 security, high-speed elevators, backup generator, borehole water, balcony with scenic view, near shopping centers and transit..." 
                        required
                        rows={5}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all resize-none leading-relaxed"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: PAYSTACK ACTIVATION & REVIEW */}
                {currentStep === 4 && (
                  <motion.div 
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Step 4 of 4</span>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Review & Paystack Activation</h2>
                    </div>

                    {/* Listing Summary Preview Card */}
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                        <img 
                          src={images[0] || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80'} 
                          alt="Listing Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] font-black uppercase">
                            {propertyType}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {unitsAvailable} {parseInt(unitsAvailable) === 1 ? 'Unit' : 'Units'} Available
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 uppercase truncate mb-1">
                          {title || 'Untitled Property'}
                        </h3>
                        <p className="text-xs text-slate-600 flex items-center gap-1 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          {preciseLocation}, {county} County
                        </p>
                        <div className="text-sm font-black text-emerald-700">
                          KES {Number(price || 0).toLocaleString()} / month
                        </div>
                      </div>
                    </div>

                    {/* Payment Success Celebration */}
                    {paymentSuccess && (
                      <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-3xl text-emerald-950 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg">
                          <CheckCircle className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-black">Payment Verified Successfully!</h3>
                        <p className="text-xs font-medium text-emerald-800">
                          Your property listing is now activated and live on the HomeHaven platform. Redirecting to your dashboard...
                        </p>
                      </div>
                    )}

                    {/* Paystack Activation Section */}
                    {!paymentSuccess && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 p-1.5 bg-slate-100 rounded-2xl">
                          <button
                            type="button"
                            onClick={() => setPaymentMode('paystack')}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                              paymentMode === 'paystack'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                            Pay Online (Paystack M-Pesa / Card)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMode('manual')}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                              paymentMode === 'manual'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <Smartphone className="w-4 h-4 text-blue-600" />
                            Submit M-Pesa Code Manually
                          </button>
                        </div>

                        {paymentMode === 'paystack' ? (
                          <div className="p-6 bg-emerald-50/80 border border-emerald-200 rounded-3xl space-y-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                                    Secure Checkout
                                  </span>
                                  {paystackConfig?.isConfigured ? (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-mono font-bold">
                                      Key: {paystackConfig.mode.toUpperCase()} ({paystackConfig.publicKey.slice(0, 10)}...)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-medium">
                                      Demo Sandbox Ready
                                    </span>
                                  )}
                                  {scriptBlocked && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-bold">
                                      Inline Script Blocked (Direct Fallback Active)
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-lg font-black text-slate-900 mt-2">
                                  Paystack Listing Activation (KES 1,500)
                                </h4>
                                <p className="text-xs text-slate-600 mt-1">
                                  Pay securely via Safaricom M-Pesa, Airtel Money, Visa, or Mastercard. Activation is instant and publishes your listing for 30 full days.
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-2xl font-black text-emerald-700">KES 1,500</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase">30-Day Pass</div>
                              </div>
                            </div>

                            {/* Active Paystack Flow Indicator */}
                            {paystackAuthUrl && (
                              <div className="p-5 bg-white rounded-2xl border border-emerald-300 shadow-sm space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                                  <span className="text-xs font-black text-slate-900">
                                    Paystack Checkout Window Launched
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  A checkout tab has been opened. If blocked by your browser, click below:
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <a
                                    href={paystackAuthUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Open Checkout Window
                                  </a>
                                  <button
                                    type="button"
                                    onClick={handleVerifyPayment}
                                    disabled={verifyingPayment}
                                    className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    {verifyingPayment ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                    I Completed Payment (Verify Now)
                                  </button>
                                </div>
                              </div>
                            )}

                            {!paystackAuthUrl && (
                              <button
                                type="button"
                                onClick={handleInitiatePaystack}
                                disabled={paystackLoading}
                                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                {paystackLoading ? (
                                  <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Connecting to Paystack...</span>
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-5 h-5" />
                                    <span>Proceed to Paystack Checkout (KES 1,500)</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          /* MANUAL M-PESA FORM */
                          <form onSubmit={handleManualMpesaSubmit} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                            <div className="p-4 bg-white rounded-2xl border border-slate-200">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                Direct M-Pesa Instructions
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-500 font-bold block">Paybill No:</span>
                                  <strong className="text-slate-900 font-black">247247 (Equity)</strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-bold block">Account No:</span>
                                  <strong className="text-slate-900 font-black">774411 (HomeHaven)</strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-bold block">Amount:</span>
                                  <strong className="text-emerald-700 font-black">KES 1,500</strong>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                M-Pesa Transaction Reference Code *
                              </label>
                              <input 
                                type="text"
                                placeholder="e.g. SHK9182J82"
                                required
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-600 outline-none"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Sender Phone Number *
                              </label>
                              <input 
                                type="tel"
                                placeholder="e.g. 0712345678"
                                required
                                value={manualPhone}
                                onChange={(e) => setManualPhone(e.target.value)}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={manualSubmitting}
                              className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {manualSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FileText className="w-4 h-4 text-emerald-400" />
                              )}
                              Submit M-Pesa Code for Verification
                            </button>
                          </form>
                        )}

                        {/* Save Draft Option */}
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={loading}
                            className="text-xs font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider underline transition-colors"
                          >
                            {loading ? 'Saving Draft...' : 'Or Save Listing as Draft & Pay Later on Dashboard'}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* BOTTOM PREVIOUS / NEXT NAVIGATION BUTTONS */}
                <div className="pt-8 mt-8 border-t border-slate-100 flex items-center justify-between gap-4">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={goToPrevStep}
                      className="px-6 py-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous Step
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={goToNextStep}
                      className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                    >
                      <span>
                        {currentStep === 1 && 'Next: Location & Contact'}
                        {currentStep === 2 && 'Next: Photos & Description'}
                        {currentStep === 3 && 'Next: Review & Paystack'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goToPrevStep}
                      className="text-xs font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Edit Property Details
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;
