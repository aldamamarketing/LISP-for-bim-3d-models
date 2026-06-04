import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';

const DashboardContext = createContext();

export function useDashboard() {
  return useContext(DashboardContext);
}

export function DashboardProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [tenantLisps, setTenantLisps] = useState([]);
  const [draftLisps, setDraftLisps] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [deviceNotes, setDeviceNotes] = useState({});
  const [seats, setSeats] = useState(1);
  
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Bem-vindo à fase Beta! 🚀', text: 'Você já pode conectar seus LISPs e gerenciá-los na nuvem. Ajude-nos reportando bugs ou sugerindo ideias usando o botão "Reportar Bug".', read: false },
    { id: 2, title: 'Welcome to the Beta Phase! 🚀', text: 'You can now link your LISPs and manage them in the cloud. Help us out by reporting bugs or suggesting features via the "Reportar Bug" button.', read: false }
  ]);
  
  const [activeTab, setActiveTab] = useState('lisp');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await loadOrInitializeUser(user);
      } else {
        setUserData(null);
        setTenantLisps([]);
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const generateSemanticIds = (email, name) => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const slug = (email.split('@')[0] || name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      uid: `USR-${dateStr}-${slug}`,
      apiKey: `lc_key_${dateStr}_${slug}`
    };
  };

  const loadOrInitializeUser = async (user) => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const loadedData = { id: docSnap.id, ...docSnap.data() };
        setUserData(loadedData);
        setDeviceNotes(loadedData.deviceNotes || {});
        if (loadedData.maxSeats) setSeats(loadedData.maxSeats);
        await loadTenantLisps(loadedData.id);
      } else {
        const { uid, apiKey } = generateSemanticIds(user.email, user.displayName);
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);

        const newUser = {
          uid: uid,
          email: user.email,
          name: user.displayName || 'Engenheiro(a)',
          apiKey: apiKey,
          registeredDevices: [],
          deviceNotes: {},
          maxSeats: 1,
          role: 'beta-tester',
          createdAt: new Date().toISOString(),
          trialExpiresAt: expires.toISOString()
        };

        await setDoc(doc(db, 'users', uid), newUser);
        setUserData({ id: uid, ...newUser });
        await loadTenantLisps(uid);
      }
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const loadTenantLisps = async (tenantId) => {
    try {
      const q = query(collection(db, 'lispFiles'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      setTenantLisps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    firebaseUser,
    userData, setUserData,
    loading, setLoading,
    tenantLisps, setTenantLisps,
    draftLisps, setDraftLisps,
    isUploading, setIsUploading,
    deviceNotes, setDeviceNotes,
    seats, setSeats,
    notifications, markAsRead, unreadCount,
    activeTab, setActiveTab,
    isMobileMenuOpen, setIsMobileMenuOpen,
    showSupportModal, setShowSupportModal
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
