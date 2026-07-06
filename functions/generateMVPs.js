const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { PATTERN_GENERATORS } = require("./patterns/index.js");

// Definimos los parámetros por defecto para el MVP
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 100;
const DEFAULT_JOINT = 10;

exports.generateMVPs = onRequest(async (req, res) => {
  // Asegurarnos de que admin esté inicializado (index.js suele hacerlo)
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  
  const db = admin.firestore();
  const collectionRef = db.collection("publicAssets");
  const batch = db.batch();
  let count = 0;

  const archetypes = Object.keys(PATTERN_GENERATORS);
  
  for (const archetypeId of archetypes) {
    const generator = PATTERN_GENERATORS[archetypeId];
    
    const numArgs = generator.length;
    let params = [];
    if (numArgs === 1) params = [DEFAULT_WIDTH];
    else if (numArgs === 2) params = [DEFAULT_WIDTH, DEFAULT_HEIGHT];
    else if (numArgs === 3) params = [DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_JOINT];
    
    try {
      const patCode = generator(...params);
      
      const safeId = `hatch_mvp_${archetypeId}`;
      const docData = {
        name: `${archetypeId}_MVP`,
        description: `MVP Baseline para el patrón ${archetypeId}`,
        category: "Baseline",
        code: patCode,
        type: "hatch",
        source: "LispCentral Generator",
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = collectionRef.doc(safeId);
      batch.set(docRef, docData, { merge: true });
      count++;
      
    } catch (e) {
      console.error(`[ERROR] Falló al generar ${archetypeId}:`, e.message);
    }
  }

  try {
    await batch.commit();
    res.status(200).send(`¡Éxito! ${count} MVPs subidos a Firestore.`);
  } catch(e) {
    res.status(500).send(`Error: ${e.message}`);
  }
});
