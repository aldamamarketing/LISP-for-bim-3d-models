const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Inicializa usando las credenciales por defecto del entorno (Google Cloud Auth local)
admin.initializeApp({
  projectId: "lispcentral"
});

const db = admin.firestore();

async function importCatalog() {
  const csvPath = path.join(__dirname, "..", "catalogo_metal.csv");
  const data = fs.readFileSync(csvPath, "utf8");
  
  const lines = data.split('\n').filter(line => line.trim().length > 0);
  const headers = lines[0].split(',');
  
  console.log(`Importando ${lines.length - 1} perfiles a Firestore...`);
  
  const batch = db.batch();
  const collectionRef = db.collection("catalogs").doc("Metal_Profiles").collection("items");
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 8) continue;
    
    // Nome,Forma,Dim_X,Dim_Y,Espessura,Labio,Material,Peso
    const docData = {
      name: values[0].trim(),
      shape: values[1].trim(),
      h: parseFloat(values[2]),
      bf: parseFloat(values[3]),
      tw: parseFloat(values[4]),
      tf: parseFloat(values[5]),
      material: values[6].trim(),
      weight: parseFloat(values[7]),
      active: true
    };
    
    const safeId = docData.name.replace(/[^a-zA-Z0-9]/g, "_");
    const docRef = collectionRef.doc(safeId);
    batch.set(docRef, docData);
  }
  
  await batch.commit();
  console.log("¡Importación completada!");
}

importCatalog().catch(console.error);
