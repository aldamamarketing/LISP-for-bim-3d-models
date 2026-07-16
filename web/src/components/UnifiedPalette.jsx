import React, { useState, useEffect, Suspense, lazy } from 'react';

// Precarga pasiva de componentes para transiciones instantáneas
const SaasPalette = lazy(() => import('./SaasPalette'));
const LispCommandPalette = lazy(() => import('./LispCommandPalette'));
const ResourcePalette = lazy(() => import('./ResourcePalette'));
const PropertiesPalette = lazy(() => import('./PropertiesPalette'));

export default function UnifiedPalette() {
  const [activeTab, setActiveTab] = useState('standards');
  const [loadedTabs, setLoadedTabs] = useState(['standards']);

  // Idle Prefetching
  useEffect(() => {
    // Al cargar la paleta inicial, simulamos inactividad y precargamos las demás
    const timer = setTimeout(() => {
      setLoadedTabs(prev => {
        const next = new Set([...prev, 'commands', 'resources', 'properties']);
        return Array.from(next);
      });
    }, 1500); // Esperar 1.5s antes de empezar a descargar los otros JS
    return () => clearTimeout(timer);
  }, []);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (!loadedTabs.includes(tabId)) {
      setLoadedTabs(prev => [...prev, tabId]);
    }
  };

  const tabs = [
    { 
      id: 'standards', 
      label: 'Standards', 
      icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> 
    },
    { 
      id: 'commands', 
      label: 'Commands', 
      icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg> 
    },
    { 
      id: 'resources', 
      label: 'Hatches', 
      icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> 
    },
    { 
      id: 'properties', 
      label: 'Properties', 
      icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg> 
    }
  ];

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#181818', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Icon Sidebar */}
      <div style={{ 
        width: '50px', 
        backgroundColor: '#111', 
        borderRight: '1px solid #333', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        paddingTop: '8px',
        flexShrink: 0
      }}>
        <div style={{ width: '100%', flex: 1 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === tab.id ? 'var(--tmd-orange)' : '#666',
                cursor: 'pointer',
                padding: '12px 0',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 0.2s',
                borderLeft: activeTab === tab.id ? '3px solid var(--tmd-orange)' : '3px solid transparent'
              }}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        {/* Footer Link */}
        <a 
          href="https://lispcentral.web.app/dashboard" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            marginBottom: '10px',
            color: '#666',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '0.6rem',
            padding: '6px 0',
            width: '100%',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--tmd-orange)'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
          title="Abrir Painel LispCentral Web"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          <span style={{ marginTop: '3px', fontWeight: 'bold' }}>Web</span>
        </a>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid rgba(242,109,33,0.3)', borderTop: '2px solid var(--tmd-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        }>
          {/* Mantenemos montados los componentes para no perder el estado, solo ocultamos visualmente */}
          {loadedTabs.includes('standards') && (
            <div style={{ display: activeTab === 'standards' ? 'block' : 'none', height: '100%' }}>
              <SaasPalette isUnified={true} />
            </div>
          )}
          {loadedTabs.includes('commands') && (
            <div style={{ display: activeTab === 'commands' ? 'block' : 'none', height: '100%' }}>
              <LispCommandPalette isUnified={true} />
            </div>
          )}
          {loadedTabs.includes('resources') && (
            <div style={{ display: activeTab === 'resources' ? 'block' : 'none', height: '100%' }}>
              <ResourcePalette isUnified={true} />
            </div>
          )}
          {loadedTabs.includes('properties') && (
            <div style={{ display: activeTab === 'properties' ? 'block' : 'none', height: '100%' }}>
              <PropertiesPalette isUnified={true} />
            </div>
          )}
        </Suspense>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
