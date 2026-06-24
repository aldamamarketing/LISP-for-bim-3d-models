export const flemish = {
  id: 'flemish',
  name: 'Flemish',
  category: 'Brick Bond',
  controlsType: 'rectangular',
  iconUrl: '/patterns/flemish.svg',
  controls: ['width', 'height', 'joint'],
  defaults: {
    width: 400,
    height: 100,
    joint: 0,
    rows: 6,
    columns: 4
  },
  generateSvgRenderer: params => {
    const w = params.width || 400;
    const h = params.height || 100;
    const hw = w / 2;
    const stepX = w + hw;
    const th = h * 2;
    const paths = `
        <!-- Horizontales -->
        <line x1="0" y1="0" x2="${stepX}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${stepX}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${stepX}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales Fila 1 (Stretcher, luego Header) -->
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${stepX}" y1="0" x2="${stepX}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <!-- Verticales Fila 2 (Descentrado por stepX/2 = 0.75w, envuelto) -->
        <line x1="${0.75 * w}" y1="${h}" x2="${0.75 * w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${0.25 * w}" y1="${h}" x2="${0.25 * w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w: stepX,
      h: th,
      paths
    };
  }
};
