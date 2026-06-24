export const herringbone = {
  id: 'herringbone',
  name: 'Herringbone',
  category: 'Parquetry',
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
    const T = tw + th;
    const stepX = T / Math.sqrt(2);
    const stepY = T / Math.sqrt(2);
    let paths = '';
    const drawLineFamily = (ang, x0, y0) => {
      const rad = ang * Math.PI / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const perpRad = (ang + 90) * Math.PI / 180;
      const cosP = Math.cos(perpRad);
      const sinP = Math.sin(perpRad);
      for (let k = -6; k <= 6; k++) {
        const ox = x0 + k * stepY * cosP;
        const oy = y0 + k * stepY * sinP;
        const startX = ox - 6 * T * cosA;
        const startY = oy - 6 * T * sinA;
        const endX = ox + 6 * T * cosA;
        const endY = oy + 6 * T * sinA;
        const offset = -(k * stepX);
        paths += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" stroke-dasharray="${tw},${th}" stroke-dashoffset="${offset}" />\n`;
      }
    };
    drawLineFamily(45, 0, 0);
    drawLineFamily(135, 0, 0);
    drawLineFamily(45, 0, -th);
    drawLineFamily(135, tw, 0);
    return {
      w: T,
      h: T,
      paths
    };
  }
};
