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
    
    const paths = `
      <line x1="0" y1="0" x2="${tw}" y2="${th}" />
      <line x1="${tw}" y1="${th}" x2="${tw * 2}" y2="0" />
      <line x1="0" y1="0" x2="0" y2="${th}" />
      <line x1="${tw}" y1="0" x2="${tw}" y2="${th}" />
    `;
    
    return {
      w: tw * 2,
      h: th,
      paths: paths,
      baseUnit: Math.max(tw, th)
    };
  }
};
