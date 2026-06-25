import { generateSvgPathsFromPat } from '../../../utils/PatToSvgRenderer.js';

export const arch_chevron = {
  id: 'chevron',
  name: 'Chevron',
  categories: ["Paving","Geometric","Parquetry"],
  controlsType: 'rectangular',
  iconUrl: '/patterns/chevron.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 420,
    height: 200,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Chevron',
      description: 'Patrón de pavimento o suelo tipo Chevron. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Chevron',
      description: 'Paving or flooring pattern type Chevron. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Chevron',
      description: 'Padrão de pavimento ou piso tipo Chevron. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    
    const w = params.width || 420;
    const h = params.height || 200;
    
    const tw = w;
    const th = h;
    const angleRad = Math.atan2(th, tw);
    const angle = angleRad * (180 / Math.PI);
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const dX = th * sinA;
    const dY = th * cosA;
    const dash = w / cosA;
    const space = -(2 * tw - w) / cosA;
    const yPeak = h;
    
    const patCode = `*Chevron_${w}x${h}, Parametric
${angle}, 0,0, ${dX},${dY}, ${dash},${space}
-${angle}, ${tw},${yPeak}, ${-dX},${dY}, ${dash},${space}
90, 0,0, 0,${tw}
90, ${w},0, 0,${tw}`;

    const paths = generateSvgPathsFromPat(patCode, tw * 2, th);
    
    return {
      w: tw * 2,
      h: th,
      paths: paths,
      baseUnit: Math.max(tw, th)
    };
  }
};
