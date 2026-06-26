import React from 'react';
import { ASSETS_BASE_URL } from './HatchEngine';

export default function ThumbnailPreview({ archetype, containerWidth = 130, containerHeight = 90 }) {
  if (!archetype) return null;

  const w = archetype.defaults?.width || 346;
  const h = archetype.defaults?.height || 600;

  const bgSize = w && h ? `${(w/Math.max(w,h))*100}% ${(h/Math.max(w,h))*100}%` : '50%';

  // Construir siempre URL absoluta para evitar el bug de file:// en AutoCAD embebido.
  // Rutas relativas (/patterns/xxx.svg) se resuelven como file:///C:/patterns/ y fallan.
  const iconSrc = archetype.iconUrl?.startsWith('/') 
    ? ASSETS_BASE_URL + archetype.iconUrl
    : archetype.iconUrl;


  const tileWidth = containerWidth / 2.5; // Mostrar 2.5 mosaicos de ancho
  const tileHeight = tileWidth * (h / w);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: '#1a1a1a'
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        backgroundImage: `url(${iconSrc})`,
        backgroundSize: `${tileWidth}px ${tileHeight}px`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'top left',
        filter: iconSrc?.endsWith('.svg') ? 'invert(1) hue-rotate(180deg)' : 'none'
      }} />
    </div>
  );
}
