import React, { useState, useEffect } from 'react';
import { getPublicAssets, addToFavorites } from '../../utils/library';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import HatchPreview from './HatchPreview';
import LinetypePreview from './LinetypePreview';
import ToastContainer, { showToast } from '../Toast';

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
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

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
    if (!user) {
      showToast(
        'Crie uma conta gratuita para salvar nos favoritos e usar direto no AutoCAD. <a href="/login?redirect=' + encodeURIComponent(window.location.pathname) + '" style="color:#f26d21;font-weight:bold;text-decoration:underline">Criar conta →</a>',
        'warning',
        6000
      );
      return;
    }
    setSaving(assetId);
    try {
      await addToFavorites(assetId);
      showToast('Adicionado aos Favoritos com sucesso! ⭐', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
    setSaving(null);
  };

  // Descarga directa sin login
  const handleDirectDownload = (item) => {
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (currentType === 'hatch') {
      content = `*${item.name || 'HATCH'}, ${item.description || ''}\n${item.code}\n`;
      filename = `${(item.name || 'hatch').replace(/\s+/g, '_')}.pat`;
    } else if (currentType === 'lin') {
      content = `*${item.name || 'LINE'}, ${item.description || ''}\n${item.code}\n`;
      filename = `${(item.name || 'linetype').replace(/\s+/g, '_')}.lin`;
    } else if (currentType === 'icon') {
      content = item.svgCode || item.code;
      filename = `${(item.name || 'icon').replace(/\s+/g, '_')}.svg`;
      mimeType = 'image/svg+xml';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      '📥 Download concluído! <strong>Dica:</strong> Salve nos favoritos para usar direto no AutoCAD sem baixar.',
      'info',
      5000
    );
  };

  const categories = ['Todas', ...new Set(assets.map(a => a.category || 'General'))];

  const filtered = assets.filter(a => {
    if (activeCategory !== 'Todas' && a.category !== activeCategory) return false;
    if (searchQuery && searchQuery.trim().length > 2) {
      const lowerQ = searchQuery.toLowerCase();
      // Verificamos si alguna de las palabras clave del usuario está en el título o descripción
      const keywords = lowerQ.split(/[\n, ]+/).filter(k => k.length >= 2);
      if (keywords.length > 0) {
        const textToSearch = `${a.name || ''} ${a.description || ''}`.toLowerCase();
        const matches = keywords.some(k => textToSearch.includes(k));
        if (!matches) return false;
      }
    }
    return true;
  });

  return (
    <>
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
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button 
                onClick={() => handleSave(item.id)}
                disabled={saving === item.id}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {saving === item.id ? 'Salvando...' : '⭐ Favoritos'}
              </button>
              <button 
                onClick={() => handleDirectDownload(item)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'var(--tmd-orange)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ⬇ Baixar
              </button>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
      <ToastContainer />
    </>
  );
}
