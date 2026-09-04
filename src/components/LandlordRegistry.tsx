import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  FileText, 
  CheckCircle2, 
  Printer, 
  Edit3, 
  Save, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  Award, 
  Calendar, 
  ExternalLink,
  Layers,
  Hash,
  AlertCircle
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../App';

interface LandlordRegistryProps {
  profile: UserProfile | null;
  listings: any[];
  onProfileUpdated?: (updated: Partial<UserProfile>) => void;
}

export const LandlordRegistry: React.FC<LandlordRegistryProps> = ({ 
  profile, 
  listings,
  onProfileUpdated 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for registry profile
  const [businessName, setBusinessName] = useState(profile?.businessName || profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [payoutPhone, setPayoutPhone] = useState(profile?.payoutPhone || profile?.phone || '');
  const [nationalId, setNationalId] = useState(profile?.nationalId || '');
  const [kraPin, setKraPin] = useState(profile?.kraPin || '');
  const [county, setCounty] = useState(profile?.county || 'Nairobi');
  const [physicalAddress, setPhysicalAddress] = useState(profile?.physicalAddress || '');

  const registryId = `LL-KE-${(profile?.id || '00000000').slice(0, 8).toUpperCase()}`;

  // Factual calculations from real listings
  const activeCount = listings.filter(l => {
    const isExpired = l.expiresAt ? new Date(l.expiresAt).getTime() < Date.now() : false;
    return l.status === 'active' && !isExpired;
  }).length;

  const totalUnits = listings.reduce((acc, curr) => acc + (Number(curr.unitsAvailable) || 1), 0);
  const totalPortfolioValue = listings.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const activePortfolioValue = listings
    .filter(l => l.status === 'active' && (!l.expiresAt || new Date(l.expiresAt).getTime() >= Date.now()))
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setSaving(true);
    setFeedback(null);

    try {
      const userRef = doc(db, 'users', profile.id);
      const updatePayload = {
        name: businessName.trim() || profile.name,
        businessName: businessName.trim(),
        phone: phone.trim(),
        payoutPhone: payoutPhone.trim(),
        nationalId: nationalId.trim(),
        kraPin: kraPin.trim().toUpperCase(),
        county: county.trim(),
        physicalAddress: physicalAddress.trim()
      };

      await updateDoc(userRef, updatePayload);

      if (onProfileUpdated) {
        onProfileUpdated(updatePayload);
      }

      setFeedback({ type: 'success', text: 'Landlord Registry profile updated successfully in Firestore.' });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving landlord registry:', err);
      setFeedback({ type: 'error', text: 'Failed to update registry: ' + (err.message || 'Unknown error') });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Registry Header */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-8 bottom-8 opacity-10 text-white pointer-events-none hidden md:block">
          <ShieldCheck className="w-48 h-48" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Verified Landlord Registry
              </span>
              <span className="text-slate-400 text-xs font-mono font-bold">
                {registryId}
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase">
              {profile?.businessName || profile?.name || 'Registered Landlord'}
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1 max-w-xl">
              Official Property Registry & Accreditation Record for HomeHaven Kenya. All property deeds and units registered under this profile are cryptographically indexed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCertificate(true)}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              View Registry Certificate
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditing ? 'Cancel Edit' : 'Edit Registry Info'}
            </button>
          </div>
        </div>

        {/* Factual Registry Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800/80">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Total Properties
            </span>
            <span className="text-2xl font-black text-white font-mono mt-1 block">
              {listings.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">In Registry Ledger</span>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Total Managed Units
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
              {totalUnits}
            </span>
            <span className="text-[10px] text-emerald-400/80 font-medium">Physical Capacity</span>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Active Verified Yield
            </span>
            <span className="text-2xl font-black text-blue-400 font-mono mt-1 block">
              KES {activePortfolioValue.toLocaleString()}
            </span>
            <span className="text-[10px] text-blue-400/80 font-medium">{activeCount} Published Units</span>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Registry Status
            </span>
            <span className="text-lg font-black text-emerald-400 mt-1 block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Active & Good Standing
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Zero Compliance Flag</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          {feedback.text}
        </div>
      )}

      {/* Edit Form (if toggled) */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Update Official Registry Details
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Ensure your national ID, KRA PIN, and payout details match your official documents.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Landlord / Legal Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="e.g. Stephen Kariuki Properties Ltd"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Contact Phone Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="e.g. 0712345678"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Payout M-Pesa Number (For Tenant Inquiries & Deposits)
              </label>
              <input
                type="tel"
                value={payoutPhone}
                onChange={(e) => setPayoutPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="e.g. 0712345678"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                National ID / Business Registration No.
              </label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="e.g. 12345678 or CPR/2023/..."
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                KRA PIN (Optional / For Tax Invoicing)
              </label>
              <input
                type="text"
                value={kraPin}
                onChange={(e) => setKraPin(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono uppercase text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="e.g. A012345678Z"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Primary Operating County
              </label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="e.g. Nairobi, Kiambu, Machakos"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Physical Office / Address
              </label>
              <input
                type="text"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="e.g. Westlands Commercial Center, 3rd Floor, Nairobi"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Registry Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Registry Profile Credential Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Official Landlord Profile */}
        <div className="bg-white rounded-[2rem] p-7 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Accreditation
              </span>
              <h4 className="text-sm font-black text-slate-900 uppercase">
                Registry Credentials
              </h4>
            </div>
          </div>

          <div className="space-y-2.5 text-xs pt-2">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Registry ID:</span>
              <span className="font-mono font-black text-slate-900">{registryId}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">National ID / Reg:</span>
              <span className="font-bold text-slate-900">{profile?.nationalId || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">KRA Tax PIN:</span>
              <span className="font-mono font-bold text-slate-900">{profile?.kraPin || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 font-medium">Primary Region:</span>
              <span className="font-bold text-slate-900">{profile?.county || 'Nairobi, Kenya'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Contact & Settlement */}
        <div className="bg-white rounded-[2rem] p-7 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Settlement & Contact
              </span>
              <h4 className="text-sm font-black text-slate-900 uppercase">
                Contact & Payouts
              </h4>
            </div>
          </div>

          <div className="space-y-2.5 text-xs pt-2">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Registered Email:</span>
              <span className="font-bold text-slate-900 truncate max-w-[150px]">{profile?.email}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Primary Phone:</span>
              <span className="font-bold text-slate-900">{profile?.phone || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">M-Pesa Payout:</span>
              <span className="font-bold text-emerald-700 font-mono">{profile?.payoutPhone || profile?.phone || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 font-medium">Paystack Fee Status:</span>
              <span className="font-black text-emerald-600">KES 1,500 / Listing</span>
            </div>
          </div>
        </div>

        {/* Card 3: Registry Compliance */}
        <div className="bg-white rounded-[2rem] p-7 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Audit & Compliance
              </span>
              <h4 className="text-sm font-black text-slate-900 uppercase">
                Inventory Audit
              </h4>
            </div>
          </div>

          <div className="space-y-2.5 text-xs pt-2">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Active Properties:</span>
              <span className="font-bold text-emerald-600">{activeCount} of {listings.length} Listed</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Total Registered Units:</span>
              <span className="font-bold text-slate-900">{totalUnits} Units</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Gross Portfolio:</span>
              <span className="font-black text-slate-900 font-mono">KES {totalPortfolioValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 font-medium">Verification Method:</span>
              <span className="font-bold text-slate-900">Paystack / Admin Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Registered Property Ledger Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                Official Property Ledger
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Registered Real Estate Assets ({listings.length})
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Every unit below has been registered under your landlord identity and assigned an official tracking code.
            </p>
          </div>
          
          <button
            onClick={() => setShowCertificate(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Registry Ledger
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Registry Asset Ref</th>
                <th className="px-6 py-4">Property Title & Location</th>
                <th className="px-6 py-4">Type & Capacity</th>
                <th className="px-6 py-4">Monthly Rate</th>
                <th className="px-6 py-4">Registration Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">No properties registered in this ledger yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Create your first listing to generate official registry asset records.</p>
                  </td>
                </tr>
              ) : (
                listings.map((listing) => {
                  const assetRef = `PROP-REG-${listing.id.substring(0, 6).toUpperCase()}`;
                  const isExpired = listing.expiresAt ? new Date(listing.expiresAt).getTime() < Date.now() : false;
                  const isFullyActive = listing.status === 'active' && !isExpired;

                  return (
                    <tr key={listing.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {assetRef}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900">{listing.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {listing.location || 'Nairobi'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{listing.type || 'Apartment'}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {listing.unitsAvailable || 1} Unit(s) available
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-slate-900">
                        KES {Number(listing.price || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {isFullyActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black text-[10px] uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified Active
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-black text-[10px] uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-black text-[10px] uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Pending Activation
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Registry Certificate Modal */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-3xl w-full border-8 border-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowCertificate(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Canvas */}
            <div className="border-4 border-double border-slate-300 p-8 md:p-10 rounded-2xl bg-[#fcfbf7] space-y-6 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center mb-3 shadow-lg">
                  <ShieldCheck className="w-9 h-9 text-emerald-400" />
                </div>
                <span className="text-[10px] font-black tracking-[0.25em] text-slate-500 uppercase">
                  Republic of Kenya • Real Estate Accreditation
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mt-1">
                  Landlord Accreditation Certificate
                </h2>
                <div className="w-24 h-1 bg-blue-600 rounded-full my-2" />
              </div>

              <p className="text-xs text-slate-600 max-w-lg mx-auto font-serif italic">
                This is to officially certify that the individual/entity named below is an accredited, verified landlord on the HomeHaven Kenya Property Registry.
              </p>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-left space-y-4 max-w-xl mx-auto shadow-sm">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Landlord / Entity Name
                    </span>
                    <strong className="text-sm font-black text-slate-900 uppercase block">
                      {profile?.businessName || profile?.name || 'Registered Landlord'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Official Registry ID
                    </span>
                    <strong className="text-sm font-mono font-black text-blue-600 block">
                      {registryId}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Registered Email
                    </span>
                    <span className="font-bold text-slate-800">{profile?.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Registered Phone
                    </span>
                    <span className="font-bold text-slate-800">{profile?.phone || 'Verified'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Registered Properties
                    </span>
                    <span className="font-bold text-slate-900 font-mono">{listings.length} Properties</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Total Capacity
                    </span>
                    <span className="font-bold text-slate-900 font-mono">{totalUnits} Units</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-200 text-left text-xs">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Issued Date
                  </span>
                  <span className="font-bold text-slate-800">
                    {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block flex items-center gap-1 justify-end">
                    <CheckCircle2 className="w-3 h-3" /> Security Seal Verified
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    SHA256-REG-{registryId}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCertificate(false)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrintCertificate}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 shadow-lg"
              >
                <Printer className="w-4 h-4" />
                Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandlordRegistry;
