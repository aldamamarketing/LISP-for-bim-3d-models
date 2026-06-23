import React, { useState, useEffect } from 'react';
import { getPublicAssets, addToFavorites } from '../../utils/library';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import HatchPreview from './HatchPreview';
import LinetypePreview from './LinetypePreview';
import ToastContainer, { showToast } from '../Toast';
import EditMetadataModal from './EditMetadataModal';

const SvgPreview = ({ svgString }) => (
  <div 
    style={{ width: '100%', height: '100px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    dangerouslySetInnerHTML={{ __html: svgString }} 
  />
);

export default function LibraryPanel({ currentType, searchQuery = '', selectedItems = [], onToggleSelect }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [saving, setSaving] = useState(null);
  const [user, setUser] = useState(null);
  
  const [contextMenu, setContextMenu] = useState(null);
  const [editingHatch, setEditingHatch] = useState(null);

  const isAdmin = user && user.email === 'aldamadaniel1984@gmail.com';

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

  const handleContextMenu = (e, item) => {
    if (!isAdmin) return;
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      item
    });
  };

  const handleEditMetadata = () => {
    setEditingHatch(contextMenu.item);
    setContextMenu(null);
  };

  const handleMetadataSaved = (updatedHatch) => {
    setAssets(assets.map(a => a.id === updatedHatch.id ? updatedHatch : a));
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

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', 
        gap: '10px', 
        alignContent: 'start'
      }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando biblioteca...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '20px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum recurso encontrado.</p>
          </div>
        ) : (
          filtered.map(item => {
            const isSelected = selectedItems.some(i => i.id === item.id);
            return (
              <div 
                key={item.id} 
                onClick={() => onToggleSelect && onToggleSelect(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                style={{ 
                  backgroundColor: isSelected ? 'rgba(242, 109, 33, 0.2)' : 'transparent', 
                  padding: '5px', 
                  borderRadius: '4px', 
                  border: isSelected ? '2px solid var(--tmd-orange)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.1s ease',
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#3b4654';
                    e.currentTarget.style.border = '2px solid #5a6b82';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.border = '2px solid transparent';
                  }
                }}
              >
                <div style={{ width: '64px', height: '64px', backgroundColor: '#3b4654', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  {currentType === 'icon' && <IconGenerator iconName={item.name} size={64} color="var(--tmd-orange)" />}
                  {currentType === 'hatch' && (
                    <div 
                      title={item.name}
                      style={{ 
                        width: '48px', height: '48px', 
                        backgroundImage: `url(${item.iconUrl || '/patterns/stack.svg'})`, 
                        backgroundSize: '50% 50%', backgroundRepeat: 'repeat', 
                        filter: 'invert(1) hue-rotate(180deg)', opacity: 0.9 
                      }} 
                    />
                  )}
                  {currentType === 'lin' && <LinetypePreview linCode={item.code} scale={1} width={64} height={64} />}
                </div>
                <span style={{ 
                  color: '#fff', 
                  fontSize: '0.7rem', 
                  marginTop: '6px', 
                  textAlign: 'center', 
                  width: '100%',
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }} title={item.name}>
                  {item.name || 'ITEM'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {contextMenu && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
            onClick={() => setContextMenu(null)} 
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            width: '160px'
          }}>
            <button 
              onClick={handleEditMetadata}
              style={{ padding: '10px 15px', backgroundColor: 'transparent', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#334155'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              ✏️ Editar Metadatos
            </button>
            <button 
              onClick={() => {
                showToast("Para editar geometría, selecciona un arquetipo en el constructor y sobreescribe este patrón.", "info", 5000);
                setContextMenu(null);
              }}
              style={{ padding: '10px 15px', backgroundColor: 'transparent', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', borderTop: '1px solid #334155' }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#334155'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              📐 Editar Geometría
            </button>
          </div>
        </>
      )}

      {editingHatch && (
        <EditMetadataModal 
          hatch={editingHatch} 
          onClose={() => setEditingHatch(null)} 
          onSaved={handleMetadataSaved} 
        />
      )}
    </div>
  );
}
