export const arch_diamond = {
  id: 'diamond',
  name: 'Diamond',
  categories: ["Geometric","Paving","Roofing"],
  controlsType: 'cubic',
  iconUrl: '/patterns/diamond.svg',
  controls: ['size'],
  defaults: {
    width: 600,
    height: 600,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Diamond',
      description: 'Patrón de cubierta. Uso recomendado en planta de techos arquitectónicos.'
    },
    en: {
      name: 'Diamond',
      description: 'Roofing pattern. Recommended for architectural roof plan views.'
    },
    pt: {
      name: 'Diamond',
      description: 'Padrão de cobertura. Uso recomendado em plantas de telhados arquitetônicos.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    // For diamond, we use 'width' as 's' (spacing between parallel lines)
    const s = params.width || 600;
    const j = params.joint || 0;
    
    const ts = s + j;
    const D = ts * Math.SQRT2; // Diagonal of the diamond
    
    const paths = `
      <line x1="${D / 2}" y1="0" x2="${D}" y2="${D / 2}" />
      <line x1="${D}" y1="${D / 2}" x2="${D / 2}" y2="${D}" />
      <line x1="${D / 2}" y1="${D}" x2="0" y2="${D / 2}" />
      <line x1="0" y1="${D / 2}" x2="${D / 2}" y2="0" />
    `;
    
    return {
      w: D,
      h: D,
      paths: paths,
      baseUnit: D
    };
  }
};
