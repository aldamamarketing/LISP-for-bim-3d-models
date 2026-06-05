import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';

export default function SubscriptionsTab() {
  const { t } = useTranslation();
  const { userData } = useDashboard();
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscribedSuites, setSubscribedSuites] = useState([]);
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
                  <th className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider w-[40%]">Suite</th>
                  <th className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider">{t('dashboard.subscriptions.subscribedOn')}</th>
                  <th className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider text-center">{t('dashboard.subscriptions.activeAccess')}</th>
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
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-on-surface-variant font-mono">
                          {formatDate(subObj?.subscribedAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20">
                          ACTIVO
                        </span>
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
