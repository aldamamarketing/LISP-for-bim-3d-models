import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';

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
          const suiteDoc = await getDoc(doc(db, 'suites', sub.suiteId));
          return suiteDoc.exists() ? { id: suiteDoc.id, ...suiteDoc.data(), subId: sub.id } : null;
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
    
    const functions = getFunctions();
    const toggleAssignment = httpsCallable(functions, 'toggleDeviceAssignment');

    // Si NO está asignado y queremos asignarlo (Link)
    if (!isAssigned) {
      // Chequeo visual rápido en UI (el backend lo bloqueará igual)
      if (currentAssigned.length >= (subObj.purchasedSeats || 1)) {
        showToast(`Límite de asientos alcanzado (${subObj.purchasedSeats}). Libere uno primero.`, 'error');
        return;
      }
      
      try {
        await toggleAssignment({ subId, deviceId, action: 'assign' });
        const newAssigned = [...currentAssigned, deviceId];
        setSubscriptions(subs => subs.map(s => s.id === subId ? { ...s, assignedDevices: newAssigned } : s));
        showToast('Equipamento atribuído à Suite.', 'success');
      } catch(e) {
        showToast(e.message || 'Error al asignar dispositivo', 'error');
      }
    } 
    // Si ESTÁ asignado y queremos desasignarlo (Unlink)
    else {
      try {
        await toggleAssignment({ subId, deviceId, action: 'unassign' });
        const newAssigned = currentAssigned.filter(id => id !== deviceId);
        setSubscriptions(subs => subs.map(s => s.id === subId ? { 
          ...s, 
          assignedDevices: newAssigned,
          penaltyBox: { ...(s.penaltyBox || {}), [deviceId]: { toDate: () => new Date() } } // Mock local
        } : s));
        showToast('Equipamento desvinculado (Bloqueado por 7 dias).', 'success');
      } catch(e) {
        showToast(e.message || 'Error al desvincular dispositivo', 'error');
      }
    }
  };

  const handleDeleteDevice = async (deviceId, deviceName) => {
    if (!confirm(`¿Eliminar el equipo "${deviceName}" del pool global? Esto revocará su acceso a todas las suites.`)) return;
    try {
      // 1. Remove from all subscriptions
      const updatePromises = subscriptions.map(async (sub) => {
        if (sub.assignedDevices && sub.assignedDevices.includes(deviceId)) {
          const newAssigned = sub.assignedDevices.filter(id => id !== deviceId);
          await updateDoc(doc(db, 'subscriptions', sub.id), { assignedDevices: newAssigned });
          return { subId: sub.id, newAssigned };
        }
        return null;
      });
      
      const results = await Promise.all(updatePromises);
      
      // 2. Delete device doc
      await deleteDoc(doc(db, 'users', userData.id, 'devices', deviceId));
      
      // 3. Update UI state
      setDevices(devices.filter(d => d.id !== deviceId));
      setSubscriptions(subs => subs.map(s => {
        const updated = results.find(r => r && r.subId === s.id);
        return updated ? { ...s, assignedDevices: updated.newAssigned } : s;
      }));
      
      showToast('Equipo eliminado exitosamente.', 'success');
    } catch(e) {
      console.error(e);
      showToast('Error al eliminar el equipo.', 'error');
    }
  };

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
        <div className="border border-outline-variant rounded-md overflow-hidden bg-surface-container-low">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-highest border-b border-outline-variant/50 text-on-surface-variant">
                <tr>
                  <th className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider w-[30%]">Suite</th>
                  <th className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider">{t('dashboard.subscriptions.subscribedOn')}</th>
                  <th className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider w-[30%]">Asignar Equipos</th>
                  <th className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {subscribedSuites.map(suite => {
                  // Find corresponding subscription object
                  const subObj = subscriptions.find(s => s.id === suite.subId);
                  
                  return (
                    <tr key={suite.subId} className="hover:bg-surface-container-high transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center shrink-0 border border-outline-variant/30">
                            <span className="material-symbols-outlined text-[18px] text-primary-container">extension</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-on-surface truncate max-w-[200px] sm:max-w-[300px]">{suite.name}</span>
                            <span className="text-xs text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">person</span> {suite.authorName || 'Anônimo'}
                            </span>
                            {subObj && (
                              <div className="mt-1">
                                <span className={`text-xs font-bold ${subObj.assignedDevices?.length > (subObj.purchasedSeats || 1) ? 'text-error' : 'text-primary-container'}`}>
                                  {subObj.assignedDevices?.length || 0} / {subObj.purchasedSeats || 1} Asientos
                                </span>
                                {subObj.assignedDevices?.length > (subObj.purchasedSeats || 1) && (
                                  <div className="text-error text-xs mt-1 bg-error/10 p-1 rounded border border-error/20 inline-block">
                                    <span className="material-symbols-outlined text-[12px] align-middle mr-1">warning</span>
                                    Sobregiro: Suite suspendida. Desvincule equipos.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-on-surface-variant font-mono">
                          {formatDate(subObj?.subscribedAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-2">
                          {devices.length === 0 && <span className="text-xs text-on-surface-variant">Sin equipos registrados</span>}
                          {devices.map(dev => {
                            const isAssigned = (subObj?.assignedDevices || []).includes(dev.id);
                            const isOverLimit = subObj?.assignedDevices?.length > (subObj?.purchasedSeats || 1);
                            const disableCheck = isOverLimit && !isAssigned; // Bloquear si está sobregirado y no está asignado

                            return (
                              <div key={dev.id} className="flex items-center justify-between hover:bg-surface-container p-1 rounded group">
                                <label className={`flex items-center gap-2 cursor-pointer grow ${disableCheck ? 'opacity-50' : ''}`}>
                                  <input 
                                    type="checkbox" 
                                    className="form-checkbox bg-surface-container border-outline-variant rounded text-primary-container focus:ring-primary-container"
                                    checked={isAssigned}
                                    disabled={disableCheck}
                                    onChange={() => handleToggleDevice(subObj, dev.id)}
                                  />
                                  <span className="text-xs font-mono text-on-surface truncate max-w-[150px]">{dev.name || dev.id}</span>
                                </label>
                                <button 
                                  onClick={() => handleDeleteDevice(dev.id, dev.name || dev.id)}
                                  className="opacity-0 group-hover:opacity-100 text-error hover:bg-error/10 p-1 rounded transition-opacity"
                                  title="Eliminar equipo del pool"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          onClick={() => handleUnsubscribe(suite.subId)}
                          className="px-3 py-1.5 bg-surface text-error hover:bg-error/10 border border-error/20 hover:border-error/50 rounded text-xs font-bold transition-all"
                          title={t('dashboard.subscriptions.unsubscribe')}
                        >
                          <span className="material-symbols-outlined text-[16px] md:hidden">delete</span>
                          <span className="hidden md:inline">{t('dashboard.subscriptions.unsubscribe')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
