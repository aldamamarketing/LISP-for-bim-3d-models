import React from 'react';
import { logout } from '../firebase';
import ToastContainer from './Toast';
import FavoritesManager from './FavoritesManager';
import { useTranslation } from '../i18n/useTranslation';

import { DashboardProvider, useDashboard } from './dashboard/DashboardContext';
import AuthLogin from './dashboard/AuthLogin';
import ProfileTab from './dashboard/ProfileTab';
import LicensesTab from './dashboard/LicensesTab';
import LispFilesCard from './dashboard/LispFilesCard';
import SuitesGroupsCard from './dashboard/SuitesGroupsCard';
import SupportModal from './dashboard/SupportModal';
import SubscriptionsTab from './dashboard/SubscriptionsTab';
import IncomeDashboardTab from './dashboard/IncomeDashboardTab';
import CatalogAdminTab from './dashboard/CatalogAdminTab';

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
      if (['profile', 'licenses', 'files', 'suites', 'favorites', 'notifications', 'subscriptions', 'income', 'catalog-admin'].includes(hash)) {
        setActiveTab(hash);
      } else if (!hash) {
        setActiveTab('licenses');
        window.history.replaceState(null, null, '#licenses');
      }
    };
    
    handleHashChange(); // Initial load
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveTab]);

  // Handle custom event from Astro layout
  React.useEffect(() => {
    const handleOpenModal = () => setShowSupportModal(true);
    window.addEventListener('open-support-modal', handleOpenModal);
    return () => window.removeEventListener('open-support-modal', handleOpenModal);
  }, [setShowSupportModal]);

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
      case 'files': return <LispFilesCard />;
      case 'suites': return <SuitesGroupsCard />;
      case 'favorites': return <FavoritesManager />;
      case 'subscriptions': return <SubscriptionsTab />;
      case 'income': return <IncomeDashboardTab />;
      case 'catalog-admin': return <CatalogAdminTab />;
      case 'notifications': 
        return (
          <div className="tab-enter card">
            <h3 className="mt-0">{t('dashboard.notifications.title')}</h3>
            <p className="text-sm text-on-surface-variant">{t('dashboard.notifications.empty')}</p>
          </div>
        );
      default: return <LicensesTab />;
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
              {activeTab === 'files' ? t('dashboard.sidebar.files') : 
               activeTab === 'suites' ? t('dashboard.sidebar.suites') : 
               activeTab === 'favorites' ? t('dashboard.sidebar.collection') : 
               activeTab === 'profile' ? t('dashboard.sidebar.profile') : 
               activeTab === 'licenses' ? t('dashboard.sidebar.licenses') : 
               activeTab === 'subscriptions' ? t('dashboard.subscriptions.title') :
               activeTab === 'income' ? t('dashboard.sidebar.income') :
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
