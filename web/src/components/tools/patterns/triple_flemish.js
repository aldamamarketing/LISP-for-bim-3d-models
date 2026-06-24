export const triple_flemish = {
  id: 'triple_flemish',
  name: 'Triple Flemish Bond',
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
    const shift = 1.25 * tw;
    const totalW = 3.5 * tw;
    let paths = '';
    const drawBrick = (x, y, bw, bh) => {
      paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
    };
    for (let r = 0; r < 6; r++) {
      let y = r * th;
      let startX = r % 2 === 1 ? shift : 0;
      for (let c = -1; c < 4; c++) {
        let x = startX + c * totalW;
        drawBrick(x, y, w, h);
        drawBrick(x + tw, y, w, h);
        drawBrick(x + 2 * tw, y, w, h);
        drawBrick(x + 3 * tw, y, w / 2, h);
      }
    }
    return {
      w: totalW,
      h: th * 2,
      paths
    };
  }
};
