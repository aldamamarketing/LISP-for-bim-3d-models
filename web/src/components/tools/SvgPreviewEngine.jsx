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
            // Forzar estilos inline porque los selectores CSS globales fallan dentro de <pattern> en algunos motores
            let cleaned = match[1]
              .replace(/stroke="[^"]+"/g, '')
              .replace(/fill="[^"]+"/g, '')
              .replace(/style="[^"]+"/g, '');
            cleaned = `<style>path, line, polyline, polygon, rect, circle { stroke: #e2e8f0 !important; fill: none !important; stroke-width: 1px !important; }</style>` + cleaned;
            setSvgContent(cleaned);
          }
        })
        .catch(err => console.error("Error fetching SVG:", err));
      return () => { isMounted = false; };
    }
  }, [archetype]);

  if (!archetype) return null;

  // 1. Patrones sin motor matemático: escalar imagen SVG original de forma pareja usando CSS
  if (!archetype.generateSvgRenderer) {
    if (!svgContent) {
      return <div style={{ width: '100%', height: '100%', backgroundColor: '#0b0f19' }} />;
    }

    const w = params?.width || archetype.defaults.width || 346;
    const h = params?.height || archetype.defaults.height || 600;
    const origW = archetype.defaults.width || 346;
    const origH = archetype.defaults.height || 600;

    // Calculamos el grosor dinámico
    const maxGrid = Math.max(gridCols, gridRows);
    const strokeWidth = 1.5 * maxGrid;

    // Construimos el SVG como string
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <style>
          path, line, polyline, polygon, rect, circle {
            stroke: #e2e8f0 !important;
            fill: none !important;
            stroke-width: ${strokeWidth}px !important;
          }
        </style>
        <g transform="scale(${w / origW}, ${h / origH})">
          ${svgContent}
        </g>
      </svg>
    `;

    // Usar codificación segura para Chromium antiguos (sin ;utf8)
    const dataUri = `data:image/svg+xml,${encodeURIComponent(svgString.trim())}`;
    
    // Zoom Infinito: la dimensión predominante dicta el porcentaje
    const bgSize = gridRows >= gridCols 
      ? `auto ${100 / gridRows}%` 
      : `${100 / gridCols}% auto`;

    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#0b0f19',
        overflow: 'hidden',
        backgroundImage: `url("${dataUri}")`,
        backgroundSize: bgSize,
        backgroundPosition: 'top left',
        backgroundRepeat: 'repeat'
      }} />
    );
  }

  // 2. Patrones con motor matemático geométrico: dibujar SVG dinámicamente y usar mismo paradigma
  try {
    const { w, h, paths } = archetype.generateSvgRenderer(params);
    
    const maxGrid = Math.max(gridCols, gridRows);
    // Para matemáticos, el trazo base suele ser más fino, compensamos igual.
    const dynamicStrokeWidth = Math.max(1, 1.5 * maxGrid);

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <g stroke-width="${dynamicStrokeWidth}" stroke="#e2e8f0" fill="none">
          ${paths}
        </g>
      </svg>
    `;

    const dataUri = `data:image/svg+xml,${encodeURIComponent(svgString.trim())}`;
    
    const bgSize = gridRows >= gridCols 
      ? `auto ${100 / gridRows}%` 
      : `${100 / gridCols}% auto`;

    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#0b0f19',
        overflow: 'hidden',
        backgroundImage: `url("${dataUri}")`,
        backgroundSize: bgSize,
        backgroundPosition: 'top left',
        backgroundRepeat: 'repeat'
      }} />
    );
  } catch (err) {
    console.error("Error generating dynamic SVG:", err);
    return <div style={{ color: 'red', padding: '20px' }}>Error rendering geometry</div>;
  }
}
