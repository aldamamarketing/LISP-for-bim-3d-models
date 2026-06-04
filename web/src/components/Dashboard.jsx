import React from 'react';
import { logout } from '../firebase';
import ToastContainer from './Toast';
import FavoritesManager from './FavoritesManager';
import { useTranslation } from '../i18n/useTranslation';

import { DashboardProvider, useDashboard } from './dashboard/DashboardContext';
import AuthLogin from './dashboard/AuthLogin';
import ProfileTab from './dashboard/ProfileTab';
import LicensesTab from './dashboard/LicensesTab';
import LispManagerTab from './dashboard/LispManagerTab';
import SupportModal from './dashboard/SupportModal';

function DashboardInner({ mode }) {
  const { t } = useTranslation();
  const { 
    firebaseUser, 
    loading, 
    activeTab, setActiveTab, 
    isMobileMenuOpen, setIsMobileMenuOpen, 
    setShowSupportModal,
    userData,
    unreadCount
  } = useDashboard();

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
      <span className="text-on-surface-variant text-sm">{t('common.loading')}</span>
    </div>
  );

  if (mode === 'login' || !firebaseUser) {
    return <AuthLogin />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab />;
      case 'licenses': return <LicensesTab />;
      case 'lisp': return <LispManagerTab />;
      case 'favorites': return <FavoritesManager />;
      case 'notifications': 
        return (
          <div className="tab-enter card">
            <h3 className="mt-0">{t('dashboard.notifications.title')}</h3>
            <p className="text-sm text-on-surface-variant">{t('dashboard.notifications.empty')}</p>
          </div>
        );
      default: return <LispManagerTab />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-white font-body-md flex-col md:flex-row">
      <ToastContainer />
      <SupportModal />
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-[#0D0D0D] border-b border-[#262626] p-4 flex justify-between items-center z-30 sticky top-0">
        <h2 className="text-xl font-bold text-primary-container flex items-center gap-2">
          <span className="material-symbols-outlined" data-weight="fill">code_blocks</span>
          LispCentral
        </h2>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* OVERLAY FOR MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`w-64 fixed inset-y-0 left-0 bg-[#0D0D0D] border-r border-[#262626] flex flex-col z-30 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 border-b border-[#262626] hidden md:block">
          <h2 className="text-xl font-bold text-primary-container flex items-center gap-2">
            <span className="material-symbols-outlined" data-weight="fill">code_blocks</span>
            LispCentral
          </h2>
          <span className="text-xs text-on-surface-variant mt-1 block">{t('dashboard.breadcrumb.panel')}</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-bold text-[#555] uppercase tracking-wider mb-2 mt-4 px-2">{t('dashboard.sidebar.sectionMain')}</div>
          <button onClick={() => { setActiveTab('lisp'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'lisp' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <span className="material-symbols-outlined text-[20px]">folder_copy</span> {t('dashboard.sidebar.manager')}
          </button>
          <button onClick={() => { setActiveTab('favorites'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'favorites' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <span className="material-symbols-outlined text-[20px]">star</span> {t('dashboard.sidebar.collection')}
          </button>

          <div className="text-xs font-bold text-[#555] uppercase tracking-wider mb-2 mt-6 px-2">{t('dashboard.sidebar.sectionAccount')}</div>
          <button onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <span className="material-symbols-outlined text-[20px]">person</span> {t('dashboard.sidebar.profile')}
          </button>
          <button onClick={() => { setActiveTab('licenses'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'licenses' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <span className="material-symbols-outlined text-[20px]">vpn_key</span> {t('dashboard.sidebar.licenses')}
          </button>
          <button onClick={() => { setActiveTab('notifications'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-[#1a1c1c] text-primary-container border border-[#343535]' : 'text-on-surface-variant hover:text-white hover:bg-[#141414]'}`}>
            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-[20px]">notifications</span> {t('dashboard.sidebar.notifications')}</div>
            {unreadCount > 0 && <span className="bg-primary-container text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
          </button>

          <div className="text-xs font-bold text-[#555] uppercase tracking-wider mb-2 mt-6 px-2">{t('dashboard.sidebar.sectionHelp')}</div>
          <button onClick={() => { setShowSupportModal(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-[#141414] transition-colors">
            <span className="material-symbols-outlined text-[20px]">bug_report</span> {t('dashboard.sidebar.reportBug')}
          </button>
        </nav>
        
        <div className="p-4 border-t border-[#262626]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">{userData?.name?.charAt(0) || 'U'}</div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold truncate">{userData?.name}</div>
              <div className="text-xs text-on-surface-variant truncate">{userData?.role || 'Engenheiro'}</div>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 justify-center px-4 py-2 border border-[#262626] text-on-surface-variant hover:text-red-400 hover:border-red-400/50 rounded-lg transition-colors text-sm">
            <span className="material-symbols-outlined text-[18px]">logout</span> {t('dashboard.sidebar.logout')}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 relative min-h-screen overflow-x-hidden bg-grid-pattern">
        <div className="relative z-10 max-w-[1000px] mx-auto">
          {/* BREADCRUMBS */}
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
            <a href="/" className="hover:text-primary-container transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">home</span> LispCentral</a>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-white">{t('dashboard.breadcrumb.panel')}</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-primary-container font-bold capitalize">
              {activeTab === 'lisp' ? t('dashboard.sidebar.manager') : 
               activeTab === 'favorites' ? t('dashboard.sidebar.collection') : 
               activeTab === 'profile' ? t('dashboard.sidebar.profile') : 
               activeTab === 'licenses' ? t('dashboard.sidebar.licenses') : 
               t('dashboard.sidebar.notifications')}
            </span>
          </div>

          {renderTabContent()}
          
        </div>
      </main>
    </div>
  );
}

export default function Dashboard({ mode = 'dashboard' }) {
  return (
    <DashboardProvider>
      <DashboardInner mode={mode} />
    </DashboardProvider>
  );
}
