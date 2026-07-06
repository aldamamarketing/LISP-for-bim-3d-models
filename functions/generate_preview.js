const fs = require('fs');

const TOKEN = process.env.GCP_TOKEN || 'YOUR_TOKEN_HERE';

function parsePatLine(line) {
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

function generateSvgPathsFromPat(patCode) {
  const lines = patCode.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('*') && !l.startsWith(';'));

  const defs = lines.map(parsePatLine).filter(d => d !== null);
  if (defs.length === 0) return null;

  let maxStep = 1;
  for (const def of defs) {
    if (Math.abs(def.dx) > maxStep) maxStep = Math.abs(def.dx);
    if (Math.abs(def.dy) > maxStep) maxStep = Math.abs(def.dy);
  }

  // Find bounding box of the base pattern points
  let minX = 0, minY = 0, maxX = maxStep, maxY = maxStep;
  for (const def of defs) {
    if (def.ox < minX) minX = def.ox;
    if (def.ox > maxX) maxX = def.ox;
    if (def.oy < minY) minY = def.oy;
    if (def.oy > maxY) maxY = def.oy;
  }

  // Expand viewport to cover the pattern unit cell well
  const w = Math.max(maxX - minX + maxStep * 2, maxStep * 4, 10);
  const h = Math.max(maxY - minY + maxStep * 2, maxStep * 4, 10);
  const viewportSize = Math.max(w, h);

  let svgLines = '';
  let lineCount = 0;
  const MAX_LINES = 1000; 

  // Make stroke width proportional to viewport
  const strokeW = Math.max(viewportSize / 300, 0.5);

  for (const def of defs) {
    if (lineCount >= MAX_LINES) break;

    const rad = def.ang * Math.PI / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    let dashStr = '';
    if (def.dashes.length > 0) {
      // Map dots (0) to a small visible value relative to strokeW
      const validDashes = def.dashes.map(v => Math.max(strokeW * 1.5, Math.abs(v)));
      dashStr = ` stroke-dasharray="${validDashes.join(',')}"`;
    }

    const perpX = -sinA * def.dy;
    const perpY =  cosA * def.dy;
    const shiftX = cosA * def.dx;
    const shiftY = sinA * def.dx;

    let stepSize = Math.max(Math.abs(def.dy), Math.abs(def.dx), 0.1);
    let reps = Math.ceil((viewportSize * 2) / stepSize);
    reps = Math.min(reps, 50); 

    for (let i = -reps; i <= reps; i++) {
      if (lineCount >= MAX_LINES) break;

      const cx = def.ox + (i * perpX) + (i * shiftX);
      const cy = def.oy + (i * perpY) + (i * shiftY);

      // Line length needs to cover the viewport.
      const len = viewportSize * 2;
      const x1 = Math.round((cx - len * cosA) * 100) / 100;
      const y1 = Math.round((cy - len * sinA) * 100) / 100;
      const x2 = Math.round((cx + len * cosA) * 100) / 100;
      const y2 = Math.round((cy + len * sinA) * 100) / 100;

      // Filter lines that are completely outside the viewBox
      if (
        (x1 > minX + w && x2 > minX + w) || (x1 < minX && x2 < minX) ||
        (y1 > minY + h && y2 > minY + h) || (y1 < minY && y2 < minY)
      ) {
        continue;
      }

      // Fix dash alignment by using stroke-dashoffset = -len
      svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-dashoffset="${-len}"${dashStr} />\n`;
      lineCount++;
    }
  }

  return {
    svgLines,
    viewBox: `${minX} ${minY} ${w} ${h}`,
    strokeWidth: strokeW
  };
}

async function run() {
  console.log("Fetching documents from publicAssets via REST...");
  const url = 'https://firestore.googleapis.com/v1/projects/lispcentral/databases/(default)/documents/publicAssets?pageSize=300';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  
  if (!data.documents) {
    console.log("No documents found or error", data);
    return;
  }
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PAT Preview</title>
  <style>
    body { font-family: sans-serif; background: #1a1a1a; color: #fff; padding: 20px; }
    .grid { display: flex; flex-wrap: wrap; gap: 20px; }
    .card { background: #333; padding: 15px; border-radius: 8px; width: 250px; text-align: center; }
    .card h3 { font-size: 14px; margin: 0 0 10px 0; word-wrap: break-word; }
    .card svg { background: #222; border-radius: 4px; margin-bottom: 10px; border: 1px solid #555; }
    .btn-delete { background: #ff4444; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; width: 100%; }
    .btn-delete:hover { background: #cc0000; }
  </style>
</head>
<body>
  <h1>Hatch Patterns Preview (${data.documents.length} items)</h1>
  <div class="grid">
  `;

  data.documents.forEach(doc => {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const code = fields.code?.stringValue || "";
    const name = fields.name?.stringValue || id;
    
    // We only care about PAT files
    if (!code) return;
    
    const svgData = generateSvgPathsFromPat(code);
    if (!svgData) return;

    html += `
    <div class="card" id="${id}">
      <h3>${name}</h3>
      <svg width="100%" height="200" viewBox="${svgData.viewBox}" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#ff8c00" stroke-width="${svgData.strokeWidth}" fill="none">
          ${svgData.svgLines}
        </g>
      </svg>
      <p style="font-size: 10px; color: #aaa;">ID: ${id}</p>
    </div>
    `;
  });

  html += `
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync('preview.html', html);
  console.log("preview.html generado con exito en C:/Users/TM PROJETOS/3D Objects/Projetos/LispCentral/functions/preview.html");
}

run().catch(console.error);
