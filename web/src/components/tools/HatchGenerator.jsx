import React, { useState, useEffect } from 'react';
import './IconGenerator.css'; 
import { saveToGlobalLibrary, addToFavorites } from '../../utils/library';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import HatchPreview from './HatchPreview';
import LibraryPanel from './LibraryPanel';
import ToastContainer, { showToast } from '../Toast';
import { hatchTranslations } from '../../i18n/translations.js';

export default function HatchGenerator({ lang = 'en' }) {
  const t = (key) => { const dict = hatchTranslations[lang] || hatchTranslations['en']; return dict[key] || key; };
  const [theme, setTheme] = useState('Arquitectura');
  const [prompts, setPrompts] = useState('Ladrillo en espina de pez\nMadera entramada');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedHatches, setSelectedHatches] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'generator'
  const [saving, setSaving] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  const handleGenerate = async () => {
    if (!prompts.trim()) return;
    setIsGenerating(true);
    
    const lines = prompts.split('\n').filter(p => p.trim() !== '');
    
    try {
      const prodUrl = 'https://us-central1-lispcentral.cloudfunctions.net/generateHatch';
      const localUrl = 'http://127.0.0.1:5001/lispcentral/us-central1/generateHatch';
      
      let response;
      try {
        response = await fetch(prodUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme, prompts: lines })
        });
      } catch (err) {
        // Fallback to local emulator
        response = await fetch(localUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme, prompts: lines })
        });
      }

      if (!response.ok) throw new Error("Error del servidor");

      const data = await response.json();
      const parsedResults = (Array.isArray(data.results) ? data.results : []).map(r => {
        const nameToUse = r.name || r.filename || 'hatch';
        r.id = "hatch_" + nameToUse.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        return r;
      });
      setResults(parsedResults);
    } catch (error) {
      console.error(error);
      showToast("Instabilidade nos serviços de IA. Tente novamente em instantes.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveFavorites = async () => {
    if (!user) {
      showToast(
        'Crie uma conta gratuita para salvar nos favoritos. <a href="/login?redirect=' + encodeURIComponent(window.location.pathname) + '" style="color:#f26d21;font-weight:bold;text-decoration:underline">Criar conta →</a>',
        'warning',
        6000
      );
      return;
    }
    
    setSaving('all');
    try {
      for (const hatch of selectedHatches) {
        // Generados por IA puede que no estén en BD pública, guardarlos primero.
        if (results.some(r => r.id === hatch.id)) {
          const assetData = {
            id: hatch.id,
            type: 'hatch',
            name: hatch.name || hatch.filename || 'HATCH',
            description: hatch.description,
            category: hatch.category || 'General',
            code: hatch.patCode || hatch.code
          };
          await saveToGlobalLibrary(assetData);
        }
        await addToFavorites(hatch.id);
      }
      showToast('Adicionados aos Favoritos com sucesso! ⭐', 'success');
      setSelectedHatches([]); // Limpiar selección tras añadir? o mantener.
    } catch (error) {
      showToast(error.message, 'error');
    }
    setSaving(null);
  };

  const toggleSelectHatch = (hatch) => {
    const isSelected = selectedHatches.some(h => h.id === hatch.id);
    if (isSelected) {
      setSelectedHatches(selectedHatches.filter(h => h.id !== hatch.id));
    } else {
      // Normalizar para que library items y result items tengan misma estructura básica
      const normalizedHatch = {
        ...hatch,
        filename: hatch.name || hatch.filename || 'HATCH',
        patCode: hatch.code || hatch.patCode
      };
      setSelectedHatches([...selectedHatches, normalizedHatch]);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    let combinedContent = "";
    
    selectedHatches.forEach(h => {
      combinedContent += `*${h.filename}, ${h.description || ''}\n`;
      combinedContent += h.patCode + "\n\n";
    });

    const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "LispCentral_Hatches.pat";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsExporting(false);

    showToast(
      '📥 Download concluído! <strong>Dica:</strong> Com o LispCentral Loader, você usa esses hatches direto no AutoCAD sem baixar arquivos.',
      'info',
      8000
    );
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
          onClick={() => setActiveTab('generator')}
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
          ✨ {t('hatch.title')}
        </button>
      </div>

      {/* Contenido Principal */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: '20px' }}>
        
        {/* Pestaña: Biblioteca */}
        {activeTab === 'library' && (
          <LibraryPanel 
            currentType="hatch" 
            selectedItems={selectedHatches} 
            onToggleSelect={toggleSelectHatch} 
          />
        )}

        {/* Pestaña: Generador IA */}
        {activeTab === 'generator' && (
          <div style={{ display: 'flex', width: '100%', gap: '20px' }}>
            <div className="panel col-settings" style={{ width: '300px', flexShrink: 0 }}>
              <div className="panel-header">{t('hatch.config')}</div>
              <div className="panel-body">
                <div className="form-group">
                  <label>{t('hatch.context')}</label>
                  <select className="form-control" value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option value="Arquitectura">Arquitetura (Paredes, Pisos)</option>
                    <option value="Topografía">Topografia (Terrenos)</option>
                    <option value="Materiales">Materiais (Aço, Madeira)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('hatch.toGenerate')}</label>
                  <textarea 
                    className="form-control" 
                    rows="6" 
                    value={prompts}
                    onChange={(e) => setPrompts(e.target.value)}
                    placeholder="Ex: Tijolo 20x40&#10;Padrão hexagonal"
                  ></textarea>
                </div>

                <button 
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: '10px' }}
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Calculando...' : t('hatch.generateBtn')}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#222', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', marginBottom: '15px' }}>Resultados IA ({results.length})</h3>
              
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', 
                gap: '10px', 
                alignContent: 'start'
              }}>
                {isGenerating && <p style={{ color: 'var(--tmd-orange)' }}>Gerando padrões, aguarde...</p>}
                
                {!isGenerating && results.map(item => {
                  const isSelected = selectedHatches.some(i => i.id === item.id);
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => toggleSelectHatch(item)}
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
                      <div style={{ width: '64px', height: '64px', backgroundColor: '#3b4654', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <HatchPreview patCode={item.patCode} scale={1} width={64} height={64} />
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
                      }} title={item.filename || item.name}>
                        {item.filename || item.name || 'HATCH'}
                      </span>
                    </div>
                  );
                })}
                
                {!isGenerating && results.length === 0 && (
                  <p style={{ color: 'var(--text-muted)' }}>Escreva os comandos à esquerda e clique em Gerar.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar (Sticky Bottom) */}
      {selectedHatches.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '30px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 1000
        }}>
          <span style={{ color: '#fff', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--tmd-orange)', fontSize: '1.2rem', marginRight: '5px' }}>{selectedHatches.length}</span>
            hachuras selecionadas
          </span>
          
          <div style={{ width: '1px', height: '30px', backgroundColor: '#333' }}></div>

          <button 
            onClick={handleSaveFavorites}
            disabled={saving === 'all'}
            style={{
              padding: '10px 20px',
              backgroundColor: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ⭐ {saving === 'all' ? 'Salvando...' : 'Adicionar à Paleta'}
          </button>

          <button 
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--tmd-orange)',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ⬇️ {isExporting ? 'Processando...' : 'Baixar .PAT'}
          </button>
        </div>
      )}

    </div>
    <ToastContainer />
    </>
  );
}
