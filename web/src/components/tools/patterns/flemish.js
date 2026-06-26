export const arch_flemish = {
  id: 'flemish',
  name: 'Flemish',
  categories: ["Geometric","Paving","Brick Bond"],
  controlsType: 'rectangular',
  iconUrl: '/patterns/flemish.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 450,
    height: 200,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Flemish',
      description: 'Aparejo Flamenco. Alterna soga y tizón en la misma hilada.'
    },
    en: {
      name: 'Flemish',
      description: 'Flemish bond. Alternates stretcher and header in the same course.'
    },
    pt: {
      name: 'Flemish',
      description: 'Aparelho Flamengo. Alterna tijolos compridos e curtos na mesma fiada.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    const w = params.width || 200;
    const h = params.height || 100;
    const j = params.joint || 0;
    
    const tw = w + j;
    const th = h + j;
    const hw = w / 2 + j;
    const stepX = tw + hw;
    
    const paths = `
      <line x1="0" y1="0" x2="${stepX}" y2="0" />
      <line x1="0" y1="${th}" x2="${stepX}" y2="${th}" />
      <line x1="0" y1="${th * 2}" x2="${stepX}" y2="${th * 2}" />
      
      <line x1="0" y1="0" x2="0" y2="${th}" />
      <line x1="${tw}" y1="0" x2="${tw}" y2="${th}" />
      <line x1="${stepX}" y1="0" x2="${stepX}" y2="${th}" />
      
      <line x1="${tw / 2 - hw / 2}" y1="${th}" x2="${tw / 2 - hw / 2}" y2="${th * 2}" />
      <line x1="${tw / 2 + hw / 2}" y1="${th}" x2="${tw / 2 + hw / 2}" y2="${th * 2}" />
    `;
    
    return {
      w: stepX,
      h: th * 2,
      paths: paths,
      baseUnit: Math.max(w, h)
    };
  }
};
