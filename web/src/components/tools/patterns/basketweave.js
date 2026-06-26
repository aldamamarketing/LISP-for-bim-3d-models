export const arch_basketweave = {
  id: 'basketweave',
  name: 'Basketweave',
  categories: ["Brick Bond","Paving","Parquetry","Geometric"],
  controlsType: 'cubic',
  iconUrl: '/patterns/basketweave.svg',
  controls: ['size', 'joint'],
  defaults: {
    width: 400,
    height: 400,
    joint: 10,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Basketweave',
      description: 'Patrón de mampostería tipo Basketweave. Ideal en vistas de alzado para fachadas o muros portantes.'
    },
    en: {
      name: 'Basketweave',
      description: 'Masonry pattern type Basketweave. Ideal for elevation views of facades or load-bearing walls.'
    },
    pt: {
      name: 'Basketweave',
      description: 'Padrão de alvenaria tipo Basketweave. Ideal em vistas de elevação para fachadas ou paredes estruturais.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    // Basketweave is square based, usually takes only 'size' parameter.
    // We map width to 's'
    const s = params.width || 400;
    const j = params.joint || 10;
    
    const ts = s + j;
    const tileW = ts * 2;
    const tileH = ts * 2;
    
    const paths = `
      <!-- Grid boundaries -->
      <line x1="0" y1="0" x2="${tileW}" y2="0" />
      <line x1="0" y1="${tileH}" x2="${tileW}" y2="${tileH}" />
      <line x1="0" y1="${ts}" x2="${tileW}" y2="${ts}" />
      
      <line x1="0" y1="0" x2="0" y2="${tileH}" />
      <line x1="${tileW}" y1="0" x2="${tileW}" y2="${tileH}" />
      <line x1="${ts}" y1="0" x2="${ts}" y2="${tileH}" />
      
      <!-- Inner splits -->
      <!-- Vertical in top-left -->
      <line x1="${ts / 2}" y1="0" x2="${ts / 2}" y2="${ts}" />
      <!-- Vertical in bottom-right -->
      <line x1="${ts * 1.5}" y1="${ts}" x2="${ts * 1.5}" y2="${tileH}" />
      
      <!-- Horizontal in top-right -->
      <line x1="${ts}" y1="${ts / 2}" x2="${tileW}" y2="${ts / 2}" />
      <!-- Horizontal in bottom-left -->
      <line x1="0" y1="${ts * 1.5}" x2="${ts}" y2="${ts * 1.5}" />
    `;
    
    return {
      w: tileW,
      h: tileH,
      paths: paths,
      baseUnit: tileW
    };
  }
};
