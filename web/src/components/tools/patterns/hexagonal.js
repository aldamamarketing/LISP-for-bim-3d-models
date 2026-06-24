export const hexagonal = {
  id: 'hexagonal',
  name: 'Hexagonal',
  category: 'Geometric',
  controlsType: 'cubic',
  iconUrl: '/patterns/hexagonal.svg',
  controls: ['size', 'joint'],
  defaults: {
    size: 100,
    joint: 0,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const s = params.size || 100;
    const H = s * Math.sqrt(3);
    const h = H / 2;
    const totalW = 3 * s;
    const totalH = H;
    const hex = (cx, cy) => {
      return `<path d="M ${cx + s},${cy} L ${cx + s / 2},${cy + h} L ${cx - s / 2},${cy + h} L ${cx - s},${cy} L ${cx - s / 2},${cy - h} L ${cx + s / 2},${cy - h} Z" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\\n`;
    };
    let paths = hex(0, 0) + hex(1.5 * s, h) + hex(3 * s, 0) + hex(0, 2 * h) + hex(3 * s, 2 * h);
    return {
      w: totalW,
      h: totalH,
      paths
    };
  }
};
