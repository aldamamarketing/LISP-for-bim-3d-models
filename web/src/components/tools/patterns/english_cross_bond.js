export const english_cross_bond = {
  id: 'english_cross_bond',
  name: 'English Cross Bond',
  category: 'Brick',
  controlsType: 'rectangular',
  iconUrl: '/patterns/stretcher.svg',
  controls: ['width', 'height', 'joint'],
  defaults: {
    width: 200,
    height: 100,
    joint: 0,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const w = params.width || 200;
    const h = params.height || 100;
    const j = params.joint || 0;
    const tw = w + j;
    const th = h + j;
    let paths = '';
    const drawBrick = (x, y, bw, bh) => {
      paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
    };
    for (let r = 0; r < 8; r++) {
      let y = r * th;
      let isStretcher = r % 2 === 0;
      let isShifted = r % 4 === 2;
      let startX = isShifted ? 0.5 * tw : 0;
      let numBricks = isStretcher ? 5 : 10;
      let bw = isStretcher ? w : w / 2;
      let sw = isStretcher ? tw : tw / 2;
      for (let c = -2; c < numBricks; c++) {
        let x = startX + c * sw;
        drawBrick(x, y, bw, h);
      }
    }
    return {
      w: tw,
      h: th * 4,
      paths
    };
  }
};
