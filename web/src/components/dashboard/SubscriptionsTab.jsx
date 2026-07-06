import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc, updateDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';

const SubscribedSuiteRow = ({ suite, subObj, devices, handleToggleDevice, handleUnsubscribe, userData }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [commands, setCommands] = useState(null);

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

  const handleReviewSubmit = async () => {
    if (!userData) return;
    if (reviewRating < 1 || reviewRating > 5) return;
    setIsSubmittingReview(true);
    try {
      const reviewRef = collection(db, 'reviews');
      const reviewData = {
        suiteId: suite.id,
        tenantId: userData.id,
        rating: reviewRating,
        comment: reviewComment,
        createdAt: serverTimestamp()
      };
      
      if (reviewTarget.type === 'command') {
        reviewData.commandId = reviewTarget.id;
      }
      
      await addDoc(reviewRef, reviewData);
      
      setReviewModalOpen(false);
      showToast(t('store.review_success', '¡Gracias por tu valoración!'), 'success');
      
      if (reviewTarget.type === 'suite') {
        updateDoc(doc(db, 'suites', suite.id), {
          ratingCount: increment(1),
        }).catch(err => console.warn('Rating counter failed:', err));
      } else {
        setCommands(cmds => cmds.map(c => c.id === reviewTarget.id ? { ...c, rating: reviewRating, ratingCount: (c.ratingCount || 0) + 1 } : c));
      }
    } catch (err) {
      console.error(err);
      showToast(t('store.review_error', 'Error al enviar valoración.'), 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleToggle = async (e) => {
    const isProgrammatic = typeof e === 'boolean';
    const willExpand = isProgrammatic ? e : !expanded;
    
    setExpanded(willExpand);
    
    if (willExpand && commands === null && !suite.isGlobal) {
      setLoadingDetails(true);
      try {
        const gQ = query(collection(db, 'groups'), where('suiteId', '==', suite.id));
        const gSnap = await getDocs(gQ);
        const fetchedGroups = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        let allCommands = [];
        if (fetchedGroups.length > 0) {
          const groupIds = fetchedGroups.map(g => g.id);
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
    } else if (willExpand && commands === null && suite.isGlobal) {
        // Global suite has no fetched commands natively from store here, so we skip or fetch owned ones
        setCommands([]);
    }
  };

  return (
    <div className={`bg-surface-container-low border ${expanded ? 'border-primary-container/50' : 'border-outline-variant'} rounded-md overflow-hidden transition-all duration-300 hover:border-outline mb-2`}>
      <div className="flex items-center p-3 group">
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-label={`Toggle details for ${suite.name}`}
          className="flex-1 flex items-center min-w-0 text-left bg-transparent border-none p-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded"
        >
          <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center shrink-0 border border-outline-variant shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-primary-container">extension</span>
          </div>
          
          <div className="ml-4 flex-1 min-w-0 flex items-center gap-4">
            <div className="flex flex-col min-w-0 shrink-0 w-64">
              <span className="font-bold text-on-surface text-sm truncate">{suite.name}</span>
              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">person</span> {suite.authorName || 'Anônimo'}
              </span>
            </div>

            <div className="flex-1 hidden md:block">
              {subObj && (
                <div className="flex flex-col items-start">
                  <span className={`text-xs font-bold ${subObj.assignedDevices?.length > (subObj.purchasedSeats || 1) ? 'text-error' : 'text-primary-container'}`}>
                    {subObj.assignedDevices?.length || 0} / {subObj.purchasedSeats || 1} Asientos
                  </span>
                  {subObj.assignedDevices?.length > (subObj.purchasedSeats || 1) && (
                    <div className="text-error text-[10px] mt-0.5 bg-error/10 px-1 rounded inline-block">
                      Sobregiro. Desvincule equipos.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </button>

        <div className="ml-4 flex items-center gap-3 shrink-0">
          {!suite.isGlobal && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleUnsubscribe(suite.subId); }}
              className="px-3 py-1.5 bg-surface text-error hover:bg-error/10 border border-error/20 hover:border-error/50 rounded text-xs font-bold transition-all"
              title={t('dashboard.subscriptions.unsubscribe')}
            >
              <span className="material-symbols-outlined text-[16px] md:hidden">delete</span>
              <span className="hidden md:inline">{t('dashboard.subscriptions.unsubscribe')}</span>
            </button>
          )}
          
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-label="Toggle details"
            className="text-on-surface-variant hover:text-on-surface w-6 flex justify-center transition-transform outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded"
          >
            <span className={`material-symbols-outlined text-[20px] transform transition-transform duration-300 ${expanded ? 'rotate-180 text-primary-container' : ''}`}>
              expand_more
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-outline-variant bg-surface-container-lowest p-5 animate-in slide-in-from-top-2 fade-in duration-300">
          
          {/* Top section: Description and Assign Devices */}
          <div className="flex flex-col md:flex-row gap-5 mb-5">
            <div className="flex-1">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">{t('store.about_suite', 'Acerca de esta Suite')}</h4>
              <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                {suite.description || t('store.no_desc', 'Esta suite no posee una descripción extendida.')}
              </p>
              
              {!suite.isGlobal && (
                <div className="mt-4">
                  <button 
                    onClick={() => openReviewModal('suite', suite.id, suite.name)}
                    className="px-3 py-1.5 bg-surface border border-outline-variant rounded text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2 inline-flex"
                  >
                    <span className="material-symbols-outlined text-[16px]">star_rate</span>
                    {t('store.rate', 'Valorar')}
                  </button>
                </div>
              )}
            </div>

            <div className="md:w-72 shrink-0 bg-surface border border-outline-variant/30 rounded p-4">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">computer</span>
                Asignar Equipos ({subObj?.assignedDevices?.length || 0} / {subObj?.purchasedSeats || 1})
              </h4>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {devices.length === 0 && <span className="text-xs text-on-surface-variant">Sin equipos registrados</span>}
                {devices.map(dev => {
                  const isAssigned = (subObj?.assignedDevices || []).includes(dev.id);
                  const isOverLimit = subObj?.assignedDevices?.length > (subObj?.purchasedSeats || 1);
                  const disableCheck = isOverLimit && !isAssigned; 

                  return (
                    <div key={dev.id} className="flex items-center justify-between hover:bg-surface-container p-1.5 rounded group transition-colors">
                      <label className={`flex items-center gap-2 cursor-pointer grow ${disableCheck ? 'opacity-50' : ''}`}>
                        <input 
                          type="checkbox" 
                          className="form-checkbox bg-surface-container border-outline-variant rounded text-primary-container focus:ring-primary-container"
                          checked={isAssigned}
                          disabled={disableCheck}
                          onChange={() => handleToggleDevice(subObj, dev.id)}
                        />
                        <span className="text-xs font-mono text-on-surface truncate max-w-[150px]" title={dev.name || dev.id}>
                          {dev.name || dev.id}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
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

          {/* Commands Table */}
          {!suite.isGlobal && (
            <div className="mt-4 border-t border-outline-variant/30">
              {loadingDetails ? (
                <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-container"></div></div>
              ) : commands && commands.length > 0 ? (
                <div className="max-h-64 overflow-y-auto custom-scrollbar mt-4">
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
                               <button
                                 onClick={(e) => { e.stopPropagation(); openReviewModal('command', cmd.id, cmd.friendlyName || cmd.commandName); }}
                                 className="opacity-0 group-hover/row:opacity-100 transition-opacity text-[10px] bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface hover:text-primary-container hover:border-primary-container"
                               >
                                 Rate
                               </button>
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
          )}
        </div>
      )}
    </div>
  );
};


export default function SubscriptionsTab() {
  const { t } = useTranslation();
  const { userData } = useDashboard();
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscribedSuites, setSubscribedSuites] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const subQ = query(collection(db, 'subscriptions'), where('tenantId', '==', userData.id));
        const subSnap = await getDocs(subQ);
        const subs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSubscriptions(subs);

        const suitePromises = subs.map(async (sub) => {
          if (sub.isGlobal) {
            return { 
               id: sub.suiteId || 'global', 
               name: 'Global Suite (Mis Herramientas)', 
               authorName: userData.name || 'Tú',
               subId: sub.id,
               isGlobal: true
            };
          }
          if (!sub.suiteId) return null;
          const suiteDoc = await getDoc(doc(db, 'suites', sub.suiteId));
          return suiteDoc.exists() 
            ? { id: suiteDoc.id, ...suiteDoc.data(), subId: sub.id, isGlobal: false } 
            : { id: sub.suiteId, name: 'Suite não encontrada', authorName: '—', subId: sub.id, isGlobal: false };
        });

        const suitesData = (await Promise.all(suitePromises)).filter(Boolean);
        setSubscribedSuites(suitesData);
        
        // Fetch devices para asignacion
        const devQ = query(collection(db, 'users', userData.id, 'devices'));
        const devSnap = await getDocs(devQ);
        setDevices(devSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userData) {
      fetchSubscriptions();
    }
  }, [userData]);

  const handleToggleDevice = async (subObj, deviceId) => {
    const subId = subObj.id;
    const currentAssigned = subObj.assignedDevices || [];
    const isAssigned = currentAssigned.includes(deviceId);
    
    // Si NO está asignado y queremos asignarlo (Link)
    if (!isAssigned) {
      if (currentAssigned.length >= (subObj.purchasedSeats || 1)) {
        showToast(`Límite de asientos alcanzado (${subObj.purchasedSeats}). Libere uno primero.`, 'error');
        return;
      }
      
      try {
        const newAssigned = [...currentAssigned, deviceId];
        await updateDoc(doc(db, 'subscriptions', subId), {
          assignedDevices: newAssigned
        });
        setSubscriptions(subs => subs.map(s => s.id === subId ? { ...s, assignedDevices: newAssigned } : s));
        showToast('Equipamento atribuído à Suite.', 'success');
      } catch(e) {
        console.error(e);
        showToast(e.message || 'Error al asignar dispositivo', 'error');
      }
    } 
    // Si ESTÁ asignado y queremos desasignarlo (Unlink)
    else {
      if (!confirm(`⚠️ ALERTA: Si desvinculas este equipo, NO podrás volver a asignarlo a esta Suite durante 7 días (Política Anti-Abuso).\n\n¿Estás seguro de que deseas desvincularlo ahora?`)) return;

      try {
        const newAssigned = currentAssigned.filter(id => id !== deviceId);
        await updateDoc(doc(db, 'subscriptions', subId), {
          assignedDevices: newAssigned,
          [`penaltyBox.${deviceId}`]: new Date()
        });
        setSubscriptions(subs => subs.map(s => s.id === subId ? { 
          ...s, 
          assignedDevices: newAssigned,
          penaltyBox: { ...(s.penaltyBox || {}), [deviceId]: new Date() } 
        } : s));
        showToast('Equipamento desvinculado.', 'success');
      } catch(e) {
        console.error(e);
        showToast(e.message || 'Error al desvincular dispositivo', 'error');
      }
    }
  };

  // El botón de borrar equipo se movió al dashboard de Licenses & Access

  const handleUnsubscribe = async (subId) => {
    if (!confirm(t('dashboard.subscriptions.confirmUnsubscribe'))) return;
    try {
      await deleteDoc(doc(db, 'subscriptions', subId));
      setSubscribedSuites(subscribedSuites.filter(s => s.subId !== subId));
      showToast(t('dashboard.subscriptions.successUnsubscribe'), 'success');
    } catch (err) {
      showToast(t('dashboard.subscriptions.errorUnsubscribe'), 'error');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    // Firestore timestamp or ISO string
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="animate-spin h-6 w-6 border-b-2 border-primary-container rounded-full"></div></div>;
  }

  return (
    <div className="tab-enter card pb-32">
      <h3 className="mt-0 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-primary-container">shopping_bag</span>
        {t('dashboard.subscriptions.title')}
      </h3>
      <p className="text-sm text-on-surface-variant mb-6">
        {t('dashboard.subscriptions.desc')}
      </p>

      {subscribedSuites.length === 0 ? (
        <div className="p-8 border border-dashed border-outline-variant rounded bg-surface-container-low text-center">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant mb-2">extension_off</span>
          <p className="text-on-surface-variant text-sm">{t('dashboard.subscriptions.emptyTitle')}</p>
          <a href="/store" className="inline-block mt-4 text-primary-container font-bold text-sm hover:underline">{t('dashboard.subscriptions.exploreStore')}</a>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {subscribedSuites.map(suite => {
            const subObj = subscriptions.find(s => s.id === suite.subId);
            return (
              <SubscribedSuiteRow 
                key={suite.subId} 
                suite={suite} 
                subObj={subObj} 
                devices={devices} 
                handleToggleDevice={handleToggleDevice} 
                handleUnsubscribe={handleUnsubscribe} 
                userData={userData}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
