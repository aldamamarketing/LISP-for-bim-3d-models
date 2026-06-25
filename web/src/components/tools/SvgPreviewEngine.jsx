import React, { useState, useEffect } from 'react';
import { ASSETS_BASE_URL } from './HatchEngine';

/**
 * Motor de previsualización que toma las fórmulas de HatchEngine
 * y construye una rejilla visual 100% basada en CSS y SVG en tiempo real.
 */
export default function SvgPreviewEngine({ archetype, params, gridRows = 3, gridCols = 3 }) {
  const [svgContent, setSvgContent] = useState(null);

  useEffect(() => {
    if (archetype && !archetype.generateSvgRenderer && archetype.iconUrl) {
      let isMounted = true;
      // Construir URL absoluta: rutas relativas fallan con file:// en AutoCAD embebido.
      const absoluteUrl = archetype.iconUrl.startsWith('/')
        ? ASSETS_BASE_URL + archetype.iconUrl
        : archetype.iconUrl;
      fetch(absoluteUrl)
        .then(res => res.text())
        .then(text => {
          if (!isMounted) return;
          const match = text.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
          if (match && match[1]) {
            // Eliminar estilos y colores explícitos problemáticos para forzarlos por CSS
            let cleaned = match[1]
              .replace(/stroke="[^"]+"/g, '')
              .replace(/fill="[^"]+"/g, '')
              .replace(/style="[^"]+"/g, '');
            // Inyectar un tag <style> para forzar el color de las líneas
            cleaned = `<style> .hatch-preview-layer * { stroke: #ffffff !important; stroke-width: 1.5px !important; fill: none !important; } </style>` + cleaned;
            setSvgContent(cleaned);
          }
        })
        .catch(err => console.error("Error fetching SVG:", err));
      return () => { isMounted = false; };
    }
  }, [archetype]);

  if (!archetype) return null;

  // 1. Patrones sin motor matemático: escalar imagen SVG original de forma pareja
  if (!archetype.generateSvgRenderer) {
    // URL absoluta para evitar file:// en AutoCAD embebido
    const absIconUrl = archetype.iconUrl?.startsWith('/')
      ? ASSETS_BASE_URL + archetype.iconUrl
      : archetype.iconUrl;

    if (gridCols === 1 && gridRows === 1) {
      // Modo Aislado: sin repetición, centrado y con espacio vacío alrededor
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f19', padding: '40px' }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${absIconUrl})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'invert(1) hue-rotate(180deg)',
          }}></div>
        </div>
      );
    }

    const w = params?.width || archetype.defaults.width;
    const h = params?.height || archetype.defaults.height;

    const gridW = w * gridCols;
    const gridH = h * gridRows;
    const viewBoxSize = Math.max(gridW, gridH) + (1.5 * Math.max(w, h));

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f19' }}>
        <svg 
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
          style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '1 / 1', border: '1px solid #1e293b' }}
        >
          <defs>
            <pattern 
              id={`hatchFallback-${archetype.id}`} 
              patternUnits="userSpaceOnUse" 
              width={w} 
              height={h}
            >
              {svgContent ? (
                <g 
                   className="hatch-preview-layer"
                   transform={`scale(${w / (archetype.defaults.width || 346)}, ${h / (archetype.defaults.height || 600)})`}
                   dangerouslySetInnerHTML={{ __html: svgContent }} 
                />
              ) : (
                <image 
                  href={absIconUrl} 
                  width={w} 
                  height={h} 
                  preserveAspectRatio="none"
                  style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                />
              )}
            </pattern>
          </defs>
          <rect width={viewBoxSize} height={viewBoxSize} fill={`url(#hatchFallback-${archetype.id})`} />
        </svg>
      </div>
    );
  }

  // 2. Patrones con motor matemático geométrico: dibujar SVG dinámicamente
  try {
    const { w, h, paths, baseUnit } = archetype.generateSvgRenderer(params);
    
    // 1. Calculamos el tamaño de la cuadrícula base solicitada
    const gridW = w * gridCols;
    const gridH = h * gridRows;
    
    // 2. Tomamos el lado mayor para mantener un viewBox cuadrado
    const maxGridSide = Math.max(gridW, gridH);
    
    // 3. Añadimos un desbordamiento de 1.5 patrones por lado (1.5 en total extra para encuadrar mejor)
    const maxPatternSide = baseUnit || Math.max(w, h);
    const viewBoxSize = maxGridSide + (1.5 * maxPatternSide);

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f19' }}>
        <svg 
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
          style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '1 / 1', border: '1px solid #1e293b' }}
        >
          <defs>
            <pattern id={`hatchPattern-${archetype.id}`} patternUnits="userSpaceOnUse" width={w} height={h} patternTransform={archetype.patternTransform || ''}>
              <g className="hatch-preview-layer" stroke="#ffffff" fill="none" strokeWidth="1.5" dangerouslySetInnerHTML={{ __html: paths }} />
            </pattern>
          </defs>
          <rect width={viewBoxSize} height={viewBoxSize} fill={`url(#hatchPattern-${archetype.id})`} />
        </svg>
      </div>
    );
  } catch (err) {
    console.error("Error generating dynamic SVG:", err);
    return <div style={{ color: 'red' }}>Error rendering geometry</div>;
  }
}
