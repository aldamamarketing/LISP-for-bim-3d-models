import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';

export default function SupportModal() {
  const { t } = useTranslation();
  const { userData, showSupportModal, setShowSupportModal } = useDashboard();
  
  const [supportType, setSupportType] = useState('bug');
  const [supportLocation, setSupportLocation] = useState('app');
  const [supportMsg, setSupportMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showSupportModal) return null;

  const handleSendSupport = async (e) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        tenantId: userData.id,
        email: userData.email,
        type: supportType,
        location: supportLocation,
        message: supportMsg,
        createdAt: serverTimestamp(),
        status: 'open'
      });
      showToast('Mensagem enviada! Nossa equipe entrará em contato.', 'success');
      setShowSupportModal(false);
      setSupportMsg('');
    } catch(e) {
      console.error(e);
      showToast('Erro ao enviar mensagem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div
        className="bg-surface-container border border-surface-variant rounded-xl w-full max-w-md p-6 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
      >
        <button 
          onClick={() => setShowSupportModal(false)} 
          className="absolute top-4 right-4 text-on-surface-variant hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white outline-none"
          aria-label="Close support modal"
          title="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h3 id="support-modal-title" className="text-xl font-bold mb-4">{t('dashboard.support.title')}</h3>
        <form onSubmit={handleSendSupport}>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label htmlFor="support-type" className="block text-sm text-on-surface-variant mb-2">Asunto</label>
              <select 
                id="support-type"
                value={supportType} 
                onChange={e => setSupportType(e.target.value)} 
                className="w-full bg-[#0D0D0D] border border-surface-variant text-white rounded-lg p-3 focus:outline-none focus:border-primary-container"
              >
                <option value="bug">{t('dashboard.support.bug')}</option>
                <option value="feature">{t('dashboard.support.feature')}</option>
                <option value="help">{t('dashboard.support.help')}</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="support-location" className="block text-sm text-on-surface-variant mb-2">{t('dashboard.support.location')}</label>
              <select 
                id="support-location"
                value={supportLocation} 
                onChange={e => setSupportLocation(e.target.value)} 
                className="w-full bg-[#0D0D0D] border border-surface-variant text-white rounded-lg p-3 focus:outline-none focus:border-primary-container"
              >
                <option value="app">{t('dashboard.support.loc_app')}</option>
                <option value="loader">{t('dashboard.support.loc_loader')}</option>
                <option value="lisp">{t('dashboard.support.loc_lisp')}</option>
                <option value="palette">{t('dashboard.support.loc_palette')}</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="support-msg" className="block text-sm text-on-surface-variant mb-2">Mensagem</label>
            <textarea 
              id="support-msg"
              value={supportMsg} 
              onChange={e => setSupportMsg(e.target.value)} 
              className="w-full bg-[#0D0D0D] border border-surface-variant text-white rounded-lg p-3 h-32 resize-none focus:outline-none focus:border-primary-container" 
              placeholder={t('dashboard.support.placeholder')}
            ></textarea>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary-container text-white font-bold py-3 rounded-lg hover:bg-[#e66000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </>
            ) : t('dashboard.support.send')}
          </button>
        </form>
      </div>
    </div>
  );
}
