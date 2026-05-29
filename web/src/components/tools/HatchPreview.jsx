import React, { useRef, useEffect } from 'react';

const parsePat = (code) => {
  const lines = code.split('\n');
  const patterns = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('*') || trimmed.startsWith(';')) continue;
    const parts = trimmed.split(',').map(s => parseFloat(s.trim()));
    if (parts.length >= 5) {
      patterns.push({
        angle: parts[0],
        ox: parts[1],
        oy: parts[2],
        dx: parts[3],
        dy: parts[4],
        dashes: parts.slice(5).filter(n => !isNaN(n))
      });
    }
  }
  return patterns;
};

export default function HatchPreview({ patCode, scale = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    if (!patCode) return;

    const patterns = parsePat(patCode);
    
    // Configurar estilo de línea
    ctx.strokeStyle = '#f26d21'; // tmd-orange
    ctx.lineWidth = 1;

    // Calcular escala dinámica para que el patrón se repita ~4 veces (3x3 garantizado)
    const maxSpacing = Math.max(...patterns.map(p => {
      const dashSum = p.dashes.reduce((sum, d) => sum + Math.abs(d), 0);
      return Math.max(Math.abs(p.dx), Math.abs(p.dy), dashSum);
    })) || 10;
    const baseScale = (height / 4) / maxSpacing;
    const finalScale = baseScale * scale;

    // Suficiente para cubrir el área
    const maxDist = Math.max(width, height) * 3; 

    patterns.forEach(pat => {
      const angleRad = pat.angle * Math.PI / 180;
      
      // Preparar guiones. En AutoCAD: + es línea, - es espacio, 0 es punto.
      // Math.abs convierte los espacios negativos en distancias de canvas válidas.
      // Canvas ignora el dash 0, así que lo convertimos a un valor muy pequeño (0.5) para que sea un punto.
      const canvasDashes = pat.dashes.map(d => d === 0 ? 0.5 : Math.abs(d) * finalScale);
      
      ctx.save();
      // Origen en el centro para facilitar la visualización
      ctx.translate(width / 2, height / 2);
      
      // AutoCAD Y crece hacia arriba, Canvas Y crece hacia abajo
      ctx.translate(pat.ox * finalScale, -pat.oy * finalScale); 
      ctx.rotate(-angleRad); 
      
      ctx.beginPath();
      if (canvasDashes.length > 0) {
        ctx.setLineDash(canvasDashes);
      } else {
        ctx.setLineDash([]);
      }
      
      const dy = pat.dy * finalScale;
      const dx = pat.dx * finalScale;
      
      // Si dy es 0, dibujamos una sola línea en el centro
      if (Math.abs(dy) < 0.001) {
        ctx.moveTo(-maxDist, 0);
        ctx.lineTo(maxDist, 0);
      } else {
        const numLines = Math.ceil(maxDist / Math.abs(dy));
        for (let i = -numLines; i <= numLines; i++) {
          const yPos = i * dy;
          const xOffset = i * dx;
          
          // Desfase del dash para que el patrón se escalone correctamente
          ctx.lineDashOffset = -xOffset;
          
          ctx.moveTo(-maxDist, yPos);
          ctx.lineTo(maxDist, yPos);
        }
      }
      
      ctx.stroke();
      ctx.restore();
    });

  }, [patCode, scale]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={300} 
      style={{ 
        width: '100%', 
        height: 'auto', 
        maxHeight: '200px',
        border: '1px solid #333', 
        borderRadius: '6px',
        marginBottom: '15px'
      }} 
    />
  );
}
