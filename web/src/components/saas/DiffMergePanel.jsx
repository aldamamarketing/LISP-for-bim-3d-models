import React, { useState, useEffect } from 'react';

// Mapa ACI extendido (~30 colores clave del estándar AutoCAD)
const ACI_COLORS = {
  1:'#FF0000',2:'#FFFF00',3:'#00FF00',4:'#00FFFF',5:'#0000FF',6:'#FF00FF',
  7:'#FFFFFF',8:'#808080',9:'#C0C0C0',10:'#FF4040',20:'#FF9B00',30:'#FF7800',
  40:'#FFBE00',50:'#FFE600',60:'#BEFF00',70:'#7FFF00',80:'#3FFF00',90:'#00FF40',
  100:'#00FF9B',110:'#00FFD5',120:'#00D5FF',130:'#009BFF',140:'#0040FF',
  150:'#4000FF',160:'#7800FF',170:'#BE00FF',180:'#FF00D5',190:'#FF009B',
  200:'#FF0040',250:'#AAAAAA',251:'#808080',252:'#555555',253:'#333333',
  254:'#1A1A1A',255:'#000000'
};
const getAciColor = (aci) => ACI_COLORS[aci] || '#AAAAAA';

const TYPE_LABELS = { layer: 'Layers', style: 'TextStyles', dimStyle: 'DimStyles' };
const TYPE_ORDER = ['layer', 'style', 'dimStyle'];

export default function DiffMergePanel({ draft, currentStandard, searchFilters = [], onCommit, onCancel, mode = 'extract' }) {
  const [diff, setDiff] = useState({ newItems: [], modifiedItems: [], missingItems: [] });
  const [selectedNews, setSelectedNews] = useState(new Set());
  const [selectedMods, setSelectedMods] = useState(new Set());
  const [selectedMissing, setSelectedMissing] = useState(new Set());
  // Keys: '{section}-{type}', e.g. 'new-layer', 'mod-style'
  const [collapsedSubGroups, setCollapsedSubGroups] = useState(new Set());

  useEffect(() => {
    if (!draft) return;

    const newItems = [], modifiedItems = [], missingItems = [];

    const draftLayers  = draft.layers     || {};
    const draftStyles  = draft.textStyles || {};
    const draftDims    = draft.dimStyles  || {};
    const curLayers    = currentStandard?.layers     || {};
    const curStyles    = currentStandard?.textStyles || {};
    const curDims      = currentStandard?.dimStyles  || {};

    // --- Layers ---
    Object.keys(draftLayers).forEach(key => {
      const d = draftLayers[key], c = curLayers[key];
      if (!c) {
        newItems.push({ type: 'layer', key, data: d });
      } else {
        const changes = [];
        if (d.color      !== c.color)      changes.push(`Color: ${c.color} → ${d.color}`);
        if (d.ltype      !== c.ltype)      changes.push(`Linetype: ${c.ltype} → ${d.ltype}`);
        if (d.lineweight !== c.lineweight) changes.push(`Lineweight: ${c.lineweight} → ${d.lineweight}`);
        if (changes.length) modifiedItems.push({ type: 'layer', key, data: d, changes });
      }
    });
    Object.keys(curLayers).forEach(key => {
      if (!draftLayers[key]) missingItems.push({ type: 'layer', key, data: curLayers[key] });
    });

    // --- TextStyles ---
    Object.keys(draftStyles).forEach(key => {
      const d = draftStyles[key], c = curStyles[key];
      if (!c) {
        newItems.push({ type: 'style', key, data: d });
      } else {
        const changes = [];
        if (d.font   !== c.font)   changes.push(`Font: ${c.font||'N/A'} → ${d.font||'N/A'}`);
        if (d.height !== c.height) changes.push(`Height: ${c.height||0} → ${d.height||0}`);
        if (changes.length) modifiedItems.push({ type: 'style', key, data: d, changes });
      }
    });
    Object.keys(curStyles).forEach(key => {
      if (!draftStyles[key]) missingItems.push({ type: 'style', key, data: curStyles[key] });
    });

    // --- DimStyles ---
    Object.keys(draftDims).forEach(key => {
      const d = draftDims[key], c = curDims[key];
      if (!c) {
        newItems.push({ type: 'dimStyle', key, data: d });
      } else {
        const changes = [];
        if (d.dimscale !== c.dimscale) changes.push(`Scale: ${c.dimscale} → ${d.dimscale}`);
        if (d.dimtxt   !== c.dimtxt)   changes.push(`Text height: ${c.dimtxt} → ${d.dimtxt}`);
        if (d.dimdec   !== c.dimdec)   changes.push(`Decimals: ${c.dimdec} → ${d.dimdec}`);
        if (changes.length) modifiedItems.push({ type: 'dimStyle', key, data: d, changes });
      }
    });
    Object.keys(curDims).forEach(key => {
      if (!draftDims[key]) missingItems.push({ type: 'dimStyle', key, data: curDims[key] });
    });

    setDiff({ newItems, modifiedItems, missingItems });
    // New items: checked by default. Modified & Missing: unchecked for safety.
    setSelectedNews(new Set(newItems.map(i => `${i.type}-${i.key}`)));
    setSelectedMods(new Set());
    setSelectedMissing(new Set());
  }, [draft, currentStandard]);

  // --- Selection helpers ---
  const toggleItem = (id, set, setter) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const handleSelectGroup = (section, select) => {
    const map = {
      new:     [diff.newItems,      setSelectedNews],
      mod:     [diff.modifiedItems, setSelectedMods],
      missing: [diff.missingItems,  setSelectedMissing],
    };
    const [items, setter] = map[section];
    setter(select ? new Set(items.map(i => `${i.type}-${i.key}`)) : new Set());
  };

  const handleSelectAllGlobal = () => {
    const total = diff.newItems.length + diff.modifiedItems.length + diff.missingItems.length;
    const selected = selectedNews.size + selectedMods.size + selectedMissing.size;
    if (selected === total && total > 0) {
      setSelectedNews(new Set()); setSelectedMods(new Set()); setSelectedMissing(new Set());
    } else {
      setSelectedNews(new Set(diff.newItems.map(i => `${i.type}-${i.key}`)));
      setSelectedMods(new Set(diff.modifiedItems.map(i => `${i.type}-${i.key}`)));
      setSelectedMissing(new Set(diff.missingItems.map(i => `${i.type}-${i.key}`)));
    }
  };

  const toggleSubGroup = (key) => {
    const next = new Set(collapsedSubGroups);
    next.has(key) ? next.delete(key) : next.add(key);
    setCollapsedSubGroups(next);
  };

  // --- Commit ---
  const handleCommit = () => {
    const merged = {
      layers:     { ...(currentStandard?.layers     || {}) },
      textStyles: { ...(currentStandard?.textStyles || {}) },
      dimStyles:  { ...(currentStandard?.dimStyles  || {}) },
    };

    const applyItems = (items, selected) => items.forEach(item => {
      if (!selected.has(`${item.type}-${item.key}`)) return;
      if (item.type === 'layer')    merged.layers[item.key]     = item.data;
      if (item.type === 'style')    merged.textStyles[item.key] = item.data;
      if (item.type === 'dimStyle') merged.dimStyles[item.key]  = item.data;
    });

    const removeItems = (items, selected) => items.forEach(item => {
      if (!selected.has(`${item.type}-${item.key}`)) return;
      if (item.type === 'layer')    delete merged.layers[item.key];
      if (item.type === 'style')    delete merged.textStyles[item.key];
      if (item.type === 'dimStyle') delete merged.dimStyles[item.key];
    });

    applyItems(diff.newItems,      selectedNews);
    applyItems(diff.modifiedItems, selectedMods);
    removeItems(diff.missingItems, selectedMissing);

    const selectedActions = {
      newItems: diff.newItems.filter(i => selectedNews.has(`${i.type}-${i.key}`)),
      modifiedItems: diff.modifiedItems.filter(i => selectedMods.has(`${i.type}-${i.key}`)),
      missingItems: diff.missingItems.filter(i => selectedMissing.has(`${i.type}-${i.key}`))
    };

    onCommit({ merged, selectedActions });
  };

  // --- Filter ---
  const applySearch = (items) => {
    if (!searchFilters || searchFilters.length === 0) return items;
    return items.filter(item =>
      searchFilters.every(f => item.key.toLowerCase().includes(f.toLowerCase()))
    );
  };

  // --- Row renderer ---
  const renderItem = (item, i, selectedSet, toggleFn) => {
    const isChecked = selectedSet.has(`${item.type}-${item.key}`);
    return (
      <div key={`${item.type}-${item.key}-${i}`} style={{ borderBottom: '1px solid #2d3748' }}>
        <label style={{ display: 'flex', alignItems: 'center', padding: '4px 20px 4px 20px', fontSize: '0.75rem', cursor: 'pointer', margin: 0, boxSizing: 'border-box' }}>
          <input
            type="checkbox"
            style={{ margin: '0 8px 0 0', flexShrink: 0 }}
            checked={isChecked}
            onChange={() => toggleFn(`${item.type}-${item.key}`)}
          />
          <span style={{ fontFamily: 'monospace', color: '#d1d5db', flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {item.key}
          </span>
          {item.type === 'layer' && (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getAciColor(item.data.color), flexShrink: 0 }} title={`ACI: ${item.data.color}`} />
          )}
          {item.type === 'style' && (
            <span style={{ color: '#6b7280', fontSize: '10px', flexShrink: 0 }}>{item.data.font}</span>
          )}
          {item.type === 'dimStyle' && (
            <span style={{ color: '#6b7280', fontSize: '10px', flexShrink: 0 }}>×{item.data.dimscale}</span>
          )}
        </label>
        {item.changes && item.changes.length > 0 && (
          <div style={{ padding: '0 20px 4px 36px', fontSize: '10px', color: '#6b7280' }}>
            {item.changes.map((c, j) => <div key={j}>{c}</div>)}
          </div>
        )}
      </div>
    );
  };

  // --- Section renderer with collapsible sub-groups ---
  const renderSection = (items, selectedSet, toggleFn, sectionKey, label, accentColor) => {
    const filtered = applySearch(items);
    if (filtered.length === 0) return null;

    // Group by type
    const groups = {};
    filtered.forEach(item => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    });
    const activeTypes = TYPE_ORDER.filter(t => groups[t]?.length > 0);
    const hasMultipleTypes = activeTypes.length > 1;

    return (
      <div>
        {/* Section header */}
        <div style={{ backgroundColor: '#1e293b', padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: accentColor }}>
            {label} ({filtered.length})
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', cursor: 'pointer' }} onClick={() => handleSelectGroup(sectionKey, true)}>All</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', cursor: 'pointer' }} onClick={() => handleSelectGroup(sectionKey, false)}>None</span>
          </div>
        </div>

        {/* Sub-groups */}
        {activeTypes.map(type => {
          const typeItems = groups[type];
          const subKey = `${sectionKey}-${type}`;
          const isCollapsed = collapsedSubGroups.has(subKey);

          return (
            <div key={type}>
              {/* Sub-group header: only shown when multiple types coexist */}
              {hasMultipleTypes && (
                <div
                  onClick={() => toggleSubGroup(subKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '3px 12px', backgroundColor: '#161e2e',
                    borderBottom: '1px solid #2a3a4a', cursor: 'pointer',
                    fontSize: '0.68rem', color: '#64748b', userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '7px', lineHeight: 1 }}>{isCollapsed ? '▶' : '▼'}</span>
                  <span>{TYPE_LABELS[type]} ({typeItems.length})</span>
                </div>
              )}
              {!isCollapsed && typeItems.map((item, i) =>
                renderItem(item, i, selectedSet, toggleFn)
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const totalSelected = selectedNews.size + selectedMods.size + selectedMissing.size;
  const totalAll = diff.newItems.length + diff.modifiedItems.length + diff.missingItems.length;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#111827', zIndex: 100, display: 'flex', flexDirection: 'column', color: 'white', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', flexShrink: 0 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
          {mode === 'extract' ? 'Review Standard Updates' : 'Audit: Fix DWG Deviations'}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', color: '#60a5fa' }}>
          <input type="checkbox" checked={totalAll > 0 && totalSelected === totalAll} onChange={handleSelectAllGlobal} style={{ margin: '0 4px 0 0' }} />
          Select All
        </label>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderSection(diff.newItems,      selectedNews,    (id) => toggleItem(id, selectedNews,    setSelectedNews),    'new',     mode === 'extract' ? 'New in DWG (Add to Cloud)' : 'Extra in DWG (Ignore)', '#38bdf8')}
        {renderSection(diff.modifiedItems, selectedMods,    (id) => toggleItem(id, selectedMods,    setSelectedMods),    'mod',     mode === 'extract' ? 'Modified (Update Cloud)' : 'Deviates (Fix in DWG)', '#fbbf24')}
        {renderSection(diff.missingItems,  selectedMissing, (id) => toggleItem(id, selectedMissing, setSelectedMissing), 'missing', mode === 'extract' ? 'Missing in DWG (Delete from Cloud)' : 'Missing (Create in DWG)', '#f87171')}

        {totalAll === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: '0.75rem' }}>
            No differences found.
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding: '12px', borderTop: '1px solid #374151', display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '8px 0', backgroundColor: '#374151', color: '#d1d5db', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}>
          Cancel
        </button>
        <button
          onClick={handleCommit}
          disabled={totalSelected === 0}
          style={{ flex: 1, padding: '8px 0', backgroundColor: totalSelected === 0 ? '#1e3a8a' : '#2563eb', color: totalSelected === 0 ? '#93c5fd' : 'white', border: 'none', borderRadius: '4px', cursor: totalSelected === 0 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}
        >
          {mode === 'extract' ? `UPDATE CLOUD (${totalSelected})` : `FIX DWG (${totalSelected})`}
        </button>
      </div>
    </div>
  );
}
