const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Inicializa usando la llave de servicio para tener permisos de Administrador
try {
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "lispcentral"
  });
} catch (e) {
  console.error("❌ ERROR: Falta el archivo 'serviceAccountKey.json' en la carpeta functions.");
  console.log("-> Ve a la Consola de Firebase > Configuración > Cuentas de Servicio.");
  console.log("-> Clic en 'Generar nueva clave privada'.");
  console.log("-> Guarda ese archivo descargado dentro de la carpeta 'functions' con el nombre 'serviceAccountKey.json' y vuelve a intentar.");
  process.exit(1);
}

const db = admin.firestore();

async function importHatches() {
  const hatchesDir = path.join(__dirname, "..", "assets", "hatches");
  
  if (!fs.existsSync(hatchesDir)) {
    console.log(`Creando carpeta ${hatchesDir}...`);
    fs.mkdirSync(hatchesDir, { recursive: true });
    console.log("¡Carpeta creada! Coloca ahí tus archivos .pat de CADHatch y vuelve a ejecutar este script.");
    return;
  }

  const files = fs.readdirSync(hatchesDir).filter(file => file.toLowerCase().endsWith('.pat'));
  
  if (files.length === 0) {
    console.log("No se encontraron archivos .pat en la carpeta assets/hatches.");
    console.log("Descarga los ZIPs de CADHatch, extráelos ahí y vuelve a intentar.");
    return;
  }

  console.log(`Encontrados ${files.length} archivos .pat. Importando a Firestore...`);
  
  const collectionRef = db.collection("publicAssets");
  
  // Firebase Batch limit is 500 writes. We chunk them into blocks of 400.
  const CHUNK_SIZE = 400;
  let successCount = 0;

  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunkFiles = files.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    
    for (const file of chunkFiles) {
      const filePath = path.join(hatchesDir, file);
      const data = fs.readFileSync(filePath, "utf8");
      
      // Validar si el archivo realmente es un PAT (al menos tiene data o empieza con *)
      if (!data || data.trim().length === 0) continue;

      // Obtener el nombre del Hatch
      let name = path.parse(file).name;
      let description = "Importado de CADHatch.com";
      
      const lines = data.split(/\r?\n/);
      if (lines.length > 0 && lines[0].trim().startsWith('*')) {
        const parts = lines[0].trim().substring(1).split(',');
        if (parts[0]) name = parts[0].trim();
        if (parts[1]) description = parts.slice(1).join(',').trim() + " (Fuente: CADHatch.com)";
      }
      
      const safeId = "hatch_" + name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      
      const searchString = (name + " " + description).toLowerCase();
      let category = "General";
      if (searchString.includes("wood") || searchString.includes("timber")) {
        category = "Madera";
      } else if (searchString.includes("brick") || searchString.includes("block")) {
        category = "Ladrillos";
      } else if (searchString.includes("stone") || searchString.includes("rock") || searchString.includes("rubble")) {
        category = "Piedra";
      } else if (searchString.includes("gravel") || searchString.includes("sand") || searchString.includes("earth") || searchString.includes("ground")) {
        category = "Terreno / Grava";
      } else if (searchString.includes("tile") || searchString.includes("roof")) {
        category = "Tejas / Revestimientos";
      } else if (searchString.includes("concrete") || searchString.includes("ar-conc")) {
        category = "Concreto";
      }
      
      const docData = {
        name: name,
        description: description,
        category: category,
        code: data,
        type: "hatch",
        source: "https://www.cadhatch.com",
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = collectionRef.doc(safeId);
      // Usamos { merge: true } para evitar sobrescribir campos manuales (ej: active: false que pongas en el Dashboard)
      batch.set(docRef, docData, { merge: true });
      successCount++;
    }
    
    await batch.commit();
    console.log(`Lote guardado en Firebase: ${i + chunkFiles.length}/${files.length}...`);
  }
  
  console.log(`¡Importación completada! ${successCount} hatches subidos a Firebase sin duplicados.`);
}

importHatches().catch(console.error);
