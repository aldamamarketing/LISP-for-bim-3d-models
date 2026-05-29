import React, { useRef, useEffect } from 'react';

const parseLin = (code) => {
  const lines = code.split('\n');
  let dashes = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('*') || trimmed.startsWith(';')) continue;
    if (trimmed.toUpperCase().startsWith('A,')) {
      // Remover todo lo que esté entre corchetes (textos/formas complejas)
      // ya que Canvas puro no puede renderizarlas fácilmente sin fuentes externas
      const clean = trimmed.replace(/\[.*?\]/g, '-5'); 
      const parts = clean.substring(2).split(',').map(s => parseFloat(s.trim()));
      dashes = parts.filter(n => !isNaN(n));
      break; // Solo parseamos la primera definición 'A,' que encontremos
    }
  }
  return dashes;
};

export default function LinetypePreview({ linCode, scale = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Fondo
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    if (!linCode) return;

    const dashes = parseLin(linCode);
    const canvasDashes = dashes.map(d => d === 0 ? 0.5 : Math.abs(d) * scale * 10);
    
    ctx.strokeStyle = '#f26d21'; 
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (canvasDashes.length > 0) {
      ctx.setLineDash(canvasDashes);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

  }, [linCode, scale]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={40} 
      style={{ 
        width: '100%', 
        height: '40px', 
        border: '1px solid #333', 
        borderRadius: '6px',
        marginBottom: '15px'
      }} 
    />
  );
}
