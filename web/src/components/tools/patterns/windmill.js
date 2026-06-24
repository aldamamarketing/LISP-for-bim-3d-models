export const windmill = {
  id: 'windmill',
  name: 'Windmill Pattern',
  category: 'Parquet',
  controlsType: 'rectangular',
  iconUrl: '/patterns/basketweave.svg',
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
    const W = tw + th;
    let paths = '';
    const drawRect = (x, y, bw, bh) => {
      paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
    };
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let ox = c * W;
        let oy = r * W;
        drawRect(ox, oy, w, h);
        drawRect(ox + tw, oy, h, w);
        drawRect(ox + th, oy + tw, w, h);
        drawRect(ox, oy + th, h, w);
      }
    }
    return {
      w: W,
      h: W,
      paths
    };
  }
};
