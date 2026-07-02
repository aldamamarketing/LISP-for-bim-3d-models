import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import DiffMergePanel from './DiffMergePanel';

export default function StandardsList({ teamId, searchFilters = [], isExtracting, onExtractComplete, onEditingStateChange, onStandardLoaded }) {
  const [standard, setStandard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('layers');
  const [draft, setDraft] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [panelMode, setPanelMode] = useState('extract');
  const lastDraftRef = useRef(null);

  useEffect(() => {
    if (!teamId) {
      setStandard(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const token = urlParams.get('token');

    if (!auth.currentUser && token) {
      // Estamos en la Paleta CefSharp, usamos REST API
      const API_BASE = window.location.hostname === "localhost"
        ? "http://127.0.0.1:5001/lispcentral/us-central1"
        : "https://us-central1-lispcentral.cloudfunctions.net";
      
      const fetchStandard = () => {
        fetch(`${API_BASE}/getStandard?token=${encodeURIComponent(token)}&teamId=${encodeURIComponent(teamId)}`)
          .then(res => {
            if (!res.ok) throw new Error("Network response was not ok");
            return res.json();
          })
          .then(data => {
            setStandard(data);
            setLoading(false);
            if (onStandardLoaded) onStandardLoaded(data);
          })
          .catch(err => {
            console.error("Error fetching standard via API:", err);
            setStandard(null);
            setLoading(false);
          });
      };

      fetchStandard();
      return;
    }

    // Flujo normal (Dashboard)
    const unsub = onSnapshot(doc(db, "teams", teamId, "standards", "current"), (d) => {
      if (d.exists()) {
        const data = d.data().standardData;
        setStandard(data);
        if (onStandardLoaded) onStandardLoaded(data);
      } else {
        setStandard(null);
        if (onStandardLoaded) onStandardLoaded(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener la norma:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [teamId]);

  // Polling for Draft when isExtracting or isAuditing is true
  useEffect(() => {
    if (isExtracting && panelMode !== 'extract') setPanelMode('extract');
    if (!isExtracting && !isAuditing) return;

    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const token = urlParams.get('token');
    if (!token || !teamId) return;

    const API_BASE = window.location.hostname === "localhost"
      ? "http://127.0.0.1:5001/lispcentral/us-central1"
      : "https://us-central1-lispcentral.cloudfunctions.net";

    const interval = setInterval(() => {
      fetch(`${API_BASE}/getDraft?token=${encodeURIComponent(token)}&teamId=${encodeURIComponent(teamId)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.draftData) {
            // Check if it's a new draft based on timestamp string or just assume it's new
            const currentDraftJson = JSON.stringify(data.draftData);
            if (currentDraftJson !== lastDraftRef.current) {
              lastDraftRef.current = currentDraftJson;
              setDraft(data.draftData);
              setShowDiff(true);
              if (onEditingStateChange) onEditingStateChange(true);
              if (onExtractComplete) onExtractComplete();
              setIsAuditing(false);
              clearInterval(interval);
            }
          }
        })
        .catch(console.error);
    }, 2000);

    return () => clearInterval(interval);
  }, [isExtracting, isAuditing, panelMode, teamId, onExtractComplete]);

  const handleCommitMerge = ({ merged, selectedActions, layerMappings }) => {
    setShowDiff(false);
    if (onEditingStateChange) onEditingStateChange(false);
    
    if (panelMode === 'audit') {
      // FIX DWG MODE: Construct LISP to apply fixes to DWG
      const cmds = [];

      // 1. Rename extra layers mapped to standard layers
      if (layerMappings) {
        Object.keys(layerMappings).forEach(oldLayer => {
          const newLayer = layerMappings[oldLayer];
          const escapedOld = oldLayer.replace(/"/g, '\\"');
          const escapedNew = newLayer.replace(/"/g, '\\"');
          // Rename if old exists and new does NOT exist (to prevent rename crash)
          cmds.push(`(if (and (tblsearch "LAYER" "${escapedOld}") (not (tblsearch "LAYER" "${escapedNew}"))) (command ".-rename" "layer" "${escapedOld}" "${escapedNew}"))`);
        });
      }

      // 2. Apply standard properties (color, linetype)
      const addCmds = (items, sourceMap) => {
        items.forEach(item => {
          if (item.type === 'layer') {
            const p = sourceMap.layers[item.key];
            if (p) {
              const escapedName = item.key.replace(/"/g, '\\"');
              const escapedLtype = (p.ltype || 'Continuous').replace(/"/g, '\\"');
              cmds.push(`(LC:apply-layer "${escapedName}" ${p.color} "${escapedLtype}" ${p.lineweight || 25})`);
            }
          } else if (item.type === 'style') {
            const p = sourceMap.textStyles[item.key];
            if (p) {
              const escapedName = item.key.replace(/"/g, '\\"');
              const escapedFont = (p.font || '').replace(/"/g, '\\"');
              cmds.push(`(LC:apply-textstyle "${escapedName}" "${escapedFont}" ${p.height || 0})`);
            }
          } else if (item.type === 'dimStyle') {
            const p = sourceMap.dimStyles[item.key];
            if (p) {
              const escapedName = item.key.replace(/"/g, '\\"');
              cmds.push(`(LC:apply-dimstyle "${escapedName}" ${p.dimscale || 0} ${p.dimtxt || 0} ${p.dimdec || 0})`);
            }
          } else if (item.type === 'globalVar') {
            const p = sourceMap.globalVars[item.key];
            if (p && p.value !== undefined) {
              cmds.push(`(setvar "${item.key}" ${p.value})`);
            }
          } else if (item.type === 'linetype') {
            cmds.push(`(LC:apply-linetype "${item.key.replace(/"/g, '\\"')}")`);
          } else if (item.type === 'mleaderStyle') {
            cmds.push(`(LC:apply-mleaderstyle "${item.key.replace(/"/g, '\\"')}")`);
          } else if (item.type === 'tableStyle') {
            cmds.push(`(LC:apply-tablestyle "${item.key.replace(/"/g, '\\"')}")`);
          } else if (item.type === 'scaleList') {
            cmds.push(`(LC:apply-scale "${item.key.replace(/"/g, '\\"')}")`);
          }
        });
      };
      // We apply standard values (from currentStandard) to fix the DWG
      addCmds(selectedActions.modifiedItems, standard);
      addCmds(selectedActions.missingItems, standard);

      // If a layer was "mapped" (and thus not formally selected as missing), 
      // we still need to apply its standard color/linetype because it just got renamed!
      if (layerMappings) {
        Object.values(layerMappings).forEach(targetLayer => {
          // If it wasn't already in missingItems to be processed
          if (!selectedActions.missingItems.find(i => i.key === targetLayer)) {
            const p = standard.layers[targetLayer];
            if (p) {
              const escapedName = targetLayer.replace(/"/g, '\\"');
              const escapedLtype = (p.ltype || 'Continuous').replace(/"/g, '\\"');
              cmds.push(`(LC:apply-layer "${escapedName}" ${p.color} "${escapedLtype}" ${p.lineweight || 25})`);
            }
          }
        });
      }

      if (cmds.length > 0) {
        cmds.push('(c:LC_APPLY_COMPLETE)');
        import('../../utils/autocadBridge').then(m => {
          m.executeInAutoCAD(`(progn ${cmds.join(' ')})`);
        });
      }
      return;
    }

    // EXTRACT MODE: Sync merged standard to Cloud
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const token = urlParams.get('token');
    
    if (!auth.currentUser && token) {
      const API_BASE = window.location.hostname === "localhost"
        ? "http://127.0.0.1:5001/lispcentral/us-central1"
        : "https://us-central1-lispcentral.cloudfunctions.net";
        
      fetch(`${API_BASE}/syncStandard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, teamId, standardData: merged })
      }).then(res => {
        if(res.ok) {
          // Force reload
          if (window.Acad) window.Acad.Editor.executeCommandAsync('(setvar "USERS1" "LC_SAAS_FORCE_RELOAD") ');
        }
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ height: '16px', backgroundColor: '#1f2937', borderRadius: '4px', width: '75%' }}></div>
        <div style={{ height: '16px', backgroundColor: '#1f2937', borderRadius: '4px', width: '100%' }}></div>
        <div style={{ height: '16px', backgroundColor: '#1f2937', borderRadius: '4px', width: '83%' }}></div>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.875rem', color: '#888' }}>
        No standard selected. Select one or create a new one to apply.
      </div>
    );
  }

  if (!standard) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.875rem', color: '#888' }}>
        The Administrator has not uploaded any standards to this team yet. Request them from your administrator or sync from AutoCAD if you are the administrator.
      </div>
    );
  }

  // Apply search filters
  const passesFilter = (name) => {
    if (!searchFilters || searchFilters.length === 0) return true;
    const lowerName = name.toLowerCase();
    return searchFilters.every(f => lowerName.includes(f.toLowerCase()));
  };

  const arrays = {
    layers: Object.entries(standard.layers || {}).filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0])),
    textStyles: Object.entries(standard.textStyles || {}).filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0])),
    dimStyles: Object.entries(standard.dimStyles || {}).filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0])),
    globalVars: Object.entries(standard.globalVars || {}).filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0])),
    linetypes: Object.entries(standard.linetypes || {}).filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0])),
    mleaderStyles: Object.entries(standard.mleaderStyles || {}).filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0])),
    tableStyles: Object.entries(standard.tableStyles || {}).filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0])),
    scaleLists: Object.entries(standard.scaleLists || {}).filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0])),
  };

  const formatGlobalVar = (name, value) => {
    if (name === 'INSUNITS') {
      const map = {0:'Sin unidades', 1:'Pulgadas', 2:'Pies', 4:'Milímetros', 5:'Centímetros', 6:'Metros'};
      return map[value] || value;
    }
    if (name === 'MEASUREMENT') return value === 0 ? 'Inglés' : (value === 1 ? 'Métrico' : value);
    if (name === 'DIMSCALE' && value === 0) return 'Anotativo (0)';
    return value;
  };

  const renderRow = (type, name, props) => {
    if (type === 'layers') {
      const colorHex = getAutoCADColor(props.color);
      return (
        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 4px 12px', boxSizing: 'border-box', borderBottom: '1px solid #333', fontSize: '0.75rem', cursor: 'default' }}>
          <span style={{ fontFamily: 'monospace', color: '#d1d5db', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '8px', width: '66.666%' }} title={name}>{name}</span>
          <div style={{ display: 'flex', alignItems: 'center', width: '33.333%', justifyContent: 'flex-end', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, backgroundColor: colorHex }} title={`Color ACI: ${props.color}`}></div>
            <span style={{ color: '#6b7280', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '10px' }} title={props.linetype}>{props.linetype}</span>
          </div>
        </div>
      );
    } else if (type === 'textStyles') {
      return (
        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 4px 12px', boxSizing: 'border-box', borderBottom: '1px solid #333', fontSize: '0.75rem', cursor: 'default' }}>
          <span style={{ fontFamily: 'monospace', color: '#d1d5db', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '8px', width: '50%' }} title={name}>{name}</span>
          <span style={{ color: '#6b7280', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '50%', textAlign: 'right' }} title={props.font}>{props.font}</span>
        </div>
      );
    } else if (type === 'globalVars') {
      return (
        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 4px 12px', boxSizing: 'border-box', borderBottom: '1px solid #333', fontSize: '0.75rem', cursor: 'default' }}>
          <span style={{ fontFamily: 'monospace', color: '#fbbf24', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '8px', width: '50%' }} title={name}>{name}</span>
          <span style={{ color: '#d1d5db', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '50%', textAlign: 'right' }}>{formatGlobalVar(name, props.value)}</span>
        </div>
      );
    } else {
      return (
        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 4px 12px', boxSizing: 'border-box', borderBottom: '1px solid #333', fontSize: '0.75rem', cursor: 'default' }}>
          <span style={{ fontFamily: 'monospace', color: '#d1d5db', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '8px', width: '100%' }} title={name}>{name}</span>
        </div>
      );
    }
  };

  const groups = [
    { key: 'layers', label: 'Capas' },
    { key: 'textStyles', label: 'Estilos de Texto' },
    { key: 'dimStyles', label: 'Estilos de Cota' },
    { key: 'globalVars', label: 'Variables Globales' },
    { key: 'linetypes', label: 'Tipos de Línea' },
    { key: 'mleaderStyles', label: 'Directrices Múltiples' },
    { key: 'tableStyles', label: 'Estilos de Tabla' },
    { key: 'scaleLists', label: 'Escalas Anotativas' },
  ];

  const toggleGroup = (key) => {
    setActiveTab(prev => {
      const next = new Set(prev instanceof Set ? prev : [prev]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandedGroups = activeTab instanceof Set ? activeTab : new Set(['layers']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#111827', color: '#ffffff', position: 'relative' }}>
      {showDiff && draft && (
        <DiffMergePanel
          draft={draft}
          currentStandard={standard || {}}
          searchFilters={searchFilters}
          mode={panelMode}
          onCommit={handleCommitMerge}
          onCancel={() => {
            setShowDiff(false);
            if (onEditingStateChange) onEditingStateChange(false);
          }}
        />
      )}

      {/* Accordion Lists */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        {groups.map(g => {
          const arr = arrays[g.key];
          if (!arr || arr.length === 0) return null;
          const isExpanded = expandedGroups.has(g.key);
          return (
            <div key={g.key} style={{ borderBottom: '1px solid #374151' }}>
              <button 
                onClick={() => toggleGroup(g.key)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: isExpanded ? '#374151' : '#1f2937', color: '#e5e7eb', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', border: 'none', textAlign: 'left', transition: 'background-color 0.2s' }}
              >
                <span>{g.label} ({arr.length})</span>
                <svg style={{ width: '16px', height: '16px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isExpanded && (
                <div style={{ backgroundColor: '#111827' }}>
                  {arr.map(([name, props]) => renderRow(g.key, name, props))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Action Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid #374151', backgroundColor: '#111827' }}>
        <button 
          onClick={() => {
            const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            const token = urlParams.get('token') || '';
            const targetTeamId = teamId || 'PERSONAL';
            setPanelMode('audit');
            setIsAuditing(true);
            setTimeout(() => setIsAuditing(false), 30000); // 30s timeout
            // Importar dinámicamente o usar executeInAutoCAD global si existe
            import('../../utils/autocadBridge').then(m => {
              m.executeInAutoCAD(`(LC:run-audit "${targetTeamId}" "${token}")`);
            }).catch(() => {
              console.log('TMD_AUDIT triggered locally. AutoCAD bridge fallback.');
            });
          }}
          style={{ width: '100%', backgroundColor: '#15803d', color: '#ffffff', fontWeight: 'bold', padding: '8px 0', borderRadius: '4px', fontSize: '0.875rem', transition: 'background-color 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: 'none' }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
        >
          <svg style={{ width: '16px', height: '16px', marginRight: '8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {isAuditing ? 'Auditing...' : 'Audit Current Drawing'}
        </button>
      </div>
    </div>
  );
}

// Full ACI mapping to keep main list colors accurate
function getAutoCADColor(aci) {
  const colors = {
    1:'#FF0000',2:'#FFFF00',3:'#00FF00',4:'#00FFFF',5:'#0000FF',6:'#FF00FF',
    7:'#FFFFFF',8:'#808080',9:'#C0C0C0',10:'#FF4040',20:'#FF9B00',30:'#FF7800',
    40:'#FFBE00',50:'#FFE600',60:'#BEFF00',70:'#7FFF00',80:'#3FFF00',90:'#00FF40',
    100:'#00FF9B',110:'#00FFD5',120:'#00D5FF',130:'#009BFF',140:'#0040FF',
    150:'#4000FF',160:'#7800FF',170:'#BE00FF',180:'#FF00D5',190:'#FF009B',
    200:'#FF0040',250:'#AAAAAA',251:'#808080',252:'#555555',253:'#333333',
    254:'#1A1A1A',255:'#000000'
  };
  return colors[aci] || '#AAAAAA';
}
