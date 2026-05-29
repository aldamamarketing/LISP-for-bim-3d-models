import React, { useState } from 'react';
import './IconGenerator.css'; 
import { saveToGlobalLibrary, addToFavorites } from '../../utils/library';
import HatchPreview from './HatchPreview';
import LibraryPanel from './LibraryPanel';

export default function HatchGenerator() {
  const [theme, setTheme] = useState('Arquitectura');
  const [prompts, setPrompts] = useState('Ladrillo en espina de pez\nMadera entramada');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedHatches, setSelectedHatches] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [activeTab, setActiveTab] = useState('library');
  const [saving, setSaving] = useState(null);

  const handleGenerate = async () => {
    if (!prompts.trim()) return;
    setIsGenerating(true);
    
    const lines = prompts.split('\n').filter(p => p.trim() !== '');
    
    try {
      const isDev = import.meta.env.DEV;
      const baseUrl = isDev 
        ? 'http://127.0.0.1:5001/lispcentral/us-central1'
        : 'https://us-central1-lispcentral.cloudfunctions.net';
      const apiUrl = `${baseUrl}/generateHatch`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, prompts: lines })
      });

      if (!response.ok) throw new Error("Error del servidor");

      const data = await response.json();
      const parsedResults = Array.isArray(data.results) ? data.results : [];
      setResults(parsedResults);
      if (parsedResults.length > 0) setActiveTab('ai');
    } catch (error) {
      console.error(error);
      alert("No momento, estamos enfrentando instabilidade em nossos serviços de IA. Por favor, tente novamente em alguns instantes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToFavorites = async (hatch) => {
    setSaving(hatch.id);
    try {
      const assetData = {
        id: hatch.id,
        type: 'hatch',
        name: hatch.name || hatch.filename,
        description: hatch.description,
        category: hatch.category || 'General',
        code: hatch.patCode
      };
      await saveToGlobalLibrary(assetData);
      await addToFavorites(hatch.id);
      alert('Adicionado aos Favoritos e à Biblioteca Pública!');
    } catch (error) {
      alert(error.message);
    }
    setSaving(null);
  };

  const toggleSelectHatch = (hatch) => {
    const isSelected = selectedHatches.some(h => h.id === hatch.id);
    if (isSelected) {
      setSelectedHatches(selectedHatches.filter(h => h.id !== hatch.id));
    } else {
      setSelectedHatches([...selectedHatches, hatch]);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    let combinedContent = "";
    
    selectedHatches.forEach(h => {
      combinedContent += `*${h.filename}, ${h.description}\n`;
      combinedContent += h.patCode + "\n\n";
    });

    const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "TMD_Hatches.pat";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsExporting(false);
  };

  return (
    <div className="icon-gen-container" style={{ '--preview-bg': '#1a1a1a', '--preview-fg': '#ffffff' }}>
      
      {/* 1. CONFIGURACIÓN */}
      <div className="panel col-settings">
        <div className="panel-header">Configuração</div>
        <div className="panel-body">
          <div className="form-group">
            <label>Contexto / Categoria</label>
            <select className="form-control" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="Arquitectura">Arquitetura (Paredes, Pisos)</option>
              <option value="Topografía">Topografia (Terrenos)</option>
              <option value="Materiales">Materiais (Aço, Madeira)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Hachuras a Gerar (uma por linha)</label>
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
            {isGenerating ? 'Calculando Geometria...' : 'Gerar Padrões'}
          </button>
        </div>
      </div>

      {/* 2. RESULTADOS */}
      <div className="panel col-preview">
        <div className="panel-header">
          Fábrica de Hachuras (.pat)
        </div>
        <div className="panel-body">
          <div style={{ flex: 1, backgroundColor: '#222', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
              <button 
                onClick={() => setActiveTab('library')}
                style={{ flex: 1, padding: '15px', backgroundColor: activeTab === 'library' ? '#333' : 'transparent', color: activeTab === 'library' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Biblioteca Pública
              </button>
              <button 
                onClick={() => setActiveTab('ai')}
                style={{ flex: 1, padding: '15px', backgroundColor: activeTab === 'ai' ? '#333' : 'transparent', color: activeTab === 'ai' ? 'var(--tmd-orange)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Resultados ({results.length})
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'library' ? (
                <LibraryPanel currentType="hatch" searchQuery={prompts} />
              ) : (
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {results.length > 0 && (
                    <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '5px' }}>
                      <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '10px', fontSize: '0.9rem' }}>
                        Zoom da Previsão: {zoomScale.toFixed(1)}x
                      </label>
                      <input 
                        type="range" min="0.1" max="5" step="0.1" value={zoomScale} 
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--tmd-orange)' }}
                      />
                    </div>
                  )}

                  {results.length === 0 && !isGenerating && (
                    <div className="empty-state" style={{ padding: '20px' }}>
                      Escreva seus comandos à esquerda e clique em Gerar, ou busque na Biblioteca Pública.
                    </div>
                  )}

                  {isGenerating && (
                    <div className="loading-state" style={{ padding: '20px', textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto 15px auto', width: '40px', height: '40px', border: '3px solid rgba(242, 109, 33, 0.3)', borderTop: '3px solid var(--tmd-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <p>Gerando padrões... (aprox 10-15s)</p>
                    </div>
                  )}

                  {!isGenerating && results.map((hatch) => (
                    <div key={hatch.id} style={{ display: 'flex', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', flexDirection: 'column', padding: '15px', alignItems: 'flex-start' }}>
                      <strong style={{ color: 'var(--tmd-orange)', marginBottom: '10px' }}>*{hatch.filename || hatch.name}, {hatch.description}</strong>
                      <HatchPreview patCode={hatch.patCode} scale={zoomScale} />
                      <pre style={{ margin: 0, fontSize: '0.8rem', color: 'var(--preview-fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', width: '100%' }}>
                        {hatch.patCode}
                      </pre>
                      
                      <button 
                        onClick={() => handleSaveToFavorites(hatch)}
                        disabled={saving === hatch.id}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '15px', fontWeight: 'bold' }}
                      >
                        {saving === hatch.id ? 'Salvando...' : '⭐ Adicionar aos Favoritos'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CARRITO */}
      <div className="panel col-cart">
        <div className="panel-header">
          Hachuras Selecionadas
          <span className="badge">{selectedHatches.length}</span>
        </div>
        <div className="panel-body">
          {selectedHatches.length === 0 ? (
            <div className="empty-state">
              Haz clic en los patrones del centro para añadirlos al paquete.
            </div>
          ) : (
            <div className="cart-list">
              {selectedHatches.map((hatch) => (
                <div key={hatch.id} className="cart-item">
                  <div className="cart-item-preview" style={{ background: '#333', color: '#fff', fontSize: '10px', padding: '2px' }}>PAT</div>
                  <div className="cart-item-info">
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '4px', fontSize: '0.85rem' }} 
                      value={hatch.filename}
                      onChange={(e) => {
                        const newArr = [...selectedHatches];
                        const idx = newArr.findIndex(x => x.id === hatch.id);
                        newArr[idx].filename = e.target.value;
                        setSelectedHatches(newArr);
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="truncate-text">{hatch.description}</span>
                  </div>
                  <button className="btn-remove" onClick={() => toggleSelectHatch(hatch)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedHatches.length > 0 && (
          <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}>
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', fontSize: '0.85rem' }}>
              <strong style={{ color: 'var(--tmd-orange)', display: 'block', marginBottom: '5px' }}>
                Detalhes da hachura selecionada ({selectedHatches[selectedHatches.length - 1].name || selectedHatches[selectedHatches.length - 1].filename}):
              </strong>
              <span style={{ color: '#ccc' }}>{selectedHatches[selectedHatches.length - 1].description}</span>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: '100%' }}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Empacotando...' : 'Baixar Arquivo .PAT'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
