import React from 'react';

/**
 * Motor de previsualización que toma las fórmulas de HatchEngine
 * y construye una rejilla visual 100% basada en CSS y SVG en tiempo real.
 */
export default function SvgPreviewEngine({ archetype, params, gridRows = 3, gridCols = 3 }) {
  if (!archetype) return null;

  // 1. Patrones sin motor matemático: escalar imagen SVG original de forma pareja
  if (!archetype.generateSvgRenderer) {
    if (gridCols === 1 && gridRows === 1) {
      // Modo Aislado: sin repetición, centrado y con espacio vacío alrededor
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f19', padding: '40px' }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${archetype.iconUrl})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'invert(1) hue-rotate(180deg)',
          }}></div>
        </div>
      );
    }

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f19', overflow: 'hidden' }}>
        <div style={{
          width: '100%',
          aspectRatio: '1 / 1',
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
          border: '1px solid #1e293b',
          gap: 0
        }}>
          {Array.from({ length: gridRows * gridCols }).map((_, i) => (
            <div key={i} style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={archetype.iconUrl} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  filter: 'invert(1) hue-rotate(180deg)' 
                }} 
              />
            </div>
          ))}
        </div>
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
          style={{ width: '100%', aspectRatio: '1 / 1', border: '1px solid #1e293b' }}
        >
          <defs>
            <pattern id={`hatchPattern-${archetype.id}`} patternUnits="userSpaceOnUse" width={w} height={h} patternTransform={archetype.patternTransform || ''}>
              <g dangerouslySetInnerHTML={{ __html: paths }} />
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
