import React, { useState, useEffect } from 'react';
import { getUserFavorites, removeFromFavorites } from '../utils/library';
import HatchPreview from './tools/HatchPreview';
import LinetypePreview from './tools/LinetypePreview';

const SvgPreview = ({ svgString }) => (
  <div 
    style={{ width: '100%', height: '100px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    dangerouslySetInnerHTML={{ __html: svgString }} 
  />
);

export default function FavoritesManager() {
  const [activeTab, setActiveTab] = useState('hatch');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const data = await getUserFavorites(activeTab);
      setFavorites(data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();
  }, [activeTab]);

  const handleRemove = async (id) => {
    try {
      await removeFromFavorites(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      alert("Error eliminando: " + e.message);
    }
  };

  const handleDownload = (item) => {
    let content = item.code;
    let extension = 'txt';
    let mime = 'text/plain';

    if (item.type === 'hatch') {
      content = `*${item.name || 'HATCH'}\n${item.description || ''}\n${item.code}`;
      extension = 'pat';
    } else if (item.type === 'lin') {
      content = `*${item.name || 'LINE'}, ${item.description || ''}\n${item.code}`;
      extension = 'lin';
    } else if (item.type === 'icon') {
      content = item.svgCode || item.code;
      extension = 'svg';
      mime = 'image/svg+xml';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name ? item.name.replace(/\s+/g, '_') : 'asset'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: '#111', color: '#fff', borderRadius: '8px', padding: '20px', minHeight: '600px' }}>
      <h2 style={{ color: 'var(--tmd-orange)', marginBottom: '20px' }}>Mis Recursos (Favoritos)</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('hatch')}
          style={{ padding: '10px 20px', backgroundColor: activeTab === 'hatch' ? 'var(--tmd-orange)' : '#222', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Hachuras (.pat)
        </button>
        <button 
          onClick={() => setActiveTab('lin')}
          style={{ padding: '10px 20px', backgroundColor: activeTab === 'lin' ? 'var(--tmd-orange)' : '#222', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Líneas (.lin)
        </button>
        <button 
          onClick={() => setActiveTab('icon')}
          style={{ padding: '10px 20px', backgroundColor: activeTab === 'icon' ? 'var(--tmd-orange)' : '#222', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Iconos (.svg)
        </button>
      </div>

      {loading ? (
        <p>Cargando favoritos...</p>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#222', borderRadius: '8px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No tienes recursos guardados en esta categoría.</p>
          <p>Usa los generadores de la IA o explora la Biblioteca Pública para añadir recursos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {favorites.map(item => (
            <div key={item.id} style={{ backgroundColor: '#222', padding: '15px', borderRadius: '8px', border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
              <strong style={{ color: 'var(--tmd-orange)', fontSize: '1.1rem', marginBottom: '5px' }}>{item.name}</strong>
              <p style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '15px' }}>{item.description}</p>
              
              <div style={{ flex: 1, marginBottom: '15px' }}>
                {activeTab === 'hatch' && <HatchPreview patCode={item.code} scale={1} />}
                {activeTab === 'lin' && <LinetypePreview linCode={item.code} scale={1} />}
                {activeTab === 'icon' && <SvgPreview svgString={item.svgCode || item.code} />}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleDownload(item)}
                  style={{ flex: 1, padding: '10px', backgroundColor: 'var(--tmd-orange)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Descargar
                </button>
                <button 
                  onClick={() => handleRemove(item.id)}
                  style={{ padding: '10px 15px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  title="Apagar (Eliminar de favoritos)"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
