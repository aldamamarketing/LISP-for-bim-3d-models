export const net = {
  id: 'net',
  name: 'Net (Rejilla)',
  category: 'Geometric',
  controlsType: 'lines',
  iconUrl: '/patterns/net.svg',
  controls: ['spacing'],
  defaults: {
    spacing: 200,
    angle: 0,
    rows: 3,
    columns: 3
  },
  generateSvgRenderer: params => {
    const s = params.spacing || 200;
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
