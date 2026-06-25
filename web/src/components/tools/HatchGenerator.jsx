import React, { useState, useEffect } from 'react';
import './IconGenerator.css'; 
import { saveToGlobalLibrary, addToFavorites } from '../../utils/library';
import { auth, functions } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { executeInAutoCAD } from '../../utils/autocadBridge';
import LibraryPanel from './LibraryPanel';
import ToastContainer, { showToast } from '../Toast';
import { translations } from '../../i18n/translations.js';
import { ARCHETYPES, generatePatternName, ARCHETYPE_DESCRIPTIONS, CATEGORIES, ASSETS_BASE_URL } from './HatchEngine';
import SvgPreviewEngine from './SvgPreviewEngine';
import ThumbnailPreview from './ThumbnailPreview';
import MultiFilter from '../MultiFilter';
import { SvgToPatEngine } from '../../utils/SvgToPatEngine';


const isInsideAutoCAD = typeof window !== 'undefined' && (
  typeof window.external?.ExecuteAutoCADCommand === 'function' ||
  typeof window.exec === 'function' ||
  typeof window.execAsync === 'function' ||
  window.location.search.includes('token=')
);

export default function HatchGenerator({ lang = 'en', isEmbedded = false, onClose }) {
  const t = (key) => { const dict = translations[lang] || translations['en']; return dict[key] || key; };
  
  const [activeTab, setActiveTab] = useState('generator'); // 'library' | 'generator'
  const [generatorView, setGeneratorView] = useState('archetypes'); // 'archetypes' | 'builder'
  
  // Estados de búsqueda para arquetipos
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  
  const [user, setUser] = useState(null);
  
  // Parametric State
  const [selectedArchetypeId, setSelectedArchetypeId] = useState('line');
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(100);
  const [spacing, setSpacing] = useState(200);
  const [joint, setJoint] = useState(5);
  const [rows, setRows] = useState(1);
  const [columns, setColumns] = useState(1);
  

  
  const [saving, setSaving] = useState(false);
  const [selectedHatches, setSelectedHatches] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  const currentArchetype = ARCHETYPES.find(a => a.id === selectedArchetypeId) || ARCHETYPES[0];

  useEffect(() => {
    // Cuando cambia el arquetipo, reiniciamos los parámetros
    setWidth(currentArchetype.defaults.width || 200);
    setHeight(currentArchetype.defaults.height || 100);
    setJoint(currentArchetype.defaults.joint || 0);
    setSpacing(currentArchetype.defaults.spacing || 50);
    setRows(currentArchetype.defaults.rows || 1);
    setColumns(currentArchetype.defaults.columns || 1);
  }, [currentArchetype]);

  // Forzar relación lógica entre dimensiones para patrones específicos
  useEffect(() => {
    if (currentArchetype.id === 'chevron') {
      // Chevron: El Largo (width) no puede ser menor que el Ancho (height).
      // Matemáticamente un Chevron requiere que la tabla sea más larga que ancha.
      if (width < height) {
        setWidth(height);
      }
    }
  }, [width, height, currentArchetype]);

  const handleArchetypeChange = (id) => {
    setSelectedArchetypeId(id);
    setGeneratorView('builder');
  };

  const filteredArchetypes = React.useMemo(() => {
    return ARCHETYPES.filter(arch => {
      const matchesSearch = arch.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || (arch.categories && arch.categories.includes(selectedCategory));
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);


  const handleSaveToFavorites = async () => {
    if (!user) {
      showToast('Crie uma conta gratuita para salvar nos favoritos.', 'warning', 6000);
      return;
    }
    setSaving(true);
    try {
      const p1 = currentArchetype.controlsType === 'lines' ? spacing : width;
      const buildHatchPattern = httpsCallable(functions, 'buildHatchPattern');
      const { data } = await buildHatchPattern({ archetypeId: currentArchetype.id, params: [p1, height, joint] });
      const patCode = data.patCode;
      const generatedName = generatePatternName(currentArchetype, p1, height, joint);
      const hatchId = "hatch_" + generatedName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

      const assetData = {
        id: hatchId,
        type: 'hatch',
        name: generatedName,
        description: `Parametric ${currentArchetype.name}`,
        category: 'Parametric',
        code: patCode,
        iconUrl: currentArchetype.iconUrl
      };

      await addToFavorites(assetData);
      showToast('Padrão salvo na sua coleção! ⭐', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
    setSaving(false);
  };

  const handleSaveToPublicLibrary = async () => {
    setSaving(true);
    try {
      const p1 = currentArchetype.controlsType === 'lines' ? spacing : width;
      const buildHatchPattern = httpsCallable(functions, 'buildHatchPattern');
      const { data } = await buildHatchPattern({ archetypeId: currentArchetype.id, params: [p1, height, joint] });
      const patCode = data.patCode;
      const generatedName = generatePatternName(currentArchetype, p1, height, joint);
      const hatchId = "hatch_" + generatedName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

      const assetData = {
        id: hatchId,
        type: 'hatch',
        name: generatedName,
        description: `Parametric ${currentArchetype.name}`,
        category: 'Parametric',
        code: patCode,
        iconUrl: currentArchetype.iconUrl
      };

      await saveToGlobalLibrary(assetData);
      await addToFavorites(assetData);
      showToast('Padrão publicado na Livraria Global! 🌍', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
    setSaving(false);
  };

  const handleApplyToAutoCAD = async () => {
    setSaving(true);
    try {
      const p1 = currentArchetype.controlsType === 'lines' ? spacing : width;
      let patCode;
      try {
        const buildHatchPattern = httpsCallable(functions, 'buildHatchPattern');
        const { data } = await buildHatchPattern({ archetypeId: currentArchetype.id, params: [p1, height, joint] });
        patCode = data.patCode;
      } catch (backendError) {
        // Fallback al Motor Universal — construir URL absoluta para evitar file:// en AutoCAD
        const absoluteIconUrl = currentArchetype.iconUrl?.startsWith('/')
          ? ASSETS_BASE_URL + currentArchetype.iconUrl
          : currentArchetype.iconUrl;
        patCode = await SvgToPatEngine.fetchAndConvert(absoluteIconUrl, currentArchetype.name);
      }
      const generatedName = generatePatternName(currentArchetype, p1, height, joint);
      const safeName = generatedName.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();

      executeInAutoCAD(`(setq *LC-ASSET-TYPE* "hatch")`);
      executeInAutoCAD(`(setq *LC-ASSET-NAME* "${safeName}")`);
      executeInAutoCAD(`(setq *LC-ASSET-CODE* "")`);
      
      const chunkSize = 100;
      for (let i = 0; i < patCode.length; i += chunkSize) {
        const rawChunk = patCode.substring(i, i + chunkSize);
        const escapedChunk = rawChunk
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        
        executeInAutoCAD(`(progn (setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "${escapedChunk}")) (princ))`);
      }
      
      executeInAutoCAD('LC_APPLY_ASSET');
      showToast('Aplicando Padrão no AutoCAD... 🚀', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
    setSaving(false);
  };

  const isAdmin = user && user.email === 'aldamadaniel1984@gmail.com';

  const handleDirectApplyArch = async (e, arch) => {
    e.stopPropagation();
    setSaving(true);
    try {
      // Construir URL absoluta para evitar el bug de file:// en AutoCAD embebido.
      const absoluteIconUrl = arch.iconUrl?.startsWith('/')
        ? ASSETS_BASE_URL + arch.iconUrl
        : arch.iconUrl;
      let patCode = await SvgToPatEngine.fetchAndConvert(absoluteIconUrl, arch.name);
      const safeName = arch.name.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      
      if (isInsideAutoCAD) {
        executeInAutoCAD(`(setq *LC-ASSET-TYPE* "hatch")`);
        executeInAutoCAD(`(setq *LC-ASSET-NAME* "${safeName}")`);
        executeInAutoCAD(`(setq *LC-ASSET-CODE* "")`);
        const chunkSize = 100;
        for (let i = 0; i < patCode.length; i += chunkSize) {
          const rawChunk = patCode.substring(i, i + chunkSize);
          const escapedChunk = rawChunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
          executeInAutoCAD(`(progn (setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "${escapedChunk}")) (princ))`);
        }
        executeInAutoCAD('LC_APPLY_ASSET');
        showToast('Aplicando Padrão no AutoCAD... 🚀', 'success');
      } else {
        const header = `*${arch.name}, ${arch.name}\n`;
        const content = header + patCode + '\n';
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${arch.name.replace(/\s+/g, '_')}.pat`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Download concluído! 📥', 'success');
      }
    } catch (err) {
      showToast('Erro ao gerar PAT: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const toggleSelectHatch = (hatch) => {
    const isSelected = selectedHatches.some(h => h.id === hatch.id);
    if (isSelected) {
      setSelectedHatches(selectedHatches.filter(h => h.id !== hatch.id));
    } else {
      setSelectedHatches([...selectedHatches, hatch]);
    }
  };

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Pestañas de Navegación */}
      {!isEmbedded && (
        <div style={{ display: 'flex', borderBottom: '1px solid #333', marginBottom: '15px' }}>
          <button 
            onClick={() => setActiveTab('library')}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: activeTab === 'library' ? '#222' : 'transparent', 
              color: activeTab === 'library' ? '#fff' : 'var(--text-muted)', 
              border: '1px solid #333',
              borderBottom: activeTab === 'library' ? '1px solid #222' : '1px solid #333',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer', 
              fontWeight: 'bold',
              marginBottom: '-1px'
            }}
          >
            {t('hatch.factory')}
          </button>
          <button 
            onClick={() => { setActiveTab('generator'); setGeneratorView('archetypes'); }}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: activeTab === 'generator' ? '#222' : 'transparent', 
              color: activeTab === 'generator' ? 'var(--tmd-orange)' : 'var(--text-muted)', 
              border: '1px solid #333',
              borderBottom: activeTab === 'generator' ? '1px solid #222' : '1px solid #333',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer', 
              fontWeight: 'bold',
              marginBottom: '-1px',
              marginLeft: '5px'
            }}
          >
            {t('hatch.parametricBuilder')}
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: '20px' }}>
        
        {/* Pestaña: Biblioteca (Para ver y gestionar los Favoritos) */}
        {activeTab === 'library' && (
          <LibraryPanel 
            currentType="hatch" 
            selectedItems={selectedHatches} 
            onToggleSelect={toggleSelectHatch} 
          />
        )}

        {/* Pestaña: Constructor Paramétrico */}
        {activeTab === 'generator' && generatorView === 'archetypes' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
            {/* Header de Arquetipos con Breadcrumb y Buscador */}
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#181818' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onClose && (
                  <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: 0 }}>← Library</button>
                )}
                {onClose && <span style={{ color: '#555' }}>/</span>}
                <span style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: 'bold' }}>Hatches</span>
                <span style={{ color: '#555' }}>/</span>
                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>Templates</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Search archetype..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#222', color: '#fff', outline: 'none' }} 
                />
                
                <div style={{ position: 'relative' }}>
                  <div 
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '4px', 
                      border: '1px solid #333', 
                      backgroundColor: '#222', 
                      color: '#fff', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '130px'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
                    </span>
                    <span style={{ fontSize: '0.6rem', marginLeft: '8px' }}>▼</span>
                  </div>
                  
                  {isCategoryDropdownOpen && (
                    <>
                      <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} 
                        onClick={() => setIsCategoryDropdownOpen(false)}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#222',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        zIndex: 10,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        width: '150px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                      }}>
                        <div 
                          onClick={() => { setSelectedCategory('All'); setIsCategoryDropdownOpen(false); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', color: selectedCategory === 'All' ? 'var(--tmd-orange)' : '#fff', backgroundColor: selectedCategory === 'All' ? 'rgba(242, 109, 33, 0.1)' : 'transparent' }}
                          onMouseEnter={(e) => { if(selectedCategory !== 'All') e.currentTarget.style.backgroundColor='#333'; }}
                          onMouseLeave={(e) => { if(selectedCategory !== 'All') e.currentTarget.style.backgroundColor='transparent'; }}
                        >
                          All Categories
                        </div>
                        {CATEGORIES.map(cat => (
                          <div 
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setIsCategoryDropdownOpen(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', color: selectedCategory === cat ? 'var(--tmd-orange)' : '#fff', backgroundColor: selectedCategory === cat ? 'rgba(242, 109, 33, 0.1)' : 'transparent' }}
                            onMouseEnter={(e) => { if(selectedCategory !== cat) e.currentTarget.style.backgroundColor='#333'; }}
                            onMouseLeave={(e) => { if(selectedCategory !== cat) e.currentTarget.style.backgroundColor='transparent'; }}
                          >
                            {cat}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
                  {filteredArchetypes.map(arch => (
                    <div 
                      key={arch.id} 
                      onClick={() => handleArchetypeChange(arch.id)} 
                      style={{
                        position: 'relative',
                        height: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        overflow: 'hidden',
                        padding: '10px',
                        backgroundColor: '#1e293b',
                        border: '2px solid',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }} 
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor='#2a3a52'; e.currentTarget.style.borderColor='var(--tmd-orange)'; }} 
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor='#1e293b'; e.currentTarget.style.borderColor='#334155'; }}
                    >
                      <div style={{ width: '100%', flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', opacity: 0.8 }}>
                          <ThumbnailPreview 
                            archetype={arch} 
                            containerWidth={130} 
                            containerHeight={90} 
                          />
                        </div>
                      </div>
                      
                      <div style={{
                        width: '100%',
                        marginTop: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{arch.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{arch.category || 'General'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>
        )}

        {activeTab === 'generator' && generatorView === 'builder' && (
          <div style={{ display: 'flex', width: '100%', height: '100%', gap: '0', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Arriba: Preview Canvas */}
            <div style={{ flex: 'none', minHeight: '220px', maxHeight: '45vh', backgroundColor: '#0b0f19', borderBottom: '1px solid #333', padding: '15px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', marginBottom: '10px', overflowX: 'auto', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)', maskImage: 'linear-gradient(to right, black 85%, transparent 100%)', scrollbarWidth: 'none', paddingRight: '20px' }}>
                {onClose && (
                  <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: 0, whiteSpace: 'nowrap' }}>← Library</button>
                )}
                {onClose && <span style={{ color: '#555' }}>/</span>}
                <span style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: 'bold' }}>Hatches</span>
                <span style={{ color: '#555' }}>/</span>
                <button onClick={() => setGeneratorView('archetypes')} style={{ background: 'none', border: 'none', color: 'var(--tmd-orange)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: 0, whiteSpace: 'nowrap' }}>Templates</button>
                <span style={{ color: '#555' }}>/</span>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  {currentArchetype.name}
                </span>
                <span style={{ color: '#555' }}>-</span>
                <span style={{ color: 'var(--tmd-orange)', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  {generatePatternName(currentArchetype, width, height, joint)}
                </span>
              </div>
              
              <div style={{ flex: 1, backgroundColor: '#0b0f19', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333' }}>
                <SvgPreviewEngine 
                  archetype={currentArchetype} 
                  params={{ width, height, spacing, joint }}
                  gridRows={rows} 
                  gridCols={columns} 
                />
              </div>
            </div>

            {/* Abajo: Parámetros */}
            <div className="panel col-settings" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                  {!currentArchetype.hasBackendEngine && (
                    <div style={{ padding: '10px', backgroundColor: 'rgba(242, 109, 33, 0.1)', borderLeft: '3px solid var(--tmd-orange)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--tmd-orange)', fontSize: '0.85rem' }}>BETA / In Development</div>
                      <div style={{ color: '#cbd5e1', fontSize: '0.75rem', marginTop: '5px', lineHeight: '1.4' }}>
                        This pattern's mathematical engine is still in development. The generated hatch is an automatic approximation.
                      </div>
                    </div>
                  )}
                  
                  {!currentArchetype.id && (
                    <div style={{
                      position: 'absolute',
                      top: '10px', left: '10px', right: '10px', bottom: '90px',
                      backgroundColor: 'rgba(26, 26, 26, 0.75)',
                      backdropFilter: 'blur(3px)',
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      textAlign: 'center',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ marginBottom: '15px' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--tmd-orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </div>
                      <h4 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1.2rem' }}>Coming Soon</h4>
                      <p style={{ color: '#aaa', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
                        This archetype is currently in development.
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', opacity: currentArchetype.id ? 1 : 0.3, pointerEvents: currentArchetype.id ? 'auto' : 'none' }}>

                  {/* Grid Setup */}
                  <div className="form-group" style={{ borderTop: '1px solid #444', paddingTop: '15px' }}>
                    <label style={{ fontWeight: 'bold', color: '#ccc' }}>Grid Layout (Rows x Cols)</label>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Rows (Max 10)</span>
                        <input type="number" min="1" max="10" className="form-control" value={rows} onChange={e => setRows(Math.min(10, Number(e.target.value)))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Columns (Max 10)</span>
                        <input type="number" min="1" max="10" className="form-control" value={columns} onChange={e => setColumns(Math.min(10, Number(e.target.value)))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                      </div>
                    </div>
                  </div>

                  {/* Control Dinámico por Tipo */}
                  <div className="form-group" style={{ borderTop: '1px solid #444', paddingTop: '15px' }}>
                    <label style={{ fontWeight: 'bold', color: '#ccc' }}>Dimensions (mm)</label>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>
                      
                      {currentArchetype.controlsType === 'rectangular' && currentArchetype.controls.includes('width') && (
                        <div style={{ flex: '1 1 45%' }}>
                          <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Length</span>
                          <input type="number" min="1" className="form-control" value={width} onChange={e => setWidth(Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                        </div>
                      )}
                      
                      {currentArchetype.controlsType === 'rectangular' && currentArchetype.controls.includes('height') && (
                        <div style={{ flex: '1 1 45%' }}>
                          <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Width</span>
                          <input type="number" min="1" className="form-control" value={height} onChange={e => setHeight(Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                        </div>
                      )}

                      {currentArchetype.controlsType === 'weave' && currentArchetype.controls.includes('width') && (
                        <div style={{ flex: '1 1 45%' }}>
                          <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Spacing</span>
                          <input type="number" min="1" className="form-control" value={width} onChange={e => setWidth(Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                        </div>
                      )}
                      
                      {currentArchetype.controlsType === 'weave' && currentArchetype.controls.includes('height') && (
                        <div style={{ flex: '1 1 45%' }}>
                          <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Thickness</span>
                          <input type="number" min="1" className="form-control" value={height} onChange={e => setHeight(Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                        </div>
                      )}

                      {currentArchetype.controlsType === 'lines' && currentArchetype.controls.includes('spacing') && (
                        <div style={{ flex: '1 1 45%' }}>
                          <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Spacing</span>
                          <input type="number" min="1" className="form-control" value={spacing} onChange={e => setSpacing(Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                        </div>
                      )}

                      {(currentArchetype.controlsType === 'cubic' || currentArchetype.controlsType === 'cubic3d') && currentArchetype.controls.includes('size') && (
                        <div style={{ flex: '1 1 45%' }}>
                          <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Size (Side)</span>
                          <input type="number" min="1" className="form-control" value={width} onChange={e => setWidth(Number(e.target.value))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Juntas */}
                  {currentArchetype.controls.includes('joint') && (
                    <div className="form-group" style={{ borderTop: '1px solid #444', paddingTop: '15px' }}>
                      <label style={{ fontWeight: 'bold', color: '#ccc' }}>Joints</label>
                      <div style={{ marginTop: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Thickness (mm)</span>
                        <input type="number" min="0" className="form-control" value={joint} onChange={e => setJoint(Number(e.target.value))} style={{ width: '45%', padding: '6px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff' }} />
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons fijos en la base */}
              <div style={{ padding: '15px 20px', backgroundColor: '#181818', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '100%', maxWidth: '350px', display: 'flex', gap: '10px' }}>
                  {isInsideAutoCAD && (
                    <button 
                      style={{ flex: 2, padding: '10px 15px', fontSize: '0.9rem', backgroundColor: 'var(--tmd-orange)', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={handleApplyToAutoCAD}
                      disabled={saving}
                    >
                      {saving ? 'Generating...' : 'Apply to AutoCAD 🎯'}
                    </button>
                  )}
                  <button 
                    style={{ flex: 1, padding: '10px 15px', fontSize: '0.9rem', backgroundColor: '#333', color: '#fff', borderRadius: '6px', border: '1px solid #555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: 'bold' }}
                    onClick={handleSaveToFavorites}
                    disabled={saving}
                    title="Save to My Collection"
                  >
                    <span>⭐</span> Add
                  </button>
                  {isAdmin && (
                    <button 
                      style={{ padding: '10px 15px', fontSize: '0.9rem', backgroundColor: '#e65c00', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      onClick={handleSaveToPublicLibrary}
                      disabled={saving}
                      title="Publish to Global Library"
                    >
                      🌍
                    </button>
                  )}
                </div>
                {/* Footer Link */}
                <div style={{ width: '100%', maxWidth: '350px', textAlign: 'center', marginTop: '2px' }}>
                  <a href="https://lispcentral.com" target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#666', textDecoration: 'none', letterSpacing: '0.5px' }}>
                    lispcentral.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>

    <ToastContainer />
    </>
  );
}
