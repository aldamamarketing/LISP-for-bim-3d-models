import React, { useState } from 'react';
import './IconGenerator.css';
import { saveToGlobalLibrary, addToFavorites } from '../../utils/library';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LinetypePreview from './LinetypePreview';
import LibraryPanel from './LibraryPanel';
import ToastContainer, { showToast } from '../Toast';

export default function LinetypeGenerator() {
  const [prompts, setPrompts] = useState('Línea de Gas (Texto "GAS")\nLínea con puntos y trazos largos');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [activeTab, setActiveTab] = useState('library');
  const [saving, setSaving] = useState(null);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  const handleGenerate = async () => {
    if (!prompts.trim()) return;
    setIsGenerating(true);
    
    const lines = prompts.split('\n').filter(p => p.trim() !== '');
    
    try {
      const prodUrl = 'https://us-central1-lispcentral.cloudfunctions.net/generateLinetype';
      const localUrl = 'http://127.0.0.1:5001/lispcentral/us-central1/generateLinetype';

      let response;
      try {
        response = await fetch(prodUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompts: lines })
        });
      } catch (err) {
        response = await fetch(localUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompts: lines })
        });
      }

      if (!response.ok) throw new Error("Error del servidor");

      const data = await response.json();
      const parsedResults = (Array.isArray(data.results) ? data.results : []).map(r => {
        const nameToUse = r.name || r.filename || 'linetype';
        r.id = "lin_" + nameToUse.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        return r;
      });
      setResults(parsedResults);
      if (parsedResults.length > 0) setActiveTab('ai');
    } catch (error) {
      console.error(error);
      showToast("Instabilidade nos serviços de IA. Tente novamente em instantes.", "error");
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

  const handleSaveToFavorites = async (line) => {
    if (!user) {
      showToast(
        'Crie uma conta gratuita para salvar nos favoritos e usar direto no AutoCAD. <a href="/login?redirect=' + encodeURIComponent(window.location.pathname) + '" style="color:#f26d21;font-weight:bold;text-decoration:underline">Criar conta →</a>',
        'warning',
        6000
      );
      return;
    }
    setSaving(line.id);
    try {
      const assetData = {
        id: line.id,
        type: 'lin',
        name: line.name || line.filename,
        description: line.description,
        category: line.category || 'General',
        code: line.linCode
      };
      await saveToGlobalLibrary(assetData);
      await addToFavorites(line.id);
      showToast('Adicionado aos Favoritos com sucesso! ⭐', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
    setSaving(null);
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

    showToast(
      '📥 Download concluído! <strong>Dica:</strong> Com o LispCentral Loader, você usa essas linhas direto no AutoCAD sem baixar arquivos. <a href="/dashboard" style="color:#f26d21;font-weight:bold;text-decoration:underline">Saiba mais →</a>',
      'info',
      8000
    );
  };

  return (
    <>
    <div className="icon-gen-container" style={{ '--preview-bg': '#1a1a1a', '--preview-fg': '#ffffff' }}>
      
      {/* 1. CONFIGURACIÓN */}
      <div className="panel col-settings">
        <div className="panel-header">Configuração</div>
        <div className="panel-body">
          <div className="form-group">
            <label>Linhas a Gerar (uma por linha)</label>
            <textarea 
              className="form-control" 
              rows="6" 
              value={prompts}
              onChange={(e) => setPrompts(e.target.value)}
              placeholder="Ex: Linha de Gás (Texto &quot;GÁS&quot;)&#10;Linha com pontos e traços longos"
            ></textarea>
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '10px' }}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Calculando Geometria...' : 'Gerar Linhas'}
          </button>
        </div>
      </div>

      {/* 2. RESULTADOS */}
      <div className="panel col-preview">
        <div className="panel-header">
          Fábrica de Linhas (.lin)
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
                Resultados ({results.length})
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'library' ? (
                <LibraryPanel currentType="lin" searchQuery={prompts} />
              ) : (
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {results.length > 0 && (
                    <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '5px' }}>
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

                  {results.length === 0 && !isGenerating && (
                    <div className="empty-state" style={{ padding: '20px' }}>
                      Escreva seus comandos à esquerda e clique em Gerar, ou busque na Biblioteca Pública.
                    </div>
                  )}

                  {isGenerating && (
                    <div className="loading-state" style={{ padding: '20px', textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto 15px auto', width: '40px', height: '40px', border: '3px solid rgba(242, 109, 33, 0.3)', borderTop: '3px solid var(--tmd-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <p>Gerando linhas... (aprox 10-15s)</p>
                    </div>
                  )}

                  {!isGenerating && results.map((line) => (
                    <div key={line.id} style={{ display: 'flex', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', flexDirection: 'column', padding: '15px', alignItems: 'flex-start' }}>
                      <strong style={{ color: 'var(--tmd-orange)', marginBottom: '10px' }}>*{line.filename || line.name}, {line.description}</strong>
                      <LinetypePreview linCode={line.linCode} scale={zoomScale} />
                      <pre style={{ margin: 0, fontSize: '0.8rem', color: 'var(--preview-fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', width: '100%' }}>
                        {line.linCode}
                      </pre>
                      
                      <button 
                        onClick={() => handleSaveToFavorites(line)}
                        disabled={saving === line.id}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '15px', fontWeight: 'bold' }}
                      >
                        {saving === line.id ? 'Salvando...' : '⭐ Adicionar aos Favoritos'}
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
          Linhas Selecionadas
          <span className="badge">{selectedLines.length}</span>
        </div>
        <div className="panel-body">
          {selectedLines.length === 0 ? (
            <div className="empty-state">
              Clique nas linhas ao centro para adicionar ao pacote.
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
                  <button className="btn-remove" onClick={() => toggleSelectLine(line)} aria-label="Remover linha">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedLines.length > 0 && (
          <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}>
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', fontSize: '0.85rem' }}>
              <strong style={{ color: 'var(--tmd-orange)', display: 'block', marginBottom: '5px' }}>
                Detalhes da linha selecionada ({selectedLines[selectedLines.length - 1].name || selectedLines[selectedLines.length - 1].filename}):
              </strong>
              <span style={{ color: '#ccc' }}>{selectedLines[selectedLines.length - 1].description}</span>
            </div>
            {user ? (
              <button 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Empacotando...' : 'Baixar Arquivo .LIN'}
              </button>
            ) : (
              <>
                <button 
                  className="btn-primary" 
                  style={{ width: '100%' }}
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? 'Empacotando...' : 'Baixar Arquivo .LIN'}
                </button>
                <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: 'rgba(242,109,33,0.08)', border: '1px solid rgba(242,109,33,0.2)', borderRadius: '6px', fontSize: '0.8rem', color: '#ccc', textAlign: 'center' }}>
                  💡 <a href={'/login?redirect=' + encodeURIComponent('/pt/tools/linetype-generator')} style={{ color: '#f26d21', textDecoration: 'none', fontWeight: 'bold' }}>Crie uma conta</a> para salvar nos favoritos e usar direto no AutoCAD.
                </div>
              </>
            )}
          </div>
        )}
      </div>

    </div>
    <ToastContainer />
    </>
  );
}
