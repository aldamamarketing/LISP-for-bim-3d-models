import React, { useState } from 'react';
import './IconGenerator.css';
import LinetypePreview from './LinetypePreview';

export default function LinetypeGenerator() {
  const [prompts, setPrompts] = useState('Línea de Gas (Texto "GAS")\nLínea con puntos y trazos largos');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLines, setGeneratedLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
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
      const apiUrl = `${baseUrl}/generateLinetype`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: lines })
      });

      if (!response.ok) throw new Error("Error del servidor");

      const data = await response.json();
      setGeneratedLines(data.results || []);
    } catch (error) {
      console.error(error);
      alert("No momento, estamos enfrentando instabilidade em nossos serviços de IA. Por favor, tente novamente em alguns instantes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelectLine = (line) => {
    const isSelected = selectedLines.some(l => l.id === line.id);
    if (isSelected) {
      setSelectedLines(selectedLines.filter(l => l.id !== line.id));
    } else {
      setSelectedLines([...selectedLines, line]);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    let combinedContent = "";
    
    selectedLines.forEach(l => {
      combinedContent += `*${l.filename}, ${l.description}\n`;
      combinedContent += l.linCode + "\n\n";
    });

    const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "TMD_Linetypes.lin";
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
        <div className="panel-header">Configuración</div>
        <div className="panel-body">
          <div className="form-group">
            <label>Tipos de Línea (uno por línea)</label>
            <textarea 
              className="form-control" 
              rows="6" 
              value={prompts}
              onChange={(e) => setPrompts(e.target.value)}
              placeholder="Ej: Línea de Gas&#10;Punteada"
            ></textarea>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Se generará la sintaxis (.lin) para cada uno.
            </span>
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '10px' }}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Calculando Linetype...' : 'Gerar Linhas (IA)'}
          </button>
        </div>
      </div>

      {/* 2. RESULTADOS */}
      <div className="panel col-preview">
        <div className="panel-header">
          Fábrica de Linhas (.lin)
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {generatedLines.length} linhas geradas
          </span>
        </div>
        <div className="panel-body">
          {generatedLines.length > 0 && (
            <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '15px' }}>
              <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '10px', fontSize: '0.9rem' }}>
                Zoom de Previsualización: {zoomScale.toFixed(1)}x
              </label>
              <input 
                type="range" min="0.1" max="5" step="0.1" value={zoomScale} 
                onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--tmd-orange)' }}
              />
            </div>
          )}
          {generatedLines.length === 0 ? (
            <div className="empty-state">
              Escribe tus comandos a la izquierda y presiona Generar.
            </div>
          ) : (
            <div className="grid-container" style={{ gridTemplateColumns: '1fr' }}>
              {generatedLines.map((line) => (
                <div 
                  key={line.id} 
                  className={`icon-preview-box ${selectedLines.some(l => l.id === line.id) ? 'selected' : ''}`}
                  onClick={() => toggleSelectLine(line)}
                  style={{ height: 'auto', width: '100%', flexDirection: 'column', padding: '15px', alignItems: 'flex-start' }}
                >
                  <strong style={{ color: 'var(--tmd-orange)', marginBottom: '10px' }}>*{line.filename}, {line.description}</strong>
                  <LinetypePreview linCode={line.linCode} scale={zoomScale} />
                  <pre style={{ margin: 0, fontSize: '0.8rem', color: 'var(--preview-fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', width: '100%' }}>
                    {line.linCode}
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
          Linhas Selecionadas
          <span className="badge">{selectedLines.length}</span>
        </div>
        <div className="panel-body">
          {selectedLines.length === 0 ? (
            <div className="empty-state">
              Haz clic en los patrones del centro para añadirlos al paquete.
            </div>
          ) : (
            <div className="cart-list">
              {selectedLines.map((line) => (
                <div key={line.id} className="cart-item">
                  <div className="cart-item-preview" style={{ background: '#333', color: '#fff', fontSize: '10px', padding: '2px' }}>LIN</div>
                  <div className="cart-item-info">
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '4px', fontSize: '0.85rem' }} 
                      value={line.filename}
                      onChange={(e) => {
                        const newArr = [...selectedLines];
                        const idx = newArr.findIndex(x => x.id === line.id);
                        newArr[idx].filename = e.target.value;
                        setSelectedLines(newArr);
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="truncate-text">{line.description}</span>
                  </div>
                  <button className="btn-remove" onClick={() => toggleSelectLine(line)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedLines.length > 0 && (
          <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}>
            <button 
              className="btn-primary" 
              style={{ width: '100%' }}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Empacotando...' : 'Baixar Arquivo .LIN'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
