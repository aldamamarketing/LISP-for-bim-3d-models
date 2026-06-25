export function parsePatLine(line) {
  const parts = line.split(',').map(s => parseFloat(s.trim()));
  if (parts.length < 5) return null;
  return {
    ang: parts[0],
    ox: parts[1],
    oy: parts[2],
    dx: parts[3],
    dy: parts[4],
    dashes: parts.slice(5).filter(n => !isNaN(n))
  };
}

export function generateSvgPathsFromPat(patCode, w, h) {
  const lines = patCode.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('*') && !l.startsWith(';'));

  const defs = lines.map(parsePatLine).filter(d => d !== null);
  if (defs.length === 0) return null;

  let svgLines = '';
  let lineCount = 0;
  const MAX_LINES = 1000;

  for (const def of defs) {
    if (lineCount >= MAX_LINES) break;

    const rad = def.ang * Math.PI / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    let dashStr = '';
    if (def.dashes.length > 0) {
      dashStr = ` stroke-dasharray="${def.dashes.map(v => Math.max(0.1, Math.abs(v))).join(',')}"`;
    }

    const perpX = -sinA * def.dy;
    const perpY =  cosA * def.dy;
    const shiftX = cosA * def.dx;
    const shiftY = sinA * def.dx;

    const reps = 15;

    for (let i = -reps; i <= reps; i++) {
      if (lineCount >= MAX_LINES) break;

      const cx = def.ox + (i * perpX) + (i * shiftX);
      const cy = def.oy + (i * perpY) + (i * shiftY);

      const len = Math.max(w, h) * 4;
      const x1 = Math.round((cx - len * cosA) * 10) / 10;
      const y1 = Math.round((cy - len * sinA) * 10) / 10;
      const x2 = Math.round((cx + len * cosA) * 10) / 10;
      const y2 = Math.round((cy + len * sinA) * 10) / 10;

      if (
        (x1 > w * 2 && x2 > w * 2) || (x1 < -w && x2 < -w) ||
        (y1 > h * 2 && y2 > h * 2) || (y1 < -h && y2 < -h)
      ) continue;

      svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${dashStr}/>\n`;
      lineCount++;
    }
  }

  return svgLines;
}
