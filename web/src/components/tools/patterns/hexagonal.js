export const arch_hexagonal = {
  id: 'hexagonal',
  name: 'Hexagonal',
  categories: ["Roofing","Geometric","Paving"],
  controlsType: 'cubic',
  iconUrl: '/patterns/hexagonal.svg',
  controls: ['size', 'joint'],
  defaults: {
    width: 346,
    height: 346,
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: 'Hexagonal',
      description: 'Patrón de cubierta. Uso recomendado en planta de techos arquitectónicos.'
    },
    en: {
      name: 'Hexagonal',
      description: 'Roofing pattern. Recommended for architectural roof plan views.'
    },
    pt: {
      name: 'Hexagonal',
      description: 'Padrão de cobertura. Uso recomendado em plantas de telhados arquitetônicos.'
    }
  },
  hasBackendEngine: true,
  generateSvgRenderer: (params) => {
    // For hexagonal, we use 'width' as the side length 's' of the hexagon
    const s = params.width || 346;
    const j = params.joint || 0;
    
    // Add joint spacing conceptually if needed, but standard is s + j
    const ts = s + j;
    
    const H = ts * Math.sqrt(3);
    const W = 3 * ts;
    
    const paths = `
      <!-- Horizontal top and bottom of the central hexagon -->
      <line x1="${ts}" y1="0" x2="${2 * ts}" y2="0" />
      <line x1="${ts}" y1="${H}" x2="${2 * ts}" y2="${H}" />
      
      <!-- Slanted sides of the central hexagon -->
      <line x1="${ts}" y1="0" x2="${0.5 * ts}" y2="${H / 2}" />
      <line x1="${2 * ts}" y1="0" x2="${2.5 * ts}" y2="${H / 2}" />
      <line x1="${ts}" y1="${H}" x2="${0.5 * ts}" y2="${H / 2}" />
      <line x1="${2 * ts}" y1="${H}" x2="${2.5 * ts}" y2="${H / 2}" />
      
      <!-- Horizontal connections to adjacent hexagons -->
      <line x1="0" y1="${H / 2}" x2="${0.5 * ts}" y2="${H / 2}" />
      <line x1="${2.5 * ts}" y1="${H / 2}" x2="${W}" y2="${H / 2}" />
    `;
    
    return {
      w: W,
      h: H,
      paths: paths,
      baseUnit: ts
    };
  }
};
