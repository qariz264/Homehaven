import React from 'react';
import { X, ShieldCheck, DollarSign, BarChart3, Scale, Award, Megaphone, Lock, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export type InfoModalTopic = 
  | 'pricing' 
  | 'market_analysis' 
  | 'legal_support' 
  | 'verification' 
  | 'digital_marketing' 
  | 'security' 
  | 'privacy' 
  | 'terms';

interface InfoModalProps {
  topic: InfoModalTopic | null;
  onClose: () => void;
}

const MODAL_CONTENT: Record<InfoModalTopic, {
  title: string;
  badge: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  summary: string;
  sections: { heading: string; body: string }[];
  actionLink?: { text: string; to: string };
}> = {
  pricing: {
    title: 'Listing Rates & Pricing Plans',
    badge: 'Transparent Pricing',
    icon: DollarSign,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    summary: 'Simple, flat-rate property indexing with zero commissions or hidden tenant viewing fees.',
    sections: [
      {
        heading: 'KES 1,500 per Property Listing',
        body: 'Every property listing is activated for a full 30-day billing cycle. Your property appears in search results across Kenya with verified landlord credentials.'
      },
      {
        heading: 'Zero Viewing Fees Policy',
        body: 'We strongly discourage landlords and brokers from charging advance viewing fees. Tenants browse, discover, and inspect properties without illegal upfront charges.'
      },
      {
        heading: 'Direct Automated & Manual Payments',
        body: 'Pay instantly via Paystack (Debit/Credit Card or M-Pesa) or submit your manual M-Pesa reference code for fast administrative review.'
      }
    ],
    actionLink: { text: 'List Your Property Now', to: '/create-listing' }
  },
  market_analysis: {
    title: 'Kenya Real Estate Market Analysis',
    badge: 'Data-Driven Insights',
    icon: BarChart3,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    summary: 'Factual rental market metrics across Kenya\'s leading urban centers and growth corridors.',
    sections: [
      {
        heading: 'High-Demand Rental Hubs',
        body: 'Nairobi (Kilimani, Westlands, Roysambu, South B), Kiambu (Ruaka, Kikuyu, Thika), and Mombasa (Nyali, Bamburi) lead rental occupancy rates averaging 91% within 14 days of listing.'
      },
      {
        heading: 'Pricing Benchmarks',
        body: 'Bedsitters range from KES 6,500 - 15,000; 1-Bedrooms range from KES 12,000 - 35,000; 2-Bedrooms range from KES 22,000 - 65,000 depending on amenities and proximity to arterial bypasses.'
      },
      {
        heading: 'Real-Time Portfolio Optimization',
        body: 'Landlords on HomeHaven Hub track vacant unit turnover and optimize yields using verified live market inquiry numbers.'
      }
    ],
    actionLink: { text: 'Explore Available Listings', to: '/#listings' }
  },
  legal_support: {
    title: 'Legal Tenancy & Compliance Framework',
    badge: 'Legal Guidance',
    icon: Scale,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-500',
    summary: 'Operating in accordance with the Laws of Kenya, the Rent Restriction Act, and the Landlord and Tenant Bill.',
    sections: [
      {
        heading: 'Written Tenancy Agreements',
        body: 'All tenancies arranged through the Hub are recommended to execute standard written lease agreements documenting security deposit terms and notice periods.'
      },
      {
        heading: 'Security Deposit Protection',
        body: 'Landlords are legally obligated to return security deposits minus documented damage reconciliations upon lease termination.'
      },
      {
        heading: 'Dispute Resolution & Triage',
        body: 'The Hub provides an administrative complaint system to resolve deposit disputes or unlawful eviction threats amicably before tribunal referral.'
      }
    ]
  },
  verification: {
    title: 'Hub Verification & KYC Protocol',
    badge: 'Trust & Safety',
    icon: Award,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    summary: 'Rigorous vetting to eliminate ghost listings and protect tenants from real estate scams.',
    sections: [
      {
        heading: 'Landlord KYC Registry',
        body: 'Landlords must maintain verified profile details including National ID, KRA PIN certificate, and official payout phone numbers.'
      },
      {
        heading: '30-Day Expiry & Renewal Check',
        body: 'Properties are verified for 30 days. Listings that become vacant or occupied must be actively managed to prevent stale search results.'
      },
      {
        heading: 'Rapid Fraud De-Listing',
        body: 'Any listing receiving substantiated tenant fraud complaints is suspended immediately pending full administrative audit.'
      }
    ],
    actionLink: { text: 'Access Landlord Registry', to: '/dashboard' }
  },
  digital_marketing: {
    title: 'Digital Marketing & Exposure Engine',
    badge: 'Tenant Outreach',
    icon: Megaphone,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-500',
    summary: 'Connecting your rental assets with over 15,000 active prospective tenants every week.',
    sections: [
      {
        heading: 'High-Resolution Visual Showcases',
        body: 'Properties feature responsive gallery showcases, precise county geo-tagging, and vacancy count indicators.'
      },
      {
        heading: 'Direct One-Click WhatsApp & Phone Connect',
        body: 'Tenants communicate directly with property owners without middleman interference or broker markups.'
      },
      {
        heading: 'Search Engine & Social Syndication',
        body: 'Active listings are indexed for high visibility on Google and syndicated across our community social feeds.'
      }
    ],
    actionLink: { text: 'List Your Property', to: '/create-listing' }
  },
  security: {
    title: 'Security Architecture & Protocols',
    badge: 'Hardened Security',
    icon: Lock,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    summary: 'Multi-layered fortress security protecting your personal data, identity, and payment transactions.',
    sections: [
      {
        heading: 'Role-Based Access Control (RBAC)',
        body: 'Firestore security rules strictly isolate user profiles. Unauthenticated users cannot read National IDs, KRA PINs, or payout records.'
      },
      {
        heading: 'HMAC Webhook Cryptographic Verification',
        body: 'All Paystack callbacks require cryptographically exact HMAC SHA-512 signatures with constant-time equality checks.'
      },
      {
        heading: 'Zero Tolerance for Fraud',
        body: 'End-to-end audit logging monitors suspicious listing modifications, duplicate payments, and unverified account spikes.'
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy & Data Protection',
    badge: 'Privacy Assurance',
    icon: FileText,
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-slate-400',
    summary: 'Strict adherence to the Kenya Data Protection Act (2019) safeguarding user information.',
    sections: [
      {
        heading: 'Data We Collect',
        body: 'We collect your name, email, phone number, and landlord verification credentials solely for providing property discovery and listing services.'
      },
      {
        heading: 'No Third-Party Data Selling',
        body: 'HomeHaven Hub will NEVER sell, lease, or monetize your personal or financial data to advertisers or external telemarketers.'
      },
      {
        heading: 'Data Access & Deletion Rights',
        body: 'You may request an export of your stored personal records or account deletion at any time by contacting our data protection officer.'
      }
    ]
  },
  terms: {
    title: 'Terms of Service & Usage Agreement',
    badge: 'Legal Agreement',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    summary: 'Standard contractual obligations governing all landlords, agents, and tenants utilizing the Hub.',
    sections: [
      {
        heading: 'Listing Accuracy Guarantee',
        body: 'Landlords agree that all prices, photos, vacancy counts, and amenities accurately represent the physical premises.'
      },
      {
        heading: 'Prohibited Practices',
        body: 'Demanding unauthorized viewing fees, posting fictitious property locations, or harassment results in immediate permanent ban.'
      },
      {
        heading: 'Platform Liability',
        body: 'HomeHaven Hub facilitates direct connection between landlords and tenants. Physical inspection and lease signing remain under the parties\' mutual due diligence.'
      }
    ]
  }
};

export const InfoModal: React.FC<InfoModalProps> = ({ topic, onClose }) => {
  if (!topic) return null;

  const content = MODAL_CONTENT[topic];
  if (!content) return null;

  const Icon = content.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-white shadow-2xl relative my-8"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl ${content.iconBg} flex items-center justify-center ${content.iconColor} shrink-0`}>
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2 border border-blue-500/20">
                {content.badge}
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white">{content.title}</h3>
              <p className="text-slate-400 text-sm font-medium mt-1 leading-relaxed">{content.summary}</p>
            </div>
          </div>

          {/* Body Sections */}
          <div className="space-y-4 my-6">
            {content.sections.map((sec, idx) => (
              <div key={idx} className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4">
                <h4 className="text-sm font-black text-blue-400 uppercase tracking-wide mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {sec.heading}
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed font-medium">
                  {sec.body}
                </p>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Close
            </button>
            {content.actionLink && (
              <Link
                to={content.actionLink.to}
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
              >
                {content.actionLink.text}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default InfoModal;
