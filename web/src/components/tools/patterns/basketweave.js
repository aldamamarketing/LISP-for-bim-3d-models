export const basketweave = {
  id: 'basketweave',
  name: 'Basketweave',
  category: 'Parquetry',
  controlsType: 'cubic',
  iconUrl: '/patterns/basketweave.svg',
  controls: ['size', 'joint'],
  defaults: {
    size: 200,
    joint: 0,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const s = params.size || 200;
    const ts = s * 2;
    const hs = s / 2;
    const paths = `
        <!-- Grilla Principal -->
        <line x1="0" y1="0" x2="${ts}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${s}" x2="${ts}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${ts}" x2="${ts}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="0" y1="0" x2="0" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${s}" y1="0" x2="${s}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${ts}" y1="0" x2="${ts}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Bloque 1 (Arriba Izq) -->
        <line x1="${hs}" y1="0" x2="${hs}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- Bloque 4 (Abajo Der) -->
        <line x1="${s + hs}" y1="${s}" x2="${s + hs}" y2="${ts}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Bloque 2 (Arriba Der) -->
        <line x1="${s}" y1="${hs}" x2="${ts}" y2="${hs}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- Bloque 3 (Abajo Izq) -->
        <line x1="0" y1="${s + hs}" x2="${s}" y2="${s + hs}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w: ts,
      h: ts,
      paths
    };
  }
};
