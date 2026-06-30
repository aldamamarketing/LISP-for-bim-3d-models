const admin = require('firebase-admin');

admin.initializeApp({
  projectId: "lispcentral"
});

const db = admin.firestore();

async function runTest() {
  console.log("=== INICIANDO E2E FLOW TEST ===");
  try {
    // 1. CREADOR: Crea una Suite Pública
    const creatorId = "TEST-CREATOR-" + Date.now();
    const suiteId = "SUITE-" + creatorId + "-v1";
    console.log(`[1] Creador (${creatorId}) publicando Suite ${suiteId}...`);
    
    await db.collection("suites").doc(suiteId).set({
      tenantId: creatorId,
      name: "Super Viga 3000",
      visibility: "store",
      price: 50,
      authorName: "Ing. Test"
    });

    // Añadir un archivo LISP falso a esa suite en lispFiles
    const lispId = "LC_SUPERVIGA";
    await db.collection("lispFiles").doc(lispId).set({
      lispId: lispId,
      tenantId: creatorId,
      suiteId: suiteId,
      originalName: "SuperViga.lsp",
      storagePath: "test/superviga.lsp"
    });

    // 2. COMPRADOR: Compra/Suscribe a la Suite
    const buyerId = "TEST-BUYER-" + Date.now();
    const subId = "SUB-" + buyerId + "-" + suiteId;
    console.log(`[2] Comprador (${buyerId}) suscribiéndose a la Suite...`);
    
    await db.collection("subscriptions").doc(subId).set({
      tenantId: buyerId,
      suiteId: suiteId,
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedDevices: [] // Aún sin equipos
    });

    // 3. COMPRADOR: Asigna Asientos (Dispositivos)
    const hwId = "PC-ACAD-TESTER";
    console.log(`[3] Comprador asignando equipo ${hwId} a la suscripción...`);
    
    await db.collection("subscriptions").doc(subId).update({
      assignedDevices: admin.firestore.FieldValue.arrayUnion(hwId)
    });

    // 4. AUTOCAD: Intenta descargar el comando desde la PC asignada
    console.log(`[4] Simulando petición de AutoCAD (Cross-Tenant)...`);
    
    // Necesitamos que el comprador tenga un Documento de Usuario con maxSeats
    await db.collection("users").doc(buyerId).set({
      name: "Comprador de Prueba",
      apiKey: buyerId + "-KEY",
      maxSeats: 5,
      registeredDevices: []
    });

    const url = `http://127.0.0.1:5001/lispcentral/us-central1/getRoutine?apiKey=${buyerId}-KEY&hwId=${hwId}&routine=${lispId}`;
    console.log(`GET ${url}`);
    
    const res = await fetch(url);
    const text = await res.text();
    
    if (res.status === 200 && !text.includes("ACCESO DENEGADO") && text.includes("SERVIDO POR LISPCENTRAL")) {
      console.log(">> ÉXITO! El comando se entregó correctamente.");
    } else if (text.includes("ACCESO DENEGADO") || text.includes("PROTECAO")) {
      console.log(">> ERROR LÓGICO: Acceso denegado a pesar de tener la licencia asignada.");
      console.log(text);
    } else {
      console.log(">> RESULTADO INESPERADO:");
      console.log(text);
    }

    // 5. Verificar base de datos (Subcolección Devices)
    const deviceSnap = await db.collection("users").doc(buyerId).collection("devices").doc(hwId).get();
    if (deviceSnap.exists) {
      console.log(`[5] ÉXITO! El equipo ${hwId} se registró automáticamente en 'devices'.`);
    } else {
      console.log(`[5] ERROR: El equipo no se guardó en la subcolección devices.`);
    }

  } catch (err) {
    console.error("Falló el test:", err);
  }
}

runTest();
