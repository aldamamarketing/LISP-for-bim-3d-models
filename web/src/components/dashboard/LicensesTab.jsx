import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';

export default function LicensesTab() {
  const { t } = useTranslation();
  const { userData, setUserData, seats, setSeats, deviceNotes, setDeviceNotes } = useDashboard();
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!userData) return;
      try {
        const q = query(collection(db, 'subscriptions'), where('tenantId', '==', userData.id));
        const snap = await getDocs(q);
        const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Fetch suite details for each subscription
        const subsWithSuites = await Promise.all(subs.map(async (sub) => {
          const sDoc = await getDoc(doc(db, 'suites', sub.suiteId));
          if (sDoc.exists()) {
            return { ...sub, suite: { id: sDoc.id, ...sDoc.data() } };
          }
          return sub;
        }));
        
        setSubscriptions(subsWithSuites.filter(s => s.suite));
      } catch (err) {
        console.error("Error fetching subscriptions", err);
      } finally {
        setLoadingSubs(false);
      }
    };
    fetchSubscriptions();
  }, [userData]);

  const handleUnsubscribe = async (subId) => {
    if (!confirm('Deseja realmente remover esta suite da sua conta?')) return;
    try {
      await deleteDoc(doc(db, 'subscriptions', subId));
      setSubscriptions(subscriptions.filter(s => s.id !== subId));
      showToast('Assinatura removida.', 'success');
    } catch (err) {
      showToast('Erro ao remover assinatura.', 'error');
    }
  };

  const handleUpdatePlan = async () => {
    if (!userData) return;
    try {
      const newSeats = parseInt(seats, 10);
      await updateDoc(doc(db, 'users', userData.id), { maxSeats: newSeats });
      setUserData({ ...userData, maxSeats: newSeats });
      showToast('Plano atualizado! Novos assentos liberados.', 'success');
    } catch(e) {
      console.error(e);
      showToast('Erro ao atualizar plano.', 'error');
    }
  };

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
    } catch(e) { showToast('Erro ao desvincular.', 'error'); }
  };

  const registeredDevices = userData?.registeredDevices || (userData?.registeredDevice ? [userData.registeredDevice] : []);

  return (
    <div className="tab-enter grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
      
      {/* LICENSES & ACCESS */}
      <div className="bg-surface-container border border-surface-variant rounded-xl p-6 border-t-[3px] border-t-primary-container">
        <h3 className="mt-0 text-lg font-bold">{t('dashboard.licenses.title')}</h3>
        <p className="text-sm text-on-surface-variant mb-4">{t('dashboard.licenses.desc')}</p>
        
        <div className="bg-[#0D0D0D] rounded-lg p-4 mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <strong>{t('dashboard.licenses.currentPlan')}</strong> <span className="text-green-400">{t('dashboard.licenses.betaTester')}</span>
          </div>
          <div className="flex justify-between items-center">
            <strong>{t('dashboard.licenses.basePrice')}</strong> <span>US$ 0.00 / mês</span>
          </div>
          <div className="flex justify-between items-center">
            <strong>{t('dashboard.licenses.seatsNeeded')}</strong> 
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={seats} 
              onChange={e => setSeats(e.target.value)} 
              className="bg-[#0D0D0D] border border-surface-variant text-white rounded-lg px-2 py-1 w-16 text-center focus:outline-none focus:border-primary-container transition-colors" 
            />
          </div>
        </div>
        
        <button 
          className="bg-primary-container text-white font-bold text-sm px-4 py-3 rounded-lg hover:bg-[#e66000] transition-colors w-full" 
          onClick={handleUpdatePlan}
        >
          {t('dashboard.licenses.updatePlan')}
        </button>

        {parseInt(seats) > (userData?.maxSeats || 1) && (
          <div className="mt-3 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-center">
            {t('dashboard.licenses.stripeWarning')}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-surface-variant">
          <h4 className="m-0 mb-3 text-sm font-bold">{t('dashboard.licenses.accessKey')}</h4>
          <div className="flex gap-3">
            <input 
              type="text" 
              readOnly 
              value={userData?.apiKey || ''} 
              className="flex-1 bg-[#0D0D0D] border border-surface-variant text-primary-container font-mono px-3 py-2 rounded-lg" 
            />
            <button 
              className="bg-primary-container text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#e66000] transition-colors" 
              onClick={() => window.location.href = `https://generateloader-wgpjjgorxa-uc.a.run.app/?token=${userData?.apiKey}`}
            >
              {t('dashboard.licenses.download')}
            </button>
          </div>
        </div>
      </div>

      {/* LINKED DEVICES */}
      <div className="bg-surface-container border border-surface-variant rounded-xl p-6">
        <h3 className="mt-0 text-lg font-bold">
          {t('dashboard.equipment.title')} ({registeredDevices.length} / {userData?.maxSeats || 1})
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">{t('dashboard.equipment.desc')}</p>
        
        {registeredDevices.length > 0 ? (
          <div className="flex flex-col gap-3">
            {registeredDevices.map(dev => (
              <div key={dev} className="bg-[#0D0D0D] p-3 rounded-lg border border-surface-variant">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-green-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">computer</span> {dev}
                  </span>
                  <button 
                    className="bg-transparent border border-surface-variant text-on-surface-variant hover:text-red-400 text-xs px-2 py-1 rounded transition-colors" 
                    onClick={() => handleUnlink(dev)}
                  >
                    {t('dashboard.equipment.unlink')}
                  </button>
                </div>
                <input 
                  type="text" 
                  value={deviceNotes[dev] || ''} 
                  onChange={e => handleNoteChange(dev, e.target.value)} 
                  placeholder={t('dashboard.equipment.placeholder')}
                  className="w-full p-2 bg-[#141414] border border-dashed border-surface-variant text-white text-sm focus:outline-none focus:border-primary-container transition-colors"
                />
              </div>
            ))}
          </div>
        ) : (
           <div className="p-4 text-center border border-dashed border-surface-variant rounded-lg text-on-surface-variant text-sm">
             {t('dashboard.equipment.empty')}
           </div>
        )}
      </div>

      {/* MY SUBSCRIPTIONS */}
      <div className="md:col-span-2 bg-surface-container border border-surface-variant rounded-xl p-6">
        <h3 className="mt-0 text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container">shopping_bag</span>
          Minhas Assinaturas (Store)
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">Suites públicas de terceiros que você adicionou à sua conta.</p>
        
        {loadingSubs ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-container"></div>
          </div>
        ) : subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptions.map(sub => (
              <div key={sub.id} className="bg-[#0D0D0D] border border-surface-variant rounded-lg p-4 flex flex-col hover:border-primary-container transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-on-surface m-0 truncate pr-2">{sub.suite.name}</h4>
                  <button className="text-on-surface-variant hover:text-error transition-colors shrink-0" onClick={() => handleUnsubscribe(sub.id)} title="Remover da Conta">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
                <div className="text-xs text-on-surface-variant mb-3 flex-1 line-clamp-2">{sub.suite.description}</div>
                <div className="flex justify-between items-center pt-3 border-t border-surface-variant">
                  <div className="text-xs font-bold text-primary-container">{sub.suite.authorName || 'Anônimo'}</div>
                  <a href={`/suite?id=${sub.suite.id}`} className="text-xs text-on-surface hover:text-primary-container flex items-center gap-1">
                    Ver <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-surface-variant rounded-lg">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant opacity-50 mb-2">production_quantity_limits</span>
            <div className="text-on-surface-variant text-sm mb-3">Você ainda não assinou nenhuma suite da Store.</div>
            <a href="/store" className="inline-block bg-surface-container-highest hover:bg-primary-container hover:text-white text-sm font-bold px-4 py-2 rounded transition-colors text-on-surface border border-outline-variant hover:border-primary-container">
              Explorar a Store
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
