/**
 * scrapeCadhatch.mjs
 * 
 * Descarga y extrae masivamente hatches de cadhatch.com y los sube a Firestore.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import AdmZip from 'adm-zip';
import https from 'https';
import path from 'path';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../lispcentral-key.json');

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();
const auth = getAuth();

const ADMIN_EMAIL = 'aldamadaniel1984@gmail.com';

const CATEGORIES = [
  { url: 'https://www.cadhatch.com/autocad-wood-hatch-patterns', name: 'Wood' },
  { url: 'https://www.cadhatch.com/autocad-stone-hatch-patterns', name: 'Stone' },
  { url: 'https://www.cadhatch.com/autocad-brickwork-hatch-patterns', name: 'Bricks' },
  { url: 'https://www.cadhatch.com/stones-gravel-hatch-patterns', name: 'Gravel' },
  { url: 'https://www.cadhatch.com/autocad-roof-tile-hatch-pattern', name: 'Roof' },
  { url: 'https://www.cadhatch.com/tree-vegetation-hatch-patterns', name: 'Vegetation' },
  { url: 'https://www.cadhatch.com/jointed-tiles-hatch-patterns', name: 'Tiles' }
];

function fetchUrl(url, isBinary = false) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Manejar redirecciones básicas si las hay (cadhatch los usa a veces con ?dn=...)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, isBinary));
      }
      
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve(isBinary ? buffer : buffer.toString('utf8'));
      });
    }).on('error', reject);
  });
}

function buildSemanticId(type, category, name) {
  return `${type}_${category.toLowerCase()}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
}

async function main() {
  console.log('🚀 Iniciando Scraper de cadhatch.com');

  let authorUid = 'admin_script';
  try {
    const userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
    authorUid = userRecord.uid;
    console.log(`✅ Admin UID obtenido: ${authorUid}`);
  } catch (err) {}

  let totalSuccess = 0;
  let totalErrors = 0;

  for (const cat of CATEGORIES) {
    console.log(`\n🔍 Analizando categoría: ${cat.name}`);
    try {
      const html = await fetchUrl(cat.url);
      
      // Buscar links de zip
      const regex = /href="([^"]+\.zip[^"]*)"/gi;
      let match;
      let zipUrls = new Set();
      
      while ((match = regex.exec(html)) !== null) {
        let link = match[1];
        if (!link.startsWith('http')) {
          link = `https://www.cadhatch.com${link.startsWith('/') ? '' : '/'}${link}`;
        }
        zipUrls.add(link);
      }

      console.log(`📦 Encontrados ${zipUrls.size} archivos en ${cat.name}. Descargando...`);

      for (const url of zipUrls) {
        try {
          const zipBuffer = await fetchUrl(url, true);
          const zip = new AdmZip(zipBuffer);
          const zipEntries = zip.getEntries();
          
          let patContent = null;
          let txtContent = null;
          let hatchName = null;

          for (const entry of zipEntries) {
            if (entry.isDirectory) continue;
            
            const ext = path.extname(entry.entryName).toLowerCase();
            if (ext === '.pat') {
              patContent = zip.readAsText(entry, 'utf8');
              const lines = patContent.split('\n');
              if (lines.length > 0 && lines[0].startsWith('*')) {
                hatchName = lines[0].split(',')[0].replace('*', '').trim();
              }
              if (!hatchName) hatchName = path.basename(entry.entryName, '.pat').toUpperCase();
            } else if (ext === '.txt') {
              txtContent = zip.readAsText(entry, 'utf8');
            }
          }

          if (!patContent) {
             console.log(`  ⏭️ Saltando (sin .pat)`);
             continue;
          }

          let description = txtContent ? txtContent.trim() : '';
          if (!description) {
            const firstLine = patContent.split('\n')[0];
            const parts = firstLine.split(',');
            if (parts.length > 1) description = parts.slice(1).join(',').trim();
          }

          const docId = buildSemanticId('hatch', cat.name, hatchName);
          const docRef = db.collection('publicAssets').doc(docId);

          await docRef.set({
            type: 'hatch',
            name: hatchName,
            description: description || 'Scraped from CADHatch',
            category: cat.name,
            code: patContent,
            icon: null,
            createdAt: new Date().toISOString(),
            authorUid: authorUid
          });

          console.log(`  ✅ Subido: ${hatchName}`);
          totalSuccess++;
        } catch (err) {
          console.error(`  ❌ Error descargando ZIP: ${err.message}`);
          totalErrors++;
        }
      }
    } catch (err) {
      console.error(`❌ Error en categoría ${cat.name}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Scraping completado.`);
  console.log(`✔️ Exitosos: ${totalSuccess}`);
  console.log(`❌ Errores: ${totalErrors}`);
  
  console.log(`\n👉 PRÓXIMO PASO: Ejecuta 'node functions/scripts/buildHatchCatalog.mjs' para actualizar el catálogo público.\n`);
}

main().catch(console.error);
