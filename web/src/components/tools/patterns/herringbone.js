export const arch_herringbone = {
  id: 'herringbone',
  name: 'Herringbone',
  categories: ["Geometric","Paving","Brick Bond","Parquetry"],
  controlsType: 'rectangular',
  iconUrl: '/patterns/herringbone.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 410,
    height: 260,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Herringbone',
      description: 'Patrón Espina de Pez.'
    },
    en: {
      name: 'Herringbone',
      description: 'Herringbone pattern.'
    },
    pt: {
      name: 'Herringbone',
      description: 'Padrão Espinha de Peixe.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    const w = params.width || 260;
    const h = params.height || 50;
    const j = params.joint || 0;
    
    const tw = w + j;
    const th = h + j;
    const S = tw + th;
    
    // Las líneas de Herringbone en un bloque inclinado
    // Usamos el vector (th, th) para el ancho y (tw, -tw) para el largo (simulando 45 grados)
    let paths = '';
    
    // Para simplificar el rendering paramétrico de un herringbone continuo en un tile S x S
    // S = tw + th. El patrón es un cuadrado inclinado. 
    // Trazamos las diagonales a lo largo de un grid mayor y lo dejamos recortar por el viewBox
    const numLines = 6;
    for(let i = -numLines; i <= numLines; i++) {
        const offset = i * th;
        // Líneas en dirección / (Pendiente 1)
        paths += `<line x1="${-S*2}" y1="${-S*2 + offset}" x2="${S*2}" y2="${S*2 + offset}" />`;
        // Líneas en dirección \ (Pendiente -1), desfasadas para hacer el zig zag (ladrillos)
        // Para formar los cortes del hueso de pez a lo largo de las maestras:
        // Las juntas cortas van cruzando las líneas largas a distancias tw
    }

    // Mejor, usando el patrón explícito de 4 segmentos del herringbone tradicional 
    // en un bloque unitario, trasladado en X e Y
    paths = '';
    const baseLines = [
      {x1: 0, y1: th, x2: tw, y2: th + tw}, // Lado largo
      {x1: tw, y1: th + tw, x2: S, y2: tw}, // Lado corto
      {x1: S, y1: tw, x2: th, y2: 0}, // Lado largo
      {x1: th, y1: 0, x2: 0, y2: th} // Lado corto
    ];

    for (let i = -2; i <= 2; i++) {
      for (let k = -2; k <= 2; k++) {
        const dx = i * S;
        const dy = k * S;
        baseLines.forEach(l => {
          paths += `<line x1="${l.x1 + dx}" y1="${l.y1 + dy}" x2="${l.x2 + dx}" y2="${l.y2 + dy}" />`;
        });
        
        // El Herringbone necesita 2 "huesos" por bloque lógico S x S
        // Añadimos el hueso secundario (desfasado al centro del bloque)
        const dx2 = dx + S/2;
        const dy2 = dy + S/2;
        baseLines.forEach(l => {
          paths += `<line x1="${l.x1 + dx2}" y1="${l.y1 + dy2}" x2="${l.x2 + dx2}" y2="${l.y2 + dy2}" />`;
        });
      }
    }
    
    return {
      w: S,
      h: S,
      logicalCols: 1,
      logicalRows: 1,
      paths: paths,
      baseUnit: S
    };
  }
};
