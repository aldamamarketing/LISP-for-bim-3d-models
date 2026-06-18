import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createRequire } from 'module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const serviceAccount = require('../lispcentral-key.json');

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'lispcentral.firebasestorage.app'
});
const db = getFirestore();
const bucket = getStorage().bucket();

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

function generateSvgForHatch(patCode) {
  const lines = patCode.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('*') && !l.startsWith(';'));

  const defs = lines.map(parsePatLine).filter(d => d !== null);
  if (defs.length === 0) return null;

  let minDy = Infinity;
  for (const def of defs) {
    const absDy = Math.abs(def.dy);
    if (absDy > 0 && absDy < minDy) minDy = absDy;
  }
  if (minDy === Infinity || minDy === 0) minDy = 1;
  const scale = 25 / minDy; // Mayor resolución para la generación base (256x256)

  let svgLines = '';
  let lineCount = 0;
  const MAX_LINES = 100; // Más líneas para el SVG fuente, se verá mejor en WebP

  for (const def of defs) {
    if (lineCount >= MAX_LINES) break;

    const rad = def.ang * Math.PI / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    let dashStr = '';
    if (def.dashes.length > 0) {
      const scaled = def.dashes.map(d => Math.max(0.5, Math.abs(d) * scale));
      dashStr = ` stroke-dasharray="${scaled.map(v => Math.round(v)).join(',')}"`;
    }

    const perpX = -sinA * (def.dy * scale);
    const perpY =  cosA * (def.dy * scale);

    for (let i = -12; i <= 12; i++) {
      if (lineCount >= MAX_LINES) break;

      const cx = 128 + (def.ox * scale) + (i * perpX);
      const cy = 128 + (def.oy * scale) + (i * perpY);

      const x1 = Math.round(cx - 300 * cosA);
      const y1 = Math.round(cy - 300 * sinA);
      const x2 = Math.round(cx + 300 * cosA);
      const y2 = Math.round(cy + 300 * sinA);

      if ((x1 > 256 && x2 > 256) || (x1 < 0 && x2 < 0) ||
          (y1 > 256 && y2 > 256) || (y1 < 0 && y2 < 0)) continue;

      svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${dashStr}/>`;
      lineCount++;
    }
  }

  if (lineCount === 0) return null;

  return `<svg viewBox="0 0 256 256" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="c"><rect width="256" height="256"/></clipPath></defs><g clip-path="url(#c)">${svgLines}</g></svg>`;
}

async function processWebP(docSnap) {
  const data = docSnap.data();
  if (!data.code) return false;

  const svgStr = generateSvgForHatch(data.code);
  if (!svgStr) return false;

  const webpBuffer = await sharp(Buffer.from(svgStr))
    .resize(48, 48)
    .webp({ quality: 80 })
    .toBuffer();

  const fileName = `icons/hatch/${docSnap.id}.webp`;
  const file = bucket.file(fileName);
  await file.save(webpBuffer, {
    metadata: { contentType: 'image/webp' }
  });
  await file.makePublic();
  const iconUrl = file.publicUrl();

  await docSnap.ref.update({ iconUrl });
  return true;
}

async function main() {
  console.log('🚀 Generando iconos WebP y subiendo a Firebase Storage...');
  
  const snap = await db.collection('publicAssets').where('type', '==', 'hatch').get();
  let success = 0, errors = 0, skipped = 0;

  for (const docSnap of snap.docs) {
    try {
      const ok = await processWebP(docSnap);
      if (ok) {
        success++;
        console.log(`✅ WebP subido: ${docSnap.data().name}`);
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`❌ Error en ${docSnap.data().name}:`, e.message);
      errors++;
    }
  }

  console.log(`\n🎉 WebP completados. Éxitos: ${success}, Errores: ${errors}, Omitidos: ${skipped}`);
}

main().catch(console.error);
