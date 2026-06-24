export const common = {
  id: 'common',
  name: 'Common',
  category: 'Brick Bond',
  controlsType: 'rectangular',
  iconUrl: '/patterns/common.svg',
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
    const th = h * 6;
    const hw = w / 2;
    let paths = `
        <!-- Horizontales -->
        <line x1="0" y1="0" x2="${w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h * 2}" x2="${w}" y2="${h * 2}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h * 3}" x2="${w}" y2="${h * 3}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h * 4}" x2="${w}" y2="${h * 4}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h * 5}" x2="${w}" y2="${h * 5}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${th}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    for (let i = 0; i < 5; i++) {
      let offsetX = i % 2 !== 0 ? hw : 0;
      paths += `
        <line x1="${offsetX}" y1="${i * h}" x2="${offsetX}" y2="${(i + 1) * h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${offsetX === 0 ? w : 0}" y1="${i * h}" x2="${offsetX === 0 ? w : 0}" y2="${(i + 1) * h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />`;
    }
    paths += `
        <line x1="0" y1="${5 * h}" x2="0" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${hw / 2}" y1="${5 * h}" x2="${hw / 2}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${hw}" y1="${5 * h}" x2="${hw}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${hw + hw / 2}" y1="${5 * h}" x2="${hw + hw / 2}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="${5 * h}" x2="${w}" y2="${th}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w,
      h: th,
      paths
    };
  }
};
