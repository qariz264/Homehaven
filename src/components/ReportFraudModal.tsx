import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldAlert, X, AlertTriangle, CheckCircle, User, Mail, Phone, FileText, ShieldCheck, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportFraudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCAM_CATEGORIES = [
  'Advance Deposit / Viewing Fee Theft',
  'Fake Property Listing / Non-Existent House',
  'Impersonation & Identity Theft',
  'Rent & Payment Scam',
  'Harassment & Extortion',
  'Other Suspicious Activity'
];

const ReportFraudModal: React.FC<ReportFraudModalProps> = ({ isOpen, onClose }) => {
  const [reportedName, setReportedName] = useState('');
  const [reportedEmail, setReportedEmail] = useState('');
  const [reportedPhone, setReportedPhone] = useState('');
  const [category, setCategory] = useState(SCAM_CATEGORIES[0]);
  const [details, setDetails] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedName && !reportedEmail && !reportedPhone) {
      setErrorMessage('Please provide at least one detail (Name, Email, or Phone Number) of the reported account.');
      return;
    }
    if (!details.trim()) {
      setErrorMessage('Please provide details describing the fraud or scam incident.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const accountIdentifier = reportedName || reportedEmail || reportedPhone;
      
      await addDoc(collection(db, 'complaints'), {
        type: 'account_fraud',
        category: category,
        listingId: 'ACCOUNT_REPORT',
        listingTitle: `FRAUD REPORT: ${accountIdentifier}`,
        reportedAccountName: reportedName.trim(),
        reportedAccountEmail: reportedEmail.trim(),
        reportedAccountPhone: reportedPhone.trim(),
        landlordEmail: reportedEmail.trim(),
        landlordPhone: reportedPhone.trim(),
        reporterName: 'Anonymous Reporter',
        reporterEmail: 'Anonymous',
        reporterPhone: 'Anonymous',
        reason: category,
        details: details.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting fraud report:', err);
      setErrorMessage('Failed to submit report: ' + (err.message || 'Please check your connection and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSuccess(false);
    setErrorMessage('');
    setReportedName('');
    setReportedEmail('');
    setReportedPhone('');
    setDetails('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto overscroll-contain">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-lg lg:max-w-xl rounded-2xl sm:rounded-[2rem] shadow-2xl border border-slate-100 relative my-auto flex flex-col h-[92vh] sm:h-auto sm:max-h-[88vh] overflow-hidden"
        >
          {success ? (
            <div className="text-center py-8 sm:py-12 px-4 sm:px-8 space-y-3 sm:space-y-4 my-auto overflow-y-auto overscroll-contain">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">Complaint Submitted to Admin</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you for keeping our community safe. Your complaint has been delivered directly to the <strong>Admin Security & Moderation Team</strong> for immediate investigation and enforcement.
              </p>
              <button
                type="button"
                onClick={resetAndClose}
                className="mt-4 px-6 sm:px-8 py-3 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                Close & Return
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Pinned Header */}
              <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0 bg-white">
                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                        Direct Admin Alert
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> 100% Anonymous
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-snug">
                      Report Fraud & Submit Complaint
                    </h3>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-0.5 line-clamp-2 sm:line-clamp-none">
                      Sends an urgent complaint to system admins to suspend fraudulent landlords or accounts.
                    </p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all shrink-0 -mr-1 -mt-1"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 flex-1 min-h-0">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="break-words leading-tight">{errorMessage}</span>
                  </div>
                )}

                {/* Anonymous Guarantee Notice */}
                <div className="bg-emerald-50/80 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-emerald-200/60 flex items-start gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] sm:text-xs font-medium text-emerald-900 leading-snug break-words">
                    <strong className="font-black">Anonymous & Confidential:</strong> You do not need to share your identity. This complaint goes straight to the admin console for investigation.
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 space-y-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block leading-tight">
                      1. Details of Reported Account / Suspect (Provide at least one) *
                    </span>

                    <div>
                      <label className="text-[11px] sm:text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Account Name / Landlord Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe / Apex Housing Agency"
                        value={reportedName}
                        onChange={(e) => setReportedName(e.target.value)}
                        className="w-full min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="text-[11px] sm:text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Account Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. landlord@example.com"
                          value={reportedEmail}
                          onChange={(e) => setReportedEmail(e.target.value)}
                          className="w-full min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] sm:text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Phone / M-Pesa Contact
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 0712 345 678"
                          value={reportedPhone}
                          onChange={(e) => setReportedPhone(e.target.value)}
                          className="w-full min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 mb-1 block">
                      2. Nature of Scam or Fraud
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
                    >
                      {SCAM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 3. Incident Description & Details *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe what happened (e.g. requested advance deposit before viewing, phone disconnected after receiving funds, fake photos, impersonating real estate company...)"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-y min-h-[72px] max-h-[160px]"
                    />
                  </div>
                </div>
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className="p-3 sm:p-4 border-t-2 border-slate-100 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center gap-2.5 sm:gap-3 shrink-0 z-10">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={submitting}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-fraud-complaint-btn"
                  disabled={submitting}
                  className="flex-1 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{submitting ? 'Sending to Admin...' : 'Send Complaint to Admin'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReportFraudModal;
