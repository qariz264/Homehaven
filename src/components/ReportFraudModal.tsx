import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldAlert, X, AlertTriangle, CheckCircle, User, Mail, Phone, FileText, ShieldCheck } from 'lucide-react';
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
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Anonymous Report Submitted</h3>
              <p className="text-sm font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you for keeping our community safe. Your report has been dispatched anonymously to our <strong>Admin Security Operations Team</strong> for immediate investigation.
              </p>
              <button
                onClick={resetAndClose}
                className="mt-6 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                Done & Return to Hub
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4 pr-8">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                      Security Alert
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> 100% Anonymous
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1">
                    Report Fraudulent Account or Scam
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    Submit suspicious landlord or user accounts directly to system admins without exposing your identity.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Anonymous Guarantee Notice */}
              <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs font-medium text-emerald-900 leading-snug">
                  <strong>Anonymous & Confidential:</strong> You do not need to share your personal details. This complaint is sent to admins anonymously.
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    1. Details of Reported Account / Suspect (Fill at least one) *
                  </span>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Account Name / Landlord Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe / Apex Housing Agency"
                      value={reportedName}
                      onChange={(e) => setReportedName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> Account Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. landlord@example.com"
                        value={reportedEmail}
                        onChange={(e) => setReportedEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number / M-Pesa Contact
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0712 345 678"
                        value={reportedPhone}
                        onChange={(e) => setReportedPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    2. Nature of Scam or Fraud
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
                  >
                    {SCAM_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> 3. Incident Description & Details *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what happened (e.g. requested advance deposit before viewing, phone disconnected after receiving funds, fake photos, impersonating real estate company...)"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
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
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                  {submitting ? 'Submitting Report...' : 'Submit Anonymous Report'}
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
