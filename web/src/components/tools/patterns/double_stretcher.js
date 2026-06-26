export const arch_double_stretcher = {
  id: 'double_stretcher',
  name: 'Double Stretcher',
  categories: ["Brick Bond","Geometric"],
  controlsType: 'rectangular',
  iconUrl: '/patterns/double_stretcher.svg',
  controls: ['width', 'height', 'joint'],
  defaults: {
    width: 400,
    height: 100,
    joint: 10,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Double Stretcher',
      description: 'Patrón de mampostería tipo Double Stretcher. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Double Stretcher',
      description: 'Masonry pattern type Double Stretcher. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Double Stretcher',
      description: 'Padrão de alvenaria tipo Double Stretcher. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    const w = params.width || 400;
    const h = params.height || 100;
    const j = params.joint || 10;
    
    const tw = w + j;
    const th = h + j;
    const halfTw = tw / 2;
    const totalH = th * 4;
    
    const paths = `
      <line x1="0" y1="0" x2="${tw}" y2="0" />
      <line x1="0" y1="${th}" x2="${tw}" y2="${th}" />
      <line x1="0" y1="${th * 2}" x2="${tw}" y2="${th * 2}" />
      <line x1="0" y1="${th * 3}" x2="${tw}" y2="${th * 3}" />
      <line x1="0" y1="${totalH}" x2="${tw}" y2="${totalH}" />
      
      <line x1="0" y1="0" x2="0" y2="${th * 2}" />
      <line x1="${tw}" y1="0" x2="${tw}" y2="${th * 2}" />
      
      <line x1="${halfTw}" y1="${th * 2}" x2="${halfTw}" y2="${totalH}" />
    `;
    
    return {
      w: tw,
      h: totalH,
      paths: paths,
      baseUnit: Math.max(tw, th)
    };
  }
};
