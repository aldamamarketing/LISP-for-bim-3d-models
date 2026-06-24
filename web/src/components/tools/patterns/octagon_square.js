export const octagon_square = {
  id: 'octagon_square',
  name: 'Octagon & Square',
  category: 'Geometric',
  controlsType: 'cubic',
  iconUrl: '/patterns/octagon_square.svg',
  controls: ['size', 'joint'],
  defaults: {
    size: 100,
    joint: 0,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const s = params.size || 100;
    const a = s / Math.SQRT2;
    const W = s + 2 * a;
    let paths = `
        <line x1="${a}" y1="0" x2="${a + s}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${a}" y1="${W}" x2="${a + s}" y2="${W}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${a}" x2="0" y2="${a + s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${W}" y1="${a}" x2="${W}" y2="${a + s}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${a + s}" y1="0" x2="${W}" y2="${a}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${a + s}" x2="${a}" y2="${W}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${a}" y1="0" x2="0" y2="${a}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${W}" y1="${a + s}" x2="${a + s}" y2="${W}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    return {
      w: W,
      h: W,
      paths
    };
  }
};
