import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';
import { Card, CardHeader } from '../ui/Card';

export default function LicensesTab() {
  const { t } = useTranslation();
  const { userData, setUserData, seats, setSeats, deviceNotes, setDeviceNotes } = useDashboard();
  const [devicesList, setDevicesList] = useState([]);

  useEffect(() => {
    if (!userData?.id) return;
    const unsub = onSnapshot(collection(db, 'users', userData.id, 'devices'), (snap) => {
      const devs = [];
      snap.forEach(d => devs.push({ id: d.id, ...d.data() }));
      setDevicesList(devs);
    });
    return () => unsub();
  }, [userData?.id]);

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
      // Remover compatibilidad legacy
      const updatedDevices = (userData.registeredDevices || []).filter(d => d !== device);
      const userRef = doc(db, 'users', userData.id);
      const updates = { registeredDevices: updatedDevices };
      if (userData.registeredDevice === device) {
        updates.registeredDevice = updatedDevices.length > 0 ? updatedDevices[0] : null;
      }
      await updateDoc(userRef, updates);
      
      // Regla Anti-Abuso: Guardamos que fue desvinculado AHORA
      try {
        await updateDoc(doc(db, 'users', userData.id, 'devices', device), { 
          globalLinked: false,
          globalUnlinkedAt: serverTimestamp()
        });
      } catch(e) { console.error("Error al desligar device de subcoleccion", e); }

      setUserData({ ...userData, ...updates });
      showToast('Equipamento desvinculado com sucesso.', 'success');
    } catch(e) { showToast('Erro ao desvincular.', 'error'); }
  };

  const handleDeleteDevice = async (deviceObj) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente ${deviceObj.name || deviceObj.id}? Esto lo removerá de todas las suscripciones.`)) return;
    try {
      await deleteDoc(doc(db, 'users', userData.id, 'devices', deviceObj.id));
      showToast('Equipamento eliminado com sucesso.', 'success');
    } catch(e) { showToast('Erro ao eliminar equipamento.', 'error'); }
  };

  const handleLink = async (deviceObj) => {
    try {
      const activeCount = devicesList.filter(d => d.globalLinked).length;
      const legacyCount = (userData.registeredDevices || []).filter(d => !devicesList.find(dev => dev.id === d)).length;
      const totalActive = activeCount + legacyCount;
      const maxSeats = userData.maxSeats || 1;

      if (totalActive >= maxSeats) {
        showToast(`Limite de assentos atingido (${maxSeats}). Desvincule outro primeiro.`, 'error');
        return;
      }

      // Regla Anti-Abuso (Penalty Box de 7 Días)
      if (deviceObj.globalUnlinkedAt) {
        const unlinkedDate = deviceObj.globalUnlinkedAt.toDate();
        const daysPassed = (new Date() - unlinkedDate) / (1000 * 60 * 60 * 24);
        if (daysPassed < 7) {
          const daysLeft = Math.ceil(7 - daysPassed);
          showToast(`Anti-Abuso: Este PC só pode ser vinculado novamente em ${daysLeft} dias.`, 'error');
          return;
        }
      }

      await updateDoc(doc(db, 'users', userData.id, 'devices', deviceObj.id), { 
        globalLinked: true,
        globalUnlinkedAt: null
      });
      showToast('Equipamento vinculado com sucesso.', 'success');
    } catch(e) { showToast('Erro ao vincular.', 'error'); }
  };

  const registeredDevices = userData?.registeredDevices || (userData?.registeredDevice ? [userData.registeredDevice] : []);

  return (
    <div className="tab-enter grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
      
      {/* LICENSES & ACCESS */}
      <Card>
        <CardHeader title={t('dashboard.licenses.title')} icon="key" />
        <p className="text-sm text-on-surface-variant mb-4 mt-2">{t('dashboard.licenses.desc')}</p>
        
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
              className="bg-primary-container text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#e66000] transition-colors shrink-0" 
              onClick={() => window.location.href = `https://us-central1-lispcentral.cloudfunctions.net/generateLoader?token=${userData?.apiKey}`}
            >
              {t('dashboard.licenses.download')}
            </button>
          </div>
        </div>
      </Card>

      {/* LINKED DEVICES */}
      <Card>
        <CardHeader title={`${t('dashboard.equipment.title')} (${devicesList.filter(d => d.globalLinked).length + registeredDevices.filter(d => !devicesList.find(dev => dev.id === d)).length} / ${userData?.maxSeats || 1})`} icon="computer" />
        <p className="text-sm text-on-surface-variant mb-4 mt-2">{t('dashboard.equipment.desc')}</p>
        
        {devicesList.length > 0 || registeredDevices.length > 0 ? (
          <div className="flex flex-col gap-3">
            {/* Iteramos los dispositivos de la subcolección nueva (Fase 3) */}
            {devicesList.map(dev => (
              <div key={dev.id} className={`p-3 rounded-lg border ${dev.globalLinked ? 'bg-[#0D0D0D] border-surface-variant' : 'bg-surface-container-low border-outline-variant/30 opacity-70'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-mono text-sm flex items-center gap-2 ${dev.globalLinked ? 'text-green-400' : 'text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[18px]">computer</span> {dev.name || dev.id}
                  </span>
                  {dev.globalLinked ? (
                    <button 
                      className="bg-error/10 border border-error/30 text-error hover:bg-error hover:text-white font-bold text-xs px-2 py-1 rounded transition-colors" 
                      onClick={() => handleUnlink(dev.id)}
                    >
                      Unlink
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        className="bg-primary-container text-white hover:bg-[#e66000] font-bold text-xs px-3 py-1 rounded transition-colors" 
                        onClick={() => handleLink(dev)}
                      >
                        Link
                      </button>
                      <button 
                        className="bg-transparent text-on-surface-variant hover:text-error transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-error/10" 
                        onClick={() => handleDeleteDevice(dev)}
                        title="Eliminar Equipo Permanentemente"
                        aria-label="Eliminar Equipo Permanentemente"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-on-surface-variant mb-2">Última conexión: {dev.lastActive ? new Date(dev.lastActive.toDate()).toLocaleString() : 'N/A'}</div>
                {dev.globalUnlinkedAt && !dev.globalLinked && (
                  <div className="text-[10px] text-error mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">timer</span>
                    Bloqueado (Penalty de 7 dias)
                  </div>
                )}
              </div>
            ))}
            
            {/* Fallback Legacy */}
            {registeredDevices.filter(d => !devicesList.find(dev => dev.id === d)).map(dev => (
              <div key={dev} className="bg-[#0D0D0D] p-3 rounded-lg border border-surface-variant">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-yellow-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">computer</span> {dev} (Legacy)
                  </span>
                  <button 
                    className="bg-error/10 border border-error/30 text-error hover:bg-error hover:text-white font-bold text-xs px-2 py-1 rounded transition-colors" 
                    onClick={() => handleUnlink(dev)}
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="p-4 text-center border border-dashed border-surface-variant rounded-lg text-on-surface-variant text-sm">
             {t('dashboard.equipment.empty')}
           </div>
        )}
      </Card>


    </div>
  );
}
