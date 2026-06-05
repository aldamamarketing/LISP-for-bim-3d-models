import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const SuiteRow = ({ suite, currentUser, initiallyExpanded }) => {
  const [expanded, setExpanded] = useState(initiallyExpanded || false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [commands, setCommands] = useState(null);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const checkSub = async () => {
        const subId = `SUB-${currentUser.uid}-${suite.id}`;
        const subDoc = await getDoc(doc(db, 'subscriptions', subId));
        if (subDoc.exists()) setHasSubscribed(true);
      };
      checkSub();
    }
  }, [currentUser, suite.id]);

  useEffect(() => {
    if (expanded && commands === null && !loadingDetails) {
      handleToggle(true); // Fetch immediately if initially expanded
    }
  }, [expanded]);

  const handleToggle = async (forceFetch = false) => {
    const willExpand = forceFetch ? true : !expanded;
    if (!forceFetch) setExpanded(willExpand);
    
    if (willExpand && commands === null) {
      setLoadingDetails(true);
      try {
        // Fetch groups for this suite
        const gQ = query(collection(db, 'groups'), where('suiteId', '==', suite.id));
        const gSnap = await getDocs(gQ);
        const fetchedGroups = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        let allCommands = [];
        if (fetchedGroups.length > 0) {
          const groupIds = fetchedGroups.map(g => g.id);
          
          // Chunking to avoid Firestore "in" limits (max 10)
          const chunks = [];
          for (let i = 0; i < groupIds.length; i += 10) { chunks.push(groupIds.slice(i, i + 10)); }
          
          let allAssignments = [];
          for (const chunk of chunks) {
            const gcQ = query(collection(db, 'groupCommands'), where('groupId', 'in', chunk));
            const gcSnap = await getDocs(gcQ);
            allAssignments = [...allAssignments, ...gcSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
          }

          if (allAssignments.length > 0) {
            const cmdIds = [...new Set(allAssignments.map(a => a.commandId))];
            const cmdChunks = [];
            for (let i = 0; i < cmdIds.length; i += 10) { cmdChunks.push(cmdIds.slice(i, i + 10)); }
            
            for (const chunk of cmdChunks) {
              const cQ = query(collection(db, 'commands'), where('__name__', 'in', chunk));
              const cSnap = await getDocs(cQ);
              allCommands = [...allCommands, ...cSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
            }
          }
        }
        setCommands(allCommands);
      } catch (err) {
        console.error("Error fetching commands for suite:", err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handleSubscribe = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      window.location.href = '/login?redirect=/store';
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
    } catch (err) {
      console.error(err);
      alert('Erro ao assinar a suite.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className={`bg-surface-container-low border ${expanded ? 'border-primary-container/50' : 'border-outline-variant'} rounded-md overflow-hidden transition-all duration-300 hover:border-outline`}>
      {/* Row Header - Always visible */}
      <div 
        className="flex items-center p-3 cursor-pointer group"
        onClick={handleToggle}
      >
        <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center shrink-0 border border-outline-variant shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-primary-container">extension</span>
        </div>
        
        <div className="ml-4 flex-1 min-w-0 flex items-center gap-4">
          <div className="font-bold text-on-surface text-sm truncate w-48 shrink-0">{suite.name}</div>
          <div className="text-xs text-on-surface-variant truncate flex-1 hidden md:block">
            {suite.description || 'Nenhuma descrição fornecida.'}
          </div>
          <div className="w-24 shrink-0 flex items-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-primary-container mr-1" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
            4.9 (186)
          </div>
          <div className="w-32 shrink-0 text-xs text-on-surface-variant truncate">
            {suite.authorName || 'Anônimo'}
          </div>
          <div className="w-24 shrink-0 flex items-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] mr-1">download</span>
            +500
          </div>
        </div>

        <div className="ml-4 flex items-center gap-3 shrink-0">
          <button 
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all min-w-[100px] ${hasSubscribed ? 'bg-success/20 text-success border border-success/30 cursor-default' : 'bg-primary-container text-white hover:bg-[#e66000]'}`}
            onClick={hasSubscribed ? (e) => e.stopPropagation() : handleSubscribe}
            disabled={isSubscribing || hasSubscribed}
          >
            {isSubscribing ? '...' : hasSubscribed ? 'Suscrito' : suite.price > 0 ? `R$ ${suite.price.toFixed(2)}` : 'Suscribirse'}
          </button>
          
          <button className="text-on-surface-variant hover:text-on-surface w-6 flex justify-center transition-transform">
            <span className={`material-symbols-outlined text-[20px] transform transition-transform duration-300 ${expanded ? 'rotate-180 text-primary-container' : ''}`}>
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* Expanded Accordion Area */}
      {expanded && (
        <div className="border-t border-outline-variant bg-surface-container-lowest p-5 animate-in slide-in-from-top-2 fade-in duration-300">
          
          {/* Detailed Description */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Acerca de esta Suite</h4>
            <p className="text-sm text-on-surface-variant max-w-4xl leading-relaxed">
              {suite.description || 'Esta suite no posee una descripción extendida. Comuníquese con el desarrollador para más detalles.'}
            </p>
          </div>

          {/* Commands Table */}
          <div className="border border-outline-variant rounded-md bg-surface-container-low overflow-hidden">
            {loadingDetails ? (
              <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-container"></div></div>
            ) : commands && commands.length > 0 ? (
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-surface-container-low sticky top-0 z-10 border-b border-outline-variant shadow-sm">
                    <tr>
                      <th className="py-2.5 px-4 font-bold text-[10px] text-on-surface-variant uppercase tracking-wider w-12">Ícono</th>
                      <th className="py-2.5 px-4 font-bold text-[10px] text-on-surface-variant uppercase tracking-wider w-48">Comando</th>
                      <th className="py-2.5 px-4 font-bold text-[10px] text-on-surface-variant uppercase tracking-wider">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {commands.map((cmd) => (
                      <tr key={cmd.id} className="hover:bg-surface-container-high transition-colors group/row">
                        <td className="py-2.5 px-4">
                          <div className="w-7 h-7 rounded bg-surface-container-highest flex items-center justify-center border border-outline-variant overflow-hidden group-hover/row:border-primary-container/50 transition-colors">
                            {cmd.svgIcon ? (
                                cmd.svgIcon.startsWith('data:image')
                                  ? <img src={cmd.svgIcon} className="w-5 h-5 object-contain" />
                                  : <div dangerouslySetInnerHTML={{ __html: cmd.svgIcon }} className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full" />
                              ) : (
                                <span className="material-symbols-outlined text-[16px] opacity-30">terminal</span>
                              )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-on-surface">{cmd.friendlyName || cmd.commandName}</div>
                          <div className="text-[10px] text-primary-container font-code-sm opacity-80">{cmd.commandName}</div>
                        </td>
                        <td className="py-2.5 px-4 text-on-surface-variant text-xs pr-8 leading-relaxed">
                          {cmd.description || 'Sin descripción detallada.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center text-on-surface-variant opacity-70">
                <span className="material-symbols-outlined text-[32px] mb-2">extension_off</span>
                <span className="text-sm">Nenhum comando encontrado nesta suite.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function StoreFront() {
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [linkedSuiteId, setLinkedSuiteId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLinkedSuiteId(params.get('id'));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setCurrentUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchSuites = async () => {
      try {
        const q = query(collection(db, 'suites'), where('visibility', '==', 'store'));
        const snap = await getDocs(q);
        const fetchedSuites = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedSuites.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
        setSuites(fetchedSuites);
      } catch (error) {
        console.error("Error fetching suites:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuites();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-container"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Store Header */}
      <div className="mb-6 flex justify-between items-end border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Extension Marketplace</h1>
          <p className="text-sm text-on-surface-variant mt-1">Busque y suscriba suites de herramientas para su flujo de trabajo.</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search extensions..." 
            className="bg-surface-container-low border border-outline-variant text-sm rounded pl-8 pr-3 py-1.5 w-64 focus:border-primary-container focus:outline-none transition-colors"
          />
          <span className="material-symbols-outlined text-[16px] absolute left-2.5 top-2 text-on-surface-variant">search</span>
        </div>
      </div>

      {/* Dense List */}
      <div className="flex flex-col gap-2">
        {suites.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant italic">A loja está vazia no momento.</div>
        ) : (
          suites.map(suite => (
            <SuiteRow 
              key={suite.id} 
              suite={suite} 
              currentUser={currentUser} 
              initiallyExpanded={suite.id === linkedSuiteId} 
            />
          ))
        )}
      </div>
      
      {/* Scrollbar CSS Overrides to keep the dense/technical feel inside the table */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #F26D21; }
      `}} />
    </div>
  );
}
