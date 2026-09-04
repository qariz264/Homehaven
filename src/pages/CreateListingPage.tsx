import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../App';
import { KENYA_COUNTIES } from '../lib/counties';
import { MapPin, DollarSign, Camera, CheckCircle2, ChevronRight, Sparkles, Building, Info, ShieldCheck, Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useSEO } from '../hooks/useSEO';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    setError('');

    try {
      const finalImages = images.length > 0 
        ? images 
        : ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80'];

      const currentUserId = auth.currentUser?.uid || profile?.id;
      if (!currentUserId) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }

      const fullLocationString = `${county} County${preciseLocation.trim() ? ` - ${preciseLocation.trim()}` : ''}`;

      const listingData = {
        title,
        description,
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
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await addDoc(collection(db, 'listings'), listingData);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Listing creation error:", err);
      if (err.code === 'permission-denied' || err.message?.includes('permissions')) {
        setError('Permission denied. Please ensure you are logged in as a landlord.');
      } else {
        setError(err.message || 'Failed to create listing. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Info Side */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-[2px] bg-blue-600" />
                <span className="text-blue-600 text-xs font-black uppercase tracking-widest">Expansion Protocol</span>
              </div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">Manifest your <br /> property on the <span className="text-blue-600">Hub.</span></h1>
              <p className="text-slate-500 font-medium leading-relaxed italic">
                "Our discovery engine connects your asset with over 15,000 verified tenants every week. Precision listing is the key to portfolio growth."
              </p>
            </motion.div>

            <div className="space-y-4">
               {[
                 { icon: <Sparkles className="w-4 h-4" />, text: 'AI Optimized Discovery' },
                 { icon: <ShieldCheck className="w-4 h-4" />, text: 'Encrypted Communication' },
                 { icon: <Building className="w-4 h-4" />, text: 'Portfolio Analytics Ready' },
               ].map((item, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.1 * i }}
                   className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm"
                 >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                       {item.icon}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">{item.text}</span>
                 </motion.div>
               ))}
            </div>
          </div>

          {/* Form Side */}
          <div className="lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl sm:rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden"
            >
              <div className="p-5 sm:p-8 md:p-12 border-b border-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest italic">Asset Configuration</h2>
                   <div className="flex items-center gap-3">
                      <div className="flex -space-x-1">
                         {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white" />)}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Discovery Team</span>
                   </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-start gap-3.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-950 leading-relaxed">
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="font-black uppercase tracking-wider text-emerald-900">Paystack Listing Activation (KES 1,500):</strong>
                        <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-md text-[10px] font-black uppercase">M-Pesa & Cards</span>
                      </div>
                      <p className="text-emerald-800 font-medium">
                        To maintain high quality and verified inventory, all listings require a fixed <strong>KES 1,500 activation fee</strong> powered by Paystack. Once submitted, you can complete payment immediately on your dashboard to instantly publish your property to prospective tenants for 30 days.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 italic">
                      Error: {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Asset Identity (Title)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. SKYLINE APARTMENTS, KILIMANI" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300 uppercase tracking-tight"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Economic Yield (Monthly KES)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input 
                          type="number" 
                          placeholder="45,000" 
                          required
                          className="w-full pl-16 pr-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300 tracking-tighter"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Select County</label>
                      <div className="relative">
                        <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 pointer-events-none" />
                        <select
                          required
                          className="w-full pl-16 pr-6 py-5 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all uppercase tracking-tight cursor-pointer appearance-none"
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Precise Location / Estate</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Kilimani, School Lane" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300 uppercase tracking-tight"
                        value={preciseLocation}
                        onChange={(e) => setPreciseLocation(e.target.value)}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Units Vacant</label>
                      <input 
                        type="number" 
                        min="1"
                        placeholder="e.g. 3" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300 tracking-tight"
                        value={unitsAvailable}
                        onChange={(e) => setUnitsAvailable(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Landlord Contact Phone Number</label>
                      <input 
                        type="tel" 
                        placeholder="e.g. 0712345678" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300 tracking-tight"
                        value={landlordPhone}
                        onChange={(e) => setLandlordPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Landlord Contact Email</label>
                      <input 
                        type="email" 
                        placeholder="e.g. landlord@example.com" 
                        required
                        className="w-full px-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300 tracking-tight"
                        value={landlordEmail}
                        onChange={(e) => setLandlordEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Image Upload & Management Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        Property Photos & Visual Assets ({images.length} added)
                      </label>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                        Upload Device Photos or Links
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Device File Upload Box */}
                      <label className="relative border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 transition-all rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer text-center group">
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
                          Select one or multiple images (PNG, JPG, WebP)
                        </span>
                      </label>

                      {/* URL Import Box */}
                      <div className="border border-slate-200 bg-slate-50 rounded-2xl p-6 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                            Add Image via Web Link
                          </span>
                          <div className="relative">
                            <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="url" 
                              placeholder="https://example.com/photo.jpg" 
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
                          Uploaded Photo Gallery ({images.length})
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative group rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-100 aspect-video shadow-sm">
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
                                <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                                  Cover Photo
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Latitude (Optional)</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="e.g. -1.2921" 
                        className="w-full px-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300 tracking-tight"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Longitude (Optional)</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="e.g. 36.8219" 
                        className="w-full px-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-300 tracking-tight"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Asset Intel (Description)</label>
                    <textarea 
                      placeholder="Specify premium features, concierge availability, utility status..." 
                      required
                      rows={5}
                      className="w-full px-6 py-5 bg-slate-50 border-0 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none placeholder:text-slate-300 leading-relaxed"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="pt-6">
                    <button 
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 group text-xs"
                    >
                      {loading ? 'Processing Registry...' : 'Initialize Asset Hub Listing'}
                      {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </button>
                    <div className="mt-8 flex items-center justify-center gap-4 text-slate-400">
                       <ShieldCheck className="w-4 h-4" />
                       <span className="text-[8px] font-black uppercase tracking-[0.3em]">End-to-End Hub Verification Pending Approval</span>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;
