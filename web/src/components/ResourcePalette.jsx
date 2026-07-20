import React, { useState, useEffect, useCallback, useRef } from 'react';
import MultiFilter from './MultiFilter';
import { executeInAutoCAD } from '../utils/autocadBridge';
import GlobalHeader from './layout/GlobalHeader';
import { getPublicAssets } from '../utils/library';

/**
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

// Cuando el HTML vive en %TEMP% (file://), los fetch relativos fallan.
// HOSTING_BASE asegura que todos los recursos estáticos usen la URL de Firebase.
const HOSTING_BASE = (typeof window !== 'undefined' && window.location.protocol === 'file:')
  ? 'https://lispcentral.web.app'
  : '';

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
    // Prefijamos HOSTING_BASE si la URL es relativa
    const resolvedSrc = svgString.startsWith('http') ? svgString : `${HOSTING_BASE}${svgString}`;
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
        <img src={resolvedSrc} alt={category} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
function ResourceItem({ item, isPinned, onContextMenu, onInsert }) {
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
      <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
        {(() => {
          const src = item.iconUrl || item.image_url || '/patterns/stack.svg';
          const isSvg = src.endsWith('.svg') || src.startsWith('data:image/svg');
          
          if (!isSvg) {
            return <img src={src} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />;
          }

          // Para lograr la cuadrícula 2x2 que cubra sin deformar:
          // Creamos un contenedor interno del 200% del tamaño, centrado.
          // Con background-size: 25% (que equivale al 50% de la tarjeta real),
          // logramos que el tile no se deforme (mantiene su aspect-ratio original),
          // se repita de forma perfecta y cubra el visor con desbordamiento oculto.
          return (
            <div style={{
              position: 'absolute', top: '-50%', left: '-50%',
              width: '200%', height: '200%',
              backgroundImage: `url(${src})`,
              backgroundSize: '25%', // El ancho del SVG será el 50% del visor real (2 columnas)
              backgroundRepeat: 'repeat',
              backgroundPosition: 'center',
              opacity: 0.8,
              filter: 'invert(1) hue-rotate(180deg)'
            }} />
          );
        })()}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onContextMenu(e, item, true); }}
        style={{
          position: 'absolute', top: '4px', right: '4px',
          background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
          borderRadius: '4px', width: '24px', height: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isPinned ? 'var(--tmd-orange)' : '#fff',
          fontSize: '1.2rem', padding: '0',
          zIndex: 2,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        title="Opções"
      >
        &#8942;
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
export default function ResourcePalette({ isUnified = false }) {
  const [catalog, setCatalog]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [pinnedIds, setPinnedIds]       = useState([]);
  const [contextMenu, setContextMenu]   = useState(null);
  const [applying, setApplying]         = useState(null);

  // ── Cargar catálogo desde Firestore publicAssets ──
  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicAssets('hatch');
      setCatalog(data);
    } catch (err) {
      console.error('[ResourcePalette] fetchCatalog error:', err);
      setError('Failed to load catalog.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCatalog();
    try {
      const stored = localStorage.getItem('lc_pinned_resources');
      if (stored) setPinnedIds(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [fetchCatalog]);

  // ── Insertar hatch/lin en AutoCAD (JIT) ──
  const handleInsert = async (item) => {
    setApplying(item.id);
    try {
      const patCode = item.code;
      if (!patCode) throw new Error('Código del patrón no disponible.');

      const safeName = item.name.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();

      // ── Bridge seguro: inyectar datos silenciosamente via evaluateLisp ──
      // Luego disparar el Ghost Command limpio via executeCommandAsync
      // NUNCA enviar expresiones LISP completas via executeCommandAsync (bug de repetición)
      executeInAutoCAD(`(setq *LC-ASSET-TYPE* "hatch")`);
      executeInAutoCAD(`(setq *LC-ASSET-NAME* "${safeName}")`);
      
      // PRESERVE ORIGINAL HEADER AND COMMENTS: 
      // core_engine.lsp injects ", LispCentral" if the very first char isn't '*'.
      // If the pattern has comments before the '*', we move the '*' line to the very top.
      const lines = patCode.split('\n');
      const starIndex = lines.findIndex(l => l.trim().startsWith('*'));
      if (starIndex > 0) {
        const starLine = lines.splice(starIndex, 1)[0];
        lines.unshift(starLine);
      }
      const finalPatCode = lines.join('\n');

      // FIX: Chunk string to avoid Access Violation y Syntax Errors.
      // 1. Tamaño seguro (100) para evitar buffer overflow en línea de comandos.
      // 2. Trocear el texto PRIMERO y escapar DESPUÉS, para no romper secuencias de escape.
      executeInAutoCAD(`(setq *LC-ASSET-CODE* "")`);
      const chunkSize = 100;
      for (let i = 0; i < finalPatCode.length; i += chunkSize) {
        const rawChunk = finalPatCode.substring(i, i + chunkSize);
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
      const res = await fetch(item.pat_url);
      if (!res.ok) return;
      const patCode = await res.text();
      sessionPatCache[item.id] = patCode;
      triggerDownload(item, patCode);
    } catch (err) {
      console.error('[ResourcePalette] download error:', err);
    }
  };

  const triggerDownload = (item, patCode) => {
    const ext = 'pat';
    const safeName = (item.name || `LC_Hatch_${item.id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // PRESERVE ORIGINAL HEADER AND COMMENTS
    let content = '';
    const lines = patCode.split('\n');
    const starIndex = lines.findIndex(l => l.trim().startsWith('*'));
    
    if (starIndex >= 0) {
      const parts = lines[starIndex].split(',');
      lines[starIndex] = `*${safeName}, ${parts.slice(1).join(',')}`;
      content = lines.join('\n') + '\n';
    } else {
      const header = `*${safeName}, ${item.desc || ''}\n`;
      content = header + patCode + '\n';
    }
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
  const filtered = catalog.filter(item => {
    if (activeFilters.length === 0) return true;
    const text = `${item.name} ${item.desc || ''} ${item.category}`.toLowerCase();
    return activeFilters.some(tag => text.includes(tag.toLowerCase()));
  });

  const pinned  = filtered.filter(i => pinnedIds.includes(i.id));
  const grouped = {};
  filtered.forEach(item => {
    if (pinnedIds.includes(item.id)) return; // ya en sección pinned
    const cat = item.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  const sortedCategories = Object.keys(grouped).sort();


  return (
    <div style={{ backgroundColor: '#181818', color: '#fff', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', position: 'relative' }}>
      

        {/* Header */}
        <div style={{ margin: '0 auto', width: '100%', maxWidth: '600px' }}>
        {!isUnified ? (
          <div style={{ padding: '8px 10px', backgroundColor: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--tmd-orange)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--tmd-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LispCentral Hatches
              </span>
            </div>
            <button
              onClick={() => fetchCatalog()}
              style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '0.7rem' }}
              title="Update catalog"
            >
              Sync
            </button>
          </div>
        ) : (
          <GlobalHeader title="LispCentral Hatches">
            <button
              onClick={() => fetchCatalog()}
              style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '0.7rem' }}
              title="Update catalog"
            >
              Sync
            </button>
          </GlobalHeader>
        )}

        {/* Búsqueda */}
        <div style={{ padding: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <MultiFilter
              storageKey="lc_filters_res_hatch"
              placeholder="Search pattern..."
              onFilterChange={setActiveFilters}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        {loading ? (
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
