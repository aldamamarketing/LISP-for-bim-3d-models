import React, { useState } from 'react';
import './IconGenerator.css';
import { exportIconsToZip } from '../../utils/iconExporter';
import { saveToGlobalLibrary, addToFavorites } from '../../utils/library';
import LibraryPanel from './LibraryPanel';

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
  const [customTheme, setCustomTheme] = useState('');
  const [styleOption, setStyleOption] = useState('Outline Minimalista');
  const [customStyle, setCustomStyle] = useState('');
  
  const [accentColor, setAccentColor] = useState('#f26d21');
  const [secondaryColor, setSecondaryColor] = useState('#3b82f6');
  const [previewMode, setPreviewMode] = useState('dark');
  const [prompts, setPrompts] = useState('Alinear arriba\nLínea a pared\nAcotar muro');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIcons, setGeneratedIcons] = useState([]);
  const [selectedIcons, setSelectedIcons] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('library');
  const [saving, setSaving] = useState(null);

  const handleGenerate = async () => {
    if (!prompts.trim()) return;
    setIsGenerating(true);
    
    const lines = prompts.split('\n').filter(p => p.trim() !== '');
    const finalTheme = theme === 'Personalizado' ? customTheme : theme;
    const finalStyle = styleOption === 'Personalizado' ? customStyle : styleOption;

    if (!finalTheme || !finalStyle) {
      alert("Por favor define el tema y estilo personalizado.");
      setIsGenerating(false);
      return;
    }
    
    try {
      const isDev = import.meta.env.DEV;
      const baseUrl = isDev 
        ? 'http://127.0.0.1:5001/lispcentral/us-central1'
        : 'https://us-central1-lispcentral.cloudfunctions.net';
      const apiUrl = `${baseUrl}/generateIcons`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: finalTheme,
          styleOption: finalStyle,
          prompts: lines
        })
      });

      if (!response.ok) {
        throw new Error('Error al generar iconos');
      }

      const data = await response.json();
      
      // Aseguramos un ID único por si el modelo devuelve formatos genéricos
      const parsedResults = Array.isArray(data) ? data.map((icon, idx) => ({
        ...icon,
        id: `gen-${Date.now()}-${idx}`
      })) : [];

      setGeneratedIcons(parsedResults);
      if (parsedResults.length > 0) setActiveTab('ai');
    } catch (error) {
      console.error(error);
      alert("No momento, estamos enfrentando instabilidade em nossos serviços de IA. Por favor, tente novamente em alguns instantes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToFavorites = async (icon) => {
    setSaving(icon.id);
    try {
      const assetData = {
        id: icon.id,
        type: 'icon',
        name: icon.name || icon.filename || icon.prompt,
        description: icon.description || icon.prompt,
        category: icon.category || 'General',
        code: icon.svgCode
      };
      await saveToGlobalLibrary(assetData);
      await addToFavorites(icon.id);
      alert('¡Añadido a tus Favoritos y a la Biblioteca Pública!');
    } catch (error) {
      alert(error.message);
    }
    setSaving(null);
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
      await exportIconsToZip(selectedIcons, accentColor, secondaryColor);
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
        '--icon-secondary': secondaryColor,
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
            <select className="form-control" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="Arquitectura 2D">Arquitectura 2D</option>
              <option value="Modelado 3D">Modelado 3D</option>
              <option value="Topografía y Civil">Topografía y Civil</option>
              <option value="Instalaciones MEP">Instalaciones MEP</option>
              <option value="Piezas Mecánicas">Piezas Mecánicas</option>
              <option value="Personalizado">Personalizado...</option>
            </select>
            {theme === 'Personalizado' && (
              <input type="text" className="form-control" style={{ marginTop: '10px' }} placeholder="Escribe tu tema..." maxLength={30} value={customTheme} onChange={e => setCustomTheme(e.target.value)} />
            )}
          </div>

          <div className="form-group">
            <label>Estilo Visual</label>
            <select className="form-control" value={styleOption} onChange={(e) => setStyleOption(e.target.value)}>
              <option value="Outline Minimalista">Outline Minimalista</option>
              <option value="Flat Design (Sólido)">Flat Design (Sólido)</option>
              <option value="Isométrico (Volumétrico)">Isométrico (Volumétrico)</option>
              <option value="Blueprint (Plano)">Blueprint (Plano)</option>
              <option value="Personalizado">Personalizado...</option>
            </select>
            {styleOption === 'Personalizado' && (
              <input type="text" className="form-control" style={{ marginTop: '10px' }} placeholder="Escribe tu estilo..." maxLength={30} value={customStyle} onChange={e => setCustomStyle(e.target.value)} />
            )}
          </div>

          <div className="form-group">
            <label>Colores (Bicolor)</label>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="color" className="form-control" style={{ padding: '0', width: '35px', height: '35px', cursor: 'pointer' }} value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Acento</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="color" className="form-control" style={{ padding: '0', width: '35px', height: '35px', cursor: 'pointer' }} value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Secundario</span>
              </div>
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
        </div>
        <div className="panel-body">
          <div style={{ flex: 1, backgroundColor: '#222', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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
                Resultados IA ({generatedIcons.length})
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'library' ? (
                <LibraryPanel currentType="icon" searchQuery={prompts} />
              ) : (
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {generatedIcons.length === 0 && !isGenerating && (
                    <div className="empty-state" style={{ padding: '20px' }}>
                      Escribe tus comandos a la izquierda y presiona Generar, o busca en la Biblioteca Pública.
                    </div>
                  )}

                  {isGenerating && (
                    <div className="loading-state" style={{ padding: '20px', textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto 15px auto', width: '40px', height: '40px', border: '3px solid rgba(242, 109, 33, 0.3)', borderTop: '3px solid var(--tmd-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <p>Generando iconos con DeepSeek... (aprox 10-15s)</p>
                    </div>
                  )}

                  {!isGenerating && generatedIcons.map((icon) => (
                    <div key={icon.id} style={{ display: 'flex', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', flexDirection: 'column', padding: '15px', alignItems: 'flex-start' }}>
                      <strong style={{ color: 'var(--tmd-orange)', marginBottom: '10px' }}>*{icon.filename || icon.name}, {icon.description}</strong>
                      <div style={{ width: '100px', height: '100px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', margin: '10px 0' }}>
                        <SvgPreview svgString={icon.svgCode} />
                      </div>
                      
                      <button 
                        onClick={() => handleSaveToFavorites(icon)}
                        disabled={saving === icon.id}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '15px', fontWeight: 'bold' }}
                      >
                        {saving === icon.id ? 'Guardando...' : '⭐ Añadir a Favoritos'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
