export const monk_bond = {
  id: 'monk_bond',
  name: 'Monk Bond',
  category: 'Brick Bond',
  controlsType: 'rectangular',
  iconUrl: '/patterns/monk_bond.svg',
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
    const totalW = w * 2.5;
    const totalH = h * 2;
    const shift = totalW / 2;
    let paths = `
        <line x1="0" y1="0" x2="${totalW}" y2="0" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${h}" x2="${totalW}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="0" y1="${totalH}" x2="${totalW}" y2="${totalH}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        
        <line x1="0" y1="0" x2="0" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w}" y1="0" x2="${w}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${w * 2}" y1="0" x2="${w * 2}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1="${totalW}" y1="0" x2="${totalW}" y2="${h}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />
      `;
    let vs = [shift, shift + w, shift + w * 2].map(v => v % totalW);
    vs.forEach(v => {
      paths += `<line x1="${v}" y1="${h}" x2="${v}" y2="${totalH}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
    });
    return {
      w: totalW,
      h: totalH,
      paths
    };
  }
};
