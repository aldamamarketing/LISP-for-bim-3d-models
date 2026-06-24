export const double_herringbone = {
  id: 'double_herringbone',
  name: 'Double Herringbone',
  category: 'Parquet',
  controlsType: 'rectangular',
  iconUrl: '/patterns/herringbone.svg',
  controls: ['width', 'height', 'joint'],
  defaults: {
    width: 400,
    height: 100,
    joint: 0,
    rows: 4,
    columns: 4
  },
  generateSvgRenderer: params => {
    const w = params.width || 400;
    const h = params.height || 100;
    const j = params.joint || 0;
    const tw = w + j;
    const th = h + j;
    const step = (tw * 2 + th) / Math.SQRT2;
    let paths = '';
    const drawRotatedRect = (x, y, bw, bh, angle) => {
      paths += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" transform="rotate(${angle} ${x} ${y})" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" />\n`;
    };
    for (let r = -2; r < 5; r++) {
      for (let c = -2; c < 5; c++) {
        let ox = (c + r) * step;
        let oy = (r - c) * step;
        drawRotatedRect(ox, oy, w, h, -45);
        drawRotatedRect(ox + th / Math.SQRT2, oy + th / Math.SQRT2, w, h, -45);
        let ox2 = ox + (tw + th) / Math.SQRT2;
        let oy2 = oy + (tw - th) / Math.SQRT2;
        drawRotatedRect(ox2, oy2, w, h, -135);
        drawRotatedRect(ox2 + th / Math.SQRT2, oy2 - th / Math.SQRT2, w, h, -135);
      }
    }
    return {
      w: step * 2,
      h: step * 2,
      paths
    };
  }
};
