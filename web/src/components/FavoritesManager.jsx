import React, { useState, useEffect } from 'react';
import { getUserFavorites, removeFromFavorites } from '../utils/library';
import HatchPreview from './tools/HatchPreview';
import LinetypePreview from './tools/LinetypePreview';
import JSZip from 'jszip';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isRevitFormat, setIsRevitFormat] = useState(false);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const data = await getUserFavorites(activeTab);
      setFavorites(data);
      setSelectedIds([]); // reset selection
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
      setSelectedIds(prev => prev.filter(selId => selId !== id));
    } catch (e) {
      alert("Error eliminando: " + e.message);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredFavorites.length && filteredFavorites.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFavorites.map(f => f.id));
    }
  };

  const filteredFavorites = favorites.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q));
  });

  const selectedItems = favorites.filter(f => selectedIds.includes(f.id));

  const handleBulkDownload = async () => {
    if (selectedItems.length === 0) return;

    if (activeTab === 'icon') {
      const zip = new JSZip();
      selectedItems.forEach((item, idx) => {
        const name = item.name ? item.name.replace(/\s+/g, '_') : `icon_${idx}`;
        const content = item.svgCode || item.code;
        zip.file(`${name}.svg`, content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iconos_lispcentral.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      let bulkContent = '';
      let extension = activeTab === 'hatch' ? 'pat' : 'lin';
      
      if (activeTab === 'hatch' && isRevitFormat) {
        bulkContent += `;%TYPE=MODEL\n;%UNITS=MM\n`;
      }

      selectedItems.forEach(item => {
        if (activeTab === 'hatch') {
          bulkContent += `*${item.name || 'HATCH'}\n${item.description || ''}\n${item.code}\n\n`;
        } else {
          bulkContent += `*${item.name || 'LINE'}, ${item.description || ''}\n${item.code}\n\n`;
        }
      });

      const blob = new Blob([bulkContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recursos_lispcentral.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{ backgroundColor: '#111', color: '#fff', borderRadius: '8px', padding: '20px', minHeight: '600px' }}>
      <div style={{ marginBottom: '15px' }}>
        <a href="/dashboard" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span>←</span> Voltar ao Dashboard
        </a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--tmd-orange)', margin: 0 }}>Mis Recursos (Favoritos)</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Pesquisar favoritos..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff', fontSize: '0.9rem', width: '250px' }}
          />
          <a href="/pt/tools/hatch-generator" style={{ padding: '8px 15px', backgroundColor: '#333', color: '#fff', textDecoration: 'none', borderRadius: '4px', border: '1px solid #555' }}>
            + Explorar Biblioteca Pública
          </a>
        </div>
      </div>
      
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
          Íconos (.svg)
        </button>
      </div>

      {loading ? (
        <p>Carregando favoritos...</p>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#222', borderRadius: '8px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Você não possui recursos salvos nesta categoria.</p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
            {activeTab === 'hatch' && <a href="/pt/tools/hatch-generator" style={{ color: '#fff', textDecoration: 'none', backgroundColor: 'var(--tmd-orange)', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold' }}>+ Gerar Hachuras</a>}
            {activeTab === 'lin' && <a href="/pt/tools/linetype-generator" style={{ color: '#fff', textDecoration: 'none', backgroundColor: 'var(--tmd-orange)', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold' }}>+ Gerar Linhas</a>}
            {activeTab === 'icon' && <a href="/pt/tools/icon-generator" style={{ color: '#fff', textDecoration: 'none', backgroundColor: 'var(--tmd-orange)', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold' }}>+ Gerar Ícones</a>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          {/* LEFT COLUMN: CATALOG */}
          <div style={{ flex: '1 1 60%' }}>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={toggleAll} style={{ padding: '6px 12px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}>
                {(selectedIds.length === filteredFavorites.length && filteredFavorites.length > 0) ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedIds.length} selecionado(s)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
              {filteredFavorites.map(item => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div key={item.id} onClick={() => toggleSelection(item.id)} style={{ cursor: 'pointer', backgroundColor: isSelected ? 'rgba(242, 109, 33, 0.15)' : '#222', padding: '15px', borderRadius: '8px', border: `1px solid ${isSelected ? 'var(--tmd-orange)' : '#333'}`, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                    </div>

                    <strong style={{ color: 'var(--tmd-orange)', fontSize: '1rem', marginBottom: '5px', paddingRight: '20px' }}>{item.name}</strong>
                    <p style={{ color: '#ccc', fontSize: '0.8rem', marginBottom: '15px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                    
                    <div style={{ flex: 1, marginBottom: '15px', pointerEvents: 'none' }}>
                      {activeTab === 'hatch' && <HatchPreview patCode={item.code} scale={0.5} />}
                      {activeTab === 'lin' && <LinetypePreview linCode={item.code} scale={1} />}
                      {activeTab === 'icon' && <SvgPreview svgString={item.svgCode || item.code} />}
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                      style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      title="Apagar (Eliminar de favoritos)"
                    >
                      Remover
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: AUTOCAD MOCKUP / CART */}
          <div style={{ flex: '0 0 320px', position: 'sticky', top: '20px', alignSelf: 'flex-start' }}>
            <div style={{ backgroundColor: '#444', borderRadius: '4px', border: '1px solid #222', boxShadow: '0 8px 24px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
              
              {/* AutoCAD Palette Header */}
              <div style={{ backgroundColor: '#222', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #555' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#555', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase' }}>Tool Palettes - LispCentral</span>
                </div>
                <div style={{ color: '#888', fontSize: '0.8rem' }}>✖</div>
              </div>

              {/* AutoCAD Palette Body */}
              <div style={{ backgroundColor: '#333', padding: '10px', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                {selectedItems.length === 0 ? (
                  <div style={{ color: '#777', fontSize: '0.85rem', textAlign: 'center', padding: '40px 10px' }}>
                    Nenhum item selecionado.<br/>Selecione itens ao lado para adicionar à paleta.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                    {selectedItems.map(item => (
                      <div key={'mock-'+item.id} style={{ backgroundColor: '#222', border: '1px solid #444', height: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px', position: 'relative' }} title={item.name}>
                        <div style={{ width: '100%', height: '40px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                          {activeTab === 'hatch' && <HatchPreview patCode={item.code} scale={0.2} />}
                          {activeTab === 'lin' && <LinetypePreview linCode={item.code} scale={0.5} />}
                          {activeTab === 'icon' && <SvgPreview svgString={item.svgCode || item.code} />}
                        </div>
                        <span style={{ fontSize: '0.55rem', color: '#ccc', textAlign: 'center', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Download Panel */}
            <div style={{ marginTop: '15px', backgroundColor: '#222', padding: '15px', borderRadius: '6px', border: '1px solid #333' }}>
              <h4 style={{ margin: '0 0 15px 0', color: 'var(--tmd-orange)' }}>Baixar Selecionados</h4>
              
              {activeTab === 'hatch' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '15px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isRevitFormat} onChange={(e) => setIsRevitFormat(e.target.checked)} />
                  Exportar para Revit (;%TYPE=MODEL)
                </label>
              )}

              <button 
                onClick={handleBulkDownload}
                disabled={selectedItems.length === 0}
                style={{ width: '100%', padding: '12px', backgroundColor: selectedItems.length > 0 ? 'var(--tmd-orange)' : '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', transition: 'background 0.2s' }}
              >
                {activeTab === 'icon' ? `Baixar .ZIP (${selectedItems.length})` : `Baixar Único Arquivo (${selectedItems.length})`}
              </button>

              <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Com o Loader instalado, você não precisa baixar. Basta sincronizar sua paleta no AutoCAD.
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
