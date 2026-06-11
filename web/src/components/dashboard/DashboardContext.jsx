import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';

const DashboardContext = createContext();

export function useDashboard() {
  return useContext(DashboardContext);
}

export function DashboardProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [tenantLisps, setTenantLisps] = useState([]);
  const [commands, setCommands] = useState([]);
  const [suites, setSuites] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // Track which data has been loaded to avoid redundant fetches
  const [loadedTabs, setLoadedTabs] = useState({});
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
        setCommands([]);
        setSuites([]);
        setGroups([]);
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const generateSlug = (email, name) => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const slug = (email.split('@')[0] || name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      slug: slug,
      apiKey: `lc_key_${dateStr}_${slug}`
    };
  };

  const loadOrInitializeUser = async (user) => {
    setLoading(true);
    try {
      // Direct doc read by Auth UID — no query needed (faster)
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        // Existing user — load data
        const loadedData = { id: userDocSnap.id, ...userDocSnap.data() };
        setUserData(loadedData);
        setDeviceNotes(loadedData.deviceNotes || {});
        if (loadedData.maxSeats) setSeats(loadedData.maxSeats);
      } else {
        // New user — create doc with Auth UID as doc ID
        const { slug, apiKey } = generateSlug(user.email, user.displayName);
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);

        const newUser = {
          slug: slug,
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

        await setDoc(userDocRef, newUser);
        setUserData({ id: user.uid, ...newUser });
      }
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const loadLispData = async (tenantId) => {
    if (loadedTabs.lisp) return; // Already loaded
    try {
      const [snapLisps, snapCmds, snapGroups] = await Promise.all([
        getDocs(query(collection(db, 'lispFiles'), where('tenantId', '==', tenantId))),
        getDocs(query(collection(db, 'commands'), where('tenantId', '==', tenantId))),
        getDocs(query(collection(db, 'groups'), where('tenantId', '==', tenantId))),
      ]);
      setTenantLisps(snapLisps.docs.map(d => ({ id: d.id, ...d.data() })));
      setCommands(snapCmds.docs.map(d => ({ id: d.id, ...d.data() })));
      setGroups(snapGroups.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadedTabs(prev => ({ ...prev, lisp: true }));
    } catch (err) {
      console.error('Error loading LISP data:', err);
    }
  };

  const loadSuitesData = async (tenantId) => {
    if (loadedTabs.suites) return;
    try {
      const snapSuites = await getDocs(query(collection(db, 'suites'), where('tenantId', '==', tenantId)));
      setSuites(snapSuites.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadedTabs(prev => ({ ...prev, suites: true }));
    } catch (err) {
      console.error('Error loading suites data:', err);
    }
  };

  useEffect(() => {
    if (!userData) return;
    const tenantId = userData.id;
    
    switch (activeTab) {
      case 'lisp':
        loadLispData(tenantId);
        break;
      case 'suites':
        loadSuitesData(tenantId);
        // Also load lisp data since suites reference commands/groups
        loadLispData(tenantId);
        break;
      // 'subscriptions' and 'licenses' fetch their own data internally
    }
  }, [activeTab, userData]);

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    firebaseUser,
    userData, setUserData,
    loading, setLoading,
    tenantLisps, setTenantLisps,
    commands, setCommands,
    suites, setSuites,
    groups, setGroups,
    loadedTabs,
    loadLispData,
    loadSuitesData,
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
