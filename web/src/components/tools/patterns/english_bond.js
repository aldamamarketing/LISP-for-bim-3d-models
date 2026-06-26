export const arch_english_bond = {
  id: 'english_bond',
  name: 'English Bond',
  categories: ["Brick Bond"],
  controlsType: 'rectangular',
  iconUrl: '/patterns/english_bond.svg',
  controls: ['width', 'height', 'joint'],
  defaults: {
    width: 2000,
    height: 1000,
    joint: 10,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'English Bond',
      description: 'Patrón de mampostería tipo English Bond. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'English Bond',
      description: 'Masonry pattern type English Bond. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'English Bond',
      description: 'Padrão de alvenaria tipo English Bond. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    const w = params.width || 215;
    const h = params.height || 65;
    const j = params.joint || 10;
    
    const tw = w + j;
    const th = h + j;
    const qTw = tw / 4;
    const halfTw = tw / 2;
    
    const paths = `
      <line x1="0" y1="0" x2="${tw}" y2="0" />
      <line x1="0" y1="${th}" x2="${tw}" y2="${th}" />
      <line x1="0" y1="${th * 2}" x2="${tw}" y2="${th * 2}" />
      <line x1="0" y1="0" x2="0" y2="${th}" />
      <line x1="${tw}" y1="0" x2="${tw}" y2="${th}" />
      <line x1="${qTw}" y1="${th}" x2="${qTw}" y2="${th * 2}" />
      <line x1="${qTw + halfTw}" y1="${th}" x2="${qTw + halfTw}" y2="${th * 2}" />
    `;
    
    return {
      w: tw,
      h: th * 2,
      paths: paths,
      baseUnit: Math.max(tw, th)
    };
  }
};
