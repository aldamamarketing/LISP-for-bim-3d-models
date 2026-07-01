import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { List } from 'react-window';
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
              cmds.push(`(tmd:apply-layer "${escapedName}" ${p.color} "${escapedLtype}" ${p.lineweight || 25})`);
            }
          } else if (item.type === 'style') {
            const p = sourceMap.textStyles[item.key];
            if (p) {
              const escapedName = item.key.replace(/"/g, '\\"');
              const escapedFont = (p.font || '').replace(/"/g, '\\"');
              cmds.push(`(tmd:apply-textstyle "${escapedName}" "${escapedFont}" ${p.height || 0})`);
            }
          } else if (item.type === 'dimStyle') {
            const p = sourceMap.dimStyles[item.key];
            if (p) {
              const escapedName = item.key.replace(/"/g, '\\"');
              cmds.push(`(tmd:apply-dimstyle "${escapedName}" ${p.dimscale || 0} ${p.dimtxt || 0} ${p.dimdec || 0})`);
            }
          } else if (item.type === 'globalVar') {
            const p = sourceMap.globalVars[item.key];
            if (p && p.value !== undefined) {
              cmds.push(`(setvar "${item.key}" ${p.value})`);
            }
          } else if (item.type === 'linetype') {
            cmds.push(`(tmd:apply-linetype "${item.key.replace(/"/g, '\\"')}")`);
          } else if (item.type === 'mleaderStyle') {
            cmds.push(`(tmd:apply-mleaderstyle "${item.key.replace(/"/g, '\\"')}")`);
          } else if (item.type === 'tableStyle') {
            cmds.push(`(tmd:apply-tablestyle "${item.key.replace(/"/g, '\\"')}")`);
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
              cmds.push(`(tmd:apply-layer "${escapedName}" ${p.color} "${escapedLtype}" ${p.lineweight || 25})`);
            }
          }
        });
      }

      if (cmds.length > 0) {
        cmds.push('(c:TMD_APPLY_COMPLETE)');
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

  const rawLayers = Object.entries(standard.layers || {});
  const rawTextStyles = Object.entries(standard.textStyles || {});

  // Apply search filters
  const passesFilter = (name) => {
    if (!searchFilters || searchFilters.length === 0) return true;
    const lowerName = name.toLowerCase();
    return searchFilters.every(f => lowerName.includes(f.toLowerCase()));
  };

  const layersArray = rawLayers.filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0]));
  const textStylesArray = rawTextStyles.filter(([name]) => passesFilter(name)).sort((a, b) => a[0].localeCompare(b[0]));

  const renderLayerRow = ({ index, style }) => {
    const [name, props] = layersArray[index];
    const colorHex = getAutoCADColor(props.color);
    return (
      <div style={{ ...style, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 4px 12px', boxSizing: 'border-box', borderBottom: '1px solid #333', fontSize: '0.75rem', cursor: 'default' }}>
        <span style={{ fontFamily: 'monospace', color: '#d1d5db', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '8px', width: '66.666%' }} title={name}>{name}</span>
        <div style={{ display: 'flex', alignItems: 'center', width: '33.333%', justifyContent: 'flex-end', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, backgroundColor: colorHex }} title={`Color ACI: ${props.color}`}></div>
          <span style={{ color: '#6b7280', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '10px' }} title={props.linetype}>{props.linetype}</span>
        </div>
      </div>
    );
  };

  const renderTextStyleRow = ({ index, style }) => {
    const [name, props] = textStylesArray[index];
    return (
      <div style={{ ...style, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 20px 4px 12px', boxSizing: 'border-box', borderBottom: '1px solid #333', fontSize: '0.75rem', cursor: 'default' }}>
        <span style={{ fontFamily: 'monospace', color: '#d1d5db', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '8px', width: '50%' }} title={name}>{name}</span>
        <span style={{ color: '#6b7280', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '50%', textAlign: 'right' }} title={props.font}>{props.font}</span>
      </div>
    );
  };

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
      {/* Tabs */}
      <div style={{ display: 'flex', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', fontSize: '0.75rem' }}>
        <button 
          onClick={() => setActiveTab('layers')}
          style={{ flex: 1, padding: '8px 0', fontWeight: 'bold', transition: 'all 0.2s', borderBottom: activeTab === 'layers' ? '2px solid #60a5fa' : 'none', color: activeTab === 'layers' ? '#60a5fa' : '#9ca3af', backgroundColor: 'transparent', cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
        >
          Capas ({layersArray.length})
        </button>
        <button 
          onClick={() => setActiveTab('textstyles')}
          style={{ flex: 1, padding: '8px 0', fontWeight: 'bold', transition: 'all 0.2s', borderBottom: activeTab === 'textstyles' ? '2px solid #818cf8' : 'none', color: activeTab === 'textstyles' ? '#818cf8' : '#9ca3af', backgroundColor: 'transparent', cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
        >
          Estilos ({textStylesArray.length})
        </button>
      </div>

      {/* Virtualized Lists for High Performance Rendering */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: '300px' }}>
        {activeTab === 'layers' && (
          <List
            height={300} // This should dynamically size to parent in prod, fixed for MVP
            rowCount={layersArray.length}
            rowHeight={30}
            width={'100%'}
            rowComponent={renderLayerRow}
            rowProps={{}}
          />
        )}
        
        {activeTab === 'textstyles' && (
          <List
            height={300}
            rowCount={textStylesArray.length}
            rowHeight={30}
            width={'100%'}
            rowComponent={renderTextStyleRow}
            rowProps={{}}
          />
        )}
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
              m.executeInAutoCAD(`(tmd:run-audit "${targetTeamId}" "${token}")`);
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
