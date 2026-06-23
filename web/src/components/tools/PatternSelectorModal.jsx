import React, { useState, useMemo } from 'react';
import { ARCHETYPES, CATEGORIES } from './HatchEngine';
import SvgPreviewEngine from './SvgPreviewEngine';

export default function PatternSelectorModal({ isOpen, onClose, onSelect, currentSelectedId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredArchetypes = useMemo(() => {
    return ARCHETYPES.filter(arch => {
      const matchesSearch = arch.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || arch.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        
        {/* Header con Buscador y Filtros */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, color: 'var(--tmd-orange)', flexShrink: 0 }}>Select Pattern</h2>
          
          <input 
            type="text" 
            placeholder="Search pattern..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle}
          />
          
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={selectStyle}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Grilla de Patrones */}
        <div style={gridContainerStyle}>
          {filteredArchetypes.length > 0 ? (
            <div style={gridStyle}>
              {filteredArchetypes.map(arch => {
                const isSelected = currentSelectedId === arch.id;
                return (
                  <div 
                    key={arch.id} 
                    onClick={() => { onSelect(arch.id); onClose(); }}
                    style={{
                      ...cardStyle,
                      borderColor: isSelected ? 'var(--tmd-orange)' : '#334155',
                      backgroundColor: isSelected ? 'rgba(242, 109, 33, 0.1)' : '#1e293b'
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{ width: '80%', height: '80%', opacity: 0.8 }}>
                        <SvgPreviewEngine 
                          archetype={arch} 
                          params={arch.defaults} 
                          gridRows={2} 
                          gridCols={2} 
                        />
                      </div>
                    </div>
                    <div style={cardTextStyle}>{arch.name}</div>
                    <div style={cardCategoryStyle}>{arch.category || 'General'}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
              No patterns found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Estilos en línea para aislar la vista
const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
};

const modalStyle = {
  width: '80%',
  maxWidth: '900px',
  height: '80vh',
  backgroundColor: '#0f172a',
  borderRadius: '12px',
  border: '1px solid #334155',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
};

const headerStyle = {
  padding: '20px',
  borderBottom: '1px solid #334155',
  display: 'flex',
  gap: '15px',
  alignItems: 'center',
  backgroundColor: '#1e293b'
};

const inputStyle = {
  flex: 1,
  padding: '10px 15px',
  borderRadius: '6px',
  border: '1px solid #475569',
  backgroundColor: '#0b0f19',
  color: 'white',
  fontSize: '1rem'
};

const selectStyle = {
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid #475569',
  backgroundColor: '#0b0f19',
  color: 'white',
  fontSize: '1rem',
  cursor: 'pointer'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.5rem',
  cursor: 'pointer',
  padding: '0 10px'
};

const gridContainerStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: '20px'
};

const cardStyle = {
  border: '2px solid',
  borderRadius: '8px',
  padding: '10px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  transition: 'all 0.2s ease',
};

const cardTextStyle = {
  marginTop: '10px',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '0.85rem',
  textAlign: 'center'
};

const cardCategoryStyle = {
  marginTop: '4px',
  color: '#94a3b8',
  fontSize: '0.7rem'
};
