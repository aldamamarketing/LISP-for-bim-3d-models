import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

export default function IncomeDashboardTab() {
  const { t } = useTranslation();
  return (
    <div className="tab-enter bg-surface-container border border-surface-variant rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
      <span className="material-symbols-outlined text-[64px] text-primary-container mb-4">bar_chart</span>
      <h3 className="text-2xl font-bold mb-2">{t('dashboard.sidebar.income')}</h3>
      <p className="text-on-surface-variant text-center max-w-md">
        {t('dashboard.income.desc')}
      </p>
    </div>
  );
}
