import React, { useState, useEffect, useRef } from 'react';

function parsePatLine(line) {
  const parts = line.split(',').map(s => parseFloat(s.trim()));
  if (parts.length < 5) return null;
  return {
    ang: parts[0],
    ox: parts[1],
    oy: parts[2],
    dx: parts[3],
    dy: parts[4],
    dashes: parts.slice(5).filter(n => !isNaN(n))
  };
}

export default function HatchVisualEditor({ code, initialScale = 1, onSave, onCancel }) {
  const [scale, setScale] = useState(initialScale);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !code) return;
    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Fondo gris oscuro estilo Architextures
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('*') && !l.startsWith(';'));
    const defs = lines.map(parsePatLine).filter(d => d !== null);
    if (defs.length === 0) return;

    // Calcular escala base empírica
    let minDy = Infinity;
    for (const def of defs) {
      const absDy = Math.abs(def.dy);
      if (absDy > 0 && absDy < minDy) minDy = absDy;
    }
    if (minDy === Infinity || minDy === 0) minDy = 1;
    
    // Scale total = baseScale * userScale
    const s = (25 / minDy) * scale;
    const MAX_LINES = 500;
    let lineCount = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (const def of defs) {
      if (lineCount >= MAX_LINES) break;

      const rad = def.ang * Math.PI / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      // No soportamos dashes perfectos en Canvas rápido, dibujamos sólido por ahora
      // O podemos intentar setLineDash
      if (def.dashes.length > 0) {
        ctx.setLineDash(def.dashes.map(d => Math.max(0.5, Math.abs(d) * s)));
      } else {
        ctx.setLineDash([]);
      }

      const perpX = -sinA * (def.dy * s);
      const perpY =  cosA * (def.dy * s);

      // Rango amplio para llenar el canvas
      for (let i = -30; i <= 30; i++) {
        if (lineCount >= MAX_LINES) break;

        // Centro + Pan
        const cx = (width / 2) + panX + (def.ox * s) + (i * perpX);
        const cy = (height / 2) + panY + (def.oy * s) + (i * perpY);

        const x1 = Math.round(cx - 800 * cosA);
        const y1 = Math.round(cy - 800 * sinA);
        const x2 = Math.round(cx + 800 * cosA);
        const y2 = Math.round(cy + 800 * sinA);

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        lineCount++;
      }
    }
    ctx.stroke();

    // Dibujar el área punteada de recorte (Viewport fijo en el centro)
    const cropSize = 256;
    const cropX = (width - cropSize) / 2;
    const cropY = (height - cropSize) / 2;

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#f26d21'; // Naranja TMD
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropSize, cropSize);
    
    // Oscurecer lo que está fuera del recorte
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, width, cropY); // Arriba
    ctx.fillRect(0, cropY + cropSize, width, height - (cropY + cropSize)); // Abajo
    ctx.fillRect(0, cropY, cropX, cropSize); // Izquierda
    ctx.fillRect(cropX + cropSize, cropY, width - (cropX + cropSize), cropSize); // Derecha

    ctx.setLineDash([]); // Reset

  }, [code, scale, panX, panY]);

  const handleExport = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Crear canvas temporal para el recorte (256x256)
    const cropSize = 256;
    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize) / 2;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropSize;
    tempCanvas.height = cropSize;
    const tCtx = tempCanvas.getContext('2d');

    // Volver a dibujar SIN el overlay oscuro ni el borde punteado
    tCtx.fillStyle = '#1e1e1e';
    tCtx.fillRect(0, 0, cropSize, cropSize);

    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('*') && !l.startsWith(';'));
    const defs = lines.map(parsePatLine).filter(d => d !== null);
    
    let minDy = Infinity;
    for (const def of defs) {
      const absDy = Math.abs(def.dy);
      if (absDy > 0 && absDy < minDy) minDy = absDy;
    }
    if (minDy === Infinity || minDy === 0) minDy = 1;
    const s = (25 / minDy) * scale;
    
    tCtx.strokeStyle = '#ffffff';
    tCtx.lineWidth = 1.5;
    tCtx.beginPath();

    for (const def of defs) {
      const rad = def.ang * Math.PI / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      if (def.dashes.length > 0) {
        tCtx.setLineDash(def.dashes.map(d => Math.max(0.5, Math.abs(d) * s)));
      } else {
        tCtx.setLineDash([]);
      }

      const perpX = -sinA * (def.dy * s);
      const perpY =  cosA * (def.dy * s);

      for (let i = -30; i <= 30; i++) {
        // Coordenadas relativas al nuevo canvas de 256x256
        const cx = (cropSize / 2) + panX + (def.ox * s) + (i * perpX);
        const cy = (cropSize / 2) + panY + (def.oy * s) + (i * perpY);

        const x1 = Math.round(cx - 800 * cosA);
        const y1 = Math.round(cy - 800 * sinA);
        const x2 = Math.round(cx + 800 * cosA);
        const y2 = Math.round(cy + 800 * sinA);

        tCtx.moveTo(x1, y1);
        tCtx.lineTo(x2, y2);
      }
    }
    tCtx.stroke();

    // Exportar a DataURL (WebP)
    const dataUrl = tempCanvas.toDataURL('image/webp', 0.8);
    onSave({ dataUrl, scale, panX, panY });
  };

  return (
    <div style={{ background: '#222', padding: '16px', borderRadius: '8px', border: '1px solid #444', display: 'flex', gap: '20px' }}>
      
      {/* Controles Laterales */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ margin: 0, color: '#fff' }}>Enquadramento</h4>
        
        <div>
          <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Scale (Zoom): {scale.toFixed(1)}x</label>
          <input 
            type="range" min="0.1" max="5" step="0.1" 
            value={scale} onChange={e => setScale(parseFloat(e.target.value))} 
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Pan X: {panX}px</label>
          <input 
            type="range" min="-256" max="256" step="5" 
            value={panX} onChange={e => setPanX(parseInt(e.target.value))} 
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Pan Y: {panY}px</label>
          <input 
            type="range" min="-256" max="256" step="5" 
            value={panY} onChange={e => setPanY(parseInt(e.target.value))} 
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={handleExport} style={{ flex: 1, padding: '8px', background: 'var(--tmd-orange)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Salvar Ícone
          </button>
          <button onClick={onCancel} style={{ flex: 1, padding: '8px', background: '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>

      {/* Visor Canvas */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#111', borderRadius: '4px', overflow: 'hidden' }}>
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={400} 
          style={{ width: '500px', height: '400px', cursor: 'move' }}
          // Implementar drag to pan en un futuro
        />
      </div>

    </div>
  );
}
