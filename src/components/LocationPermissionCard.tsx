import React, { useState } from 'react';
import { MapPin, X, Navigation, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LocationPermissionCardProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationGranted?: (coords: { latitude: number; longitude: number; county?: string }) => void;
}

// Representative Kenyan county coordinates for nearby mapping
const KENYAN_LOCATIONS: { name: string; lat: number; lng: number }[] = [
  { name: 'Nairobi', lat: -1.286389, lng: 36.817223 },
  { name: 'Kiambu', lat: -1.1714, lng: 36.8356 },
  { name: 'Mombasa', lat: -4.043477, lng: 39.668206 },
  { name: 'Kisumu', lat: -0.091702, lng: 34.767956 },
  { name: 'Nakuru', lat: -0.303099, lng: 36.080026 },
  { name: 'Machakos', lat: -1.5177, lng: 37.2634 },
  { name: 'Kajiado', lat: -1.8524, lng: 36.7768 },
  { name: 'Uasin Gishu', lat: 0.5143, lng: 35.2698 },
  { name: 'Kilifi', lat: -3.6305, lng: 39.8499 },
  { name: 'Nyeri', lat: -0.4201, lng: 36.9476 },
  { name: 'Meru', lat: 0.0463, lng: 37.6559 },
  { name: 'Laikipia', lat: 0.0167, lng: 37.0728 }
];

function getNearestCounty(lat: number, lng: number): string {
  let minDistance = Infinity;
  let nearest = 'Nairobi';

  for (const loc of KENYAN_LOCATIONS) {
    const dLat = (loc.lat - lat) * (Math.PI / 180);
    const dLng = (loc.lng - lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * (Math.PI / 180)) *
        Math.cos(loc.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = 6371 * c; // Earth radius in km

    if (distance < minDistance) {
      minDistance = distance;
      nearest = loc.name;
    }
  }

  return nearest;
}

export const LocationPermissionCard: React.FC<LocationPermissionCardProps> = ({
  isOpen,
  onClose,
  onLocationGranted
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleAllow = () => {
    setStatusMessage(null);
    setIsRequesting(true);

    if (!('geolocation' in navigator)) {
      setIsRequesting(false);
      setStatusMessage({
        type: 'error',
        text: 'Geolocation is not supported by your browser.'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearestCounty = getNearestCounty(latitude, longitude);

        localStorage.setItem('geo_permission_status', 'granted');
        localStorage.setItem('geo_user_lat', latitude.toString());
        localStorage.setItem('geo_user_lng', longitude.toString());
        localStorage.setItem('geo_user_county', nearestCounty);

        setIsRequesting(false);
        setStatusMessage({
          type: 'success',
          text: `Location enabled! Closest region detected: ${nearestCounty} County.`
        });

        if (onLocationGranted) {
          onLocationGranted({ latitude, longitude, county: nearestCounty });
        }

        // Close smoothly after brief confirmation
        setTimeout(() => {
          onClose();
        }, 1200);
      },
      (error) => {
        setIsRequesting(false);
        console.warn('Geolocation permission issue:', error);
        let errorText = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorText = 'Location permission was denied in browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorText = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorText = 'The request to get user location timed out.';
        }
        setStatusMessage({
          type: 'error',
          text: errorText
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleCancel = () => {
    localStorage.setItem('geo_permission_status', 'dismissed');
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        id="location-permission-modal"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm transition-all"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col"
          role="dialog"
          aria-labelledby="location-request-title"
          aria-describedby="location-request-desc"
        >
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-2.5 px-4 pt-4 sm:px-6 sm:pt-6 pb-2 shrink-0">
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 mt-0.5">
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">
                  Permissions
                </span>
                <h2 
                  id="location-request-title"
                  className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug"
                >
                  Geographic location access request
                </h2>
              </div>
            </div>

            <button
              id="location-request-close-btn"
              type="button"
              onClick={onClose}
              className="shrink-0 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors flex items-center gap-1 text-xs font-bold -mr-1"
              aria-label="Close"
              title="Close"
            >
              <span className="text-xs font-bold lowercase">close</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 overflow-y-auto">
            <p 
              id="location-request-desc"
              className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed"
            >
              This app requests access to Geographic location to work properly. Do you want to allow Geographic location access?
            </p>

            <div className="mt-3 p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed">
                Enabling location helps discover rental apartments, maisonettes, and bedsitters nearest to your current neighborhood across Kenya.
              </p>
            </div>

            {/* Status Alert if granted or denied */}
            {statusMessage && (
              <div 
                className={`mt-3 p-3 rounded-xl sm:rounded-2xl text-xs font-bold flex items-start gap-2.5 ${
                  statusMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{statusMessage.text}</span>
              </div>
            )}
          </div>

          {/* Action Options: Allow and Cancel */}
          <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3">
              <button
                id="location-request-cancel-btn"
                type="button"
                onClick={handleCancel}
                disabled={isRequesting}
                className="w-full sm:w-auto min-h-[42px] sm:min-h-0 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center text-center"
              >
                cancel
              </button>

              <button
                id="location-request-allow-btn"
                type="button"
                onClick={handleAllow}
                disabled={isRequesting}
                className="w-full sm:w-auto min-h-[42px] sm:min-h-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 text-center"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Requesting...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>allow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LocationPermissionCard;
