export const chevron = {
  id: 'chevron',
  name: 'Chevron',
  category: 'Parquetry',
  controlsType: 'rectangular',
  iconUrl: '/patterns/chevron.svg',
  controls: ['width', 'height'],
  defaults: {
    width: 400,
    height: 100,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const w = params.width || 400;
    const h = params.height || 100;
    const yPeak = h;
    const paths = `
        <!-- Diagonales -->
        <line x1="0" y1="0" x2="${w}" y2="${yPeak}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="${yPeak}" x2="${w + w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales (Cortes de las tablas) -->
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w + w}" y1="0" x2="${w + w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w: 2 * w,
      h: h,
      paths
    };
  }
};
