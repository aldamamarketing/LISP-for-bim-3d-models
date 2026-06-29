import React, { useState, useEffect, useCallback, useRef, Suspense, lazy, useMemo } from 'react';
import PaletteDropdownMenu from './PaletteDropdownMenu';
import MultiFilter from './MultiFilter';
import { executeInAutoCAD } from '../utils/autocadBridge';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ARCHETYPES } from './tools/HatchEngine';
import ThumbnailPreview from './tools/ThumbnailPreview';

const HatchGenerator = lazy(() => import('./tools/HatchGenerator'));

/**
 * ResourcePalette
 * 
 * Biblioteca curada de Hachuras e Tipos de Linha para uso direto no AutoCAD.
 * 
 * Arquitetura de dados JIT (3 níveis de cache):
 *  1. Catálogo leve (JSON estático no Hosting): id, nome, categoria, ícone — sem código
 *  2. Sessão LISP em RAM: patCode já baixado nesta sessão, reutilizável
 *  3. Firestore: busca individual do patCode apenas ao inserir pela 1ª vez
 * 
 * Proteção de IP: o campo `code` NUNCA está no JSON estático do catálogo.
 * 
 * Nota: Downloads de arquivo (.pat/.lin) são desabilitados quando a paleta
 * roda dentro do Chromium embebido do AutoCAD, pois o diálogo "Salvar como"
 * congela o thread principal do AutoCAD.
 */

// Iconos por categoría (fallback si el item no tiene ícono propio)
// Detectar se estamos dentro do Chromium embebido do AutoCAD
const isInsideAutoCAD = typeof window !== 'undefined' && (
  typeof window.external?.ExecuteAutoCADCommand === 'function' ||
  typeof window.exec === 'function' ||
  typeof window.execAsync === 'function' ||
  window.location.search.includes('token=')
);

const CATEGORY_ICONS = {
  'Architecture': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 28V14L16 4L28 14V28H4Z"/><path d="M12 28V20H20V28"/></svg>`,
  'Topography':   `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 24L10 12L16 20L22 8L28 20"/><line x1="4" y1="28" x2="28" y2="28"/></svg>`,
  'Materials':    `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="24" height="24" rx="2"/><line x1="4" y1="12" x2="28" y2="12"/><line x1="4" y1="20" x2="28" y2="20"/><line x1="12" y1="4" x2="12" y2="28"/></svg>`,
  'Engineering':  `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="16" cy="16" r="6"/><path d="M16 2v4M16 26v4M2 16h4M26 16h4M6.3 6.3l2.8 2.8M22.9 22.9l2.8 2.8M6.3 25.7l2.8-2.8M22.9 9.1l2.8-2.8"/></svg>`,
  'Decoration':   `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4L19 13H28L21 18L24 27L16 22L8 27L11 18L4 13H13Z"/></svg>`,
  'General':      `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="10" height="10"/><rect x="18" y="4" width="10" height="10"/><rect x="4" y="18" width="10" height="10"/><rect x="18" y="18" width="10" height="10"/></svg>`,
};

const CATALOG_TTL_MS = 60 * 60 * 1000; // 1 hora

// Cache de sesión en RAM (patCode por id, sin persistir al disco)
const sessionPatCache = {};

function SvgIcon({ svgString, category }) {
  const isUrl = typeof svgString === 'string' && (svgString.startsWith('http') || svgString.startsWith('/'));
  const icon = svgString || CATEGORY_ICONS[category] || CATEGORY_ICONS['General'];

  if (isUrl) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 0,
        opacity: 0.8,
      }}>
        <img src={svgString} alt={category} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--tmd-orange)',
      opacity: 0.3,
      zIndex: 0,
    }}>
      <span style={{ width: '64px', height: '64px' }} dangerouslySetInnerHTML={{ __html: icon }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// ContextMenu (clic derecho)
// ─────────────────────────────────────────────
function ContextMenu({ item, position, onClose, onInsert, onPin, onDownload, isPinned }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        backgroundColor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '6px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        zIndex: 9999,
        minWidth: '180px',
        padding: '4px 0',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {[
        { label: `${isPinned ? '📌 Desafixar' : '📌 Fixar no topo'}`, action: onPin },
        { label: '🎯 Inserir no AutoCAD',                              action: onInsert },
        // Download desabilitado dentro do AutoCAD (congela o thread principal)
        ...(!isInsideAutoCAD ? [{ label: '⬇️ Baixar .PAT / .LIN', action: onDownload }] : []),
      ].map(({ label, action }) => (
        <button
          key={label}
          onClick={() => { action(); onClose(); }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            color: '#fff',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '0.78rem',
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#2a2a2a'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ResourceItem
// ─────────────────────────────────────────────
function ResourceItem({ item, isPinned, activeTab, onContextMenu, onInsert }) {
  return (
    <div
      className="res-item"
      onClick={() => onInsert(item)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, item); }}
      title={`${item.name}\n${item.desc || ''}\n\nClique para inserir · Clic derecho para opções`}
      style={{
        position: 'relative',
        height: '100px', // Reducido para formato más apaisado
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        padding: 0,
        backgroundColor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#1a1a1a' }}>
        {(() => {
          const arch = ARCHETYPES.find(a => 
            a.name.toLowerCase() === (item.name || '').toLowerCase() || 
            (a.iconUrl && a.iconUrl === (item.iconUrl || item.icon))
          ) || { 
            id: item.id || 'f', 
            iconUrl: item.iconUrl || item.icon || '/patterns/stack.svg', 
            defaults: { width: 346, height: 600 } 
          };
          return (
            <ThumbnailPreview 
              archetype={arch} 
              containerWidth={180} 
              containerHeight={100} 
            />
          );
        })()}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onContextMenu(e, item, true); }}
        style={{
          position: 'absolute', top: '4px', right: '4px',
          background: 'rgba(255,255,255,0.8)', border: 'none', cursor: 'pointer',
          borderRadius: '50%', width: '24px', height: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isPinned ? 1 : 0.6,
          color: isPinned ? 'var(--tmd-orange)' : '#333',
          fontSize: '0.8rem', padding: '2px',
          zIndex: 2,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        title={isPinned ? 'Desafixar' : 'Fixar no topo'}
      >
        📌
      </button>

      {/* Texto superpuesto al estilo AutoCAD */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        zIndex: 1,
        width: '100%',
        padding: '6px 8px',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(2px)',
      }}>
        <div style={{ fontWeight: '600', fontSize: '0.75rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '1px 1px 2px #000' }}>
          {item.name}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function ResourcePalette() {
  const [activeTab, setActiveTab]       = useState('hatch');
  const [catalog, setCatalog]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [pinnedIds, setPinnedIds]       = useState([]);
  const [contextMenu, setContextMenu]   = useState(null); // { item, position, pinTrigger }
  const [applying, setApplying]         = useState(null); // id del item en proceso
  const [showGenerator, setShowGenerator] = useState(false);

  // Credenciales del Loader (igual que LispCommandPalette)
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token     = urlParams.get('token') || '';

  // ── Cargar catálogo ligero (JIT Nivel 1: localStorage → JSON estático) ──
  const fetchCatalog = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const cacheKey = `lc_catalog_${activeTab}`;
      const tsKey    = `lc_catalog_${activeTab}_ts`;
      const cached   = localStorage.getItem(cacheKey);
      const ts       = parseInt(localStorage.getItem(tsKey) || '0', 10);
      const expired  = Date.now() - ts > 3600000; // 1 hora TTL

      if (cached && !expired && !forceRefresh) {
        setCatalog(JSON.parse(cached));
      } else {
        const url = `https://us-central1-lispcentral.cloudfunctions.net/getUserResources?token=${encodeURIComponent(token)}&type=${encodeURIComponent(activeTab)}&_t=${Date.now()}`;
        const res  = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(tsKey, String(Date.now()));
        setCatalog(data);
      }
    } catch (err) {
      console.error('[ResourcePalette] fetchCatalog error:', err);
      setError('Failed to load catalog.');
    }
    setLoading(false);
  }, [activeTab, token]);

  useEffect(() => {
    fetchCatalog();
    try {
      const stored = localStorage.getItem('lc_pinned_resources');
      if (stored) setPinnedIds(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [fetchCatalog]);

  // ── Insertar hatch/lin en AutoCAD (JIT Nivel 2 + 3) ──
  const handleInsert = async (item) => {
    setApplying(item.id);
    try {
      let patCode = sessionPatCache[item.id];

      // Nivel 3: no está en cache de sesión, bajar desde Firestore
      if (!patCode) {
        const snap = await getDoc(doc(db, 'publicAssets', item.id));
        if (!snap.exists()) throw new Error('Asset not found on server.');
        patCode = snap.data().code;
        // Guardar en cache de sesión RAM (no en disco)
        sessionPatCache[item.id] = patCode;
      }

      const safeName = item.name.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();

      // ── Bridge seguro: inyectar datos silenciosamente via evaluateLisp ──
      // Luego disparar el Ghost Command limpio via executeCommandAsync
      // NUNCA enviar expresiones LISP completas via executeCommandAsync (bug de repetición)
      executeInAutoCAD(`(setq *LC-ASSET-TYPE* "${activeTab}")`);
      executeInAutoCAD(`(setq *LC-ASSET-NAME* "${safeName}")`);
      
      // FIX: Chunk string to avoid Access Violation y Syntax Errors.
      // 1. Tamaño seguro (100) para evitar buffer overflow en línea de comandos.
      // 2. Trocear el texto PRIMERO y escapar DESPUÉS, para no romper secuencias de escape.
      executeInAutoCAD(`(setq *LC-ASSET-CODE* "")`);
      const chunkSize = 100;
      for (let i = 0; i < patCode.length; i += chunkSize) {
        const rawChunk = patCode.substring(i, i + chunkSize);
        const escapedChunk = rawChunk
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        
        executeInAutoCAD(`(progn (setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "${escapedChunk}")) (princ))`);
      }
      
      executeInAutoCAD('LC_APPLY_ASSET');

    } catch (err) {
      console.error('[ResourcePalette] handleInsert error:', err);
    }
    setApplying(null);
  };

  // ── Download local ──
  const handleDownload = (item) => {
    // Intentar obtener de cache de sesión primero
    const patCode = sessionPatCache[item.id];
    if (!patCode) {
      // Si no está en cache, necesita ser insertado primero o
      // se puede bajar el código directo para el download
      handleInsertThenDownload(item);
      return;
    }
    triggerDownload(item, patCode);
  };

  const handleInsertThenDownload = async (item) => {
    try {
      const snap = await getDoc(doc(db, 'publicAssets', item.id));
      if (!snap.exists()) return;
      const patCode = snap.data().code;
      sessionPatCache[item.id] = patCode;
      triggerDownload(item, patCode);
    } catch (err) {
      console.error('[ResourcePalette] download error:', err);
    }
  };

  const triggerDownload = (item, patCode) => {
    const ext      = activeTab === 'hatch' ? 'pat' : 'lin';
    const header   = activeTab === 'hatch'
      ? `*${item.name}, ${item.desc || ''}\n`
      : `*${item.name}, ${item.desc || ''}\n`;
    const content  = header + patCode + '\n';
    const blob     = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = `${item.name.replace(/\s+/g, '_')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Pin / Favoritos (localStorage) ──
  const togglePin = (id) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      try { localStorage.setItem('lc_pinned_resources', JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  // ── Menú contextual ──
  const handleContextMenu = (e, item, pinTrigger = false) => {
    setContextMenu({
      item,
      position: { x: e.clientX, y: e.clientY },
      pinTrigger,
    });
  };

  // ── Filtrado y agrupamiento (igual que LispCommandPalette) ──
  const { filtered, pinned, grouped, sortedCategories } = useMemo(() => {
    const normalizedFilters = activeFilters.map(tag => tag.toLowerCase());

    const filteredItems = catalog.filter(item => {
      if (normalizedFilters.length === 0) return true;
      const text = `${item.name} ${item.desc || ''} ${item.category}`.toLowerCase();
      return normalizedFilters.some(tag => text.includes(tag));
    });

    const pinnedItems = filteredItems.filter(i => pinnedIds.includes(i.id));
    const groupsMap = {};

    filteredItems.forEach(item => {
      if (pinnedIds.includes(item.id)) return; // ya en sección pinned
      const cat = item.category || 'General';
      if (!groupsMap[cat]) groupsMap[cat] = [];
      groupsMap[cat].push(item);
    });

    const sortedCats = Object.keys(groupsMap).sort();

    return {
      filtered: filteredItems,
      pinned: pinnedItems,
      grouped: groupsMap,
      sortedCategories: sortedCats
    };
  }, [catalog, activeFilters, pinnedIds]);

  const tabBtn = (id, label) => ({
    flex: 1,
    padding: '8px 6px',
    backgroundColor: activeTab === id ? 'var(--tmd-orange)' : '#1e1e1e',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: activeTab === id ? 'bold' : 'normal',
    transition: 'background 0.15s',
  });

  return (
    <div style={{ backgroundColor: '#181818', color: '#fff', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', position: 'relative' }}>
      

        {/* Header (idéntico a LispCommandPalette) */}
        <div style={{ margin: '0 auto', width: '100%', maxWidth: '600px' }}>
        <div style={{ padding: '8px 10px', backgroundColor: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--tmd-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PaletteDropdownMenu myId="resources" />
            
            {!showGenerator ? (
              <select 
                value={activeTab} 
                onChange={(e) => setActiveTab(e.target.value)}
                style={{ 
                  background: 'transparent', 
                  color: 'var(--tmd-orange)', 
                  border: 'none', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="hatch">Hatches</option>
                <option value="lin">Lines</option>
              </select>
            ) : (
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--tmd-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LispCentral Hatches
              </span>
            )}
            
          </div>
          <button
            onClick={() => fetchCatalog(true)}
            style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '0.7rem' }}
            title="Update catalog"
          >
            Sync
          </button>
        </div>

        {/* Búsqueda y Botón Gerador */}
        <div style={{ padding: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!showGenerator && (
            <>
              <div style={{ flex: 1 }}>
                <MultiFilter
                  storageKey={`lc_filters_res_${activeTab}`}
                  placeholder="Search pattern..."
                  onFilterChange={setActiveFilters}
                />
              </div>
              {activeTab === 'hatch' && !showGenerator && (
                <button
                  onClick={() => setShowGenerator(true)}
                  style={{
                    backgroundColor: 'var(--tmd-orange)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + Generator
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        {showGenerator ? (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Suspense fallback={<div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>Loading generator...</div>}>
              <HatchGenerator lang="en" isEmbedded={true} onClose={() => setShowGenerator(false)} />
            </Suspense>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid rgba(242,109,33,0.3)', borderTop: '2px solid var(--tmd-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
            Loading Catalog...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c', fontSize: '0.85rem' }}>
            {error}
            <button onClick={() => fetchCatalog(true)} style={{ display: 'block', margin: '10px auto', padding: '6px 16px', backgroundColor: 'var(--tmd-orange)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {/* Seção Favoritos (pinned) */}
            {pinned.length > 0 && activeFilters.length === 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>📌 Favorites</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                  {pinned.map(item => (
                    <ResourceItem
                      key={`pin-${item.id}`}
                      item={item}
                      isPinned={true}
                      activeTab={activeTab}
                      onContextMenu={handleContextMenu}
                      onInsert={handleInsert}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Grupos por categoría */}
            {sortedCategories.map(cat => (
              <div key={cat} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{cat}</span>
                  <span>{grouped[cat].length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                  {grouped[cat].map(item => (
                    <ResourceItem
                      key={item.id}
                      item={item}
                      isPinned={pinnedIds.includes(item.id)}
                      activeTab={activeTab}
                      onContextMenu={handleContextMenu}
                      onInsert={handleInsert}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#666', fontSize: '0.85rem' }}>
                <p>No patterns found.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                  Add patterns at{' '}
                  <strong style={{ color: 'var(--tmd-orange)' }}>lispcentral.web.app</strong>
                </p>
              </div>
            )}

            {/* Indicador de loading JIT al insertar */}
            {applying && (
              <div style={{ position: 'fixed', bottom: '12px', right: '12px', backgroundColor: '#1a1a1a', border: '1px solid var(--tmd-orange)', borderRadius: '6px', padding: '8px 14px', fontSize: '0.75rem', color: 'var(--tmd-orange)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9998 }}>
                <div style={{ width: '12px', height: '12px', border: '2px solid rgba(242,109,33,0.3)', borderTop: '2px solid var(--tmd-orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Carregando padrão...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '5px 10px', borderTop: '1px solid #222', fontSize: '0.6rem', color: '#555', textAlign: 'center' }}>
        {filtered.length} padrões · Clique para inserir · Clic derecho para opções
      </div>



      {/* Menú contextual */}
      {contextMenu && (
        <ContextMenu
          item={contextMenu.item}
          position={contextMenu.position}
          isPinned={pinnedIds.includes(contextMenu.item.id)}
          onClose={() => setContextMenu(null)}
          onInsert={() => handleInsert(contextMenu.item)}
          onPin={() => togglePin(contextMenu.item.id)}
          onDownload={() => handleDownload(contextMenu.item)}
        />
      )}


      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .res-item {
          background-color: #222;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 8px 6px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          transition: all 0.15s;
          position: relative;
          text-align: center;
          min-height: 85px;
        }
        .res-item:hover {
          background-color: #2a2a2a;
          border-color: var(--tmd-orange);
        }
      `}</style>
    </div>
  );
}
