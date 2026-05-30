import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, query, where, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import FavoritesManager from './FavoritesManager';

export default function Dashboard({ mode = 'dashboard' }) {
  const [activeTab, setActiveTab] = useState('lisp');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Auth state
  const [emailStr, setEmailStr] = useState('');
  const [passwordStr, setPasswordStr] = useState('');
  const [passwordConfirmStr, setPasswordConfirmStr] = useState('');
  const [authError, setAuthError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Profile Edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  // LISP Management
  const [tenantLisps, setTenantLisps] = useState([]);
  const [draftLisps, setDraftLisps] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingLispId, setEditingLispId] = useState(null);
  const [editLispData, setEditLispData] = useState({});
  
  // Equipments
  const [deviceNotes, setDeviceNotes] = useState({});

  // Subscriptions mock
  const [seats, setSeats] = useState(1);

  // Notifications & Support
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Bem-vindo à fase Beta! 🚀', text: 'Você já pode conectar seus LISPs e gerenciá-los na nuvem. Ajude-nos reportando bugs ou sugerindo ideias usando o botão "Reportar Bug".', read: false },
    { id: 2, title: 'Welcome to the Beta Phase! 🚀', text: 'You can now link your LISPs and manage them in the cloud. Help us out by reporting bugs or suggesting features via the "Reportar Bug" button.', read: false }
  ]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState('bug');
  const [supportMsg, setSupportMsg] = useState('');

  // FAQ State
  const [openFaq, setOpenFaq] = useState(null);

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

  useEffect(() => {
    if (!loading) {
      if (mode === 'login' && firebaseUser) {
        window.location.replace('/dashboard');
      } else if (mode === 'dashboard' && !firebaseUser) {
        window.location.replace('/login');
      }
    }
  }, [loading, firebaseUser, mode]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try { await signInWithEmailAndPassword(auth, emailStr, passwordStr); } 
    catch (err) { setAuthError('Erro: ' + err.message); }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (passwordStr !== passwordConfirmStr) return setAuthError('As senhas não coincidem.');
    try { await createUserWithEmailAndPassword(auth, emailStr, passwordStr); } 
    catch (err) { setAuthError('Erro: ' + err.message); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!userData) return;
    try {
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, { name: editName, role: editRole });
      setUserData({ ...userData, name: editName, role: editRole });
      setIsEditingProfile(false);
    } catch(e) {
      alert('Erro ao atualizar perfil.');
    }
  };

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

  // --- BULK UPLOAD LOGIC ---
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.lsp'));
    if (files.length === 0) return;
    
    const newDrafts = files.map(file => ({
      fileObj: file,
      originalName: file.name,
      lispId: file.name.replace('.lsp', '').replace(/[^a-zA-Z0-9_-]/g, '_'),
      friendlyName: file.name.replace('.lsp', ''),
      suite: 'core',
      group: 'Custom Tools',
      svgIcon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 13l-3-3 3-3M11 13l3-3-3-3M8 4l-2 8"/></svg>'
    }));
    
    setDraftLisps([...draftLisps, ...newDrafts]);
  };

  const handleSvgUpload = (e, index, isDraft) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const svgCode = ev.target.result;
      if (isDraft) {
        updateDraft(index, 'svgIcon', svgCode);
      } else {
        setEditLispData({ ...editLispData, svgIcon: svgCode });
      }
    };
    reader.readAsText(file);
  };

  const updateDraft = (index, field, value) => {
    const updated = [...draftLisps];
    updated[index][field] = value;
    setDraftLisps(updated);
  };

  const removeDraft = (index) => {
    setDraftLisps(draftLisps.filter((_, i) => i !== index));
  };

  const submitAllDrafts = async () => {
    if (draftLisps.length === 0) return;
    setIsUploading(true);
    
    try {
      const { storage } = await import('../firebase');
      const newUploaded = [];

      for (const draft of draftLisps) {
        const storagePath = `tenants/${userData.id}/lisps/${draft.originalName}`;
        const fileRef = ref(storage, storagePath);
        
        await uploadBytes(fileRef, draft.fileObj);
        
        const fileMeta = {
          lispId: draft.lispId,
          tenantId: userData.id,
          originalName: draft.originalName,
          storagePath: storagePath,
          friendlyName: draft.friendlyName,
          description: draft.friendlyName,
          group: draft.group,
          suite: draft.suite,
          svgIcon: draft.svgIcon,
          uploadedAt: new Date().toISOString()
        };
        
        const semanticId = `lisp_${userData.id}_${draft.lispId}`;
        await setDoc(doc(db, 'lispFiles', semanticId), fileMeta);
        newUploaded.push({ id: semanticId, ...fileMeta });
      }
      
      setTenantLisps([...tenantLisps, ...newUploaded]);
      setDraftLisps([]);
      alert('Upload concluído com sucesso!');
    } catch(err) {
      console.error(err);
      alert('Erro durante o upload múltiplo.');
    }
    setIsUploading(false);
  };

  // --- EDIT EXISTING LISPS ---
  const handleEditClick = (lisp) => {
    setEditingLispId(lisp.id);
    setEditLispData({ ...lisp });
  };

  const handleCancelEdit = () => {
    setEditingLispId(null);
    setEditLispData({});
  };

  const handleSaveEdit = async () => {
    if (!editingLispId) return;
    try {
      const { id, originalName, storagePath, tenantId, lispId, uploadedAt, ...updatableFields } = editLispData;
      await updateDoc(doc(db, 'lispFiles', editingLispId), updatableFields);
      
      setTenantLisps(tenantLisps.map(l => l.id === editingLispId ? { ...l, ...updatableFields } : l));
      setEditingLispId(null);
    } catch(e) {
      console.error('Erro ao salvar', e);
      alert('Erro ao salvar as edições.');
    }
  };

  const handleDeleteLisp = async (lisp) => {
    if(!confirm(`Excluir '${lisp.originalName}' permanentemente?`)) return;
    try {
      const { storage } = await import('../firebase');
      await deleteObject(ref(storage, lisp.storagePath)).catch(e => console.warn(e));
      await deleteDoc(doc(db, 'lispFiles', lisp.id));
      setTenantLisps(tenantLisps.filter(l => l.id !== lisp.id));
    } catch(err) { alert('Erro ao excluir.'); }
  };

  // --- EQUIPMENTS ---
  const handleNoteChange = async (device, note) => {
    const newNotes = { ...deviceNotes, [device]: note };
    setDeviceNotes(newNotes);
    try {
      await updateDoc(doc(db, 'users', userData.id), { deviceNotes: newNotes });
    } catch(e) { console.error(e); }
  };

  const handleUnlink = async (device) => {
    if(!confirm(`Desvincular ${device}?`)) return;
    try {
      const updatedDevices = (userData.registeredDevices || []).filter(d => d !== device);
      const userRef = doc(db, 'users', userData.id);
      
      const updates = { registeredDevices: updatedDevices };
      if (userData.registeredDevice === device) {
        updates.registeredDevice = updatedDevices.length > 0 ? updatedDevices[0] : null;
      }
      
      await updateDoc(userRef, updates);
      setUserData({ ...userData, ...updates });
    } catch(e) { alert('Erro ao desvincular.'); }
  };

  // --- SUPPORT ---
  const handleSendSupport = async (e) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;
    try {
      await addDoc(collection(db, 'feedback'), {
        tenantId: userData.id,
        email: userData.email,
        type: supportType,
        message: supportMsg,
        createdAt: serverTimestamp(),
        status: 'open'
      });
      alert('Mensagem enviada com sucesso! Nossa equipe entrará em contato.');
      setShowSupportModal(false);
      setSupportMsg('');
    } catch(e) {
      console.error(e);
      alert('Erro ao enviar mensagem.');
    }
  };

  // --- PLAN UPGRADE (BETA) ---
  const handleUpdatePlan = async () => {
    if (!userData) return;
    try {
      const newSeats = parseInt(seats, 10);
      await updateDoc(doc(db, 'users', userData.id), { maxSeats: newSeats });
      setUserData({ ...userData, maxSeats: newSeats });
      alert('Plano atualizado com sucesso! Novos assentos liberados (Modo Beta Tester).');
    } catch(e) {
      console.error(e);
      alert('Erro ao atualizar plano.');
    }
  };

  // --- RENDER HELPERS ---
  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Carregando dados...</div>;

  if (mode === 'login' || !firebaseUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="font-headline-lg text-headline-lg text-white mb-2">
                {isRegistering ? 'Criar Conta' : 'Bem-vindo de volta'}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isRegistering ? 'Junte-se à plataforma LispCentral Beta.' : 'Entre para gerenciar suas rotinas LISP.'}
              </p>
            </div>
            
            <form className="space-y-4" onSubmit={isRegistering ? handleEmailSignup : handleEmailLogin}>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">E-mail Corporativo</label>
                <input 
                  type="email" 
                  value={emailStr} 
                  onChange={(e) => setEmailStr(e.target.value)} 
                  className="w-full bg-[#0D0D0D] border border-[#262626] text-white font-body-md px-4 py-3 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Senha</label>
                <input 
                  type="password" 
                  value={passwordStr} 
                  onChange={(e) => setPasswordStr(e.target.value)} 
                  className="w-full bg-[#0D0D0D] border border-[#262626] text-white font-body-md px-4 py-3 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {isRegistering && (
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Confirmar Senha</label>
                  <input 
                    type="password" 
                    value={passwordConfirmStr} 
                    onChange={(e) => setPasswordConfirmStr(e.target.value)} 
                    className="w-full bg-[#0D0D0D] border border-[#262626] text-white font-body-md px-4 py-3 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {authError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 font-code-sm text-code-sm">
                  {authError}
                </div>
              )}
              
              <button 
                type="submit" 
                className="w-full bg-primary-container text-white font-label-md text-label-md font-bold px-8 py-3.5 rounded-lg hover:bg-[#e66000] transition-colors shadow-[0_0_15px_rgba(255,107,0,0.2)] mt-6"
              >
                {isRegistering ? 'Criar Conta' : 'Entrar no Painel'}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center space-x-4">
              <div className="flex-1 h-px bg-[#262626]"></div>
              <span className="font-code-sm text-code-sm text-on-surface-variant">ou</span>
              <div className="flex-1 h-px bg-[#262626]"></div>
            </div>

            <button 
              type="button"
              onClick={loginWithGoogle} 
              className="w-full mt-6 bg-white text-black font-label-md text-label-md font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Continuar com Google
            </button>
          </div>
          
          <div className="bg-[#0D0D0D] border-t border-[#262626] p-6 text-center">
            <span className="font-body-md text-body-md text-on-surface-variant">
              {isRegistering ? 'Já tem uma conta? ' : 'Não tem uma conta? '}
            </span>
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); setIsRegistering(!isRegistering); setAuthError(''); }}
              className="font-label-md text-label-md font-bold text-primary-container hover:text-white transition-colors ml-2"
            >
              {isRegistering ? 'Fazer Login' : 'Criar Conta Gratuita'}
            </button>
          </div>
        </div>
        
        <a href="/" className="mt-8 font-label-md text-label-md text-on-surface-variant hover:text-white transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar para o site
        </a>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  
  const uniqueSuites = [...new Set([...tenantLisps.map(l => l.suite), ...draftLisps.map(d => d.suite)])].filter(Boolean);
  const uniqueGroups = [...new Set([...tenantLisps.map(l => l.group), ...draftLisps.map(d => d.group)])].filter(Boolean);
  const registeredDevices = userData?.registeredDevices || (userData?.registeredDevice ? [userData.registeredDevice] : []);

  // SORTED LISPS
  const sortedLisps = [...tenantLisps].sort((a, b) => {
    const suiteComp = (a.suite || '').localeCompare(b.suite || '');
    if (suiteComp !== 0) return suiteComp;
    const groupComp = (a.group || '').localeCompare(b.group || '');
    if (groupComp !== 0) return groupComp;
    return (a.friendlyName || '').localeCompare(b.friendlyName || '');
  });

  return (
    <div className="flex min-h-screen bg-background text-white font-body-md">
      {/* SIDEBAR */}
      <aside className="w-64 fixed inset-y-0 left-0 bg-[#0D0D0D] border-r border-[#262626] flex flex-col z-20">
        <div className="p-6 border-b border-[#262626]">
          <h2 className="text-xl font-bold text-primary-container flex items-center gap-2">
            <span className="material-symbols-outlined" data-weight="fill">code_blocks</span>
            LispCentral
          </h2>
          <span className="text-xs text-on-surface-variant mt-1 block">Painel do Cliente</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-bold text-[#555] uppercase tracking-wider mb-2 mt-4 px-2">Principal</div>
          <button onClick={() => setActiveTab('lisp')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'lisp' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <span className="material-symbols-outlined text-[20px]">folder_copy</span> Gestor de LISPs
          </button>
          <button onClick={() => setActiveTab('favorites')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'favorites' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <span className="material-symbols-outlined text-[20px]">star</span> Minha Coleção
          </button>

          <div className="text-xs font-bold text-[#555] uppercase tracking-wider mb-2 mt-6 px-2">Conta & Configurações</div>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <span className="material-symbols-outlined text-[20px]">person</span> Meu Perfil
          </button>
          <button onClick={() => setActiveTab('licenses')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'licenses' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <span className="material-symbols-outlined text-[20px]">vpn_key</span> Licenças & Acessos
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-[20px]">notifications</span> Notificações</div>
            {unreadCount > 0 && <span className="bg-primary-container text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
          </button>

          <div className="text-xs font-bold text-[#555] uppercase tracking-wider mb-2 mt-6 px-2">Ajuda</div>
          <button onClick={() => setShowSupportModal(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-[#141414] transition-colors">
            <span className="material-symbols-outlined text-[20px]">bug_report</span> Reportar Bug
          </button>
        </nav>
        
        <div className="p-4 border-t border-[#262626]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">{userData?.name?.charAt(0) || 'U'}</div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold truncate">{userData?.name}</div>
              <div className="text-xs text-on-surface-variant truncate">{userData?.role || 'Engenheiro'}</div>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 justify-center px-4 py-2 border border-[#262626] text-on-surface-variant hover:text-red-400 hover:border-red-400/50 rounded-lg transition-colors text-sm">
            <span className="material-symbols-outlined text-[18px]">logout</span> Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-64 p-8 relative min-h-screen">
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0" style={{ backgroundImage: 'linear-gradient(rgba(38, 38, 38, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(38, 38, 38, 0.2) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 max-w-[1000px] mx-auto">
          
          {/* BREADCRUMBS */}
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
            <a href="/" className="hover:text-primary-container transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">home</span> LispCentral</a>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-white">Painel do Cliente</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-primary-container font-bold capitalize">{activeTab === 'lisp' ? 'Gestor de LISPs' : activeTab === 'favorites' ? 'Minha Coleção' : activeTab === 'profile' ? 'Meu Perfil' : activeTab === 'licenses' ? 'Licenças & Acessos' : 'Notificações'}</span>
          </div>

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
      <div className="card" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 20px 0', flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome" style={{ padding: '8px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', flex: 1 }} />
            <input type="text" value={editRole} onChange={e => setEditRole(e.target.value)} placeholder="Cargo" style={{ padding: '8px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', flex: 1 }} />
            <button type="submit" className="btn" style={{ padding: '6px 12px' }}>Salvar</button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditingProfile(false)} style={{ padding: '6px 12px' }}>Cancelar</button>
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--tmd-orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                {userData?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem' }}>{userData?.name} <span style={{fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:'normal'}}>({userData?.role || 'Engenheiro'})</span></strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{userData?.email} • {userData?.uid}</span>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => { setEditName(userData?.name || ''); setEditRole(userData?.role || ''); setIsEditingProfile(true); }}>
              Editar Perfil
            </button>
          </>
        )}
      </div>

          )}

          {/* TAB: LICENSES */}
          {activeTab === 'licenses' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        
        {/* LICENSES & ACCESS */}
        <div className="card" style={{ margin: 0, borderTop: '3px solid var(--tmd-orange)' }}>
          <h3 style={{ marginTop: 0 }}>Assinatura & Licenças</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Configure seus assentos e plano de faturamento.</p>
          
          <div style={{ background: 'var(--bg-darker)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>Plano Atual:</strong> <span style={{ color: '#4caf50' }}>Beta Tester (Ilimitado)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>Preço Base:</strong> <span>US$ 0.00 / mês</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Assentos Necessários:</strong> 
              <input type="number" min="1" max="100" value={seats} onChange={e => setSeats(e.target.value)} style={{ width: '60px', padding: '4px', background: 'var(--bg-color)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center' }} />
            </div>
          </div>
          
          <button className="btn" style={{ width: '100%' }} onClick={handleUpdatePlan}>Atualizar Plano via Stripe</button>

          {parseInt(seats) > (userData?.maxSeats || 1) && (
            <div style={{ marginTop: '10px', color: '#ffeb3b', fontSize: '0.85rem', background: 'rgba(255, 235, 59, 0.1)', padding: '8px', border: '1px solid rgba(255, 235, 59, 0.3)', borderRadius: '4px', textAlign: 'center' }}>
              ⚠️ O plano precisa ser atualizado via Stripe para ativar mais assentos.
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Sua Chave de Acesso (Loader)</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" readOnly value={userData?.apiKey} style={{ flex: 1, padding: '8px', background: 'var(--bg-darker)', color: 'var(--tmd-orange)', fontFamily: 'monospace', border: '1px solid var(--border-color)' }} />
              <button className="btn" onClick={() => window.location.href = `https://generateloader-wgpjjgorxa-uc.a.run.app/?token=${userData?.apiKey}`}>Baixar</button>
            </div>
          </div>
        </div>

        {/* LINKED DEVICES */}
        <div className="card" style={{ margin: '0' }}>
          <h3 style={{ marginTop: 0 }}>Equipamentos Vinculados ({registeredDevices.length} / {userData?.maxSeats || 1})</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>PCs conectados atualmente.</p>
          
          {registeredDevices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {registeredDevices.map(dev => (
                <div key={dev} style={{ background: 'var(--bg-darker)', padding: '10px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#4caf50', fontSize: '0.9rem' }}>💻 {dev}</span>
                    <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => handleUnlink(dev)}>Desvincular</button>
                  </div>
                  <input 
                    type="text" 
                    value={deviceNotes[dev] || ''} 
                    onChange={e => handleNoteChange(dev, e.target.value)} 
                    placeholder="Observações (ex: PC do Engenheiro Marcos)"
                    style={{ width: '100%', padding: '6px', background: 'var(--bg-color)', border: '1px dashed var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              ))}
            </div>
          ) : (
             <div style={{ padding: '15px', textAlign: 'center', border: '1px dashed var(--panel-border)', borderRadius: '6px', color: 'var(--text-muted)' }}>
               Nenhum equipamento conectado. Carregue o Loader no AutoCAD.
             </div>
          )}
        </div>
      </div>

          )}

          {/* TAB: LISP */}
          {activeTab === 'lisp' && (
      <div className="card" style={{ marginBottom: '20px', overflowX: 'auto' }}>
        <h3 style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Workspace LISPs
          <div>
            <input type="file" multiple accept=".lsp" id="bulkUpload" style={{ display: 'none' }} onChange={handleFileSelect} />
            <button className="btn" onClick={() => document.getElementById('bulkUpload').click()} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              + Adicionar LISPs
            </button>
          </div>
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 0 }}>Gerencie as rotinas na nuvem. Você pode editar ícones, nomes e grupos.</p>

        {/* Datalists for Autocomplete */}
        <datalist id="suite-list">
          <option value="core" />
          <option value="structures_pro" />
          <option value="architecture" />
          {uniqueSuites.map(s => <option key={s} value={s} />)}
        </datalist>
        <datalist id="group-list">
          <option value="Custom Tools" />
          {uniqueGroups.map(g => <option key={g} value={g} />)}
        </datalist>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#262626] text-label-md font-label-md text-on-secondary-container">
              <th className="pb-3 pl-4 font-normal w-[90px]">Ícone SVG</th>
              <th className="pb-3 font-normal w-[250px]">Arquivo / Amigável</th>
              <th className="pb-3 font-normal w-[130px]">Suite</th>
              <th className="pb-3 font-normal w-[130px]">Grupo</th>
              <th className="pb-3 pr-4 text-right font-normal w-[150px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            
            {/* DRAFTS SECTION */}
            {draftLisps.map((draft, i) => (
              <tr key={'draft-'+i} className="border-b border-[#262626] bg-primary-container/5 hover:bg-[#1a1c1c] transition-colors group">
                <td className="py-4 pl-4">
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center text-primary-container" dangerouslySetInnerHTML={{ __html: draft.svgIcon || '' }} />
                    <input type="file" accept=".svg" id={`svg-upload-draft-${i}`} className="hidden" onChange={(e) => handleSvgUpload(e, i, true)} />
                    <button className="text-on-secondary-container hover:text-primary transition-colors" onClick={() => document.getElementById(`svg-upload-draft-${i}`).click()} title="Upload SVG"><span className="material-symbols-outlined text-[18px]">folder_open</span></button>
                  </div>
                  <input type="text" value={draft.svgIcon} onChange={e => updateDraft(i, 'svgIcon', e.target.value)} className="w-full mt-2 bg-[#0A0A0A] border border-[#262626] rounded text-[#888] text-[10px] p-1 font-mono" placeholder="<svg..." />
                </td>
                <td className="py-4 text-white">
                  <div className="flex flex-col gap-1 pr-2">
                    <span className="font-bold font-code-sm text-code-sm">{draft.originalName}</span>
                    <input type="text" value={draft.friendlyName} onChange={e => updateDraft(i, 'friendlyName', e.target.value)} className="w-full bg-[#141414] border border-primary-container/30 rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" placeholder="Nome amigável" />
                  </div>
                </td>
                <td className="py-4 pr-2">
                  <input list="suite-list" value={draft.suite} onChange={e => updateDraft(i, 'suite', e.target.value)} className="w-full bg-[#141414] border border-[#262626] rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" />
                </td>
                <td className="py-4 pr-2">
                  <input list="group-list" value={draft.group} onChange={e => updateDraft(i, 'group', e.target.value)} className="w-full bg-[#141414] border border-[#262626] rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" />
                </td>
                <td className="py-4 pr-4 text-right">
                  <span className="text-[11px] text-primary-container block mb-1">Aguardando Upload</span>
                  <button className="text-on-secondary-container hover:text-error transition-colors" onClick={() => removeDraft(i)}><span className="material-symbols-outlined text-[18px]">delete</span></button>
                </td>
              </tr>
            ))}
            
            {/* EXISTING LISPS SECTION (Sorted) */}
            {sortedLisps.map(lisp => {
              const isEditing = editingLispId === lisp.id;
              
              if (isEditing) {
                // EDIT MODE
                return (
                  <tr key={lisp.id} className="border-b border-[#262626] bg-white/5 hover:bg-[#1a1c1c] transition-colors group">
                    <td className="py-4 pl-4">
                      <div className="flex gap-2 items-center">
                        <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center text-primary-container" dangerouslySetInnerHTML={{ __html: editLispData.svgIcon || '' }} />
                        <input type="file" accept=".svg" id={`svg-upload-edit-${lisp.id}`} className="hidden" onChange={(e) => handleSvgUpload(e, null, false)} />
                        <button className="text-on-secondary-container hover:text-primary transition-colors" onClick={() => document.getElementById(`svg-upload-edit-${lisp.id}`).click()} title="Upload SVG"><span className="material-symbols-outlined text-[18px]">folder_open</span></button>
                      </div>
                      <input type="text" value={editLispData.svgIcon} onChange={e => setEditLispData({...editLispData, svgIcon: e.target.value})} className="w-full mt-2 bg-[#0A0A0A] border border-primary-container/50 rounded text-[#888] text-[10px] p-1 font-mono" placeholder="<svg..." />
                    </td>
                    <td className="py-4 text-white">
                      <div className="flex flex-col gap-1 pr-2">
                        <span className="font-bold font-code-sm text-code-sm">{lisp.originalName}</span>
                        <input type="text" value={editLispData.friendlyName} onChange={e => setEditLispData({...editLispData, friendlyName: e.target.value})} className="w-full bg-[#141414] border border-primary-container/50 rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" placeholder="Nome amigável" />
                      </div>
                    </td>
                    <td className="py-4 pr-2">
                      <input list="suite-list" value={editLispData.suite} onChange={e => setEditLispData({...editLispData, suite: e.target.value})} className="w-full bg-[#141414] border border-primary-container/50 rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" />
                    </td>
                    <td className="py-4 pr-2">
                      <input list="group-list" value={editLispData.group} onChange={e => setEditLispData({...editLispData, group: e.target.value})} className="w-full bg-[#141414] border border-primary-container/50 rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" />
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <button className="bg-primary-container text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-[#e66000] transition-colors mb-1 shadow-sm w-full" onClick={handleSaveEdit}>Salvar</button>
                      <button className="bg-transparent border border-[#262626] text-on-secondary-container hover:text-white px-3 py-1.5 rounded text-xs transition-colors w-full" onClick={handleCancelEdit}>Cancelar</button>
                    </td>
                  </tr>
                );
              }

              // VIEW MODE
              return (
                <tr key={lisp.id} className="border-b border-[#262626] hover:bg-[#1a1c1c] transition-colors group">
                  <td className="py-4 pl-4">
                    <div className="w-8 h-8 bg-surface-container-highest border border-surface-variant rounded flex items-center justify-center text-primary-container" dangerouslySetInnerHTML={{ __html: lisp.svgIcon || '' }} />
                  </td>
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white font-code-sm text-code-sm">{lisp.originalName}</span>
                      <span className="text-on-surface-variant text-sm">{lisp.friendlyName}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="px-2.5 py-1 bg-[#1a1c1c] border border-[#343535] rounded text-xs font-mono text-secondary">{lisp.suite || '-'}</span>
                  </td>
                  <td className="py-4">
                    <span className="px-2.5 py-1 bg-[#1a1c1c] border border-[#343535] rounded text-xs font-mono text-secondary">{lisp.group || '-'}</span>
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#262626] text-on-secondary-container hover:text-white hover:border-primary-container transition-colors" onClick={() => handleEditClick(lisp)} title="Editar"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                      <button className="w-8 h-8 flex items-center justify-center rounded border border-[#262626] text-on-secondary-container hover:text-error hover:border-error/50 transition-colors" onClick={() => handleDeleteLisp(lisp)} title="Excluir"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {draftLisps.length > 0 && (
          <div style={{ marginTop: '15px', textAlign: 'right', padding: '10px', background: 'rgba(242, 109, 33, 0.05)', borderRadius: '6px' }}>
            <span style={{ marginRight: '15px', color: 'var(--tmd-orange)' }}>{draftLisps.length} rotinas prontas para upload.</span>
            <button className="btn" onClick={submitAllDrafts} disabled={isUploading}>
              {isUploading ? 'Enviando ao Servidor...' : `Confirmar Upload`}
            </button>
          </div>
        )}
      </div>

          )}

          {/* TAB: FAVORITES */}
          {activeTab === 'favorites' && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <FavoritesManager />
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="card" style={{ marginBottom: '20px' }}>
               <h3 style={{ marginTop: 0 }}>Notificações do Sistema</h3>
               {notifications.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhuma notificação.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '8px', padding: '12px', background: n.read ? 'var(--bg-color)' : 'var(--bg-darker)', borderRadius: '6px', borderLeft: n.read ? 'none' : '4px solid var(--tmd-orange)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ color: n.read ? 'var(--text-muted)' : '#4caf50', fontSize: '1rem' }}>{n.title}</strong>
                        {!n.read && <button onClick={() => markAsRead(n.id)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>✔ Marcar como Lido</button>}
                      </div>
                      <div style={{ marginTop: '8px', color: n.read ? 'var(--text-muted)' : '#ccc' }}>{n.text}</div>
                    </div>
                  ))
                )}
            </div>
          )}

          {/* FAQ (Shows inside Licenses) */}
          {activeTab === 'licenses' && (
      <div id="faq-section" className="card" style={{ marginBottom: '40px' }}>
        <h3 style={{ marginTop: 0 }}>Centro de Ajuda / FAQ</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Encontre respostas rápidas para os problemas mais comuns.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          
          <div style={{ border: '1px solid var(--panel-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <button style={{ width: '100%', textAlign: 'left', padding: '15px', background: 'var(--panel-bg)', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}>
              <span>Como carrego meus LISPs no AutoCAD?</span>
              <span>{openFaq === 1 ? '▲' : '▼'}</span>
            </button>
            {openFaq === 1 && (
              <div style={{ padding: '15px', background: 'var(--bg-darker)', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid var(--panel-border)' }}>
                Basta clicar no botão "Baixar" na seção "Sua Chave de Acesso", o que fará o download do seu Loader pessoal. Arraste este arquivo `.lsp` para a janela do AutoCAD ou use o comando `APPLOAD`. A paleta abrirá automaticamente.
              </div>
            )}
          </div>

          <div style={{ border: '1px solid var(--panel-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <button style={{ width: '100%', textAlign: 'left', padding: '15px', background: 'var(--panel-bg)', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}>
              <span>O que faço se atingir o limite de Equipamentos?</span>
              <span>{openFaq === 2 ? '▲' : '▼'}</span>
            </button>
            {openFaq === 2 && (
              <div style={{ padding: '15px', background: 'var(--bg-darker)', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid var(--panel-border)' }}>
                Se você já atingiu o limite de licenças, precisará "Desvincular" uma máquina existente na seção "Equipamentos Vinculados", ou então atualizar o seu plano via Stripe para adicionar mais assentos (Seats) à sua assinatura.
              </div>
            )}
          </div>

          <div style={{ border: '1px solid var(--panel-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <button style={{ width: '100%', textAlign: 'left', padding: '15px', background: 'var(--panel-bg)', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}>
              <span>A Paleta não está atualizando meus LISPs novos. Por quê?</span>
              <span>{openFaq === 3 ? '▲' : '▼'}</span>
            </button>
            {openFaq === 3 && (
              <div style={{ padding: '15px', background: 'var(--bg-darker)', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid var(--panel-border)' }}>
                Para otimizar o desempenho, a paleta guarda as informações na memória. Para forçar a paleta a buscar os LISPs mais recentes enviados pelo Dashboard, tente fechar e reabrir o AutoCAD, ou clique no botão de recarregar na própria interface da Paleta no AutoCAD.
              </div>
            )}
          </div>

        </div>
      </div>

          )}

      {/* SUPPORT MODAL */}
      {showSupportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Reportar Bug / Enviar Feedback</h3>
            <form onSubmit={handleSendSupport} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <select value={supportType} onChange={e => setSupportType(e.target.value)} style={{ padding: '10px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <option value="bug">🐛 Reportar um Bug</option>
                <option value="feature">✨ Sugerir Melhoria</option>
                <option value="help">❓ Preciso de Ajuda Técnica</option>
              </select>
              <textarea 
                value={supportMsg} 
                onChange={e => setSupportMsg(e.target.value)} 
                placeholder="Descreva seu problema ou sugestão com o máximo de detalhes..." 
                style={{ padding: '10px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '120px', resize: 'vertical' }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSupportModal(false)}>Cancelar</button>
                <button type="submit" className="btn">Enviar Mensagem</button>
              </div>
            </form>
          </div>
        </div>
      )}

        </div>
      </main>
    </div>
  );
}
