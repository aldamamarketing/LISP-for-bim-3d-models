import React, { useState, useEffect, useCallback } from 'react';
import PaletteDropdownMenu from './PaletteDropdownMenu';
import MultiFilter from './MultiFilter';
import StandardsList from './saas/StandardsList';
import ContextSwitcher from './saas/ContextSwitcher';
import { executeInAutoCAD } from '../utils/autocadBridge';

export default function SaasPalette() {
  console.log('[SaasPalette] Inicializando componente...');
  const [activeFilters, setActiveFilters] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(''); // Empty means 'None'
  const [isOwner, setIsOwner] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEditingStandard, setIsEditingStandard] = useState(false);
  const [currentStandard, setCurrentStandard] = useState(null);

  // Get credentials from URL
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = urlParams.get('token') || '';
  const hwid = urlParams.get('hwId') || urlParams.get('hwid') || '';

  const handleSync = () => {
    executeInAutoCAD('LC_SYNC');
  };

  const handleInject = () => {
    if (!currentStandard) {
      console.warn('[LC] No standard loaded to apply.');
      return;
    }
    // Build a single (progn ...) LISP expression.
    // JS parses the JSON, LISP only applies — no JSON parsing needed in LISP.
    const cmds = [];
    Object.entries(currentStandard.layers || {}).forEach(([name, p]) => {
      const escapedName = name.replace(/"/g, '\\"');
      const escapedLtype = (p.ltype || 'Continuous').replace(/"/g, '\\"');
      cmds.push(`(LC:apply-layer "${escapedName}" ${p.color} "${escapedLtype}" ${p.lineweight || 25})`);
    });
    Object.entries(currentStandard.textStyles || {}).forEach(([name, p]) => {
      const escapedName = name.replace(/"/g, '\\"');
      const escapedFont = (p.font || '').replace(/"/g, '\\"');
      cmds.push(`(LC:apply-textstyle "${escapedName}" "${escapedFont}" ${p.height || 0})`);
    });
    if (cmds.length === 0) return;
    cmds.push('(c:LC_APPLY_COMPLETE)');
    executeInAutoCAD(`(progn ${cmds.join(' ')})`);
  };

  const handleUploadStandard = () => {
    setIsExtracting(true);
    // Sin espacio final — AutoCAD interpreta espacio como "repetir último comando"
    executeInAutoCAD(`(LC:extract-standards)`);    
    setTimeout(() => setIsExtracting(false), 30000);
  };

  return (
    <div style={{ backgroundColor: '#181818', color: '#fff', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Search Container */}
      <div style={{ margin: '0 auto', width: '100%', maxWidth: '600px', flexShrink: 0 }}>
        {/* TOP BAR */}
        <div style={{ padding: '8px 10px', backgroundColor: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--tmd-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PaletteDropdownMenu myId="saas" />
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--tmd-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LISPCENTRAL NORMAS
            </span>
          </div>
          <button
            onClick={handleSync}
            style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '0.7rem' }}
            title="Sync Commands"
          >
            Sync
          </button>
        </div>

        {/* SEARCH BAR */}
        <div style={{ padding: '8px 8px 4px 8px' }}>
          <MultiFilter
            storageKey="lc_active_filters_saas"
            placeholder="Search layer/style..."
            onFilterChange={setActiveFilters}
          />
        </div>

        {/* CONTEXT SWITCHER (Debajo de barra de búsqueda) */}
        <div style={{ padding: '4px 8px 8px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1, opacity: isEditingStandard ? 0.5 : 1, pointerEvents: isEditingStandard ? 'none' : 'auto' }}>
            <ContextSwitcher onContextChange={(id, owner) => { setActiveTeamId(id); setIsOwner(owner); }} />
          </div>
          {isOwner && (
            <button 
              onClick={handleUploadStandard}
              title="Update Standard in Cloud"
              style={{
                background: 'transparent',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#4ade80',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px', position: 'relative' }}>
        {isExtracting && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4ade80' }}>
            <span className="animate-pulse font-bold">Scanning DWG...</span>
          </div>
        )}
        <StandardsList 
          teamId={activeTeamId} 
          searchFilters={activeFilters} 
          isExtracting={isExtracting}
          onExtractComplete={() => setIsExtracting(false)}
          onEditingStateChange={setIsEditingStandard}
          onStandardLoaded={setCurrentStandard}
        />
      </div>

      {/* STICKY FOOTER */}
      {!isEditingStandard && (
        <div style={{
          flexShrink: 0,
          backgroundColor: '#111',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#ccc', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={autoApply}
              onChange={e => setAutoApply(e.target.checked)}
              style={{ accentColor: 'var(--tmd-orange)' }}
            />
            Apply automatically when drawing
          </label>
          
          <button 
            onClick={handleInject}
            style={{
              width: '100%',
              backgroundColor: 'var(--tmd-orange)',
              color: '#fff',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            Apply Standard to DWG
          </button>
        </div>
      )}

    </div>
  );
}
