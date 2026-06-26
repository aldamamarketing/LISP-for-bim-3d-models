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
    
    // Generar las 4 líneas base que forman la espina de pez
    const baseLines = [
      {x1: 0, y1: 0, x2: tw, y2: tw},
      {x1: S, y1: 0, x2: th, y2: tw},
      {x1: 0, y1: th, x2: tw, y2: S},
      {x1: tw, y1: 0, x2: 0, y2: tw}
    ];

    let paths = '';
    // Duplicar en una matriz 3x3 para asegurar el teselado perfecto en los bordes del SVG <pattern>
    for (let i = -1; i <= 1; i++) {
      for (let k = -1; k <= 1; k++) {
        const dx = i * S;
        const dy = k * S;
        baseLines.forEach(l => {
          paths += `<line x1="${l.x1 + dx}" y1="${l.y1 + dy}" x2="${l.x2 + dx}" y2="${l.y2 + dy}" />`;
        });
      }
    }
    
    return {
      w: S,
      h: S,
      paths: paths,
      baseUnit: Math.max(w, h)
    };
  }
};
