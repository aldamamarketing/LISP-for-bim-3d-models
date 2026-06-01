import React, { useRef, useEffect } from 'react';

const parsePat = (code) => {
  if (!code || typeof code !== 'string') return [];
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

export default function HatchPreview({ patCode, scale = 1, width = 150, height = 150 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !patCode) return;

    let rafId;
    const draw = () => {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        
        ctx.fillStyle = '#3b4654'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const patterns = parsePat(patCode);
        if (patterns.length === 0) return;

        // Normalize origins relative to first line to prevent huge coordinate hallucinations
        const baseOx = patterns[0].ox;
        const baseOy = patterns[0].oy;
        patterns.forEach(p => {
          p.ox -= baseOx;
          p.oy -= baseOy;
        });

        ctx.strokeStyle = '#ffffff'; 
        ctx.lineWidth = 1;

        let validDys = [];
        patterns.forEach(p => {
            if (Math.abs(p.dy) > 0.0001) validDys.push(Math.abs(p.dy));
        });
        validDys.sort((a,b) => a - b);
        
        let targetDy;
        if (validDys.length > 0) {
            targetDy = validDys[Math.floor(validDys.length / 2)];
        } else {
            let validDashes = [];
            patterns.forEach(p => {
                let dSum = p.dashes.reduce((sum, d) => sum + Math.abs(d), 0);
                if (dSum > 0.0001) validDashes.push(dSum);
            });
            validDashes.sort((a,b) => a - b);
            targetDy = validDashes.length > 0 ? validDashes[Math.floor(validDashes.length / 2)] : 20;
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        patterns.forEach(p => {
           if (p.ox < minX) minX = p.ox;
           if (p.ox > maxX) maxX = p.ox;
           if (p.oy < minY) minY = p.oy;
           if (p.oy > maxY) maxY = p.oy;
        });
        const bboxSize = Math.max(maxX - minX, maxY - minY);
        if (bboxSize > targetDy) {
            targetDy = bboxSize;
        }

        // HEURÍSTICA DE COMPLEJIDAD: 
        // Hachuras simples (1-5 líneas) necesitan 3-4 repeticiones para verse bien como una malla
        // Hachuras complejas (600 líneas, ej. piedras) necesitan hacer ZOOM a ~0.25 repetición.
        let targetRepetitions = Math.max(0.25, 4 - Math.log10(patterns.length) * 1.5);
        
        let finalScale = (canvas.height / targetRepetitions) / targetDy;
        
        if (finalScale > 5000) finalScale = 5000;
        if (finalScale < 0.0001) finalScale = 0.0001;

        finalScale = finalScale * scale;
        const maxDist = Math.max(canvas.width, canvas.height) * 1.5; 

        patterns.forEach(pat => {
          const angleRad = pat.angle * Math.PI / 180;
          const canvasDashes = pat.dashes.map(d => d === 0 ? 0.5 : Math.abs(d) * finalScale);
          
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          let ox = pat.ox * finalScale;
          let oy = pat.oy * finalScale;
          
          ctx.translate(ox, -oy); 
          ctx.rotate(-angleRad); 
          
          if (canvasDashes.length > 0) {
            ctx.setLineDash(canvasDashes);
          } else {
            ctx.setLineDash([]);
          }
          
          let currentMaxDist = Math.max(canvas.width, canvas.height) * 1.5 + Math.abs(ox) + Math.abs(oy);
          if (currentMaxDist > 3000) currentMaxDist = 3000;
          
          const dy = pat.dy * finalScale;
          const dx = pat.dx * finalScale;
          
          if (Math.abs(dy) < 0.001) {
            ctx.beginPath();
            ctx.moveTo(-currentMaxDist, 0);
            ctx.lineTo(currentMaxDist, 0);
            ctx.stroke();
          } else {
            const rawNumLines = Math.ceil(currentMaxDist / Math.abs(dy));
            const numLines = Math.min(rawNumLines, 2000); 
            
            for (let i = -numLines; i <= numLines; i++) {
              ctx.beginPath();
              const yPos = i * dy;
              const xOffset = i * dx;
              ctx.lineDashOffset = -xOffset;
              ctx.moveTo(-currentMaxDist, yPos);
              ctx.lineTo(currentMaxDist, yPos);
              ctx.stroke();
            }
          }
          ctx.restore();
        });
        
      } catch (e) {
        console.error("Canvas draw error", e);
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [patCode, scale, width, height]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}
