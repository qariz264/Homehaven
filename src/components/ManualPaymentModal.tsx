import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { CreditCard, X, AlertTriangle, CheckCircle, ShieldCheck, Smartphone, Landmark, FileText, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    title: string;
    price?: number;
  } | null;
  onSuccess?: () => void;
}

const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({ isOpen, onClose, listing, onSuccess }) => {
  const { profile } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'bank' | 'airtel'>('mpesa');
  const [transactionCode, setTransactionCode] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [payerName, setPayerName] = useState(profile?.name || '');
  const [amount, setAmount] = useState('1500');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionCode.trim()) {
      setErrorMessage('Please enter the M-Pesa or Bank transaction reference code.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const cleanRef = transactionCode.trim().toUpperCase();

      // Create payment document
      await addDoc(collection(db, 'payments'), {
        listingId: listing.id,
        listingTitle: listing.title,
        ownerId: profile?.id || '',
        landlordName: payerName.trim() || profile?.name || 'Landlord',
        landlordEmail: profile?.email || '',
        landlordPhone: phone.trim() || profile?.phone || '',
        amount: parseFloat(amount) || 1500,
        method: paymentMethod,
        reference: cleanRef,
        payerPhone: phone.trim(),
        payerName: payerName.trim(),
        verificationType: 'manual',
        status: 'pending_verification',
        notes: notes.trim(),
        createdAt: serverTimestamp()
      });

      // Update listing document status
      await updateDoc(doc(db, 'listings', listing.id), {
        paymentStatus: 'pending_manual_verification',
        paymentRef: cleanRef,
        updatedAt: serverTimestamp()
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Manual payment submission error:', err);
      setErrorMessage('Failed to submit manual payment verification: ' + (err.message || 'Please check your connection'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSuccess(false);
    setErrorMessage('');
    setTransactionCode('');
    setNotes('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 relative overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={resetAndClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Payment Verification Submitted</h3>
              <p className="text-sm font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
                Your payment reference <strong className="font-mono text-blue-600">{transactionCode.toUpperCase()}</strong> for property <strong>"{listing.title}"</strong> has been logged. Our admin team will verify the payment and publish your listing shortly.
              </p>
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-bold">
                Status: ⏳ Pending Admin Verification
              </div>
              <button
                onClick={resetAndClose}
                className="mt-6 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4 pr-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                      Manual Verification
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1">
                    Submit Payment Proof for Listing
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    For: <span className="font-bold text-slate-700">{listing.title}</span>
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Payment Instructions Box */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Direct Payment Transfer Details
                  </span>
                  <span className="text-xs font-black bg-blue-600 px-2.5 py-1 rounded-lg">KES 1,500</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-slate-300">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                    <strong className="text-white block font-black uppercase text-[10px] tracking-wider mb-1">📲 M-Pesa Paybill / Till:</strong>
                    <div>Paybill: <strong className="text-emerald-400 font-mono">247247</strong></div>
                    <div>Account: <strong className="text-white font-mono">HOMEHAVEN-{listing.id.substring(0, 5).toUpperCase()}</strong></div>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                    <strong className="text-white block font-black uppercase text-[10px] tracking-wider mb-1">🏦 Direct M-Pesa Buy Goods:</strong>
                    <div>Till Number: <strong className="text-emerald-400 font-mono">9812450</strong></div>
                    <div>Name: <strong className="text-white">HomeHaven Real Estate</strong></div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Method selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 block">
                    1. Select Payment Transfer Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mpesa')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === 'mpesa'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      M-Pesa Mobile
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === 'bank'
                          ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Landmark className="w-4 h-4 text-blue-600" />
                      Bank Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('airtel')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === 'airtel'
                          ? 'bg-red-50 border-red-500 text-red-800 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-red-600" />
                      Airtel Money
                    </button>
                  </div>
                </div>

                {/* Transaction Code */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-600" /> Transaction Code / Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RJK489120X or M-Pesa SMS Ref"
                    value={transactionCode}
                    onChange={(e) => setTransactionCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                    Copy the transaction code from your M-Pesa / Bank confirmation SMS.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Sender Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Amount Paid (KES)
                    </label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Paid via M-Pesa on 5th Aug 1:15pm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={submitting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  {submitting ? 'Submitting...' : 'Submit Manual Verification'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ManualPaymentModal;
