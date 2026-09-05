import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';

// Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'landlord' | 'tenant' | 'admin';
  suspended?: boolean;
  businessName?: string;
  nationalId?: string;
  kraPin?: string;
  payoutPhone?: string;
  county?: string;
  physicalAddress?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  setProfile?: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

// Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import HomePage from './pages/HomePage';
import ListingDetailsPage from './pages/ListingDetailsPage';
import LandlordDashboard from './pages/LandlordDashboard';
import CreateListingPage from './pages/CreateListingPage';
import AuthPage from './pages/AuthPage';
import AdminPanel from './pages/AdminPanel';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const isAdminEmail = user.email?.toLowerCase() === 'stephenkariuki955@gmail.com' || user.email?.toLowerCase() === 'techa5080@gmail.com';
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const finalRole = isAdminEmail ? 'admin' : (data.role || 'landlord');
            
            // Auto update Firestore record if admin email was set as landlord
            if (isAdminEmail && data.role !== 'admin') {
              const { setDoc } = await import('firebase/firestore');
              await setDoc(docRef, { role: 'admin' }, { merge: true });
            }

            setProfile({
              ...data,
              role: finalRole,
            });
          } else {
            const finalRole = isAdminEmail ? 'admin' : 'landlord';
            const newProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || (isAdminEmail ? 'Admin' : 'Landlord'),
              email: user.email || '',
              phone: '',
              role: finalRole,
            };
            const { setDoc } = await import('firebase/firestore');
            await setDoc(docRef, newProfile, { merge: true });
            setProfile(newProfile);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          const isAdminEmail = user.email?.toLowerCase() === 'stephenkariuki955@gmail.com' || user.email?.toLowerCase() === 'techa5080@gmail.com';
          setProfile({
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || (isAdminEmail ? 'Admin' : 'Landlord'),
            email: user.email || '',
            phone: '',
            role: isAdminEmail ? 'admin' : 'landlord',
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Hub Connection In Progress</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile }}>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/listings" element={<HomePage />} />
              <Route path="/listing/:id" element={<ListingDetailsPage />} />
              <Route path="/auth" element={<AuthPage />} />
              
              {/* Protected Landlord Routes */}
              <Route 
                path="/dashboard" 
                element={profile?.role === 'landlord' ? <LandlordDashboard /> : <Navigate to="/" />} 
              />
              <Route 
                path="/create-listing" 
                element={profile?.role === 'landlord' ? <CreateListingPage /> : <Navigate to="/" />} 
              />
              <Route 
                path="/admin" 
                element={<AdminPanel />} 
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
