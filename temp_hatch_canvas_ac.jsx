import React from 'react';

export default function HatchPreviewCanvas({ archetype, width, height, joint, rows, columns }) {
  // Dimensiones totales de una celda unitaria
  const isCubic3D = archetype === 'cubic3d';
  const cellW = isCubic3D ? width * Math.sqrt(3) : width + joint;
  const cellH = isCubic3D ? width * 1.5 : height + joint;
  
  // Tama├▒o del ├írea central definida por el usuario
  const coreWidth = cellW * columns;
  const coreHeight = cellH * rows;
  
  // El lienzo f├¡sico completo, d├índole un margen de sobrepaso para mostrar el patr├│n "continuo"
  const paddingX = cellW * 1.5;
  const paddingY = cellH * 1.5;
  const canvasWidth = coreWidth + (paddingX * 2);
  const canvasHeight = coreHeight + (paddingY * 2);

  // Offset para centrar el bloque principal (core) en el SVG
  const offsetX = paddingX;
  const offsetY = paddingY;

  // Renderizador espec├¡fico por arquetipo
  const renderPolygons = () => {
    const polygons = [];
    let key = 0;

    const totalCols = Math.ceil(canvasWidth / cellW) + 2;
    const totalRows = Math.ceil(canvasHeight / cellH) + 2;

    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        let x = (c - 1) * cellW;
        let y = (r - 1) * cellH;

        if (archetype === 'stack' || archetype === 'cubic') {
          polygons.push(
            <rect key={key++} x={x} y={y} width={width} height={height} fill="#a8a8a8" />
          );
        } 
        else if (archetype === 'cubic3d') {
          const s = width; // arista
          const hW = (s * Math.sqrt(3)) / 2; // medio ancho del cubo
          
          let cx = x;
          let cy = y;
          if (r % 2 !== 0) {
            cx -= cellW / 2;
          }

          // Puntos para los 3 rombos del cubo
          const topPts = `${cx + hW},${cy} ${cx + hW * 2},${cy + s * 0.5} ${cx + hW},${cy + s} ${cx},${cy + s * 0.5}`;
          const leftPts = `${cx},${cy + s * 0.5} ${cx + hW},${cy + s} ${cx + hW},${cy + s * 2} ${cx},${cy + s * 1.5}`;
          const rightPts = `${cx + hW * 2},${cy + s * 0.5} ${cx + hW},${cy + s} ${cx + hW},${cy + s * 2} ${cx + hW * 2},${cy + s * 1.5}`;

          polygons.push(
            <g key={key++}>
              <polygon points={topPts} fill="#e4e4e7" stroke="#1e293b" strokeWidth="0.5" />
              <polygon points={leftPts} fill="#a1a1aa" stroke="#1e293b" strokeWidth="0.5" />
              <polygon points={rightPts} fill="#71717a" stroke="#1e293b" strokeWidth="0.5" />
            </g>
          );
        }
        else if (archetype === 'stretcher') {
          if (r % 2 !== 0) x -= cellW / 2;
          polygons.push(
            <rect key={key++} x={x} y={y} width={width} height={height} fill="#a8a8a8" />
          );
          if (r % 2 !== 0 && c === totalCols - 1) {
             polygons.push(
              <rect key={key++} x={x + cellW} y={y} width={width} height={height} fill="#a8a8a8" />
            );
          }
        }
        else if (archetype === 'basketweave') {
          // Bloque 2x2: Dos verticales a la izquierda, dos horizontales a la derecha,
          // pero el patr├│n Architextures cl├ísico tiene 3 rectangulos verticales, 3 horizontales.
          // Para nuestro modelo WxH, supongamos W = ancho total, H = alto del ladrillo corto.
          // Dos horizontales
          polygons.push(<rect key={key++} x={x} y={y} width={width} height={height} fill="#a8a8a8" />);
          polygons.push(<rect key={key++} x={x} y={y + cellH} width={width} height={height} fill="#a8a8a8" />);
          // Dos verticales al lado
          polygons.push(<rect key={key++} x={x + cellW} y={y} width={height} height={width} fill="#a8a8a8" />);
          polygons.push(<rect key={key++} x={x + cellW + cellH} y={y} width={height} height={width} fill="#a8a8a8" />);
        }
        else if (archetype === 'common') {
          // 5 filas stretcher, 1 fila header
          const cycleRow = r % 6;
          if (cycleRow < 5) {
            // Stretcher normal
            if (cycleRow % 2 !== 0) x -= cellW / 2;
            polygons.push(<rect key={key++} x={x} y={y} width={width} height={height} fill="#a8a8a8" />);
            if (cycleRow % 2 !== 0 && c === totalCols - 1) {
               polygons.push(<rect key={key++} x={x + cellW} y={y} width={width} height={height} fill="#a8a8a8" />);
            }
          } else {
            // Header (mitad de ancho)
            const headerW = width / 2;
            const headerCell = headerW + joint;
            polygons.push(<rect key={key++} x={c * headerCell} y={y} width={headerW} height={height} fill="#a8a8a8" />);
            // Necesitamos dibujar el doble de headers para cubrir la misma longitud (c cubre hasta totalCols, as├¡ que basta con dibujar 2)
            polygons.push(<rect key={key++} x={c * cellW + headerCell} y={y} width={headerW} height={height} fill="#a8a8a8" />);
          }
        }
        else if (archetype === 'flemish') {
          // Alterna Stretcher y Header
          const headerW = width / 2;
          const headerCell = headerW + joint;
          const flemishStep = cellW + headerCell;
          let bx = c * flemishStep;
          if (r % 2 !== 0) bx -= flemishStep / 2;
          
          polygons.push(<rect key={key++} x={bx} y={y} width={width} height={height} fill="#a8a8a8" />);
          polygons.push(<rect key={key++} x={bx + cellW} y={y} width={headerW} height={height} fill="#a8a8a8" />);
          
          if (r % 2 !== 0 && c === totalCols - 1) {
             polygons.push(<rect key={key++} x={bx + flemishStep} y={y} width={width} height={height} fill="#a8a8a8" />);
             polygons.push(<rect key={key++} x={bx + flemishStep + cellW} y={y} width={headerW} height={height} fill="#a8a8a8" />);
          }
        }
        else if (archetype === 'chevron' || archetype === 'herringbone') {
          // Simplificaci├│n: Un rombo/rect├íngulo rotado
          const angle = archetype === 'herringbone' ? 45 : 30; // Herringbone = 45 deg
          const color = "#a8a8a8";
          // Como dibujar los SVGs perfectos de herringbone requiere matem├íticas extensas,
          // usaremos un pol├¡gono simplificado que denote la direcci├│n.
          // Para no bloquearnos, dibujamos el rect rotado.
          polygons.push(
            <g key={key++} transform={`translate(${x}, ${y})`}>
               <rect x={0} y={0} width={width} height={height} fill={color} transform={`rotate(${angle})`} />
               <rect x={width/2} y={height/2} width={width} height={height} fill={color} transform={`rotate(-${angle}) translate(0, ${height})`} />
            </g>
          );
        }
      }
    }
    return polygons;
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} 
        preserveAspectRatio="xMidYMid meet"
        style={{ backgroundColor: '#e2e2e2', borderRadius: '4px' }}
      >
        <g>
          {renderPolygons()}
        </g>
        
        <rect 
          x={offsetX} 
          y={offsetY} 
          width={coreWidth} 
          height={coreHeight} 
          fill="none" 
          stroke="var(--tmd-orange)" 
          strokeWidth={Math.max(2, coreWidth / 150)} 
          strokeDasharray={`${Math.max(8, coreWidth / 30)}, ${Math.max(8, coreWidth / 30)}`} 
        />
      </svg>
      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#888' }}>
        Preview: {coreWidth} x {coreHeight} mm (├ürea seleccionada en naranja)
      </div>
    </div>
  );
}
