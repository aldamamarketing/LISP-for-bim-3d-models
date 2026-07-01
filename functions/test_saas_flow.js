const admin = require("firebase-admin");

// Inicializa con Application Default Credentials (las credenciales de tu Firebase CLI)
admin.initializeApp({
  projectId: "lispcentral"
});
const db = admin.firestore();

async function run() {
  let testTeamId = null;
  let testUserId = null;
  try {
    console.log("=== INICIANDO PRUEBA E2E DEL MVP SAAS ===");
    
    // 1. Usar tu token real de LC_Loader.lsp
    const testApiKey = "lc_key_20260611_aldamadaniel1984";
    console.log(`\n[1/6] Buscando tu usuario real mediante el Token (${testApiKey})...`);
    const userSnap = await db.collection("users").where("apiKey", "==", testApiKey).limit(1).get();
    if (userSnap.empty) {
      throw new Error(`No se encontró ningún usuario con apiKey: ${testApiKey}.`);
    }
    const testUser = userSnap.docs[0].data();
    testUserId = userSnap.docs[0].id;
    console.log(`  -> Usuario real seleccionado: ID: ${testUserId}`);
    
    // 2. Crear equipo corporativo temporal
    console.log("\n[2/6] Creando equipo corporativo de prueba...");
    const teamRef = await db.collection("teams").add({
      ownerId: testUserId,
      name: "EQUIPO DE PRUEBA E2E",
      inviteCode: "E2E-TEST",
      isPublic: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    testTeamId = teamRef.id;
    console.log(`  -> Equipo creado. TeamID: ${testTeamId}`);
    
    // 3. Simular TMD_EXTRACT_STDS (AutoCAD enviando capas)
    console.log("\n[3/6] Simulando AutoCAD enviando la Norma...");
    console.log(`  -> POST https://us-central1-lispcentral.cloudfunctions.net/syncStandard`);
    const payload = {
      token: testApiKey,
      teamId: testTeamId,
      standardData: {
        layers: {
          "A-WALL": { color: 1, linetype: "Continuous", lineweight: 35 },
          "A-DOOR": { color: 2, linetype: "Continuous", lineweight: 25 }
        },
        textStyles: {
          "Standard": { font: "arial.ttf" },
          "Titulos": { font: "romans.shx" }
        }
      }
    };
    
    // Esperar a que los índices de Firestore se actualicen (Consistencia eventual)
    console.log("  -> Esperando propagación de índices (3 segundos)...");
    await new Promise(r => setTimeout(r, 3000));
    
    console.log("  -> Sanity Check Local: Consultando DB directamente...");
    const sanitySnap = await db.collection("users").where("apiKey", "==", testApiKey).limit(1).get();
    console.log(`     -> Encontrados localmente: ${sanitySnap.size}`);

    // Usando fetch nativo de Node 18+
    const syncRes = await fetch(`https://us-central1-lispcentral.cloudfunctions.net/syncStandard?token=${testApiKey}&teamId=${testTeamId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const syncText = await syncRes.text();
    console.log(`  -> Respuesta HTTP ${syncRes.status}: ${syncText}`);
    if (!syncRes.ok) throw new Error("Fallo en syncStandard. La norma no se subió.");

    // 4. Validar en Base de Datos Real
    console.log("\n[4/6] Verificando escritura en Firestore (Colección 'standards')...");
    const stdDoc = await db.collection("standards").doc(testTeamId).get();
    if (!stdDoc.exists) throw new Error("El JSON no se escribió en la colección standards.");
    const stdData = stdDoc.data();
    console.log(`  -> JSON en Nube detectado. Capas encontradas: ${Object.keys(stdData.data.layers).length}`);
    if (!stdData.data.layers["A-WALL"]) throw new Error("La capa A-WALL no se guardó correctamente.");
    
    // 5. Simular TMD_AUDIT (AutoCAD descargando norma)
    console.log("\n[5/6] Simulando AutoCAD Auditor obteniendo la Norma...");
    console.log(`  -> GET https://us-central1-lispcentral.cloudfunctions.net/getStandard`);
    const getRes = await fetch(`https://us-central1-lispcentral.cloudfunctions.net/getStandard?token=${testApiKey}&teamId=${testTeamId}`);
    const getText = await getRes.text();
    if (!getRes.ok) throw new Error(`Fallo en getStandard: HTTP ${getRes.status} - ${getText}`);
    console.log(`  -> Éxito. Datos recibidos (resumen): ${getText.substring(0, 80)}...`);
    
    console.log("\n=== PRUEBA E2E COMPLETADA CON EXITO ===");
    console.log("✅ El flujo AutoCAD ➔ Nube ➔ AutoCAD está operando perfectamente en producción.");

  } catch (err) {
    console.error("\n[X] ERROR EN PRUEBA E2E:", err.message);
  } finally {
    // 6. Limpieza
    console.log("\n[6/6] Limpiando datos de prueba...");
    if (testTeamId) {
      await db.collection("teams").doc(testTeamId).delete();
      await db.collection("standards").doc(testTeamId).delete();
    }
    console.log(`  -> Documentos temporales eliminados.`);
    process.exit(0);
  }
}

run();
