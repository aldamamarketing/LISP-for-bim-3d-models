import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, query, where, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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
  
  // Workspace LISPs
  const [tenantLisps, setTenantLisps] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    friendlyName: '',
    description: '',
    group: 'Custom Tools',
    suite: 'core',
    svgIcon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 13l-3-3 3-3M11 13l3-3-3-3M8 4l-2 8"/></svg>'
  });

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
        const loadedData = { id: docSnap.id, ...docSnap.data() };
        setUserData(loadedData);
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
          registeredDevice: null,
          activeSuites: ['core', 'structures_pro'],
          role: 'beta-tester',
          companyName: '',
          createdAt: new Date().toISOString(),
          trialExpiresAt: expires.toISOString()
        };

        await setDoc(doc(db, 'users', uid), newUser);
        setUserData({ id: uid, ...newUser });
        await loadTenantLisps(uid);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
    setLoading(false);
  };

  const loadTenantLisps = async (tenantId) => {
    try {
      const lispsRef = collection(db, 'lispFiles');
      const q = query(lispsRef, where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      const lisps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTenantLisps(lisps);
    } catch (err) {
      console.error('Erro ao carregar LISPs:', err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.lsp')) {
      alert("Apenas arquivos .lsp são permitidos.");
      return;
    }
    setUploadFile(file);
    setUploadData({ ...uploadData, friendlyName: file.name.replace('.lsp', '') });
    setShowUploadForm(true);
  };

  const submitUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    
    try {
      const { storage } = await import('../firebase');
      const lispId = uploadFile.name.replace('.lsp', '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const storagePath = `tenants/${userData.id}/lisps/${uploadFile.name}`;
      const fileRef = ref(storage, storagePath);
      
      await uploadBytes(fileRef, uploadFile);
      
      const fileMeta = {
        lispId: lispId,
        tenantId: userData.id,
        originalName: uploadFile.name,
        storagePath: storagePath,
        friendlyName: uploadData.friendlyName,
        description: uploadData.description,
        group: uploadData.group,
        suite: uploadData.suite,
        svgIcon: uploadData.svgIcon,
        uploadedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'lispFiles'), fileMeta);
      setTenantLisps([...tenantLisps, { id: docRef.id, ...fileMeta }]);
      alert('LISP enviado e configurado com sucesso!');
      
      setShowUploadForm(false);
      setUploadFile(null);
    } catch(err) {
      console.error('Erro no upload:', err);
      alert('Erro ao enviar o LISP.');
    }
    setIsUploading(false);
  };

  const handleDeleteLisp = async (lisp) => {
    if(!confirm(`Excluir o LISP '${lisp.originalName}'?`)) return;
    try {
      const { storage } = await import('../firebase');
      const fileRef = ref(storage, lisp.storagePath);
      await deleteObject(fileRef).catch(e => console.warn('File not found in storage', e));
      await deleteDoc(doc(db, 'lispFiles', lisp.id));
      setTenantLisps(tenantLisps.filter(l => l.id !== lisp.id));
    } catch(err) {
      console.error('Erro ao deletar LISP:', err);
      alert('Erro ao excluir o arquivo.');
    }
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
    // Debes reemplazar esta URL con la que te devuelva Google Cloud al desplegar 'generateLoader'
    const loaderUrl = `https://generateloader-wgpjjgorxa-uc.a.run.app/?token=${userData.apiKey}`;
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

      {/* Workspace (Mis LISPs) */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Meu Workspace (LISPs)</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Faça upload de suas rotinas .LSP para usá-las na nuvem.</p>
        
        <div style={{ margin: '15px 0' }}>
          {!showUploadForm ? (
            <>
              <input 
                type="file" 
                accept=".lsp" 
                id="lispUploadInput" 
                style={{ display: 'none' }} 
                onChange={handleFileSelect} 
              />
              <button 
                className="btn" 
                onClick={() => document.getElementById('lispUploadInput').click()}
              >
                + Adicionar Nova Rotina (.LSP)
              </button>
            </>
          ) : (
            <div style={{ padding: '15px', background: 'var(--bg-darker)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <h4 style={{ marginTop: 0 }}>Configurar Rotina: {uploadFile?.name}</h4>
              
              <div className="form-group">
                <label>Nome Amigável (Aparece no botão)</label>
                <input type="text" value={uploadData.friendlyName} onChange={e => setUploadData({...uploadData, friendlyName: e.target.value})} placeholder="Ex: Vigas 3D" />
              </div>
              
              <div className="form-group">
                <label>Descrição</label>
                <input type="text" value={uploadData.description} onChange={e => setUploadData({...uploadData, description: e.target.value})} placeholder="Ex: Cria vigas estruturais..." />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Grupo na Paleta</label>
                  <input type="text" value={uploadData.group} onChange={e => setUploadData({...uploadData, group: e.target.value})} placeholder="Ex: Estruturas" />
                </div>
                
                <div className="form-group">
                  <label>Suite (Permissão)</label>
                  <select value={uploadData.suite} onChange={e => setUploadData({...uploadData, suite: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-darker)', color: 'var(--text-color)' }}>
                    <option value="core">Core (Todos acessam)</option>
                    <option value="structures_pro">Estruturas Pro</option>
                    <option value="architecture">Arquitetura</option>
                    <option value="quantities">Quantidades</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Ícone (Código SVG)</label>
                <textarea 
                  value={uploadData.svgIcon} 
                  onChange={e => setUploadData({...uploadData, svgIcon: e.target.value})}
                  rows="3"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-darker)', color: 'var(--text-color)', fontFamily: 'monospace' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className="btn" onClick={submitUpload} disabled={isUploading}>
                  {isUploading ? 'Enviando...' : 'Salvar e Fazer Upload'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowUploadForm(false)} disabled={isUploading}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {tenantLisps.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 4px' }}>Arquivo</th>
                <th style={{ padding: '8px 4px' }}>Lisp ID</th>
                <th style={{ padding: '8px 4px' }}>Data</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenantLisps.map(lisp => (
                <tr key={lisp.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '8px 4px', color: '#fff' }}>{lisp.originalName}</td>
                  <td style={{ padding: '8px 4px', fontFamily: 'monospace', color: 'var(--tmd-orange)' }}>{lisp.lispId}</td>
                  <td style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>{new Date(lisp.uploadedAt).toLocaleDateString()}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleDeleteLisp(lisp)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-darker)', borderRadius: '8px', border: '1px dashed var(--panel-border)', marginTop: '15px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum LISP no seu workspace. Faça upload para começar.</span>
          </div>
        )}
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
