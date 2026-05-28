import React, { useState } from 'react';
import './IconGenerator.css';
import { exportIconsToZip } from '../../utils/iconExporter';

// Componente para renderizar SVG de forma segura
const SvgPreview = ({ svgString }) => {
  return (
    <div 
      className="icon-preview-box"
      dangerouslySetInnerHTML={{ __html: svgString }} 
    />
  );
};

export default function IconGenerator() {
  const [theme, setTheme] = useState('Arquitectura 2D');
  const [styleOption, setStyleOption] = useState('Outline Minimalista');
  const [accentColor, setAccentColor] = useState('#f26d21');
  const [previewMode, setPreviewMode] = useState('dark');
  const [prompts, setPrompts] = useState('Alinear arriba\nLínea a pared\nAcotar muro');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [generatedIcons, setGeneratedIcons] = useState([]);
  const [selectedIcons, setSelectedIcons] = useState([]);

  const handleGenerate = async () => {
    if (!prompts.trim()) return;
    setIsGenerating(true);
    
    try {
      const lines = prompts.split('\\n').filter(p => p.trim() !== '');
      
      // La URL base puede venir de .env en producción
      const apiUrl = import.meta.env.PUBLIC_FUNCTIONS_URL 
        ? `${import.meta.env.PUBLIC_FUNCTIONS_URL}/generateIcons`
        : 'http://127.0.0.1:5001/lispcentral/us-central1/generateIcons';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          styleOption,
          prompts: lines
        })
      });

      if (!response.ok) {
        throw new Error('Error al generar iconos');
      }

      const data = await response.json();
      
      // Aseguramos un ID único por si el modelo devuelve formatos genéricos
      const newIcons = data.map((icon, idx) => ({
        ...icon,
        id: `gen-${Date.now()}-${idx}`
      }));

      setGeneratedIcons(newIcons);
    } catch (error) {
      console.error(error);
      alert("Hubo un error comunicándose con la IA. Asegúrate de que el backend de Firebase esté corriendo y la API Key esté configurada.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (icon) => {
    const isSelected = selectedIcons.some(item => item.id === icon.id);
    if (isSelected) {
      setSelectedIcons(selectedIcons.filter(item => item.id !== icon.id));
    } else {
      // Al agregar al carrito, le damos un nombre de archivo por defecto basado en el prompt
      const slug = icon.prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setSelectedIcons([...selectedIcons, { ...icon, filename: `${slug}-v${icon.variation}` }]);
    }
  };

  const removeSelected = (id) => {
    setSelectedIcons(selectedIcons.filter(item => item.id !== id));
  };

  const updateFilename = (id, newName) => {
    setSelectedIcons(selectedIcons.map(item => 
      item.id === id ? { ...item, filename: newName } : item
    ));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportIconsToZip(selectedIcons, accentColor);
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Hubo un error al empaquetar los iconos.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      className="icon-gen-container"
      style={{
        '--icon-accent': accentColor,
        '--preview-bg': previewMode === 'dark' ? '#1a1a1a' : '#f4f4f5',
        '--preview-fg': previewMode === 'dark' ? '#ffffff' : '#1a1a1a'
      }}
    >
      
      {/* 1. CONFIGURACIÓN */}
      <div className="panel col-settings">
        <div className="panel-header">
          <span>Configuração IA</span>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label>Contexto / Tema</label>
            <select className="form-control" value={theme} onChange={e => setTheme(e.target.value)}>
              <option value="Arquitectura 2D">Arquitetura 2D</option>
              <option value="Modelado 3D">Modelagem 3D</option>
              <option value="Topografía">Topografia / Civil</option>
              <option value="Instalaciones">Instalações (MEP)</option>
              <option value="Mecánica">Mecânica / Peças</option>
            </select>
          </div>

          <div className="form-group">
            <label>Estilo Visual</label>
            <select className="form-control" value={styleOption} onChange={e => setStyleOption(e.target.value)}>
              <option value="Outline Minimalista">Outline Minimalista</option>
              <option value="Flat Design">Flat Design (Sólido)</option>
              <option value="Isométrico">Isométrico (3D falso)</option>
              <option value="Blueprint">Blueprint</option>
            </select>
          </div>

          <div className="form-group">
            <label>Color de Acento</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="color" 
                className="form-control" 
                style={{ padding: '0', width: '50px', height: '40px', cursor: 'pointer' }}
                value={accentColor} 
                onChange={(e) => setAccentColor(e.target.value)} 
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{accentColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Comandos a Gerar (um por linha)</label>
            <textarea 
              className="form-control" 
              placeholder="Ex: Alinear arriba&#10;Linha a parede&#10;Cota de nível"
              value={prompts}
              onChange={e => setPrompts(e.target.value)}
            />
          </div>

          <button 
            className="btn-primary" 
            onClick={handleGenerate}
            disabled={isGenerating || !prompts.trim()}
          >
            {isGenerating ? "Gerando Ícones..." : "1. Gerar Ícones"}
          </button>
        </div>
      </div>

      {/* 2. PREVIEW / RESULTADOS */}
      <div className="panel col-preview">
        <div className="panel-header">
          Fábrica de Ícones
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '5px', fontSize: '0.8rem', backgroundColor: 'var(--bg-darker)', padding: '4px 8px', borderRadius: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" name="previewMode" checked={previewMode === 'dark'} onChange={() => setPreviewMode('dark')} /> Dark
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginLeft: '10px' }}>
                <input type="radio" name="previewMode" checked={previewMode === 'light'} onChange={() => setPreviewMode('light')} /> Light
              </label>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {generatedIcons.length} variações geradas
            </span>
          </div>
        </div>
        <div className="panel-body">
          {generatedIcons.length === 0 ? (
            <div className="cart-empty" style={{ marginTop: '50px' }}>
              <p>Os ícones gerados aparecerão aqui.</p>
              <p style={{ fontSize: '0.9rem'}}>Descreva o que precisa no painel à esquerda e clique em Gerar.</p>
            </div>
          ) : (
            <div className="grid-icons">
              {generatedIcons.map(icon => {
                const isSelected = selectedIcons.some(i => i.id === icon.id);
                return (
                  <div 
                    key={icon.id} 
                    className={`icon-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelection(icon)}
                  >
                    <SvgPreview svgString={icon.svgCode} />
                    <span className="icon-title">{icon.prompt} (v{icon.variation})</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. CARRITO / STAGING */}
      <div className="panel col-cart">
        <div className="panel-header">
          <span>Pacote Final</span>
          <span className="badge">{selectedIcons.length}</span>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div className="cart-list" style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
            {selectedIcons.length === 0 ? (
              <div className="cart-empty">
                Selecione os ícones que deseja exportar clicando neles.
              </div>
            ) : (
              selectedIcons.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-preview">
                     <SvgPreview svgString={item.svgCode} />
                  </div>
                  <div className="cart-item-info">
                    <input 
                      type="text" 
                      value={item.filename}
                      onChange={(e) => updateFilename(item.id, e.target.value)}
                    />
                  </div>
                  <button className="btn-remove" onClick={() => removeSelected(item.id)}>×</button>
                </div>
              ))
            )}
          </div>

          <button 
            className="btn-primary" 
            style={{ flexShrink: 0 }}
            disabled={selectedIcons.length === 0 || isExporting}
            onClick={handleExport}
          >
            {isExporting ? "Empacotando..." : "2. Baixar Pacote (.zip)"}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
            Serão gerados 4 arquivos PNG (16x16 e 32x32 em Dark/Light mode) para cada ícone.
          </p>
        </div>
      </div>

    </div>
  );
}
