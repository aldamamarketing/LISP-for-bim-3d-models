import React, { useState, useEffect } from 'react';
import { getUserFavorites } from '../utils/library';
import HatchPreview from './tools/HatchPreview';
import LinetypePreview from './tools/LinetypePreview';

const SvgPreview = ({ svgString }) => (
  <div 
    style={{ width: '100%', height: '80px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    dangerouslySetInnerHTML={{ __html: svgString }} 
  />
);

export default function AutoCADPalette() {
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

  const handleApply = (item) => {
    // Comunicar con AutoCAD a traves de window.external
    if (window.external && typeof window.external.ExecuteAutoCADCommand === 'function') {
      // Codificamos en Base64 para evitar problemas con las comillas y saltos de linea en AutoLISP
      const codeB64 = btoa(item.code);
      const name = item.name ? item.name.replace(/[^a-zA-Z0-9_-]/g, '') : 'LC_ASSET';
      
      const lispCommand = `(LC_ApplyAsset "${item.type}" "${name}" "${codeB64}")\n`;
      window.external.ExecuteAutoCADCommand(lispCommand);
    } else {
      console.warn("[LC] Funcao disponivel apenas na Paleta do AutoCAD.");
    }
  };

  return (
    <div style={{ backgroundColor: '#181818', color: '#fff', minHeight: '100vh', padding: '10px' }}>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('hatch')}
          style={{ flex: 1, padding: '8px', backgroundColor: activeTab === 'hatch' ? 'var(--tmd-orange)' : '#222', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Hatch
        </button>
        <button 
          onClick={() => setActiveTab('lin')}
          style={{ flex: 1, padding: '8px', backgroundColor: activeTab === 'lin' ? 'var(--tmd-orange)' : '#222', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Lineas
        </button>
        <button 
          onClick={() => setActiveTab('icon')}
          style={{ flex: 1, padding: '8px', backgroundColor: activeTab === 'icon' ? 'var(--tmd-orange)' : '#222', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Icons
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#777', fontSize: '0.9rem' }}>Cargando paleta...</p>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay favoritos en esta categoria.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {favorites.map(item => (
            <div key={item.id} style={{ backgroundColor: '#222', padding: '10px', borderRadius: '6px', border: '1px solid #333' }}>
              <strong style={{ color: 'var(--tmd-orange)', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>{item.name}</strong>
              
              <div style={{ marginBottom: '10px' }}>
                {activeTab === 'hatch' && <HatchPreview patCode={item.code} scale={0.5} />}
                {activeTab === 'lin' && <LinetypePreview linCode={item.code} scale={0.5} />}
                {activeTab === 'icon' && <SvgPreview svgString={item.svgCode || item.code} />}
              </div>
              
              <button 
                onClick={() => handleApply(item)}
                style={{ width: '100%', padding: '8px', backgroundColor: 'var(--tmd-orange)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
              >
                Insertar en AutoCAD
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
