import React, { useState, useEffect, useCallback } from 'react';
import HatchPreview from './tools/HatchPreview';
import LinetypePreview from './tools/LinetypePreview';
import PaletteDropdownMenu from './PaletteDropdownMenu';
import MultiFilter from './MultiFilter';
import { executeInAutoCAD } from '../utils/autocadBridge';

/**
 * ResourcePalette: paleta embebida en AutoCAD para aplicar Hatches y Linetypes
 * desde los favoritos del usuario. Se comunica con AutoCAD via window.external.
 * 
 * Recibe token y hwid via URL params para autenticación.
 */

const API_BASE = 'https://us-central1-lispcentral.cloudfunctions.net';

export default function ResourcePalette() {
  console.log('[ResourcePalette] Inicializando componente...');
  const [activeTab, setActiveTab] = useState('hatch');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [error, setError] = useState(null);

  // Extraer token/hwid de la URL (inyectados por el Loader LISP)
  const urlParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const token = urlParams.get('token') || '';
  const hwid = urlParams.get('hwid') || '';
  console.log('[ResourcePalette] URL Params capturados:', { token: token ? 'OK' : 'MISSING', hwid });

  // Cargar favoritos desde la API
  const fetchResources = useCallback(async () => {
    console.log('[ResourcePalette] Ejecutando fetchResources para type:', activeTab);
    if (!token) {
      setError('Token não encontrado. Recarregue o Loader.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/getUserResources?token=${encodeURIComponent(token)}&type=${activeTab}`;
      console.log('[ResourcePalette] Fetching from:', url);
      const response = await fetch(url);
      console.log('[ResourcePalette] Fetch response status:', response.status);
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data = await response.json();
      console.log('[ResourcePalette] Dados recebidos:', data.length, 'items');
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar recursos:', err);
      setError('Falha ao carregar recursos. Verifique sua conexão.');
      setResources([]);
    }
    setLoading(false);
  }, [token, activeTab]);

  useEffect(() => {
    console.log('[ResourcePalette] useEffect (activeTab change). activeTab:', activeTab);
    fetchResources();
  }, [fetchResources]);

  // Cargar pinned IDs del localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lc_pinned_resources');
      if (stored) setPinnedIds(JSON.parse(stored));
    } catch { /* ignorar */ }
  }, []);

  const togglePin = (id) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      try { localStorage.setItem('lc_pinned_resources', JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  // Aplicar recurso en AutoCAD
  const handleApply = (item) => {
    const codeB64 = btoa(unescape(encodeURIComponent(item.code)));
    const safeName = (item.name || 'LC_ASSET').replace(/[^a-zA-Z0-9_-]/g, '');

    let lispCommand = '';
    if (activeTab === 'hatch') {
      lispCommand = `(LC_ApplyHatch "${safeName}" "${codeB64}")\n`;
    } else if (activeTab === 'lin') {
      lispCommand = `(LC_ApplyLinetype "${safeName}" "${codeB64}")\n`;
    }

    executeInAutoCAD(lispCommand);
  };

  // Filtrar y ordenar: pinned primero, luego búsqueda
  const filteredResources = resources
    .filter(item => {
      if (activeFilters.length === 0) return true;
      const searchableText = `${item.name || ''} ${item.description || ''}`.toLowerCase();
      return activeFilters.some(tag => searchableText.includes(tag.toLowerCase()));
    })
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 0 : 1;
      const bPinned = pinnedIds.includes(b.id) ? 0 : 1;
      return aPinned - bPinned;
    });

  const tabStyle = (isActive) => ({
    flex: 1,
    padding: '10px 8px',
    backgroundColor: isActive ? 'var(--tmd-orange)' : '#222',
    color: '#fff',
    border: 'none',
    borderRadius: '4px 4px 0 0',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'background 0.15s',
  });

  return (
    <div style={{ backgroundColor: '#181818', color: '#fff', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Tabs Container (Max Width to prevent over-stretching) */}
      <div style={{ margin: '0 auto', width: '100%', maxWidth: '600px' }}>
        <div style={{ padding: '8px 10px', backgroundColor: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--tmd-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PaletteDropdownMenu myId="resources" />
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--tmd-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LispCentral Recursos
            </span>
          </div>
          <button
            onClick={fetchResources}
            style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '0.7rem' }}
            title="Atualizar recursos"
          >
            Sync
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', padding: '8px 8px 0' }}>
          <button onClick={() => setActiveTab('hatch')} style={tabStyle(activeTab === 'hatch')}>
            Hachuras
          </button>
          <button onClick={() => setActiveTab('lin')} style={tabStyle(activeTab === 'lin')}>
            Linhas
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px' }}>
          <MultiFilter
            storageKey="lc_active_filters_res"
            placeholder="Buscar..."
            onFilterChange={setActiveFilters}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid rgba(242,109,33,0.3)', borderTop: '2px solid var(--tmd-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
            Carregando...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c', fontSize: '0.85rem' }}>
            {error}
            <button onClick={fetchResources} style={{ display: 'block', margin: '10px auto', padding: '6px 16px', backgroundColor: 'var(--tmd-orange)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Tentar novamente
            </button>
          </div>
        ) : filteredResources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#666', fontSize: '0.85rem' }}>
            <p>Nenhum recurso encontrado.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
              Adicione {activeTab === 'hatch' ? 'hachuras' : 'linhas'} aos favoritos em{' '}
              <strong style={{ color: 'var(--tmd-orange)' }}>lispcentral.web.app</strong>
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '6px' }}>
            {filteredResources.map(item => {
              const isPinned = pinnedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: isPinned ? 'rgba(242,109,33,0.1)' : '#222',
                    border: `1px solid ${isPinned ? 'rgba(242,109,33,0.4)' : '#333'}`,
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                  onDoubleClick={() => handleApply(item)}
                  title={`${item.name}\n${item.description || ''}\n\nDuplo-clique para aplicar`}
                >
                  {/* Pin indicator */}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(item.id); }}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: 'transparent',
                      border: 'none',
                      color: isPinned ? 'var(--tmd-orange)' : '#555',
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      padding: '2px',
                    }}
                    title={isPinned ? 'Desafixar' : 'Fixar no topo'}
                  >
                    {isPinned ? '[FIXADO]' : '[FIXAR]'}
                  </button>

                  {/* Preview */}
                  <div style={{ width: '100%', height: '50px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', opacity: 0.85, pointerEvents: 'none' }}>
                    {activeTab === 'hatch' && <HatchPreview patCode={item.code} scale={0.3} />}
                    {activeTab === 'lin' && <LinetypePreview linCode={item.code} scale={0.5} />}
                  </div>

                  {/* Name */}
                  <span style={{
                    fontSize: '0.6rem',
                    color: '#ccc',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    lineHeight: '1.2',
                  }}>
                    {item.name}
                  </span>

                  {/* Aplicación al doble click */}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div style={{ padding: '6px 10px', borderTop: '1px solid #333', fontSize: '0.65rem', color: '#555', textAlign: 'center' }}>
        {filteredResources.length} {activeTab === 'hatch' ? 'hachuras' : 'linhas'} - Duplo-clique = aplicar
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
