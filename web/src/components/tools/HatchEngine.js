// web/src/components/tools/HatchEngine.js
// Motor matemático paramétrico de Hatch

export const CATEGORIES = [
  'Brick Bond', 'Paving', 'Geometric', 'Roofing', 'Parquetry', 'Madera', 'Topography', 'Fabric', 'General'
];

export const ARCHETYPES = [
  {
    id: 'line',
    name: 'Lines (Líneas)',
    category: 'Geometric',
    controlsType: 'lines',
    iconUrl: '/patterns/line.svg',
    controls: ['spacing'],
    defaults: { spacing: 200, angle: 0, rows: 3, columns: 3 },
    generatePat: (s) => {
      return `*Line_${s}, Líneas Paralelas\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `0, 0,0, 0,${s}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.spacing || 200;
      // Dibujamos arriba y abajo para que al repetir el <pattern> los bordes sumen 1px exacto.
      const paths = `
        <line x1="0" y1="0" x2="${s}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${s}" x2="${s}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w: s, h: s, paths };
    }
  },
  {
    id: 'net',
    name: 'Net (Rejilla)',
    category: 'Geometric',
    controlsType: 'lines',
    iconUrl: '/patterns/net.svg',
    controls: ['spacing'],
    defaults: { spacing: 200, angle: 0, rows: 3, columns: 3 },
    generatePat: (s) => {
      return `*Net_${s}, Rejilla Ortogonal\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `0, 0,0, 0,${s}\n` +
             `90, 0,0, 0,${s}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.spacing || 200;
      // Dibujamos en los 4 bordes para enlosado perfecto
      const paths = `
        <line x1="0" y1="0" x2="${s}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${s}" x2="${s}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="0" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${s}" y1="0" x2="${s}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w: s, h: s, paths };
    }
  },
  {
    id: 'weave',
    name: 'Weave (Cinta Entrelazada)',
    category: 'Fabric',
    controlsType: 'weave',
    iconUrl: '/patterns/basketweave.svg',
    controls: ['width', 'height'],
    defaults: { width: 400, height: 400, joint: 0, rows: 3, columns: 3 },
    generatePat: (s, t, j) => {
      const step = 2 * (t + s);
      const dash = t + 2 * s;
      return `*Weave_${t}x${s}, Cinta Entrelazada (Weave)\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        // Vertical 1 (Izquierda)
        `90, 0,-${s}, 0,${step}, ${dash},-${t}\n` +
        `90, ${t},-${s}, 0,${step}, ${dash},-${t}\n` +
        // Horizontal 1 (Arriba)
        `0, ${t},0, 0,${step}, ${dash},-${t}\n` +
        `0, ${t},${t}, 0,${step}, ${dash},-${t}\n` +
        // Horizontal 2 (Abajo)
        `0, -${s},${t+s}, 0,${step}, ${dash},-${t}\n` +
        `0, -${s},${2*t+s}, 0,${step}, ${dash},-${t}\n` +
        // Vertical 2 (Derecha)
        `90, ${t+s},${t}, 0,${step}, ${dash},-${t}\n` +
        `90, ${2*t+s},${t}, 0,${step}, ${dash},-${t}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.width || 400; // Espacio
      const t = params.height || 400; // Grosor
      const ts = t + s;
      const cycle = 2 * ts;
      const paths = `
        <!-- Vertical 1 (Izquierda) -->
        <line x1="0" y1="0" x2="0" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${2*t+s}" x2="0" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${t}" y1="0" x2="${t}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${t}" y1="${2*t+s}" x2="${t}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- Horizontal 1 (Arriba) -->
        <line x1="${t}" y1="0" x2="${cycle}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${t}" y1="${t}" x2="${cycle}" y2="${t}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- Horizontal 2 (Abajo) -->
        <line x1="0" y1="${ts}" x2="${ts}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${2*t+s}" y1="${ts}" x2="${cycle}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${ts+t}" x2="${ts}" y2="${ts+t}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${2*t+s}" y1="${ts+t}" x2="${cycle}" y2="${ts+t}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- Vertical 2 (Derecha) -->
        <line x1="${ts}" y1="${t}" x2="${ts}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${ts+t}" y1="${t}" x2="${ts+t}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />

        <!-- Compensación de bordes para que las líneas exteriores no se vean más delgadas (1px vs 2px) -->
        <line x1="${cycle}" y1="0" x2="${cycle}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${cycle}" y1="${2*t+s}" x2="${cycle}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${t}" y1="${cycle}" x2="${cycle}" y2="${cycle}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w: cycle, h: cycle, baseUnit: ts, paths };
    }
  },
  {
    id: 'chevron',
    name: 'Chevron',
    category: 'Parquetry',
    controlsType: 'rectangular',
    iconUrl: '/patterns/chevron.svg',
    controls: ['width', 'height'],
    defaults: { width: 400, height: 100, rows: 4, columns: 4 },
    generatePat: (w, h) => {
      const tw = w;
      const th = h;
      // Para que el patrón cicle perfectamente en X y Y sin desfases:
      const angleRad = Math.atan2(th, tw);
      const angle = angleRad * (180 / Math.PI);
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      
      // En AutoCAD, deltaX es el desplazamiento a lo largo de la línea, y deltaY es perpendicular.
      // Queremos repetir la familia verticalmente por 'th':
      const dX = th * sinA;
      const dY = th * cosA;
      
      const dash = w / cosA;
      const space = -(2 * tw - w) / cosA;
      const yPeak = h;
      
      return `*Chevron_${w}x${h}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `${angle}, 0,0, ${dX},${dY}, ${dash},${space}\n` +
        `-${angle}, ${tw},${yPeak}, ${-dX},${dY}, ${dash},${space}\n` +
        `90, 0,0, 0,${tw}\n` +
        `90, ${w},0, 0,${tw}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      
      // Exactamente la misma fórmula que en el .pat para alinear los vértices
      const yPeak = h;
      
      const paths = `
        <!-- Diagonales -->
        <line x1="0" y1="0" x2="${w}" y2="${yPeak}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="${yPeak}" x2="${w + w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales (Cortes de las tablas) -->
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w + w}" y1="0" x2="${w + w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      
      // El patrón base cicla cada 2 columnas y 1 fila de alto
      return { w: 2 * w, h: h, paths };
    }
  },
  {
    id: 'common',
    name: 'Common',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/common.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      // 5 filas soga (stretcher), 1 fila tizon (header)
      const tw = w + j;
      const th = h + j;
      const halfTw = tw / 2;
      const totalH = th * 6; // Ciclo de 6 filas
      let pat = `*Common_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n`; // Horizontales
         
      // Verticales para las 5 filas de Stretcher
      for(let i=0; i<5; i++) {
        let offsetX = (i % 2 !== 0) ? halfTw : 0;
        pat += `90, ${offsetX},${i*th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      }
      // Verticales para la fila 6 (Headers - asumiendo longitud w/2)
      pat += `90, 0,${5*th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${halfTw/2},${5*th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${halfTw},${5*th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${halfTw + halfTw/2},${5*th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      return pat;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const th = h * 6;
      const hw = w / 2;
      
      let paths = `
        <!-- Horizontales -->
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*2}" x2="${w}" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*3}" x2="${w}" y2="${h*3}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*4}" x2="${w}" y2="${h*4}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*5}" x2="${w}" y2="${h*5}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      // Verticales para las 5 filas Stretcher
      for(let i=0; i<5; i++) {
        let offsetX = (i % 2 !== 0) ? hw : 0;
        paths += `
        <line x1="${offsetX}" y1="${i*h}" x2="${offsetX}" y2="${(i+1)*h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${offsetX === 0 ? w : 0}" y1="${i*h}" x2="${offsetX === 0 ? w : 0}" y2="${(i+1)*h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />`;
      }
      // Verticales para la fila 6 (Headers - ancho w/2)
      paths += `
        <line x1="0" y1="${5*h}" x2="0" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${hw/2}" y1="${5*h}" x2="${hw/2}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${hw}" y1="${5*h}" x2="${hw}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${hw + hw/2}" y1="${5*h}" x2="${hw + hw/2}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="${5*h}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      
      return { w, h: th, paths };
    }
  },
  {
    id: 'cubic',
    name: 'Cubic',
    category: 'Geometric',
    controlsType: 'rectangular',
    iconUrl: '/patterns/cubic.svg',
    controls: ['size', 'joint'],
    defaults: { size: 200, joint: 0, rows: 4, columns: 4 },
    generatePat: (s, unused, j) => {
      const ts = s + j;
      return `*Cubic_${s}x${s}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${ts}\n` +
        `90, 0,0, 0,${ts}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.size || 200;
      const paths = `
        <line x1="0" y1="0" x2="${s}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${s}" x2="${s}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="0" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${s}" y1="0" x2="${s}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w: s, h: s, paths };
    }
  },
  {
    id: 'cubic3d',
    name: 'Cubic 3D',
    category: 'Geometric',
    controlsType: 'rectangular',
    iconUrl: '/patterns/cubic3d.svg',
    controls: ['size', 'joint'],
    defaults: { size: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (s, unused, j) => {
      // Motor paramétrico de Cubos 3D isométricos
      // s = arista del cubo, j = junta
      const w = s * Math.sqrt(3); // Ancho de repetición
      const h = s * 3; // Alto de repetición
      const offset = (s * Math.sqrt(3)) / 2;
      
      const vStroke = s - j; // vertical visible
      const vSpace = -(2 * s + j); // vertical invisible
      
      const dStroke = s - j; // diagonal visible
      const dSpace = -(2 * s + j); // diagonal invisible
      
      return `*Cubic3D_${s}_J${j}, LispCentral 3D Cubic Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        // Verticales (90 grados)
        `90, 0,0, ${offset},${s * 1.5}, ${vStroke},${vSpace}\n` +
        `90, ${offset},${s * 0.5}, ${offset},${s * 1.5}, ${vStroke},${vSpace}\n` +
        // Diagonales derechas (30 grados)
        `30, 0,0, 0,${s * 1.5}, ${dStroke},${dSpace}\n` +
        `30, 0,${s}, 0,${s * 1.5}, ${dStroke},${dSpace}\n` +
        // Diagonales izquierdas (150 grados)
        `150, 0,0, 0,${s * 1.5}, ${dStroke},${dSpace}\n` +
        `150, 0,${s}, 0,${s * 1.5}, ${dStroke},${dSpace}\n`;
    }
  },
  {
    id: 'flemish',
    name: 'Flemish',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/flemish.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      // Alterna Stretcher y Header en la misma fila
      const tw = w + j;
      const th = h + j;
      const hw = (w/2) + j; // header total width
      const stepX = tw + hw; 
      
      return `*Flemish_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n` +
        // Fila 1 (Empieza con Stretcher)
        `90, 0,0, 0,${th*2}, ${h},-${th*2 - h}\n` +
        `90, ${tw},0, 0,${th*2}, ${h},-${th*2 - h}\n` +
        // Fila 2 (Empieza descentrado)
        `90, ${stepX/2},${th}, 0,${th*2}, ${h},-${th*2 - h}\n` +
        `90, ${stepX/2 + tw},${th}, 0,${th*2}, ${h},-${th*2 - h}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const hw = w / 2;
      const stepX = w + hw;
      const th = h * 2;
      
      const paths = `
        <!-- Horizontales -->
        <line x1="0" y1="0" x2="${stepX}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${stepX}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${stepX}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales Fila 1 (Stretcher, luego Header) -->
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${stepX}" y1="0" x2="${stepX}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales Fila 2 (Descentrado por stepX/2 = 0.75w, envuelto) -->
        <line x1="${0.75 * w}" y1="${h}" x2="${0.75 * w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${0.25 * w}" y1="${h}" x2="${0.25 * w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w: stepX, h: th, paths };
    }
  },
  {
    id: 'herringbone',
    name: 'Herringbone',
    category: 'Parquetry',
    controlsType: 'rectangular',
    iconUrl: '/patterns/herringbone.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      // Herringbone real matemático a 45 grados
      const blockW = w + j;
      const blockH = h + j;
      const stepX = (blockW + blockH) / Math.sqrt(2);
      const stepY = stepX;
      
      return `*Herringbone_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
          `; Generado por LispCentral Hatch Builder\n` +
          `45, 0,0, ${stepX},${stepY}, ${w},-${blockH}\n` +
          `135, 0,0, ${stepX},${stepY}, ${w},-${blockH}\n` +
          `45, 0,${h+j}, ${stepX},${stepY}, ${w},-${blockH}\n` +
          `135, ${w+j},0, ${stepX},${stepY}, ${w},-${blockH}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const j = params.joint || 0;
      
      const tw = w + j;
      const th = h + j;
      const T = tw + th;
      
      const stepX = T / Math.sqrt(2);
      const stepY = T / Math.sqrt(2);
      
      let paths = '';
      
      const drawLineFamily = (ang, x0, y0) => {
        const rad = ang * Math.PI / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        
        const perpRad = (ang + 90) * Math.PI / 180;
        const cosP = Math.cos(perpRad);
        const sinP = Math.sin(perpRad);
        
        for (let k = -6; k <= 6; k++) {
          const ox = x0 + k * stepY * cosP;
          const oy = y0 + k * stepY * sinP;
          
          const startX = ox - 6 * T * cosA;
          const startY = oy - 6 * T * sinA;
          const endX = ox + 6 * T * cosA;
          const endY = oy + 6 * T * sinA;
          
          const offset = -(k * stepX);
          
          paths += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" stroke-dasharray="${tw},${th}" stroke-dashoffset="${offset}" />\n`;
        }
      };

      drawLineFamily(45, 0, 0);
      drawLineFamily(135, 0, 0);
      drawLineFamily(45, 0, -th);
      drawLineFamily(135, tw, 0);
      
      return { w: T, h: T, paths };
    }
  },
  {
    id: 'stack',
    name: 'Stack',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/stack.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 400, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j; 
      const th = h + j; 
      return `*Stack_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n` +
        `90, 0,0, 0,${tw}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 400;
      const paths = `
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w, h, paths };
    }
  },
  {
    id: 'stretcher',
    name: 'Stretcher',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/stretcher.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const halfTw = tw / 2;
      return `*Stretcher_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n` +
        `90, 0,0, ${th},${halfTw}, ${h},-${th}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const th = h * 2;
      const hw = w / 2;
      const paths = `
        <!-- Horizontales -->
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- Verticales bordes (Fila 1) -->
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- Vertical centro (Fila 2) -->
        <line x1="${hw}" y1="${h}" x2="${hw}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w, h: th, paths };
    }
  },
  {
    id: 'english_bond',
    name: 'English Bond',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/english_bond.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const halfTw = tw / 2;
      const totalH = th * 2; 
      
      let pat = `*EnglishBond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n`; 
         
      // Fila 1 (Stretcher)
      pat += `90, 0,0, 0,${totalH}, ${h},-${totalH-h}\n`;
      
      // Fila 2 (Headers) - Ancho = w/2, offset = w/4
      const qTw = tw / 4;
      pat += `90, ${qTw},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${qTw + halfTw},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      
      return pat;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const th = h * 2;
      const hw = w / 2;
      const qw = w / 4;
      
      let paths = `
        <!-- Horizontales -->
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales Fila 1 (Stretcher) -->
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales Fila 2 (Headers) -->
        <line x1="${qw}" y1="${h}" x2="${qw}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${qw + hw}" y1="${h}" x2="${qw + hw}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w, h: th, paths };
    }
  },
  {
    id: '13_running_bond',
    name: '1/3 Running Bond',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/13_running_bond.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const shift = tw / 3;
      const totalH = th * 3; 
      
      let pat = `*13_Running_Bond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n`; 
         
      pat += `90, 0,0, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift*2},${th*2}, 0,${totalH}, ${h},-${totalH-h}\n`;
      
      return pat;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const th = h * 3;
      const shift = w / 3;
      
      let paths = `
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*2}" x2="${w}" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="${shift}" y1="${h}" x2="${shift}" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${shift*2}" y1="${h*2}" x2="${shift*2}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w, h: th, paths };
    }
  },
  {
    id: '14_running_bond',
    name: '1/4 Running Bond',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/14_running_bond.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const shift = tw / 4;
      const totalH = th * 4; 
      
      let pat = `*14_Running_Bond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n`; 
         
      pat += `90, 0,0, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift*2},${th*2}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift*3},${th*3}, 0,${totalH}, ${h},-${totalH-h}\n`;
      
      return pat;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const th = h * 4;
      const shift = w / 4;
      
      let paths = `
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*2}" x2="${w}" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*3}" x2="${w}" y2="${h*3}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="${shift}" y1="${h}" x2="${shift}" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${shift*2}" y1="${h*2}" x2="${shift*2}" y2="${h*3}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${shift*3}" y1="${h*3}" x2="${shift*3}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w, h: th, paths };
    }
  },
  {
    id: 'double_stretcher',
    name: 'Double Stretcher',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/double_stretcher.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const halfTw = tw / 2;
      const totalH = th * 4; 
      
      let pat = `*DoubleStretcher_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n`; 
         
      // Fila 1 y 2 (Verticales alineadas a 0 y w)
      pat += `90, 0,0, 0,${totalH}, ${h*2 + j},-${totalH - (h*2 + j)}\n`;
      // Fila 3 y 4 (Verticales alineadas a w/2)
      pat += `90, ${halfTw},${th*2}, 0,${totalH}, ${h*2 + j},-${totalH - (h*2 + j)}\n`;
      
      return pat;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const th = h * 4;
      const hw = w / 2;
      
      let paths = `
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*2}" x2="${w}" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*3}" x2="${w}" y2="${h*3}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales Fila 1 y 2 -->
        <line x1="0" y1="0" x2="0" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales Fila 3 y 4 -->
        <line x1="${hw}" y1="${h*2}" x2="${hw}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w, h: th, paths };
    }
  },
  {
    id: 'triple_stretcher',
    name: 'Triple Stretcher',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/triple_stretcher.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const halfTw = tw / 2;
      const totalH = th * 6; 
      
      let pat = `*TripleStretcher_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n`; 
         
      // Fila 1, 2, 3 (Verticales alineadas a 0)
      pat += `90, 0,0, 0,${totalH}, ${h*3 + 2*j},-${totalH - (h*3 + 2*j)}\n`;
      // Fila 4, 5, 6 (Verticales alineadas a w/2)
      pat += `90, ${halfTw},${th*3}, 0,${totalH}, ${h*3 + 2*j},-${totalH - (h*3 + 2*j)}\n`;
      
      return pat;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const th = h * 6;
      const hw = w / 2;
      
      let paths = `
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*2}" x2="${w}" y2="${h*2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*3}" x2="${w}" y2="${h*3}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*4}" x2="${w}" y2="${h*4}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h*5}" x2="${w}" y2="${h*5}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales F1-F3 -->
        <line x1="0" y1="0" x2="0" y2="${h*3}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h*3}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales F4-F6 -->
        <line x1="${hw}" y1="${h*3}" x2="${hw}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w, h: th, paths };
    }
  },
  {
    id: 'monk_bond',
    name: 'Monk Bond',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/monk_bond.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const totalW = tw * 2.5; // 2 Stretchers + 1 Header
      const totalH = th * 2; 
      
      let pat = `*MonkBond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n`; 
         
      // Fila 1: S(0), S(tw), H(2*tw)
      pat += `90, 0,0, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${tw},0, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${tw*2},0, 0,${totalH}, ${h},-${totalH-h}\n`;
      
      // Fila 2: shift by 1.25w
      const shift = totalW / 2;
      pat += `90, ${shift},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift + tw},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift + tw*2},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      
      return pat;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const totalW = w * 2.5;
      const totalH = h * 2;
      const shift = totalW / 2;
      
      let paths = `
        <line x1="0" y1="0" x2="${totalW}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${totalW}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${totalH}" x2="${totalW}" y2="${totalH}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w*2}" y1="0" x2="${w*2}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${totalW}" y1="0" x2="${totalW}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      let vs = [shift, shift + w, shift + w*2].map(v => v % totalW);
      vs.forEach(v => {
         paths += `<line x1="${v}" y1="${h}" x2="${v}" y2="${totalH}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      });
      
      return { w: totalW, h: totalH, paths };
    }
  },
  {
    id: 'silesian_bond',
    name: 'Silesian Bond',
    category: 'Brick Bond',
    controlsType: 'rectangular',
    iconUrl: '/patterns/silesian_bond.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 6, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const totalW = tw * 3.5; // 3 Stretchers + 1 Header
      const totalH = th * 2; 
      
      let pat = `*SilesianBond_${w}x${h}_J${j}, LispCentral Parametric Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, 0,${th}\n`; 
         
      // Fila 1: S(0), S(tw), S(2tw), H(3tw)
      pat += `90, 0,0, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${tw},0, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${tw*2},0, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${tw*3},0, 0,${totalH}, ${h},-${totalH-h}\n`;
      
      // Fila 2: shift by 1.75w
      const shift = totalW / 2;
      pat += `90, ${shift},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift + tw},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift + tw*2},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      pat += `90, ${shift + tw*3},${th}, 0,${totalH}, ${h},-${totalH-h}\n`;
      
      return pat;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const totalW = w * 3.5;
      const totalH = h * 2;
      const shift = totalW / 2;
      
      let paths = `
        <line x1="0" y1="0" x2="${totalW}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${totalW}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${totalH}" x2="${totalW}" y2="${totalH}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w*2}" y1="0" x2="${w*2}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w*3}" y1="0" x2="${w*3}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${totalW}" y1="0" x2="${totalW}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      let vs = [shift, shift + w, shift + w*2, shift + w*3].map(v => v % totalW);
      vs.forEach(v => {
         paths += `<line x1="${v}" y1="${h}" x2="${v}" y2="${totalH}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      });
      
      return { w: totalW, h: totalH, paths };
    }
  },
  {
    id: 'basketweave',
    name: 'Basketweave',
    category: 'Parquetry',
    controlsType: 'cubic',
    iconUrl: '/patterns/basketweave.svg',
    controls: ['size', 'joint'],
    defaults: { size: 200, joint: 0, rows: 4, columns: 4 },
    generatePat: (s, unused, j) => {
      // Basketweave de 2 ladrillos (proporción 2:1)
      const ts = s + j;
      const th = ts * 2; // El bloque de repetición tiene ancho ts*2 y alto ts*2
      
      // Bloque 1 (Arriba Izquierda) - 2 ladrillos verticales
      // Bloque 2 (Arriba Derecha) - 2 ladrillos horizontales
      // Bloque 3 (Abajo Izquierda) - 2 ladrillos horizontales
      // Bloque 4 (Abajo Derecha) - 2 ladrillos verticales
      
      return `*Basketweave_${s}x${s}_J${j}, LispCentral Basketweave Hatch\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        // Líneas principales de la grilla 2x2
        `0, 0,0, 0,${ts*2}\n` +
        `0, 0,${ts}, 0,${ts*2}\n` +
        `90, 0,0, 0,${ts*2}\n` +
        `90, ${ts},0, 0,${ts*2}\n` +
        // Divisiones internas de los bloques
        // Vertical dentro de bloques 1 y 4 (en X = ts/2 y X = ts*1.5)
        `90, ${ts/2},0, 0,${ts*2}, ${s},-${ts + j}\n` +
        `90, ${ts*1.5},${ts}, 0,${ts*2}, ${s},-${ts + j}\n` +
        // Horizontal dentro de bloques 2 y 3 (en Y = ts/2 y Y = ts*1.5)
        `0, ${ts},${ts/2}, 0,${ts*2}, ${s},-${ts + j}\n` +
        `0, 0,${ts*1.5}, 0,${ts*2}, ${s},-${ts + j}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.size || 200;
      const ts = s * 2;
      const hs = s / 2;
      
      const paths = `
        <!-- Grilla Principal -->
        <line x1="0" y1="0" x2="${ts}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${s}" x2="${ts}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${ts}" x2="${ts}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="0" y1="0" x2="0" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${s}" y1="0" x2="${s}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${ts}" y1="0" x2="${ts}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Bloque 1 (Arriba Izq) -->
        <line x1="${hs}" y1="0" x2="${hs}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- Bloque 4 (Abajo Der) -->
        <line x1="${s + hs}" y1="${s}" x2="${s + hs}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Bloque 2 (Arriba Der) -->
        <line x1="${s}" y1="${hs}" x2="${ts}" y2="${hs}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- Bloque 3 (Abajo Izq) -->
        <line x1="0" y1="${s + hs}" x2="${s}" y2="${s + hs}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w: ts, h: ts, paths };
    }
  },
  {
    id: 'hexagonal',
    name: 'Hexagonal',
    category: 'Geometric',
    controlsType: 'cubic',
    iconUrl: '/patterns/hexagonal.svg',
    controls: ['size', 'joint'],
    defaults: { size: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (s, unused, j) => {
      const H = s * Math.sqrt(3);
      return `*Hexagonal_${s}_J${j}, Panal de abejas geométrico\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, 0,0, ${1.5 * s},${H/2}, ${s},${-2 * s}\n` +
        `60, ${s},0, ${1.5 * s},${H/2}, ${s},${-2 * s}\n` +
        `120, 0,0, ${1.5 * s},${H/2}, ${s},${-2 * s}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.size || 100;
      const H = s * Math.sqrt(3);
      const h = H / 2;
      
      const totalW = 3 * s;
      const totalH = H;
      
      const hex = (cx, cy) => {
        return `<path d="M ${cx+s},${cy} L ${cx+s/2},${cy+h} L ${cx-s/2},${cy+h} L ${cx-s},${cy} L ${cx-s/2},${cy-h} L ${cx+s/2},${cy-h} Z" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\\n`;
      };
      
      let paths = hex(0, 0) + hex(1.5*s, h) + hex(3*s, 0) + hex(0, 2*h) + hex(3*s, 2*h);
      
      return { w: totalW, h: totalH, paths };
    }
  },
  {
    id: 'octagon_square',
    name: 'Octagon & Square',
    category: 'Geometric',
    controlsType: 'cubic',
    iconUrl: '/patterns/octagon_square.svg',
    controls: ['size', 'joint'],
    defaults: { size: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (s, unused, j) => {
      const a = s / Math.SQRT2;
      const W = s + 2 * a;
      return `*OctagonSquare_${s}_J${j}, Mosaico Victoriano\n` +
        `; Generado por LispCentral Hatch Builder\n` +
        `0, ${a},0, 0,${W}, ${s},${-(W-s)}\n` +
        `90, 0,${a}, 0,${W}, ${s},${-(W-s)}\n` +
        `45, ${a+s},0, 0,${W}, ${s},${-W}\n` +
        `135, ${a},0, 0,${W}, ${s},${-W}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.size || 100;
      const a = s / Math.SQRT2;
      const W = s + 2 * a;
      
      let paths = `
        <line x1="${a}" y1="0" x2="${a+s}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${a}" y1="${W}" x2="${a+s}" y2="${W}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${a}" x2="0" y2="${a+s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${W}" y1="${a}" x2="${W}" y2="${a+s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${a+s}" y1="0" x2="${W}" y2="${a}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${a+s}" x2="${a}" y2="${W}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${a}" y1="0" x2="0" y2="${a}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${W}" y1="${a+s}" x2="${a+s}" y2="${W}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
      return { w: W, h: W, paths };
    }
  },
  {
    id: 'double_flemish',
    name: 'Double Flemish Bond',
    category: 'Brick',
    controlsType: 'rectangular',
    iconUrl: '/patterns/stretcher.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 200, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const totalW = 2.5 * tw;
      const shift = 0.75 * tw;
      return `*DoubleFlemish_${w}x${h}_J${j}, Aparejo Flamenco Doble\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `0, 0,0, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${tw},0, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${2*tw},0, 0,${th}, ${w/2},${j + totalW - w/2}\n` +
             `90, 0,0, ${th},0, ${h},${j}\n` +
             `90, ${tw},0, ${th},0, ${h},${j}\n` +
             `90, ${2*tw},0, ${th},0, ${h},${j}\n` +
             `90, ${2.5*tw},0, ${th},0, ${h},${j}\n` +
             `0, ${shift},${th/2}, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${shift+tw},${th/2}, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${shift+2*tw},${th/2}, 0,${th}, ${w/2},${j + totalW - w/2}\n` +
             `90, ${shift},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+tw},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+2*tw},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+2.5*tw},${th/2}, ${th},0, ${h},${j}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 200;
      const h = params.height || 100;
      const j = params.joint || 0;
      const tw = w + j;
      const th = h + j;
      const shift = 0.75 * tw;
      const totalW = 2.5 * tw;
      let paths = '';
      const drawBrick = (x, y, bw, bh) => {
        paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      };
      for(let r=0; r<6; r++) {
        let y = r * th;
        let startX = (r % 2 === 1) ? shift : 0;
        for(let c=-1; c<4; c++) {
          let x = startX + c * totalW;
          drawBrick(x, y, w, h);
          drawBrick(x + tw, y, w, h);
          drawBrick(x + 2*tw, y, w/2, h);
        }
      }
      return { w: totalW, h: th * 2, paths };
    }
  },
  {
    id: 'triple_flemish',
    name: 'Triple Flemish Bond',
    category: 'Brick',
    controlsType: 'rectangular',
    iconUrl: '/patterns/stretcher.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 200, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const totalW = 3.5 * tw;
      const shift = 1.25 * tw;
      return `*TripleFlemish_${w}x${h}_J${j}, Aparejo Flamenco Triple\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `0, 0,0, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${tw},0, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${2*tw},0, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${3*tw},0, 0,${th}, ${w/2},${j + totalW - w/2}\n` +
             `90, 0,0, ${th},0, ${h},${j}\n` +
             `90, ${tw},0, ${th},0, ${h},${j}\n` +
             `90, ${2*tw},0, ${th},0, ${h},${j}\n` +
             `90, ${3*tw},0, ${th},0, ${h},${j}\n` +
             `90, ${3.5*tw},0, ${th},0, ${h},${j}\n` +
             `0, ${shift},${th/2}, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${shift+tw},${th/2}, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${shift+2*tw},${th/2}, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${shift+3*tw},${th/2}, 0,${th}, ${w/2},${j + totalW - w/2}\n` +
             `90, ${shift},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+tw},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+2*tw},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+3*tw},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+3.5*tw},${th/2}, ${th},0, ${h},${j}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 200;
      const h = params.height || 100;
      const j = params.joint || 0;
      const tw = w + j;
      const th = h + j;
      const shift = 1.25 * tw;
      const totalW = 3.5 * tw;
      let paths = '';
      const drawBrick = (x, y, bw, bh) => {
        paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      };
      for(let r=0; r<6; r++) {
        let y = r * th;
        let startX = (r % 2 === 1) ? shift : 0;
        for(let c=-1; c<4; c++) {
          let x = startX + c * totalW;
          drawBrick(x, y, w, h);
          drawBrick(x + tw, y, w, h);
          drawBrick(x + 2*tw, y, w, h);
          drawBrick(x + 3*tw, y, w/2, h);
        }
      }
      return { w: totalW, h: th * 2, paths };
    }
  },
  {
    id: 'gothic_bond',
    name: 'Gothic Bond',
    category: 'Brick',
    controlsType: 'rectangular',
    iconUrl: '/patterns/stretcher.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 200, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const totalW = 1.5 * tw;
      const shift = 0.25 * tw;
      return `*GothicBond_${w}x${h}_J${j}, Aparejo Gótico\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `0, 0,0, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${tw},0, 0,${th}, ${w/2},${j + totalW - w/2}\n` +
             `90, 0,0, ${th},0, ${h},${j}\n` +
             `90, ${tw},0, ${th},0, ${h},${j}\n` +
             `90, ${1.5*tw},0, ${th},0, ${h},${j}\n` +
             `0, ${shift},${th/2}, 0,${th}, ${w},${j + totalW - w}\n` +
             `0, ${shift+tw},${th/2}, 0,${th}, ${w/2},${j + totalW - w/2}\n` +
             `90, ${shift},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+tw},${th/2}, ${th},0, ${h},${j}\n` +
             `90, ${shift+1.5*tw},${th/2}, ${th},0, ${h},${j}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 200;
      const h = params.height || 100;
      const j = params.joint || 0;
      const tw = w + j;
      const th = h + j;
      const shift = 0.25 * tw;
      const totalW = 1.5 * tw;
      let paths = '';
      const drawBrick = (x, y, bw, bh) => {
        paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      };
      for(let r=0; r<6; r++) {
        let y = r * th;
        let startX = (r % 2 === 1) ? shift : 0;
        for(let c=-2; c<6; c++) {
          let x = startX + c * totalW;
          drawBrick(x, y, w, h);
          drawBrick(x + tw, y, w/2, h);
        }
      }
      return { w: totalW, h: th * 2, paths };
    }
  },
  {
    id: 'english_cross_bond',
    name: 'English Cross Bond',
    category: 'Brick',
    controlsType: 'rectangular',
    iconUrl: '/patterns/stretcher.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 200, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const totalW = tw;
      const totalH = 4 * th;
      return `*EnglishCrossBond_${w}x${h}_J${j}, Aparejo Cruzado Inglés\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `; Fila 1: Sogas\n` +
             `0, 0,0, 0,${totalH}, ${w},${j}\n` +
             `90, 0,0, ${totalH},0, ${h},${j}\n` +
             `90, ${tw},0, ${totalH},0, ${h},${j}\n` +
             `; Fila 2: Tizones\n` +
             `0, 0,${th}, 0,${totalH}, ${w/2},${j + w/2 + j}\n` +
             `0, ${0.5*tw},${th}, 0,${totalH}, ${w/2},${j + w/2 + j}\n` +
             `90, 0,${th}, ${totalH},0, ${h},${j}\n` +
             `90, ${0.5*tw},${th}, ${totalH},0, ${h},${j}\n` +
             `; Fila 3: Sogas desplazadas\n` +
             `0, ${0.5*tw},${2*th}, 0,${totalH}, ${w},${j}\n` +
             `90, ${0.5*tw},${2*th}, ${totalH},0, ${h},${j}\n` +
             `90, ${1.5*tw},${2*th}, ${totalH},0, ${h},${j}\n` +
             `; Fila 4: Tizones\n` +
             `0, 0,${3*th}, 0,${totalH}, ${w/2},${j + w/2 + j}\n` +
             `0, ${0.5*tw},${3*th}, 0,${totalH}, ${w/2},${j + w/2 + j}\n` +
             `90, 0,${3*th}, ${totalH},0, ${h},${j}\n` +
             `90, ${0.5*tw},${3*th}, ${totalH},0, ${h},${j}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 200;
      const h = params.height || 100;
      const j = params.joint || 0;
      const tw = w + j;
      const th = h + j;
      let paths = '';
      const drawBrick = (x, y, bw, bh) => {
        paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      };
      for(let r=0; r<8; r++) {
        let y = r * th;
        let isStretcher = r % 2 === 0;
        let isShifted = r % 4 === 2;
        let startX = isShifted ? 0.5 * tw : 0;
        let numBricks = isStretcher ? 5 : 10;
        let bw = isStretcher ? w : w/2;
        let sw = isStretcher ? tw : tw/2;
        for(let c=-2; c<numBricks; c++) {
          let x = startX + c * sw;
          drawBrick(x, y, bw, h);
        }
      }
      return { w: tw, h: th * 4, paths };
    }
  },
  {
    id: 'double_herringbone',
    name: 'Double Herringbone',
    category: 'Parquet',
    controlsType: 'rectangular',
    iconUrl: '/patterns/herringbone.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 400, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const step = (tw * 2 + th)/Math.SQRT2;
      return `*DoubleHerringbone_${w}x${h}_J${j}, Doble Espiga\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `45, 0,0, 0,${step}, ${w},${-(w+2*th)}\n` +
             `45, ${th/Math.SQRT2},${-th/Math.SQRT2}, 0,${step}, ${w},${-(w+2*th)}\n` +
             `135, ${th/Math.SQRT2},${th/Math.SQRT2}, 0,${step}, ${w},${-(w+2*th)}\n` +
             `135, 0,${th*Math.SQRT2}, 0,${step}, ${w},${-(w+2*th)}\n` +
             `135, ${tw/Math.SQRT2},${tw/Math.SQRT2}, 0,${step}, ${h},${-(w+2*th-h)}\n` +
             `135, ${(tw+th)/Math.SQRT2},${(tw-th)/Math.SQRT2}, 0,${step}, ${h},${-(w+2*th-h)}\n` +
             `45, ${-(tw-th)/Math.SQRT2},${(tw+th)/Math.SQRT2}, 0,${step}, ${h},${-(w+2*th-h)}\n` +
             `45, ${-tw/Math.SQRT2},${(tw+2*th)/Math.SQRT2}, 0,${step}, ${h},${-(w+2*th-h)}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 400;
      const h = params.height || 100;
      const j = params.joint || 0;
      const tw = w + j;
      const th = h + j;
      
      const step = (tw * 2 + th)/Math.SQRT2;
      let paths = '';
      
      const drawRotatedRect = (x, y, bw, bh, angle) => {
        paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" transform="rotate(${angle} ${x} ${y})" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      };
      
      for(let r=-2; r<5; r++) {
        for(let c=-2; c<5; c++) {
          let ox = (c + r) * step;
          let oy = (r - c) * step;
          
          drawRotatedRect(ox, oy, w, h, -45);
          drawRotatedRect(ox + th/Math.SQRT2, oy + th/Math.SQRT2, w, h, -45);
          
          let ox2 = ox + (tw+th)/Math.SQRT2;
          let oy2 = oy + (tw-th)/Math.SQRT2;
          drawRotatedRect(ox2, oy2, w, h, -135);
          drawRotatedRect(ox2 + th/Math.SQRT2, oy2 - th/Math.SQRT2, w, h, -135);
        }
      }
      return { w: step*2, h: step*2, paths };
    }
  },
  {
    id: 'triple_herringbone',
    name: 'Triple Herringbone',
    category: 'Parquet',
    controlsType: 'rectangular',
    iconUrl: '/patterns/herringbone.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 300, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const step = (tw * 2 + 2*th)/Math.SQRT2;
      return `*TripleHerringbone_${w}x${h}_J${j}, Triple Espiga\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `45, 0,0, 0,${step}, ${w},${-(w+3*th)}\n` +
             `45, ${th/Math.SQRT2},${-th/Math.SQRT2}, 0,${step}, ${w},${-(w+3*th)}\n` +
             `45, ${2*th/Math.SQRT2},${-2*th/Math.SQRT2}, 0,${step}, ${w},${-(w+3*th)}\n` +
             `135, ${2*th/Math.SQRT2},${2*th/Math.SQRT2}, 0,${step}, ${w},${-(w+3*th)}\n` +
             `135, ${th/Math.SQRT2},${3*th/Math.SQRT2}, 0,${step}, ${w},${-(w+3*th)}\n` +
             `135, 0,${4*th/Math.SQRT2}, 0,${step}, ${w},${-(w+3*th)}\n` +
             `135, ${tw/Math.SQRT2},${tw/Math.SQRT2}, 0,${step}, ${h},${-(w+3*th-h)}\n` +
             `135, ${(tw+th)/Math.SQRT2},${(tw-th)/Math.SQRT2}, 0,${step}, ${h},${-(w+3*th-h)}\n` +
             `135, ${(tw+2*th)/Math.SQRT2},${(tw-2*th)/Math.SQRT2}, 0,${step}, ${h},${-(w+3*th-h)}\n` +
             `45, ${-(tw-2*th)/Math.SQRT2},${(tw+2*th)/Math.SQRT2}, 0,${step}, ${h},${-(w+3*th-h)}\n` +
             `45, ${-(tw-th)/Math.SQRT2},${(tw+3*th)/Math.SQRT2}, 0,${step}, ${h},${-(w+3*th-h)}\n` +
             `45, ${-tw/Math.SQRT2},${(tw+4*th)/Math.SQRT2}, 0,${step}, ${h},${-(w+3*th-h)}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 300;
      const h = params.height || 100;
      const j = params.joint || 0;
      const tw = w + j;
      const th = h + j;
      const step = (tw * 2 + 2*th)/Math.SQRT2;
      let paths = '';
      const drawRotatedRect = (x, y, bw, bh, angle) => {
        paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" transform="rotate(${angle} ${x} ${y})" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      };
      for(let r=-2; r<5; r++) {
        for(let c=-2; c<5; c++) {
          let ox = (c + r) * step;
          let oy = (r - c) * step;
          drawRotatedRect(ox, oy, w, h, -45);
          drawRotatedRect(ox + th/Math.SQRT2, oy + th/Math.SQRT2, w, h, -45);
          drawRotatedRect(ox + 2*th/Math.SQRT2, oy + 2*th/Math.SQRT2, w, h, -45);
          
          let ox2 = ox + (tw+2*th)/Math.SQRT2;
          let oy2 = oy + (tw-2*th)/Math.SQRT2;
          drawRotatedRect(ox2, oy2, w, h, -135);
          drawRotatedRect(ox2 + th/Math.SQRT2, oy2 - th/Math.SQRT2, w, h, -135);
          drawRotatedRect(ox2 + 2*th/Math.SQRT2, oy2 - 2*th/Math.SQRT2, w, h, -135);
        }
      }
      return { w: step*2, h: step*2, paths };
    }
  },
  {
    id: 'diamond',
    name: 'Diamond Grid',
    category: 'Geometric',
    controlsType: 'lines',
    iconUrl: '/patterns/cubic.svg',
    controls: ['spacing'],
    defaults: { spacing: 100, rows: 4, columns: 4 },
    generatePat: (s) => {
      return `*Diamond_${s}, Rombo a 45 grados\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `45, 0,0, 0,${s}\n` +
             `135, 0,0, 0,${s}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.spacing || 100;
      let paths = '';
      const w = s * Math.SQRT2;
      for(let i=0; i<=4; i++) {
        paths += `<line x1="${i*w}" y1="0" x2="${i*w + 4*w}" y2="${4*w}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
        paths += `<line x1="0" y1="${i*w}" x2="${4*w}" y2="${i*w + 4*w}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
        paths += `<line x1="${i*w}" y1="${4*w}" x2="${i*w + 4*w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
        paths += `<line x1="0" y1="${4*w - i*w}" x2="${4*w}" y2="${-i*w}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      }
      return { w: 2*w, h: 2*w, paths };
    }
  },
  {
    id: 'triangle',
    name: 'Triangle Grid',
    category: 'Geometric',
    controlsType: 'cubic',
    iconUrl: '/patterns/hexagonal.svg',
    controls: ['size'],
    defaults: { size: 100, rows: 4, columns: 4 },
    generatePat: (s) => {
      const h = s * Math.sqrt(3) / 2;
      return `*Triangle_${s}, Triangulos equiláteros\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `0, 0,0, 0,${h}\n` +
             `60, 0,0, 0,${h}\n` +
             `120, 0,0, 0,${h}\n`;
    },
    generateSvgRenderer: (params) => {
      const s = params.size || 100;
      const h = s * Math.sqrt(3) / 2;
      let paths = '';
      for(let i=0; i<=10; i++) {
        paths += `<line x1="0" y1="${i*h}" x2="${10*s}" y2="${i*h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
        paths += `<line x1="${i*s}" y1="0" x2="${i*s + 10*h/Math.sqrt(3)}" y2="${10*h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
        paths += `<line x1="${i*s}" y1="0" x2="${i*s - 10*h/Math.sqrt(3)}" y2="${10*h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
        paths += `<line x1="${-i*s}" y1="0" x2="${-i*s + 10*h/Math.sqrt(3)}" y2="${10*h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
        paths += `<line x1="${10*s - i*s}" y1="0" x2="${10*s - i*s - 10*h/Math.sqrt(3)}" y2="${10*h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      }
      return { w: 3*s, h: 3*h, paths };
    }
  },
  {
    id: 'windmill',
    name: 'Windmill Pattern',
    category: 'Parquet',
    controlsType: 'rectangular',
    iconUrl: '/patterns/basketweave.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 200, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const W = tw + th;
      return `*Windmill_${w}x${h}_J${j}, Molino de Viento\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `; Horizontales largas\n` +
             `0, 0,0, 0,${W}, ${w},${-(W-w)}\n` +
             `0, ${tw},${th}, 0,${W}, ${w},${-(W-w)}\n` +
             `; Horizontales cortas\n` +
             `0, 0,${h}, 0,${W}, ${w},${-(W-w)}\n` +
             `0, ${tw},${th+h}, 0,${W}, ${w},${-(W-w)}\n` +
             `; Verticales largas\n` +
             `90, ${tw},0, 0,${W}, ${w},${-(W-w)}\n` +
             `90, ${tw+th},${tw}, 0,${W}, ${w},${-(W-w)}\n` +
             `; Verticales cortas\n` +
             `90, ${tw-h},0, 0,${W}, ${w},${-(W-w)}\n` +
             `90, ${tw+th-h},${tw}, 0,${W}, ${w},${-(W-w)}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 200;
      const h = params.height || 100;
      const j = params.joint || 0;
      const tw = w + j;
      const th = h + j;
      const W = tw + th;
      let paths = '';
      const drawRect = (x, y, bw, bh) => {
        paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      };
      for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
          let ox = c * W;
          let oy = r * W;
          drawRect(ox, oy, w, h);
          drawRect(ox + tw, oy, h, w);
          drawRect(ox + th, oy + tw, w, h);
          drawRect(ox, oy + th, h, w);
        }
      }
      return { w: W, h: W, paths };
    }
  },
  {
    id: 'hopscotch',
    name: 'Hopscotch',
    category: 'Parquet',
    controlsType: 'rectangular',
    iconUrl: '/patterns/basketweave.svg',
    controls: ['width', 'height', 'joint'],
    defaults: { width: 200, height: 100, joint: 0, rows: 4, columns: 4 },
    generatePat: (w, h, j) => {
      const tw = w + j;
      const th = h + j;
      const W = tw + th;
      return `*Hopscotch_${w}x${h}_J${j}, Rayuela\n` +
             `; Generado por LispCentral Hatch Builder\n` +
             `0, 0,0, 0,${W}, ${w},${-th}\n` +
             `0, 0,${w}, 0,${W}, ${w},${-th}\n` +
             `0, ${tw},${tw}, 0,${W}, ${h},${-tw}\n` +
             `0, ${tw},${tw+h}, 0,${W}, ${h},${-tw}\n` +
             `90, 0,0, 0,${W}, ${w},${-th}\n` +
             `90, ${w},0, 0,${W}, ${w},${-th}\n` +
             `90, ${tw},${tw}, 0,${W}, ${h},${-tw}\n` +
             `90, ${tw+h},${tw}, 0,${W}, ${h},${-tw}\n`;
    },
    generateSvgRenderer: (params) => {
      const w = params.width || 200;
      const h = params.height || 100;
      const j = params.joint || 0;
      const tw = w + j;
      const th = h + j;
      const W = tw + th;
      let paths = '';
      const drawRect = (x, y, bw, bh) => {
        paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      };
      for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
          let ox = c * W;
          let oy = r * W;
          drawRect(ox, oy, w, w);
          drawRect(ox + tw, oy + tw, h, h);
        }
      }
      return { w: W, h: W, paths };
    }
  }
];

export const ARCHETYPE_DESCRIPTIONS = {
  line: 'Líneas paralelas simples con espaciado uniforme.',
  net: 'Rejilla ortogonal de cuadros perfectos.',
  weave: 'Cinta entrelazada simulando un tejido tradicional.',
  chevron: 'Patrón de zig-zag continuo, ideal para pisos y parquets.',
  common: 'Aparejo común: 5 hiladas en soga (largo) por 1 hilada en tizón (ancho).',
  cubic: 'Cuadrícula base.',
  cubic3d: 'Patrón de cubos isométricos 3D apilados.',
  flemish: 'Aparejo flamenco: alterna soga y tizón en la misma hilada.',
  herringbone: 'Aparejo en espiga o hueso de pez a 45 grados.',
  stack: 'Aparejo apilado, las juntas coinciden perfectamente alineadas.',
  stretcher: 'Aparejo en soga tradicional desfasado a la mitad.',
  english_bond: 'Aparejo inglés: alterna una hilada completa de soga con una completa de tizón.',
  '13_running_bond': 'Ladrillos en soga desfasados un tercio (1/3) de su longitud.',
  '14_running_bond': 'Ladrillos en soga desfasados un cuarto (1/4) de su longitud.',
  double_stretcher: 'Dos hiladas de sogas alineadas, seguidas de dos hiladas desfasadas a la mitad.',
  triple_stretcher: 'Tres hiladas de sogas alineadas, seguidas de tres hiladas desfasadas a la mitad.',
  monk_bond: 'Aparejo de los monjes: alterna dos sogas y un tizón por cada hilada. Se usaba mucho en iglesias medievales.',
  silesian_bond: 'Aparejo silesiano: alterna tres sogas y un tizón por hilada.',
  basketweave: 'Patrón de cesta o trenzado de pares de ladrillos ortogonales.',
  hexagonal: 'Mosaico de panal de abejas. Formado por hexágonos regulares perfectos.',
  octagon_square: 'Clásico mosaico victoriano: octágonos regulares conectados por pequeños cuadrados insertados.',
  double_flemish: 'Aparejo flamenco doble: alterna dos sogas y un tizón centrando este último sobre las sogas.',
  triple_flemish: 'Aparejo flamenco triple: alterna tres sogas y un tizón.',
  gothic_bond: 'Aparejo gótico: alterna soga y tizón en cada hilada con un desfase particular.',
  english_cross_bond: 'Aparejo cruzado inglés: filas puras de soga y tizón, alternadas, con desfase en las sogas.',
  double_herringbone: 'Doble espiga a 45 grados: bloques de dos ladrillos colocados en zigzag.',
  triple_herringbone: 'Triple espiga a 45 grados: bloques de tres ladrillos colocados en zigzag.',
  diamond: 'Retícula de rombos continuos formados por líneas cruzadas a 45 grados.',
  triangle: 'Triángulos equiláteros perfectos mediante grilla tricruzada.',
  windmill: 'Parquet de molino de viento: cuatro ladrillos rectangulares rotando sobre un cuadrado central.',
  hopscotch: 'Rayuela: patrón combinando un cuadrado grande y uno pequeño en una cuadrícula continua.',
};

export const generatePatternName = (archetype, w, h, j) => {
  const hasJoint = archetype.controls.includes('joint') && j > 0;
  if (archetype.controlsType === 'cubic' || archetype.controlsType === 'lines') {
    if (hasJoint) return `${archetype.id}_${w}_j${j}`;
    return `${archetype.id}_${w}`;
  }
  if (hasJoint) return `${archetype.id}_${w}x${h}_j${j}`;
  return `${archetype.id}_${w}x${h}`;
};
