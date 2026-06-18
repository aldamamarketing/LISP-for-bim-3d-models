import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../lispcentral-key.json');

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

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

  // Escala: el dy mínimo debería mapear a ~12 unidades en un canvas de 100x100
  let minDy = Infinity;
  for (const def of defs) {
    const absDy = Math.abs(def.dy);
    if (absDy > 0 && absDy < minDy) minDy = absDy;
  }
  if (minDy === Infinity || minDy === 0) minDy = 1;
  const scale = 12 / minDy;

  // Usar clipping para recortar todo al viewBox 0-100
  let svgLines = '';
  let lineCount = 0;
  const MAX_LINES = 40; // Iconos livianos: max 40 trazos

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

    // Generar repeticiones perpendiculares al ángulo de la línea
    const perpX = -sinA * (def.dy * scale);
    const perpY =  cosA * (def.dy * scale);

    for (let i = -8; i <= 8; i++) {
      if (lineCount >= MAX_LINES) break;

      const cx = 50 + (def.ox * scale) + (i * perpX);
      const cy = 50 + (def.oy * scale) + (i * perpY);

      // Trazar la línea a lo largo del ángulo, clipped al canvas
      const x1 = Math.round(cx - 150 * cosA);
      const y1 = Math.round(cy - 150 * sinA);
      const x2 = Math.round(cx + 150 * cosA);
      const y2 = Math.round(cy + 150 * sinA);

      // Solo incluir si cruza el viewport visible (0-100)
      if ((x1 > 100 && x2 > 100) || (x1 < 0 && x2 < 0) ||
          (y1 > 100 && y2 > 100) || (y1 < 0 && y2 < 0)) continue;

      svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${dashStr}/>`;
      lineCount++;
    }
  }

  if (lineCount === 0) return null;

  // SVG mínimo con clipPath para que nada salga del viewBox
  return `<svg viewBox="0 0 100 100" stroke="currentColor" stroke-width="1" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="c"><rect width="100" height="100"/></clipPath></defs><g clip-path="url(#c)">${svgLines}</g></svg>`;
}

async function main() {
  console.log('🚀 Iniciando Generador de SVGs Matemáticos...');
  
  const snap = await db.collection('publicAssets')
    .where('type', '==', 'hatch')
    .get();

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    
    // Si queremos regenerar todos, quitamos la condición.
    // Para probar, vamos a regenerar todos temporalmente.
    if (!data.code) {
      skipped++;
      continue;
    }

    try {
      const svg = generateSvgForHatch(data.code);
      if (svg) {
        await db.collection('publicAssets').doc(docSnap.id).update({ icon: svg });
        console.log(`✅ SVG generado para: ${data.name}`);
        success++;
      } else {
        console.log(`⚠️ No se pudo generar SVG para: ${data.name}`);
        errors++;
      }
    } catch (e) {
      console.error(`❌ Error en ${data.name}:`, e.message);
      errors++;
    }
  }

  console.log(`\n🎉 Proceso completado. Éxitos: ${success}, Errores: ${errors}, Omitidos: ${skipped}`);
  console.log('👉 Ejecuta node buildHatchCatalog.mjs para actualizar el catálogo.');
}

main().catch(console.error);
