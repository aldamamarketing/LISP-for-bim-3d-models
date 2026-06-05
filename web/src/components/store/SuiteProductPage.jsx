import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function SuiteProductPage() {
  const [suite, setSuite] = useState(null);
  const [groups, setGroups] = useState([]);
  const [commands, setCommands] = useState([]);
  const [groupCommands, setGroupCommands] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setCurrentUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const suiteId = params.get('id');
        const token = params.get('token');
        
        let suiteData = null;
        let sId = suiteId;

        if (suiteId) {
          const sDoc = await getDoc(doc(db, 'suites', suiteId));
          if (sDoc.exists()) suiteData = { id: sDoc.id, ...sDoc.data() };
        } else if (token) {
          const q = query(collection(db, 'suites'), where('shareToken', '==', token));
          const snap = await getDocs(q);
          if (!snap.empty) {
            suiteData = { id: snap.docs[0].id, ...snap.docs[0].data() };
            sId = suiteData.id;
          }
        }

        if (!suiteData) {
          setError('Suite não encontrada ou acesso negado.');
          setLoading(false);
          return;
        }

        setSuite(suiteData);

        // Check if already subscribed
        if (currentUser) {
          const subId = `SUB-${currentUser.uid}-${sId}`;
          const subDoc = await getDoc(doc(db, 'subscriptions', subId));
          if (subDoc.exists()) setHasSubscribed(true);
        }

        // Fetch Groups
        const gQ = query(collection(db, 'groups'), where('suiteId', '==', sId));
        const gSnap = await getDocs(gQ);
        const fetchedGroups = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedGroups.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setGroups(fetchedGroups);

        if (fetchedGroups.length > 0) {
          const groupIds = fetchedGroups.map(g => g.id);
          // Firestore 'in' query supports up to 10 items.
          // For MVP, we'll chunk them if needed.
          const chunks = [];
          for (let i = 0; i < groupIds.length; i += 10) {
            chunks.push(groupIds.slice(i, i + 10));
          }
          
          let allAssignments = [];
          for (const chunk of chunks) {
            const gcQ = query(collection(db, 'groupCommands'), where('groupId', 'in', chunk));
            const gcSnap = await getDocs(gcQ);
            allAssignments = [...allAssignments, ...gcSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
          }
          setGroupCommands(allAssignments);

          if (allAssignments.length > 0) {
            const cmdIds = [...new Set(allAssignments.map(a => a.commandId))];
            const cmdChunks = [];
            for (let i = 0; i < cmdIds.length; i += 10) {
              cmdChunks.push(cmdIds.slice(i, i + 10));
            }
            
            let allCommands = [];
            for (const chunk of cmdChunks) {
              const cQ = query(collection(db, 'commands'), where('__name__', 'in', chunk));
              const cSnap = await getDocs(cQ);
              allCommands = [...allCommands, ...cSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
            }
            setCommands(allCommands);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Ocorreu um erro ao carregar a suite.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]); // re-run if currentUser changes so we can check subscription status

  const handleSubscribe = async () => {
    if (!currentUser) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    
    setIsSubscribing(true);
    try {
      const subId = `SUB-${currentUser.uid}-${suite.id}`;
      await setDoc(doc(db, 'subscriptions', subId), {
        tenantId: currentUser.uid,
        suiteId: suite.id,
        subscribedAt: new Date(),
        pricePaid: 0
      });
      setHasSubscribed(true);
      alert('Suite adicionada à sua conta com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao assinar a suite.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado para a área de transferência!');
  };

  if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-container mx-auto"></div></div>;
  if (error) return <div className="p-8 text-center text-error border border-error/30 bg-error/10 rounded-lg">{error}</div>;
  if (!suite) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: The Product (Mosaic & Details) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Breadcrumb */}
        <div className="text-xs text-on-surface-variant flex items-center gap-2">
          <a href="/store" className="hover:text-primary-container transition-colors">Store</a>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>{suite.storeCategory || 'General'}</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface truncate">{suite.name}</span>
        </div>

        {/* Mosaic Auto-Generated from SVGs */}
        <div className="bg-surface border border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent pointer-events-none"></div>
          
          {commands.length === 0 ? (
            <div className="text-on-surface-variant opacity-50 flex flex-col items-center">
              <span className="material-symbols-outlined text-[48px]">extension_off</span>
              <span className="mt-2 text-sm">Nenhum comando encontrado nesta suite</span>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4 relative z-10 max-w-[80%]">
              {commands.map((cmd, i) => (
                <div key={cmd.id} className={`w-14 h-14 rounded-xl bg-surface-container-highest shadow-lg border border-outline-variant flex items-center justify-center p-2 transform hover:scale-110 transition-transform ${i % 2 === 0 ? 'translate-y-2' : '-translate-y-2'}`} title={cmd.friendlyName || cmd.commandName}>
                  {cmd.svgIcon ? (
                    cmd.svgIcon.startsWith('data:image')
                      ? <img src={cmd.svgIcon} className="w-full h-full object-contain" />
                      : <div dangerouslySetInnerHTML={{ __html: cmd.svgIcon }} className="w-full h-full [&>svg]:w-full [&>svg]:h-full" />
                  ) : (
                    <span className="material-symbols-outlined text-[24px] opacity-30 text-on-surface">terminal</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contents List */}
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-bold text-on-surface text-lg">Conteúdo da Suite</h3>
          </div>
          <div className="p-0">
            {groups.length === 0 ? (
              <div className="p-4 text-sm text-on-surface-variant text-center">Nenhum grupo definido.</div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {groups.map(group => {
                  const gCmds = groupCommands.filter(a => a.groupId === group.id);
                  return (
                    <div key={group.id} className="p-4">
                      <h4 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary-container">folder_open</span>
                        {group.name}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                        {gCmds.length === 0 && <span className="text-xs text-on-surface-variant italic">Grupo vazio</span>}
                        {gCmds.map(assignment => {
                          const cmd = commands.find(c => c.id === assignment.commandId);
                          if (!cmd) return null;
                          return (
                            <div key={assignment.id} className="flex items-start gap-3 bg-surface-container-lowest p-2 rounded border border-outline-variant/50">
                              <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center border border-outline-variant shrink-0">
                                {cmd.svgIcon ? (
                                  cmd.svgIcon.startsWith('data:image')
                                    ? <img src={cmd.svgIcon} className="w-5 h-5 object-contain" />
                                    : <div dangerouslySetInnerHTML={{ __html: cmd.svgIcon }} className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full" />
                                ) : (
                                  <span className="material-symbols-outlined text-[16px] opacity-30">terminal</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-on-surface truncate">{cmd.friendlyName || cmd.commandName}</div>
                                <div className="text-xs text-on-surface-variant truncate font-code-sm">{cmd.commandName}</div>
                                {cmd.description && <div className="text-[11px] text-on-surface-variant mt-1 line-clamp-2">{cmd.description}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Checkout & Actions */}
      <div className="lg:col-span-1">
        <div className="bg-surface border border-outline-variant rounded-xl p-6 sticky top-24 shadow-xl">
          <div className="text-xs text-primary-container font-bold uppercase tracking-wider mb-2">Novo | +500 instalações</div>
          
          <h1 className="text-2xl font-bold text-on-surface leading-tight mb-2">{suite.name}</h1>
          
          <div className="flex items-center gap-2 mb-6 text-sm">
            <div className="flex text-primary-container">
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star_half</span>
            </div>
            <span className="text-on-surface-variant">4.9 (186)</span>
          </div>

          <div className="mb-6">
            {suite.price > 0 ? (
              <>
                <div className="text-sm text-on-surface-variant line-through mb-1">R$ {(suite.price * 1.2).toFixed(2).replace('.',',')}</div>
                <div className="text-4xl font-bold text-on-surface flex items-start gap-1">
                  <span className="text-xl mt-1">R$</span>
                  {suite.price.toFixed(2).replace('.',',')}
                </div>
              </>
            ) : (
              <div className="text-4xl font-bold text-primary-container">Grátis</div>
            )}
            <div className="text-xs text-success font-bold mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">bolt</span> Instalação Imediata
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button 
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${hasSubscribed ? 'bg-success/20 text-success border border-success/30 cursor-default' : 'bg-primary-container text-white hover:bg-[#e66000]'}`}
              onClick={hasSubscribed ? null : handleSubscribe}
              disabled={isSubscribing || hasSubscribed}
            >
              {isSubscribing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : hasSubscribed ? (
                <><span className="material-symbols-outlined text-[18px]">check_circle</span> Já Adicionado à sua Conta</>
              ) : (
                'Adicionar à Minha Conta'
              )}
            </button>
          </div>

          <p className="text-sm text-on-surface-variant mb-6 pb-6 border-b border-outline-variant">
            {suite.description}
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Autor/Desenvolvedor</span>
              <span className="font-bold text-on-surface">{suite.authorName || 'Anônimo'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Compatibilidade</span>
              <span className="font-bold text-on-surface text-right">{suite.compatibility || 'AutoCAD, Civil 3D'}</span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-outline-variant flex gap-4">
            <button className="flex-1 flex items-center justify-center gap-2 text-sm text-primary-container hover:bg-primary-container/10 py-2 rounded transition-colors" onClick={handleShare}>
              <span className="material-symbols-outlined text-[18px]">share</span> Compartilhar
            </button>
            <a href={`/store?author=${encodeURIComponent(suite.authorName || '')}`} className="flex-1 flex items-center justify-center gap-2 text-sm text-on-surface hover:bg-surface-container-high py-2 rounded transition-colors">
              <span className="material-symbols-outlined text-[18px]">storefront</span> Ver Loja
            </a>
          </div>

        </div>
      </div>

    </div>
  );
}
