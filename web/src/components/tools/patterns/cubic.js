export const cubic = {
  id: 'cubic',
  name: 'Cubic',
  category: 'Geometric',
  controlsType: 'rectangular',
  iconUrl: '/patterns/cubic.svg',
  controls: ['size', 'joint'],
  defaults: {
    size: 200,
    joint: 0,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const s = params.size || 200;
    const paths = `
        <line x1="0" y1="0" x2="${s}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${s}" x2="${s}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="0" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${s}" y1="0" x2="${s}" y2="${s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w: s,
      h: s,
      paths
    };
  }
};
