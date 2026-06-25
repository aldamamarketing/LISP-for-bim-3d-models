import { generateSvgPathsFromPat } from '../../../utils/PatToSvgRenderer.js';

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
    
    const blockW = w + j;
    const blockH = h + j;
    const stepX = (blockW + blockH) / Math.sqrt(2);
    const stepY = stepX;
    
    const patCode = `*Herringbone_${w}x${h}_J${j}, Parametric
45, 0,0, ${stepX},${stepY}, ${w},-${blockH}
135, 0,0, ${stepX},${stepY}, ${w},-${blockH}
45, 0,${h + j}, ${stepX},${stepY}, ${w},-${blockH}
135, ${w + j},0, ${stepX},${stepY}, ${w},-${blockH}`;

    // Orthogonal tile bounds for a 45 degree herringbone is blockW + blockH
    const tileSize = blockW + blockH;
    const paths = generateSvgPathsFromPat(patCode, tileSize, tileSize);
    
    return {
      w: tileSize,
      h: tileSize,
      paths: paths,
      baseUnit: Math.max(w, h)
    };
  }
};
