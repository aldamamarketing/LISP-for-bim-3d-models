/**
 * uploadZippedHatches.mjs
 * 
 * Script para procesar de forma masiva archivos ZIP conteniendo hatches (.pat)
 * e importarlos a Firestore. Utiliza el nombre de la carpeta como Categoría.
 * 
 * Uso: node functions/scripts/uploadZippedHatches.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../lispcentral-key.json');

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();
const auth = getAuth();

const ASSETS_DIR = 'Z:\\Autocad Config\\LISP\\assets';
const ADMIN_EMAIL = 'aldamadaniel1984@gmail.com';

// Función recursiva para encontrar todos los ZIPs
function findZipFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findZipFiles(filePath, fileList);
    } else if (file.toLowerCase().endsWith('.zip')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Capitaliza la primera letra
function capitalize(str) {
  if (!str) return 'General';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ID Semántico
function buildSemanticId(type, category, name) {
  return `${type}_${category.toLowerCase()}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
}

async function main() {
  console.log(`\n🚀 Iniciando subida masiva desde: ${ASSETS_DIR}`);

  // 1. Obtener UID del admin
  let authorUid = 'admin_script';
  try {
    const userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
    authorUid = userRecord.uid;
    console.log(`✅ Admin UID obtenido: ${authorUid}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo obtener el UID de ${ADMIN_EMAIL}. Se usará 'admin_script'.`);
  }

  // 2. Buscar archivos ZIP
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`❌ La ruta ${ASSETS_DIR} no existe.`);
    process.exit(1);
  }

  const zipFiles = findZipFiles(ASSETS_DIR);
  console.log(`📦 Encontrados ${zipFiles.length} archivos ZIP.\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // 3. Procesar cada ZIP
  for (const zipPath of zipFiles) {
    try {
      const folderName = path.basename(path.dirname(zipPath));
      let category = folderName.toLowerCase() === 'ok' ? 'General' : capitalize(folderName);
      
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      
      let patContent = null;
      let txtContent = null;
      let hatchName = null;
      
      // Leer entradas del ZIP
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        
        const ext = path.extname(entry.entryName).toLowerCase();
        if (ext === '.pat') {
          patContent = zip.readAsText(entry, 'utf8');
          // Intentar obtener el nombre de la primera línea: *NOMBRE, ...
          const lines = patContent.split('\n');
          if (lines.length > 0 && lines[0].startsWith('*')) {
            hatchName = lines[0].split(',')[0].replace('*', '').trim();
          }
          if (!hatchName) {
            hatchName = path.basename(entry.entryName, '.pat').toUpperCase();
          }
        } else if (ext === '.txt') {
          txtContent = zip.readAsText(entry, 'utf8');
        }
      }

      if (!patContent) {
        console.log(`⏭️  Saltando ${path.basename(zipPath)} - No contiene archivo .pat`);
        skipCount++;
        continue;
      }

      // Si no hay txt, usamos la descripción de la primera línea del pat si existe
      let description = '';
      if (txtContent) {
        description = txtContent.trim();
      } else {
        const firstLine = patContent.split('\n')[0];
        const parts = firstLine.split(',');
        if (parts.length > 1) {
          description = parts.slice(1).join(',').trim();
        }
      }

      const docId = buildSemanticId('hatch', category, hatchName);
      const docRef = db.collection('publicAssets').doc(docId);

      // Subir a Firestore (siempre sobrescribe/actualiza)
      await docRef.set({
        type: 'hatch',
        name: hatchName,
        description: description || 'Importado via ZIP',
        category: category,
        code: patContent,
        icon: null,
        createdAt: new Date().toISOString(),
        authorUid: authorUid
      });

      console.log(`✅ Subido: ${hatchName} (Cat: ${category}) -> ${docId}`);
      successCount++;
      
    } catch (err) {
      console.error(`❌ Error en ${path.basename(zipPath)}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n🎉 Proceso completado.`);
  console.log(`✔️ Exitosos: ${successCount}`);
  console.log(`⏭️ Saltados: ${skipCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  
  console.log(`\n👉 PRÓXIMO PASO: Ejecuta 'node functions/scripts/buildHatchCatalog.mjs' para actualizar el catálogo público.\n`);
}

main().catch(console.error);
