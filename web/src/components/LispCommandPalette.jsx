import React, { useState, useEffect, useCallback } from 'react';
import MultiFilter from './MultiFilter';
import { executeInAutoCAD } from '../utils/autocadBridge';
import GlobalHeader from './layout/GlobalHeader';

const API_BASE = 'https://getroutine-wgpjjgorxa-uc.a.run.app/getRoutine';

const GROUP_ICONS = {
  "Estruturas (Pro)": `<svg viewBox="0 0 24 24" fill="none"><path d="M4 22V2m16 20V2m-16 6h16m-16 8h16" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><rect x="8" y="6" width="8" height="12" vector-effect="non-scaling-stroke" fill="currentColor" fill-opacity="0.15" stroke="none"/></svg>`,
  "BIM / Coordenação": `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l9 5.5-9 5.5-9-5.5z" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.15"/><path d="M12 14v7m-9-5.5v7l9 5.5m9-5.5v7l-9 5.5" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/></svg>`,
  "BIM / Anotação": `<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><path d="M8 10h8m-8 4h5" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><rect x="18" y="4" width="4" height="4" vector-effect="non-scaling-stroke" fill="currentColor" fill-opacity="0.2" stroke="none"/></svg>`,
  "BIM / Propriedades": `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><path d="M3 9h18m-12 0v12" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><rect x="11" y="11" width="8" height="2" vector-effect="non-scaling-stroke" fill="currentColor" fill-opacity="0.2" stroke="none"/></svg>`,
  "Quantidades": `<svg viewBox="0 0 24 24" fill="none"><path d="M3 21h18M3 21V3" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><rect x="6" y="12" width="4" height="9" vector-effect="non-scaling-stroke" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.2"/><rect x="14" y="6" width="4" height="15" vector-effect="non-scaling-stroke" fill="currentColor" fill-opacity="0.4" stroke="currentColor" stroke-width="1.2"/></svg>`,
  "Fabricação (Pro)": `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.15"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5m-14.1-7.1l3.5 3.5m7.2 7.2l3.5 3.5m-14.2 0l3.5-3.5m7.2-7.2l3.5-3.5" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/></svg>`,
  "Arquitetura": `<svg viewBox="0 0 24 24" fill="none"><path d="M3 21v-8l9-6 9 6v8H3z" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><path d="M9 21v-6h6v6H9z" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.2"/></svg>`,
  "Arquitetura 2D": `<svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><path d="M4 10h16M10 4v16" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="10" width="10" height="10" vector-effect="non-scaling-stroke" fill="currentColor" fill-opacity="0.15" stroke="none"/></svg>`,
  "Topografia": `<svg viewBox="0 0 24 24" fill="none"><path d="M2 14c3-4 7-6 10-6s7 2 10 6" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><path d="M2 18c3-4 7-6 10-6s7 2 10 6" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.1"/><path d="M12 2v6" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/></svg>`,
  "Sistema / Core": `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3m-13.4-7.1l2.1 2.1m10.6 10.6l2.1 2.1m-14.8 0l2.1-2.1m10.6-10.6l2.1-2.1" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/></svg>`,
  "Comando Geral": `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="14" rx="3" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><path d="M9 9l3 3-3 3M13 15h2" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/></svg>`,
  "Outros": `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="4" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.15"/></svg>`
};

const GROUP_ORDER = [
  "Arquitetura 2D", "Estruturas (Pro)", "BIM / Coordenação", "BIM / Anotação",
  "BIM / Propriedades", "Quantidades", "Fabricação (Pro)", "Arquitetura",
  "Topografia", "Sistema / Core", "Comando Geral", "Custom Tools", "Outros"
];

const SvgIcon = ({ svgString, fallback, cmdName }) => {
  let iconHtml = svgString || fallback;
  
  if (cmdName === 'SUPERFLATTEN') {
    iconHtml = `<svg viewBox="0 0 24 24" fill="none"><path d="M2 16 L12 21 L22 16 L12 11 Z" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.15"/><path d="M6 9 L12 12 L18 9 L12 6 Z" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.4"/><path d="M6 9 V14 M18 9 V14 M12 12 V17" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/><path d="M12 1 V5 M10 3 L12 5 L14 3" vector-effect="non-scaling-stroke" stroke="currentColor" stroke-width="1.5"/></svg>`;
  }

  return (
    <div 
      style={{ 
        width: '48px', 
        height: '48px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'var(--tmd-orange)',
        margin: '0 auto',
        opacity: 0.95
      }} 
      dangerouslySetInnerHTML={{ __html: iconHtml }} 
    />
  );
};

export default function LispCommandPalette({ isUnified = false }) {
  console.log('[LispCommandPalette] Inicializando componente...');
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Get credentials from URL
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = urlParams.get('token') || '';
  const hwid = urlParams.get('hwId') || urlParams.get('hwid') || '';
  // TODO: Remove/disable all console logs before moving to final production environment
  console.log('[LispCommandPalette] URL Params capturados:', { token: token ? 'OK' : 'MISSING', hwid: hwid ? hwid.slice(0, 6) + '...' : 'MISSING' });

  const fetchCommands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}?token=${encodeURIComponent(token)}&hwId=${encodeURIComponent(hwid)}&routine=INDEX`;
      const maskedUrl = `${API_BASE}?token=${token ? encodeURIComponent(token.slice(0, 12) + '...') : ''}&hwId=${hwid ? encodeURIComponent(hwid.slice(0, 6) + '...') : ''}&routine=INDEX`;
      console.log('[LispCommandPalette] Fetching from:', maskedUrl);
      const response = await fetch(url);
      console.log('[LispCommandPalette] Fetch response status:', response.status);
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data = await response.json();
      console.log('[LispCommandPalette] Comandos recebidos:', Array.isArray(data) ? data.length : 0);
      setCommands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching commands:', err);
      setError('Falha ao carregar funções LISP. Verifique a conexão.');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lisp_central_favorites');
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* ignore */ }
    
    fetchCommands();
  }, [fetchCommands]);

  const togglePin = (cmdName, e) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(cmdName) ? prev.filter(p => p !== cmdName) : [...prev, cmdName];
      try { localStorage.setItem('lisp_central_favorites', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleRunCommand = (cmdName) => {
    // Usa LC:run-or-load para garantizar carga JIT desde la nube
    executeInAutoCAD(cmdName);
  };

  // Filter and group
  const filteredCmds = commands.filter(cmd => {
    if (activeFilters.length === 0) return true;
    const searchableText = `${cmd.name || ''} ${cmd.friendly || ''} ${cmd.desc || ''} ${cmd.group || ''}`.toLowerCase();
    // Must match at least ONE tag (OR logic)
    return activeFilters.some(tag => searchableText.includes(tag.toLowerCase()));
  });

  const formatGroupName = (rawGroup) => {
    if (!rawGroup) return 'Outros';
    const match = rawGroup.match(/^SUITE-[^-]+-(.*?)-[0-9]+(\s*-\s*TOOLS)?$/i);
    if (match && match[1]) {
      const name = match[1].replace(/-/g, ' ');
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      return `Suite: ${capitalized}`;
    }
    return rawGroup;
  };

  const grouped = {};
  filteredCmds.forEach(cmd => {
    const g = formatGroupName(cmd.group);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(cmd);
  });

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    let iA = GROUP_ORDER.indexOf(a);
    let iB = GROUP_ORDER.indexOf(b);
    if (a.startsWith('Suite:')) iA = 11.5; // Entre Comando Geral e Custom Tools/Outros
    if (b.startsWith('Suite:')) iB = 11.5;
    if (iA === -1) iA = 99;
    if (iB === -1) iB = 99;
    
    // Sort alphabetically if they have the same priority
    if (iA === iB) return a.localeCompare(b);
    
    return iA - iB;
  });

  return (
    <div style={{ backgroundColor: '#181818', color: '#fff', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Search Container (Max Width to prevent over-stretching) */}
      <div style={{ margin: '0 auto', width: '100%', maxWidth: '600px' }}>
        {/* TOP BAR */}
        {!isUnified ? (
          <div style={{ padding: '8px 10px', backgroundColor: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--tmd-orange)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--tmd-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LispCentral Commands
              </span>
            </div>
            <button
              onClick={() => {
                fetchCommands();
                executeInAutoCAD('LC_SYNC');
              }}
              style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '0.7rem' }}
              title="Atualizar comandos"
            >
              Sync
            </button>
          </div>
        ) : (
          <GlobalHeader title="LispCentral Commands">
            <button
              onClick={() => {
                fetchCommands();
                executeInAutoCAD('LC_SYNC');
              }}
              style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '3px 8px', fontSize: '0.7rem' }}
              title="Atualizar comandos"
            >
              Sync
            </button>
          </GlobalHeader>
        )}

        <div style={{ padding: '8px' }}>
          <MultiFilter
            storageKey="lc_active_filters_cmd"
            placeholder="Search function..."
            onFilterChange={setActiveFilters}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid rgba(242,109,33,0.3)', borderTop: '2px solid var(--tmd-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
            Carregando Funções...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c', fontSize: '0.85rem' }}>
            {error}
            <button onClick={fetchCommands} style={{ display: 'block', margin: '10px auto', padding: '6px 16px', backgroundColor: 'var(--tmd-orange)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div>
            {/* Favorites Section */}
            {favorites.length > 0 && activeFilters.length === 0 && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
                  📌 Favoritos
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '6px' }}>
                  {commands.filter(c => favorites.includes(c.name)).map(cmd => (
                    <CommandItem key={`fav-${cmd.name}`} cmd={cmd} isPinned={true} togglePin={togglePin} onRun={handleRunCommand} />
                  ))}
                </div>
              </div>
            )}

            {/* Grouped Commands */}
            {sortedGroups.map(group => (
              <div key={group} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{group}</span>
                  <span>{grouped[group].length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '6px' }}>
                  {grouped[group].map(cmd => (
                    <CommandItem key={`cmd-${cmd.name}`} cmd={cmd} isPinned={favorites.includes(cmd.name)} togglePin={togglePin} onRun={handleRunCommand} />
                  ))}
                </div>
              </div>
            ))}
            
            {filteredCmds.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#666', fontSize: '0.85rem' }}>
                Nenhuma função encontrada.
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .cmd-item svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .cmd-item {
          background-color: #222;
          border: 1px solid #333;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          transition: all 0.15s;
          position: relative;
          text-align: center;
          min-height: 95px;
          overflow: hidden;
        }
        .cmd-item:hover {
          background-color: #2a2a2a;
          border-color: var(--tmd-orange);
        }
      `}</style>
    </div>
  );
}

function CommandItem({ cmd, isPinned, togglePin, onRun }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="cmd-item" onClick={() => onRun(cmd.name)} title={cmd.desc}>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          background: 'rgba(0,0,0,0.4)',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          color: '#fff',
          fontSize: '1rem',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
        title="Opções"
      >
        ⋮
      </button>

      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: '28px',
          right: '4px',
          background: '#333',
          border: '1px solid #444',
          borderRadius: '4px',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
          boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePin(cmd.name, e);
              setMenuOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              padding: '4px 8px',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.7rem'
            }}
          >
            {isPinned ? 'Desafixar' : '📌 Fixar'}
          </button>
          
          {cmd.doc && cmd.doc !== "#" && (
            <a
              href={`https://lispcentral.web.app/docs/${cmd.doc}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
              style={{
                color: '#fff',
                textDecoration: 'none',
                padding: '4px 8px',
                fontSize: '0.7rem',
                display: 'block'
              }}
            >
              📖 Docs
            </a>
          )}
        </div>
      )}

      {isPinned && (
        <div style={{ position: 'absolute', top: '4px', left: '4px', color: 'var(--tmd-orange)', fontSize: '0.7rem', zIndex: 2 }}>
          📌
        </div>
      )}

      <div style={{ 
        flex: 1, 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '16px 12px 10px 12px',
        boxSizing: 'border-box'
      }}>
        <SvgIcon svgString={cmd.svgIcon} fallback={GROUP_ICONS[cmd.group] || GROUP_ICONS['Outros']} cmdName={cmd.name} />
      </div>
      
      <div style={{ 
        width: '100%', 
        background: 'rgba(0,0,0,0.6)', 
        padding: '6px 4px', 
        borderTop: '1px solid #333' 
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cmd.name}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cmd.friendly || cmd.desc}
        </div>
      </div>
    </div>
  );
}
