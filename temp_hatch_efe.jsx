import React, { useState } from 'react';
import './IconGenerator.css'; // Reutilizamos el CSS del IconGenerator por consistencia
import HatchPreview from './HatchPreview';

export default function HatchGenerator() {
  const [theme, setTheme] = useState('Arquitectura');
  const [prompts, setPrompts] = useState('Ladrillo en espina de pez\nMadera entramada');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHatches, setGeneratedHatches] = useState([]);
  const [selectedHatches, setSelectedHatches] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

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
      setGeneratedHatches(data.results || []);
    } catch (error) {
      console.error(error);
      alert("No momento, estamos enfrentando instabilidade em nossos servi├ºos de IA. Por favor, tente novamente em alguns instantes.");
    } finally {
      setIsGenerating(false);
    }
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
      
      {/* 1. CONFIGURACI├ôN */}
      <div className="panel col-settings">
        <div className="panel-header">Configuraci├│n</div>
        <div className="panel-body">
          <div className="form-group">
            <label>Contexto / Categor├¡a</label>
            <select className="form-control" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="Arquitectura">Arquitectura (Muros, Pisos)</option>
              <option value="Topograf├¡a">Topograf├¡a (Terrenos)</option>
              <option value="Materiales">Materiales (Acero, Madera)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Hachuras a Generar (una por l├¡nea)</label>
            <textarea 
              className="form-control" 
              rows="6" 
              value={prompts}
              onChange={(e) => setPrompts(e.target.value)}
              placeholder="Ej: Ladrillo 20x40&#10;Patr├│n hexagonal"
            ></textarea>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Se generar├í la matem├ítica (.pat) para cada uno.
            </span>
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '10px' }}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Calculando Geometr├¡a...' : 'Gerar Padr├Áes (IA)'}
          </button>
        </div>
      </div>

      {/* 2. RESULTADOS */}
      <div className="panel col-preview">
        <div className="panel-header">
          F├íbrica de Hachuras (.pat)
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {generatedHatches.length} patrones generados
          </span>
        </div>
        <div className="panel-body">
          {generatedHatches.length === 0 ? (
            <div className="empty-state">
              Escribe tus comandos a la izquierda y presiona Generar.
            </div>
          ) : (
            <div className="grid-container" style={{ gridTemplateColumns: '1fr' }}>
              <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '10px', fontSize: '0.9rem' }}>
                  Zoom de Previsualizaci├│n: {zoomScale.toFixed(1)}x
                </label>
                <input 
                  type="range" min="0.1" max="5" step="0.1" value={zoomScale} 
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--tmd-orange)' }}
                />
              </div>
              {generatedHatches.map((hatch) => (
                <div 
                  key={hatch.id} 
                  className={`icon-preview-box ${selectedHatches.some(h => h.id === hatch.id) ? 'selected' : ''}`}
                  onClick={() => toggleSelectHatch(hatch)}
                  style={{ height: 'auto', width: '100%', flexDirection: 'column', padding: '15px', alignItems: 'flex-start' }}
                >
                  <strong style={{ color: 'var(--tmd-orange)', marginBottom: '10px' }}>*{hatch.filename}, {hatch.description}</strong>
                  <HatchPreview patCode={hatch.patCode} scale={zoomScale} />
                  <pre style={{ margin: 0, fontSize: '0.8rem', color: 'var(--preview-fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', width: '100%' }}>
                    {hatch.patCode}
                  </pre>
                </div>
              ))}
            </div>
          )}
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
              Haz clic en los patrones del centro para a├▒adirlos al paquete.
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
                  <button className="btn-remove" onClick={() => toggleSelectHatch(hatch)}>├ù</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedHatches.length > 0 && (
          <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}>
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
