import React, { useState, useEffect } from 'react';
import './IconGenerator.css'; 
import { saveToGlobalLibrary, addToFavorites } from '../../utils/library';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LibraryPanel from './LibraryPanel';
import ToastContainer, { showToast } from '../Toast';
import { translations } from '../../i18n/translations.js';
import { ARCHETYPES, generatePatternName, ARCHETYPE_DESCRIPTIONS, CATEGORIES } from './HatchEngine';
import SvgPreviewEngine from './SvgPreviewEngine';


export default function HatchGenerator({ lang = 'en' }) {
  const t = (key) => { const dict = translations[lang] || translations['en']; return dict[key] || key; };
  
  const [activeTab, setActiveTab] = useState('generator'); // 'library' | 'generator'
  const [generatorView, setGeneratorView] = useState('archetypes'); // 'archetypes' | 'builder'
  
  // Estados de búsqueda para arquetipos
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
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
      const matchesCategory = selectedCategory === 'All' || arch.category === selectedCategory;
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
      const patCode = currentArchetype.generatePat(p1, height, joint);
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

      await addToFavorites(assetData); // Guarda el código y datos completos en la colección privada
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
      const patCode = currentArchetype.generatePat(p1, height, joint);
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
      await addToFavorites(assetData); // También a favoritos del admin para acceso rápido
      showToast('Padrão publicado na Livraria Global! 🌍', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
    setSaving(false);
  };

  // Puedes ajustar este chequeo con tu email real o custom claim
  const isAdmin = user && user.email === 'aldamadaniel1984@gmail.com';


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
            <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', gap: '15px', alignItems: 'center', backgroundColor: '#1e293b' }}>
              <h2 style={{ margin: 0, color: 'var(--tmd-orange)', flexShrink: 0 }}>Arquetipos Paramétricos</h2>
              <input type="text" placeholder="Buscar patrón..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, padding: '10px 15px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0b0f19', color: 'white' }} />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0b0f19', color: 'white' }}>
                <option value="All">Todas las Categorías</option>
                {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                {filteredArchetypes.map(arch => (
                  <div key={arch.id} onClick={() => handleArchetypeChange(arch.id)} style={{ border: '2px solid #334155', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#1e293b', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.borderColor='var(--tmd-orange)'} onMouseLeave={(e) => e.currentTarget.style.borderColor='#334155'}>
                    <div style={{ width: '100%', height: '140px', opacity: 0.8, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: 0 }}>
                        {[1,2,3,4].map(i => (
                          <img key={i} src={arch.iconUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'invert(1) hue-rotate(180deg)' }} alt="Pattern tile" />
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: '15px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center' }}>{arch.name}</div>
                      <div style={{ marginTop: '4px', color: '#94a3b8', fontSize: '0.75rem' }}>{arch.category || 'General'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'generator' && generatorView === 'builder' && (
          <div style={{ display: 'flex', width: '100%', gap: '20px' }}>
            
            {/* Columna Izquierda: Parámetros */}
            <div className="panel col-settings" style={{ width: '320px', flexShrink: 0, overflowY: 'auto' }}>
              <div style={{ padding: '15px', borderBottom: '1px solid #333', backgroundColor: '#1a1a1a', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('hatch.settings')}</h3>
                <button onClick={() => setGeneratorView('archetypes')} style={{ background: 'none', border: 'none', color: 'var(--tmd-orange)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>⬅ Volver</button>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                


                {/* Grid Setup */}
                <div className="form-group" style={{ borderTop: '1px solid #444', paddingTop: '15px' }}>
                  <label style={{ fontWeight: 'bold' }}>{t('hatch.gridLayout')}</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Rows (Max 10)</span>
                      <input type="number" min="1" max="10" className="form-control" value={rows} onChange={e => setRows(Math.min(10, Number(e.target.value)))} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Columns (Max 10)</span>
                      <input type="number" min="1" max="10" className="form-control" value={columns} onChange={e => setColumns(Math.min(10, Number(e.target.value)))} />
                    </div>
                  </div>
                </div>

                {/* Control Dinámico por Tipo */}
                <div className="form-group" style={{ borderTop: '1px solid #444', paddingTop: '15px' }}>
                  <label style={{ fontWeight: 'bold' }}>{t('hatch.dimensions')}</label>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    
                    {currentArchetype.controlsType === 'rectangular' && currentArchetype.controls.includes('width') && (
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('hatch.length')}</span>
                        <input type="number" min="1" className="form-control" value={width} onChange={e => setWidth(Number(e.target.value))} />
                      </div>
                    )}
                    
                    {currentArchetype.controlsType === 'rectangular' && currentArchetype.controls.includes('height') && (
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('hatch.width')}</span>
                        <input type="number" min="1" className="form-control" value={height} onChange={e => setHeight(Number(e.target.value))} />
                      </div>
                    )}

                    {currentArchetype.controlsType === 'weave' && currentArchetype.controls.includes('width') && (
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('hatch.spaceS')}</span>
                        <input type="number" min="1" className="form-control" value={width} onChange={e => setWidth(Number(e.target.value))} />
                      </div>
                    )}
                    
                    {currentArchetype.controlsType === 'weave' && currentArchetype.controls.includes('height') && (
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('hatch.ribbonThicknessT')}</span>
                        <input type="number" min="1" className="form-control" value={height} onChange={e => setHeight(Number(e.target.value))} />
                      </div>
                    )}

                    {currentArchetype.controlsType === 'lines' && currentArchetype.controls.includes('spacing') && (
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('hatch.spaceS')}</span>
                        <input type="number" min="1" className="form-control" value={spacing} onChange={e => setSpacing(Number(e.target.value))} />
                      </div>
                    )}

                    {(currentArchetype.controlsType === 'cubic' || currentArchetype.controlsType === 'cubic3d') && currentArchetype.controls.includes('size') && (
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Size (Side)</span>
                        <input type="number" min="1" className="form-control" value={width} onChange={e => setWidth(Number(e.target.value))} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Juntas */}
                {currentArchetype.controls.includes('joint') && (
                  <div className="form-group" style={{ borderTop: '1px solid #444', paddingTop: '15px' }}>
                    <label style={{ fontWeight: 'bold' }}>{t('hatch.joints')}</label>
                    <div style={{ marginTop: '5px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{t('hatch.thickness')}</span>
                      <input type="number" min="0" className="form-control" value={joint} onChange={e => setJoint(Number(e.target.value))} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '15px', fontSize: '1rem' }}
                    onClick={handleSaveToFavorites}
                    disabled={saving}
                  >
                    {saving ? '...' : t('hatch.myCollection')}
                  </button>

                  {isAdmin && (
                    <button 
                      className="btn-primary" 
                      style={{ flex: 1, padding: '15px', fontSize: '1rem', backgroundColor: '#e65c00' }}
                      onClick={handleSaveToPublicLibrary}
                      disabled={saving}
                      title="Solo visible para Administradores"
                    >
                      {saving ? '...' : t('hatch.publish')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Preview Canvas */}
            <div style={{ flex: 1, backgroundColor: '#222', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('hatch.livePreview')}</h3>
                <span style={{ color: 'var(--tmd-orange)', fontWeight: 'bold' }}>
                  {generatePatternName(currentArchetype, width, height, joint)}
                </span>
              </div>
              
              <div style={{ flex: 1, backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333' }}>
                <SvgPreviewEngine 
                  archetype={currentArchetype} 
                  params={{ width, height, spacing, joint }}
                  gridRows={rows} 
                  gridCols={columns} 
                />
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
