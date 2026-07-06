export const arch_circular = {
  id: 'circular',
  name: 'Circular',
  categories: ["Paving","Organic"],
  controlsType: 'circular',
  iconUrl: '/patterns/circular.svg',
  controls: ['radius', 'spacing'],
  defaults: {
    radius: 50,
    spacing: 120,
    joint: 0,
    rows: 2,
    columns: 2
  },
  generateSvgRenderer: (params) => {
    const r = params.radius || 50;
    const s = params.spacing || 120;
    
    // El patrón base es un cuadrado de lado = spacing
    // Dibujamos el círculo en el centro
    const paths = `<circle cx="${s/2}" cy="${s/2}" r="${r}" />`;
    
    return {
      w: s,
      h: s,
      logicalCols: 1,
      logicalRows: 1,
      paths: paths,
      baseUnit: s
    };
  },
  hasBackendEngine: true,
  i18n: {
    es: {
      name: 'Circular',
      description: 'Patrón de pavimento o suelo tipo Circular. Ideal para plantas arquitectónicas y revestimientos de piso.'
    },
    en: {
      name: 'Circular',
      description: 'Paving or flooring pattern type Circular. Ideal for architectural floor plans and surface coverings.'
    },
    pt: {
      name: 'Circular',
      description: 'Padrão de pavimento ou piso tipo Circular. Ideal para plantas arquitetônicas e revestimentos de piso.'
    }
  }
};
