import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { useTranslation } from '../../i18n/useTranslation';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';

const SuiteRow = ({ suite, currentUser, initiallyExpanded }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(initiallyExpanded || false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [commands, setCommands] = useState(null);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState({ type: 'suite', id: suite.id, name: suite.name });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const openReviewModal = (type, targetId, targetName) => {
    setReviewTarget({ type, id: targetId, name: targetName });
    setReviewRating(5);
    setReviewComment('');
    setReviewModalOpen(true);
  };

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

  const handleToggle = async (e) => {
    const isProgrammatic = typeof e === 'boolean';
    const willExpand = isProgrammatic ? e : !expanded;
    
    setExpanded(willExpand);
    
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
            const gcQ = query(collection(db, 'groupFiles'), where('groupId', 'in', chunk));
            const gcSnap = await getDocs(gcQ);
            allAssignments = [...allAssignments, ...gcSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
          }

          if (allAssignments.length > 0) {
            const fileIds = [...new Set(allAssignments.map(a => a.fileId))];
            const fileChunks = [];
            for (let i = 0; i < fileIds.length; i += 10) { fileChunks.push(fileIds.slice(i, i + 10)); }
            
            for (const chunk of fileChunks) {
              const cQ = query(collection(db, 'commands'), where('lispFileId', 'in', chunk));
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
      
      // Success: update UI immediately
      setHasSubscribed(true);
      
      // Non-critical: fire-and-forget counter
      updateDoc(doc(db, 'suites', suite.id), {
        downloads: increment(1)
      }).catch(err => console.warn('Counter update failed:', err));
      
    } catch (err) {
      console.error(err);
      alert(t('store.error_subscribe', 'Erro ao assinar a suite.'));
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!currentUser) return;
    if (reviewRating < 1 || reviewRating > 5) return;
    setIsSubmittingReview(true);
    try {
      const reviewRef = collection(db, 'reviews');
      const reviewData = {
        suiteId: suite.id,
        tenantId: currentUser.uid,
        rating: reviewRating,
        comment: reviewComment,
        createdAt: serverTimestamp()
      };
      
      if (reviewTarget.type === 'command') {
        reviewData.commandId = reviewTarget.id;
      }
      
      await addDoc(reviewRef, reviewData);
      
      setReviewModalOpen(false);
      alert(t('store.review_success', '¡Gracias por tu valoración!'));
      
      // Non-critical: fire-and-forget counter
      if (reviewTarget.type === 'suite') {
        updateDoc(doc(db, 'suites', suite.id), {
          ratingCount: increment(1),
        }).catch(err => console.warn('Rating counter failed:', err));
      } else {
        // If it's a command, optionally update local command state so it shows immediately
        setCommands(cmds => cmds.map(c => c.id === reviewTarget.id ? { ...c, rating: reviewRating, ratingCount: (c.ratingCount || 0) + 1 } : c));
      }
      
    } catch (err) {
      console.error(err);
      alert(t('store.review_error', 'Error al enviar valoración.'));
    } finally {
      setIsSubmittingReview(false);
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
            <span className="material-symbols-outlined text-[14px] mr-1">terminal</span>
            {suite.commandCount ? `${suite.commandCount} cmds` : 'Multi'}
          </div>
          <div className="w-24 shrink-0 flex items-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-primary-container mr-1" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
            {suite.rating ? suite.rating.toFixed(1) : 'N/A'} ({suite.ratingCount || 0})
          </div>
          <div className="w-32 shrink-0 text-xs text-on-surface-variant truncate">
            {suite.authorName || 'Anônimo'}
          </div>
          <div className="w-24 shrink-0 flex items-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] mr-1">download</span>
            +{suite.downloads || 0}
          </div>
        </div>

        <div className="ml-4 flex items-center gap-3 shrink-0">
          <button 
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all min-w-[100px] ${hasSubscribed ? 'bg-success/20 text-success border border-success/30 cursor-default' : 'bg-primary-container text-white hover:bg-[#e66000]'}`}
            onClick={hasSubscribed ? (e) => e.stopPropagation() : handleSubscribe}
            disabled={isSubscribing || hasSubscribed}
          >
            {isSubscribing ? '...' : hasSubscribed ? t('store.subscribed', 'Suscrito') : t('store.free_beta', 'Gratis (Beta)')}
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
          <div className="mb-5 flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">{t('store.about_suite', 'Acerca de esta Suite')}</h4>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                {suite.description || t('store.no_desc', 'Esta suite no posee una descripción extendida. Comuníquese con el desarrollador para más detalles.')}
              </p>
            </div>
            {hasSubscribed && (
              <button 
                onClick={() => openReviewModal('suite', suite.id, suite.name)}
                className="px-3 py-1.5 bg-surface border border-outline-variant rounded text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">star_rate</span>
                {t('store.rate', 'Valorar')}
              </button>
            )}
          </div>

          {/* Review Modal inline */}
          {reviewModalOpen && (
            <div className="mb-5 p-4 bg-surface border border-primary-container/30 rounded-md max-w-xl animate-in fade-in zoom-in-95">
              <h5 className="text-sm font-bold text-on-surface mb-3">{t('store.leave_review', 'Deja tu valoración para')} {reviewTarget.name}</h5>
              <div className="flex gap-2 mb-3">
                {[1,2,3,4,5].map(star => (
                  <button 
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <span 
                      className={`material-symbols-outlined text-[24px] ${star <= reviewRating ? 'text-primary-container' : 'text-outline-variant'}`}
                      style={{fontVariationSettings: star <= reviewRating ? "'FILL' 1" : "'FILL' 0"}}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
              <textarea 
                className="w-full bg-surface-container-low border border-outline-variant rounded p-2 text-sm text-on-surface focus:border-primary-container focus:outline-none mb-3 resize-none"
                rows="2"
                placeholder={t('store.review_placeholder', 'Cuenta tu experiencia (opcional)...')}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setReviewModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface font-bold"
                >
                  {t('store.cancel', 'Cancelar')}
                </button>
                <button 
                  onClick={handleReviewSubmit}
                  disabled={isSubmittingReview}
                  className="px-3 py-1.5 bg-primary-container text-white rounded text-xs font-bold hover:bg-[#e66000] disabled:opacity-50"
                >
                  {isSubmittingReview ? t('store.sending', 'Enviando...') : t('store.send_review', 'Enviar Valoración')}
                </button>
              </div>
            </div>
          )}

          {/* Commands Table - Flat IDE Style */}
          <div className="mt-4 border-t border-outline-variant/30">
            {loadingDetails ? (
              <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-container"></div></div>
            ) : commands && commands.length > 0 ? (
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-surface-container-lowest sticky top-0 z-10 border-b border-outline-variant/30">
                    <tr>
                      <th className="py-1.5 px-2 font-code-sm text-[10px] text-on-surface-variant uppercase w-10">{t('store.icon', 'Ícono')}</th>
                      <th className="py-1.5 px-2 font-code-sm text-[10px] text-on-surface-variant uppercase w-48">{t('store.command', 'Comando')}</th>
                      <th className="py-1.5 px-2 font-code-sm text-[10px] text-on-surface-variant uppercase">{t('store.description', 'Descripción')}</th>
                      <th className="py-1.5 px-2 font-code-sm text-[10px] text-on-surface-variant uppercase text-right w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {commands.map((cmd) => (
                      <tr key={cmd.id} className="hover:bg-surface-container-high transition-colors group/row">
                        <td className="py-1.5 px-2">
                          <div className="w-6 h-6 flex items-center justify-center opacity-80 group-hover/row:opacity-100 transition-opacity">
                            {cmd.svgIcon ? (
                                cmd.svgIcon.startsWith('data:image')
                                  ? <img src={cmd.svgIcon} className="w-4 h-4 object-contain" />
                                  : <div dangerouslySetInnerHTML={{ __html: cmd.svgIcon }} className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full" />
                              ) : (
                                <span className="material-symbols-outlined text-[14px] opacity-30">terminal</span>
                              )}
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="font-bold text-on-surface text-xs">{cmd.friendlyName || cmd.commandName}</div>
                          <div className="text-[10px] text-primary-container font-code-sm opacity-60">{cmd.commandName}</div>
                        </td>
                        <td className="py-1.5 px-2 text-on-surface-variant text-[11px] pr-4 leading-snug">
                          {cmd.description || '...'}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                             {cmd.rating ? (
                               <span className="text-[10px] text-primary-container flex items-center font-bold">
                                 <span className="material-symbols-outlined text-[12px] mr-0.5" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                 {cmd.rating.toFixed(1)}
                               </span>
                             ) : null}
                             {hasSubscribed && (
                               <button
                                 onClick={(e) => { e.stopPropagation(); openReviewModal('command', cmd.id, cmd.friendlyName || cmd.commandName); }}
                                 className="opacity-0 group-hover/row:opacity-100 transition-opacity text-[10px] bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface hover:text-primary-container hover:border-primary-container"
                               >
                                 Rate
                               </button>
                             )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center text-on-surface-variant opacity-70">
                <span className="material-symbols-outlined text-[32px] mb-2">extension_off</span>
                <span className="text-sm">{t('store.no_commands', 'Ningún comando encontrado en esta suite.')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function StoreFront() {
  const { t } = useTranslation();
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [linkedSuiteId, setLinkedSuiteId] = useState(null);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterVersion, setFilterVersion] = useState('');

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

  // Derived Filtered State
  const filteredSuites = suites.filter(suite => {
    const matchesSearch = !searchQuery || 
      suite.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      suite.authorName?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = !filterCategory || suite.storeCategory === filterCategory;
    const matchesPlatform = !filterPlatform || suite.compatibility === filterPlatform;
    const matchesVersion = !filterVersion || suite.supportedVersions === filterVersion;

    return matchesSearch && matchesCategory && matchesPlatform && matchesVersion;
  });

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Store Header & Filters */}
      <div className="mb-6 border-b border-outline-variant pb-4">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{t('store.marketplace_title', 'Extension Marketplace')}</h1>
            <p className="text-sm text-on-surface-variant mt-1">{t('store.marketplace_subtitle', 'Busque y suscriba suites de herramientas para su flujo de trabajo.')}</p>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder={t('store.search_ph', 'Search extensions...')}
              className="bg-surface-container-low border border-outline-variant text-sm rounded pl-8 pr-3 py-1.5 w-64 focus:border-primary-container focus:outline-none transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="material-symbols-outlined text-[16px] absolute left-2.5 top-2 text-on-surface-variant">search</span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex gap-3">
          <select 
            className="bg-surface border border-outline-variant rounded text-on-surface-variant text-xs py-1.5 px-2 focus:border-primary-container focus:text-on-surface outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">{t('store.all_categories', 'Todas las Categorías')}</option>
            {/* We dynamically extract categories from the loaded suites, plus defaults */}
            {[...new Set([...suites.map(s => s.storeCategory).filter(Boolean), 'architecture', 'civil', 'topo', 'structure', 'mep', 'productivity', 'quantities', 'urban'])].map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>

          <select 
            className="bg-surface border border-outline-variant rounded text-on-surface-variant text-xs py-1.5 px-2 focus:border-primary-container focus:text-on-surface outline-none"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
          >
            <option value="">{t('store.platform_any', 'Plataforma (Cualquiera)')}</option>
            <option value="universal">Universal</option>
            <option value="autocad">AutoCAD</option>
            <option value="civil3d">Civil 3D</option>
            <option value="autocad_vertical">AutoCAD Vertical</option>
            <option value="bricscad">BricsCAD</option>
            <option value="zwcad">ZWCAD</option>
            <option value="gstarcad">GstarCAD</option>
          </select>

          <select 
            className="bg-surface border border-outline-variant rounded text-on-surface-variant text-xs py-1.5 px-2 focus:border-primary-container focus:text-on-surface outline-none"
            value={filterVersion}
            onChange={(e) => setFilterVersion(e.target.value)}
          >
            <option value="">{t('store.version_any', 'Versión (Cualquiera)')}</option>
            <option value="all">{t('store.all', 'Todas')}</option>
            <option value="2025+">2025+</option>
            <option value="2021-2024">2021-2024</option>
            <option value="2018-2020">2018-2020</option>
            <option value="2013-2017">2013-2017</option>
            <option value="legacy">Legacy</option>
          </select>
        </div>
      </div>

      {/* Dense List */}
      <div className="flex flex-col gap-2">
        {filteredSuites.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant italic">{t('store.no_results', 'No se encontraron suites con estos filtros.')}</div>
        ) : (
          filteredSuites.map(suite => (
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
