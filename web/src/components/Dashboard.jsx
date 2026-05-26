import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, query, where, updateDoc } from 'firebase/firestore';

export default function Dashboard({ mode = 'dashboard' }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [emailStr, setEmailStr] = useState('');
  const [passwordStr, setPasswordStr] = useState('');
  const [passwordConfirmStr, setPasswordConfirmStr] = useState('');
  const [authError, setAuthError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await loadOrInitializeUser(user);
      } else {
        setUserData(null);
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

  useEffect(() => {
    // Topbar header dynamic handling
    const btnLogin = document.getElementById('btn-login-portal');
    if (btnLogin) {
      if (firebaseUser) {
        btnLogin.style.display = 'none'; // hide in dashboard since they are already there
      } else {
        btnLogin.style.display = 'inline-block';
        btnLogin.innerText = 'Login';
      }
    }
    
    // Hide sidebar on login page
    if (mode === 'login') {
      document.body.classList.add('hide-sidebar');
    } else {
      document.body.classList.remove('hide-sidebar');
    }
    return () => document.body.classList.remove('hide-sidebar');
  }, [firebaseUser, mode]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, emailStr, passwordStr);
    } catch (err) {
      setAuthError('Erro ao iniciar sessão: ' + err.message);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (passwordStr !== passwordConfirmStr) {
      setAuthError('As senhas não coincidem.');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, emailStr, passwordStr);
    } catch (err) {
      setAuthError('Erro ao criar conta: ' + err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!userData) return;
    try {
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, { name: editName, role: editRole });
      setUserData({ ...userData, name: editName, role: editRole });
      setIsEditingProfile(false);
      alert('Perfil atualizado com sucesso.');
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
        setUserData({ id: docSnap.id, ...docSnap.data() });
      } else {
        const { uid, apiKey } = generateSemanticIds(user.email, user.displayName);
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);

        const newUser = {
          uid: uid,
          email: user.email,
          name: user.displayName || 'Engenheiro(a)',
          apiKey: apiKey,
          registeredDevice: null,
          activeSuites: ['core', 'structures_pro'],
          role: 'beta-tester',
          companyName: '',
          createdAt: new Date().toISOString(),
          trialExpiresAt: expires.toISOString()
        };

        await setDoc(doc(db, 'users', uid), newUser);
        setUserData({ id: uid, ...newUser });
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
    setLoading(false);
  };

  const handleUnlink = async () => {
    if(confirm('Tem certeza que deseja desvincular o equipamento atual?')) {
      try {
        const userRef = doc(db, 'users', userData.id);
        await updateDoc(userRef, { registeredDevice: null });
        setUserData({ ...userData, registeredDevice: null });
        alert('Equipamento desvinculado com sucesso.');
      } catch(e) {
        alert('Erro ao desvincular.');
      }
    }
  };

  const handleDownload = () => {
    if (!userData?.apiKey) return;
    const loaderUrl = `https://us-central1-lispcentral.cloudfunctions.net/generateLoader?apiKey=${userData.apiKey}`;
    window.location.href = loaderUrl;
  };

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Carregando dados seguros...</div>;

  if (mode === 'login' || !firebaseUser) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', position: 'relative' }}>
        <button onClick={() => window.history.back()} style={{ position: 'absolute', top: '15px', left: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
          ← Voltar
        </button>
        <h2 style={{ marginTop: '30px' }}>Acesso Restrito</h2>
        <p>Por favor, inicie sessão para entrar no seu painel.</p>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <input type="email" placeholder="E-mail" value={emailStr} onChange={(e) => setEmailStr(e.target.value)} style={{ padding: '10px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
          <input type="password" placeholder="Senha" value={passwordStr} onChange={(e) => setPasswordStr(e.target.value)} style={{ padding: '10px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
          {isRegistering && (
            <input type="password" placeholder="Confirmar Senha" value={passwordConfirmStr} onChange={(e) => setPasswordConfirmStr(e.target.value)} style={{ padding: '10px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
          )}
          {authError && <div style={{ color: '#ff7043', fontSize: '0.85rem' }}>{authError}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
            {isRegistering ? (
              <>
                <button className="btn" onClick={handleEmailSignup} style={{ width: '100%' }}>Criar Conta</button>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Já tem conta? <button type="button" onClick={(e) => { e.preventDefault(); setIsRegistering(false); setAuthError(''); }} style={{ background: 'none', border: 'none', color: 'var(--tmd-orange)', cursor: 'pointer', padding: 0 }}>Fazer Login</button>
                </div>
              </>
            ) : (
              <>
                <button className="btn" onClick={handleEmailLogin} style={{ width: '100%' }}>Entrar</button>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Não tem uma conta? <button type="button" onClick={(e) => { e.preventDefault(); setIsRegistering(true); setAuthError(''); }} style={{ background: 'none', border: 'none', color: 'var(--tmd-orange)', cursor: 'pointer', padding: 0 }}>Criar Conta</button>
                </div>
              </>
            )}
          </div>
        </form>

        <div style={{ margin: '20px 0', borderBottom: '1px solid var(--border-color)' }}></div>
        <button className="btn" onClick={loginWithGoogle} style={{ width: '100%', background: '#fff', color: '#333' }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ width: '18px', verticalAlign: 'middle', marginRight: '8px' }} alt="Google" />
          Continuar com Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <h1 style={{ color: 'var(--tmd-orange)', margin: 0 }}>Painel do Cliente</h1>
        <button className="btn btn-secondary" onClick={logout}>Sair</button>
      </div>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '30px' }}>Gerencie sua assinatura, dispositivos e chaves LispCentral.</p>

      {/* Grid Layout to save vertical space */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        
        {/* Profile Card */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>Meu Perfil</h3>
          {isEditingProfile ? (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome" style={{ padding: '8px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
              <input type="text" value={editRole} onChange={e => setEditRole(e.target.value)} placeholder="Cargo / Função" style={{ padding: '8px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn">Salvar</button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingProfile(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong style={{ color: 'var(--text-muted)' }}>Nome:</strong> {userData?.name}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Cargo:</strong> {userData?.role || 'Engenheiro(a)'}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>E-mail:</strong> {userData?.email}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>UID:</strong> <span style={{ fontFamily: 'monospace' }}>{userData?.uid}</span></div>
              <button className="btn btn-secondary" style={{ marginTop: '10px', alignSelf: 'flex-start' }} onClick={() => { setEditName(userData?.name || ''); setEditRole(userData?.role || 'Engenheiro(a)'); setIsEditingProfile(true); }}>Editar Perfil</button>
            </div>
          )}
        </div>

        {/* Suites Card with Badges */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>Suites Ativas</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>O plano atual desbloqueia as seguintes ferramentas:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {(userData?.activeSuites || []).map(suite => (
              <span key={suite} style={{ background: 'var(--bg-darker)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <span style={{ color: '#4caf50', marginRight: '6px' }}>●</span>
                {suite}
              </span>
            ))}
          </div>
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.9rem', margin: 0 }}><strong style={{ color: 'var(--text-muted)' }}>Plano:</strong> {userData?.role === 'beta-tester' ? 'Beta Tester Gratuito' : userData?.role}</p>
          </div>
        </div>

      </div>

      {/* Full width Card for the Key */}
      <div className="card" style={{ borderLeft: '4px solid var(--tmd-orange)' }}>
        <h3 style={{ marginTop: 0 }}>Chave de Acesso & Loader</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Esta é a chave que valida seu acesso no AutoCAD.</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginTop: '15px' }}>
          <div className="code-snippet" style={{ margin: 0, flex: '1 1 auto', minWidth: '250px' }}>{userData?.apiKey}</div>
          <button className="btn" onClick={handleDownload}>Baixar Loader .LSP</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <h4 style={{ margin: '0 0 5px 0' }}>Equipamento Vinculado</h4>
            {userData?.registeredDevice ? (
              <span style={{ color: '#4caf50', fontWeight: 'bold' }}>💻 {userData.registeredDevice}</span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum equipamento vinculado (será vinculado no primeiro uso).</span>
            )}
          </div>
          {userData?.registeredDevice && (
            <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={handleUnlink}>Desvincular</button>
          )}
        </div>
      </div>
    </div>
  );
}
