export const diamond = {
  id: 'diamond',
  name: 'Diamond Grid',
  category: 'Geometric',
  controlsType: 'lines',
  iconUrl: '/patterns/cubic.svg',
  controls: ['spacing'],
  defaults: {
    spacing: 100,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const s = params.spacing || 100;
    let paths = '';
    const w = s * Math.SQRT2;
    for (let i = 0; i <= 4; i++) {
      paths += `<line x1="${i * w}" y1="0" x2="${i * w + 4 * w}" y2="${4 * w}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      paths += `<line x1="0" y1="${i * w}" x2="${4 * w}" y2="${i * w + 4 * w}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      paths += `<line x1="${i * w}" y1="${4 * w}" x2="${i * w + 4 * w}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      paths += `<line x1="0" y1="${4 * w - i * w}" x2="${4 * w}" y2="${-i * w}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
    }
    return {
      w: 2 * w,
      h: 2 * w,
      paths
    };
  }
};
