export const triangle = {
  id: 'triangle',
  name: 'Triangle Grid',
  category: 'Geometric',
  controlsType: 'cubic',
  iconUrl: '/patterns/hexagonal.svg',
  controls: ['size'],
  defaults: {
    size: 100,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const s = params.size || 100;
    const h = s * Math.sqrt(3) / 2;
    let paths = '';
    for (let i = 0; i <= 10; i++) {
      paths += `<line x1="0" y1="${i * h}" x2="${10 * s}" y2="${i * h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      paths += `<line x1="${i * s}" y1="0" x2="${i * s + 10 * h / Math.sqrt(3)}" y2="${10 * h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      paths += `<line x1="${i * s}" y1="0" x2="${i * s - 10 * h / Math.sqrt(3)}" y2="${10 * h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      paths += `<line x1="${-i * s}" y1="0" x2="${-i * s + 10 * h / Math.sqrt(3)}" y2="${10 * h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
      paths += `<line x1="${10 * s - i * s}" y1="0" x2="${10 * s - i * s - 10 * h / Math.sqrt(3)}" y2="${10 * h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
    }
    return {
      w: 3 * s,
      h: 3 * h,
      paths
    };
  }
};
