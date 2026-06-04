import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';

export default function ProfileTab() {
  const { t } = useTranslation();
  const { userData, setUserData } = useDashboard();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setEditRole(userData.role || '');
    }
  }, [userData, isEditingProfile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!userData) return;
    try {
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, { name: editName, role: editRole });
      setUserData({ ...userData, name: editName, role: editRole });
      setIsEditingProfile(false);
      showToast('Perfil atualizado com sucesso!', 'success');
    } catch(e) {
      showToast('Erro ao atualizar perfil.', 'error');
    }
  };

  return (
    <div className="tab-enter bg-surface-container border border-surface-variant rounded-xl p-5 flex justify-between items-center flex-wrap gap-3 mb-5">
      {isEditingProfile ? (
        <form onSubmit={handleUpdateProfile} className="flex gap-3 items-center w-full">
          <input 
            type="text" 
            value={editName} 
            onChange={e => setEditName(e.target.value)} 
            placeholder="Nome" 
            className="w-full bg-[#0D0D0D] border border-surface-variant text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-container transition-colors" 
          />
          <input 
            type="text" 
            value={editRole} 
            onChange={e => setEditRole(e.target.value)} 
            placeholder="Cargo" 
            className="w-full bg-[#0D0D0D] border border-surface-variant text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-container transition-colors" 
          />
          <button type="submit" className="bg-primary-container text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#e66000] transition-colors whitespace-nowrap">
            {t('dashboard.profile.save')}
          </button>
          <button type="button" className="bg-transparent border border-surface-variant text-on-surface-variant hover:text-white text-sm px-4 py-2 rounded-lg transition-colors ml-2 whitespace-nowrap" onClick={() => setIsEditingProfile(false)}>
            {t('dashboard.profile.cancel')}
          </button>
        </form>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-lg">
              {userData?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-lg font-bold m-0">{userData?.name || 'Usuário Beta'}</h3>
              <span className="text-sm text-on-surface-variant">{userData?.email} • {userData?.role || 'Engenheiro'}</span>
            </div>
          </div>
          <button className="bg-primary-container text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#e66000] transition-colors" onClick={() => setIsEditingProfile(true)}>
            {t('dashboard.profile.editProfile')}
          </button>
        </>
      )}
    </div>
  );
}
