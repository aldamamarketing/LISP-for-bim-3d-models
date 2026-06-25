import React, { useState, useEffect } from 'react';
import { getUserFavorites, removeFromFavorites } from '../utils/library';
import HatchPreview from './tools/HatchPreview';
import LinetypePreview from './tools/LinetypePreview';
import JSZip from 'jszip';
import ToastContainer, { showToast } from './Toast';
import { ARCHETYPES } from './tools/HatchEngine';
import ThumbnailPreview from './tools/ThumbnailPreview';

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
      showToast('Recurso removido dos favoritos.', 'info', 3000);
    } catch (e) {
      showToast('Erro ao remover: ' + e.message, 'error');
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

  const groupedFavorites = filteredFavorites.reduce((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

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
    <>
    <div className="card" style={{ margin: 0, minHeight: '600px' }}>
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h2 className="text-xl font-bold m-0 text-white">Minha Coleção</h2>
        <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full sm:w-[250px] bg-[#0A0A0A] border border-[#262626] rounded text-white text-sm p-2 focus:border-primary-container focus:outline-none"
          />
          <a href="/pt/tools/hatch-generator" className="w-full sm:w-auto bg-[#1a1c1c] text-white border border-[#262626] hover:border-primary-container hover:text-primary-container px-4 py-2 rounded text-sm transition-colors flex justify-center items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span> Explorar Biblioteca
          </a>
        </div>
      </div>
      
      <div className="flex gap-2 mb-6 border-b border-[#262626] pb-2">
        <button 
          onClick={() => setActiveTab('hatch')}
          className={`px-4 py-2 rounded font-bold text-sm transition-colors ${activeTab === 'hatch' ? 'bg-primary-container text-white' : 'bg-transparent text-on-surface-variant hover:text-white'}`}
        >
          Hachuras (.pat)
        </button>
        <button 
          onClick={() => setActiveTab('lin')}
          className={`px-4 py-2 rounded font-bold text-sm transition-colors ${activeTab === 'lin' ? 'bg-primary-container text-white' : 'bg-transparent text-on-surface-variant hover:text-white'}`}
        >
          Líneas (.lin)
        </button>
        <button 
          onClick={() => setActiveTab('icon')}
          className={`px-4 py-2 rounded font-bold text-sm transition-colors ${activeTab === 'icon' ? 'bg-primary-container text-white' : 'bg-transparent text-on-surface-variant hover:text-white'}`}
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

            <div className="flex flex-col gap-10">
              {Object.keys(groupedFavorites).sort().map(category => (
                <div key={category}>
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-[#333] pb-2">{category}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                    {groupedFavorites[category].map(item => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <div key={item.id} onClick={() => toggleSelection(item.id)} style={{ border: '2px solid #334155', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#1e293b', transition: 'all 0.2s ease', position: 'relative' }} className={`${isSelected ? 'border-primary-container bg-primary-container/10' : ''}`} onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.borderColor='var(--tmd-orange)'; }} onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.borderColor='#334155'; }}>
                          
                          <div className="absolute top-3 right-3 opacity-0 hover:opacity-100 transition-opacity z-10" style={{ opacity: isSelected ? 1 : undefined }}>
                            <input type="checkbox" checked={isSelected} readOnly className="cursor-pointer accent-primary-container" />
                          </div>
                          {(isSelected) && (
                            <div className="absolute top-3 right-3 z-10 bg-[#1e293b] rounded-full">
                              <span className="material-symbols-outlined text-primary-container text-[20px]">check_circle</span>
                            </div>
                          )}

                          <div style={{ width: '100%', height: '140px', opacity: 0.8, overflow: 'hidden', backgroundColor: '#0b0f19' }}>
                            {activeTab === 'hatch' && (
                                <div style={{ width: '100%', height: '100%', opacity: 0.8 }}>
                                  {(() => {
                                    const arch = ARCHETYPES.find(a => 
                                      a.name.toLowerCase() === (item.name || '').toLowerCase() || 
                                      (a.iconUrl && a.iconUrl === item.iconUrl)
                                    ) || { 
                                      id: item.id || 'f', 
                                      iconUrl: item.iconUrl || '/patterns/stack.svg', 
                                      defaults: { width: 346, height: 600 } 
                                    };
                                    return (
                                      <ThumbnailPreview 
                                        archetype={arch} 
                                        containerWidth={180} 
                                        containerHeight={150} 
                                      />
                                    );
                                  })()}
                                </div>
                              )}
                            {activeTab === 'lin' && (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LinetypePreview linCode={item.code} scale={1} />
                              </div>
                            )}
                            {activeTab === 'icon' && (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <SvgPreview svgString={item.svgCode || item.code} />
                              </div>
                            )}
                          </div>

                          <div style={{ padding: '15px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                            <div style={{ marginTop: '4px', color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || 'Recurso guardado'}</div>
                          </div>
                          
                          <div style={{ padding: '10px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                              title="Apagar"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: AUTOCAD MOCKUP / CART */}
          <div style={{ flex: '0 0 320px', position: 'sticky', top: '20px', alignSelf: 'flex-start' }}>
            <div className="bg-[#1A1A1A] rounded border border-[#333] shadow-2xl overflow-hidden">
              
              {/* AutoCAD Palette Header */}
              <div className="bg-[#2A2B2C] px-3 py-1.5 flex justify-between items-center border-b border-[#444]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-[#888]">palette</span>
                  <span className="text-[10px] font-bold text-[#CCC] uppercase tracking-wider">Tool Palettes - LispCentral</span>
                </div>
                <div className="text-[#888] text-xs cursor-pointer hover:text-white">✖</div>
              </div>

              {/* AutoCAD Palette Body */}
              <div className="bg-[#3A3B3D] p-3 min-h-[200px] max-h-[400px] overflow-y-auto">
                {selectedItems.length === 0 ? (
                  <div className="text-[#999] text-xs text-center py-10 px-2 font-mono">
                    Nenhum item selecionado.<br/>Selecione itens ao lado para adicionar à paleta.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {selectedItems.map(item => (
                      <div key={'mock-'+item.id} className="bg-[#2A2B2C] border border-[#444] h-[70px] flex flex-col items-center justify-center p-1 relative hover:border-[#666] cursor-pointer" title={item.name}>
                        <div className="w-full h-[40px] overflow-hidden flex items-center justify-center opacity-90 mix-blend-screen">
                          {activeTab === 'hatch' && (
                            <div 
                              title={item.name}
                              style={{ 
                                width: '32px', height: '32px', 
                                backgroundImage: `url(${item.iconUrl || '/patterns/stack.svg'})`, 
                                backgroundSize: '50% 50%', backgroundRepeat: 'repeat', 
                                filter: 'invert(1) hue-rotate(180deg)' 
                              }} 
                            />
                          )}
                          {activeTab === 'lin' && <LinetypePreview linCode={item.code} scale={0.5} />}
                          {activeTab === 'icon' && <SvgPreview svgString={item.svgCode || item.code} />}
                        </div>
                        <span className="text-[9px] text-[#CCC] text-center mt-1 truncate w-full">{item.name}</span>
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

              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#aaa', textAlign: 'center', padding: '10px', backgroundColor: 'rgba(242,109,33,0.05)', border: '1px solid rgba(242,109,33,0.15)', borderRadius: '6px' }}>
                💡 <strong style={{ color: 'var(--tmd-orange)' }}>Dica Pro:</strong> Com o <a href="/dashboard" style={{ color: '#f26d21', textDecoration: 'underline' }}>Loader instalado</a>, seus favoritos ficam disponíveis direto na paleta do AutoCAD — sem precisar baixar nada.
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
    <ToastContainer />
    </>
  );
}
