import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';

export default function ProfileTab() {
  const { t } = useTranslation();
  const { userData, setUserData } = useDashboard();
  
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
    }
  }, [userData]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!userData) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, { name: editName });
      setUserData({ ...userData, name: editName });
      showToast(t('dashboard.profile.success') || 'Perfil atualizado com sucesso!', 'success');
    } catch(e) {
      showToast(t('dashboard.profile.error') || 'Erro ao atualizar perfil.', 'error');
    }
    setIsSaving(false);
  };

  const handleResetPassword = async () => {
    if (!userData?.email) return;
    try {
      await sendPasswordResetEmail(auth, userData.email);
      showToast(t('dashboard.profile.resetSent') || 'Email de redefinição enviado!', 'success');
    } catch(e) {
      showToast('Erro ao enviar email.', 'error');
    }
  };

  return (
    <div className="tab-enter">
      <div className="bg-surface-container border border-surface-variant rounded-xl p-6 md:p-8 mb-5">
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-surface-variant">
          <div className="w-20 h-20 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-3xl shadow-lg">
            {userData?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-2xl font-bold m-0">{userData?.name || 'User'}</h3>
            <span className="text-sm text-on-surface-variant bg-[#1a1c1c] px-2.5 py-1 rounded-md mt-2 inline-block border border-surface-variant">
              {userData?.role || 'Beta Tester'}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm font-semibold text-on-surface-variant mb-2">
              {t('dashboard.profile.displayName') || 'Nome de Exibição'}
            </label>
            <input 
              type="text" 
              value={editName} 
              onChange={e => setEditName(e.target.value)} 
              className="w-full bg-[#0D0D0D] border border-surface-variant text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary-container transition-colors" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface-variant mb-2">
              {t('dashboard.profile.email') || 'Email'}
            </label>
            <input 
              type="email" 
              value={userData?.email || ''} 
              disabled
              className="w-full bg-[#1a1c1c] border border-surface-variant text-on-surface-variant rounded-lg px-4 py-3 cursor-not-allowed opacity-70" 
            />
            <p className="text-xs text-on-surface-variant mt-2">
              {t('dashboard.profile.emailNote') || 'O e-mail não pode ser alterado durante a fase Beta.'}
            </p>
          </div>
          
          <div className="pt-6 flex gap-3 flex-wrap">
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-primary-container text-white font-bold text-sm px-6 py-3 rounded-lg hover:bg-[#e66000] transition-colors disabled:opacity-50"
            >
              {isSaving ? '...' : t('dashboard.profile.save')}
            </button>
            <button 
              type="button" 
              onClick={handleResetPassword}
              className="bg-transparent border border-surface-variant text-on-surface-variant hover:text-white text-sm px-6 py-3 rounded-lg transition-colors"
            >
              {t('dashboard.profile.changePassword') || 'Mudar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
