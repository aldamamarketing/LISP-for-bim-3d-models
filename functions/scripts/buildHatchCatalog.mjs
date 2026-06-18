/**
 * buildHatchCatalog.mjs
 * 
 * Script de administración: Lee publicAssets de Firestore y genera el JSON
 * estático del catálogo SIN el campo `code` (protección de IP).
 * 
 * Uso: node functions/scripts/buildHatchCatalog.mjs
 * Requiere: GOOGLE_APPLICATION_CREDENTIALS o firebase-admin configurado.
 * 
 * El JSON resultante se copia a web/public/api/hatch-catalog.json
 * y se sube con el próximo `firebase deploy --only hosting`.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../lispcentral-key.json');

const __dirname = dirname(fileURLToPath(import.meta.url));

// Inicializar Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

const TYPES = ['hatch', 'lin'];
const OUTPUT_DIR = join(__dirname, '../../web/public/api');

async function buildCatalog(type) {
  console.log(`\n📦 Construindo catálogo: ${type}...`);

  const snap = await db.collection('publicAssets')
    .where('type', '==', type)
    .orderBy('category')
    .get();

  const items = snap.docs.map(doc => {
    const d = doc.data();
    
    // Clean up description to be a pure readable name
    let cleanDesc = (d.description || '').split('\n')[0]; // Only take first line
    cleanDesc = cleanDesc.replace(/^\*[A-Z0-9_-]+,?\s*/i, ''); // Remove *NAME, 
    cleanDesc = cleanDesc.replace(/Free patterns from www\.CADhatch\.com/i, ''); // Remove branding
    cleanDesc = cleanDesc.trim();
    if (!cleanDesc) cleanDesc = d.name || doc.id;

    return {
      id: doc.id,
      name: cleanDesc,      // Display the clean readable name as 'name'
      codeName: d.name,     // Keep the original technical name if needed
      category: d.category || 'General',
      icon: d.iconUrl || d.icon || null, // URL de WebP o SVG crudo
    };
    // ⚠️ NUNCA incluir d.code en este JSON — protección de IP
  });

  console.log(`  ✅ ${items.length} items encontrados`);
  return items;
}

async function main() {
  try {
    mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const type of TYPES) {
      const catalog = await buildCatalog(type);
      const outputPath = join(OUTPUT_DIR, `${type}-catalog.json`);
      writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf8');
      console.log(`  📄 Salvo em: ${outputPath}`);
    }

    console.log('\n✅ Catálogos gerados com sucesso!');
    console.log('👉 Próximo passo: firebase deploy --only hosting');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao gerar catálogo:', err);
    process.exit(1);
  }
}

main();
