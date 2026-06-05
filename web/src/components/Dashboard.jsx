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

  // Handle hash routing on mount and hash change
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['profile', 'licenses', 'lisp', 'favorites', 'notifications'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    
    handleHashChange(); // Initial load
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveTab]);

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
      
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 md:p-8 relative min-h-screen overflow-x-hidden bg-grid-pattern">
        <div className="relative z-10 max-w-[1200px]">
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
      </div>
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
