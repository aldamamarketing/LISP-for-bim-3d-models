export const arch_stack = {
  id: 'stack',
  name: 'Stack',
  categories: ["Brick Bond","Paving","Geometric","Roofing"],
  controlsType: 'rectangular',
  iconUrl: '/patterns/stack.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 200,
    height: 200,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Stack',
      description: 'Patrón de mampostería tipo Stack. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Stack',
      description: 'Masonry pattern type Stack. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Stack',
      description: 'Padrão de alvenaria tipo Stack. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    const w = params.width || 200;
    const h = params.height || 200;
    const j = params.joint || 0;
    
    const tw = w + j;
    const th = h + j;
    
    // Matemática pura (traducida a etiquetas <line>)
    // Patrón original:
    // 0, 0,0, 0,th
    // 90, 0,0, 0,tw
    
    const paths = `
      <line x1="0" y1="0" x2="${w}" y2="0" />
      <line x1="0" y1="${h}" x2="${w}" y2="${h}" />
      <line x1="0" y1="0" x2="0" y2="${h}" />
      <line x1="${w}" y1="0" x2="${w}" y2="${h}" />
    `;
    
    return {
      w: tw,
      h: th,
      paths: paths,
      baseUnit: Math.max(tw, th)
    };
  }
};
