import React, { useState, useEffect } from 'react';
import { getPublicAssets, addToFavorites } from '../../utils/library';
import HatchPreview from './HatchPreview';
import LinetypePreview from './LinetypePreview';

const SvgPreview = ({ svgString }) => (
  <div 
    style={{ width: '100%', height: '100px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    dangerouslySetInnerHTML={{ __html: svgString }} 
  />
);

export default function LibraryPanel({ currentType, searchQuery = '' }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      try {
        const data = await getPublicAssets(currentType);
        setAssets(data);
      } catch (e) {
        console.error("Error fetching library:", e);
      }
      setLoading(false);
    };
    fetchLibrary();
  }, [currentType]);

  const handleSave = async (assetId) => {
    setSaving(assetId);
    try {
      await addToFavorites(assetId);
      alert('Adicionado aos Favoritos com sucesso');
    } catch (e) {
      alert(e.message);
    }
    setSaving(null);
  };

  const categories = ['Todas', ...new Set(assets.map(a => a.category || 'General'))];

  const filtered = assets.filter(a => {
    if (activeCategory !== 'Todas' && a.category !== activeCategory) return false;
    if (searchQuery && searchQuery.trim().length > 2) {
      const lowerQ = searchQuery.toLowerCase();
      // Verificamos si alguna de las palabras clave del usuario está en el título
      const keywords = lowerQ.split(/[\n, ]+/).filter(k => k.length > 3);
      if (keywords.length > 0) {
        const textToSearch = `${a.name || ''} ${a.description || ''}`.toLowerCase();
        const matches = keywords.some(k => textToSearch.includes(k));
        if (!matches) return false;
      }
    }
    return true;
  });

  return (
    <div style={{ flex: 1, backgroundColor: '#222', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Biblioteca Pública ({filtered.length})</h3>
        <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Busque e guarde recursos para usar no AutoCAD.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '15px', paddingBottom: '5px' }}>
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 12px',
              backgroundColor: activeCategory === cat ? 'var(--tmd-orange)' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '15px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando biblioteca...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum recurso encontrado no banco de dados.</p>
            <p style={{ color: '#fff', fontSize: '0.9rem' }}>Use o botão laranja para gerar novos recursos!</p>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
              <strong style={{ color: 'var(--tmd-orange)', display: 'block', marginBottom: '5px' }}>{item.name}</strong>
              <p style={{ fontSize: '0.8rem', color: '#ccc', margin: '0 0 10px 0' }}>{item.description}</p>
              
              {currentType === 'hatch' && <HatchPreview patCode={item.code} scale={1} />}
              {currentType === 'lin' && <LinetypePreview linCode={item.code} scale={1} />}
              {currentType === 'icon' && <SvgPreview svgString={item.svgCode || item.code} />}
              
              <button 
                onClick={() => handleSave(item.id)}
                disabled={saving === item.id}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px',
                  fontWeight: 'bold'
                }}
              >
                {saving === item.id ? 'Salvando...' : '⭐ Adicionar aos Favoritos'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
