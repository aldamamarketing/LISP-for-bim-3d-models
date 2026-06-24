export const stretcher = {
  id: 'stretcher',
  name: 'Stretcher',
  category: 'Brick Bond',
  controlsType: 'rectangular',
  iconUrl: '/patterns/stretcher.svg',
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
    const th = h * 2;
    const hw = w / 2;
    const paths = `
        <!-- Horizontales -->
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- Verticales bordes (Fila 1) -->
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <!-- Vertical centro (Fila 2) -->
        <line x1="${hw}" y1="${h}" x2="${hw}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w,
      h: th,
      paths
    };
  }
};
