const admin = require('firebase-admin');

// Reusa Application Default Credentials (el CLI local ya tiene acceso)
admin.initializeApp({
  projectId: "lispcentral"
});

const db = admin.firestore();

async function run() {
  try {
    // Buscar al usuario 123456@gmail.com
    const usersSnap = await db.collection('users').where('email', '==', '123456@gmail.com').limit(1).get();
    if (usersSnap.empty) {
      console.error("Usuario no encontrado.");
      process.exit(1);
    }
    
    const userData = usersSnap.docs[0].data();
    const apiKey = userData.apiKey;
    const tenantId = usersSnap.docs[0].id;
    console.log(`Usuario encontrado: ${userData.email}`);
    console.log(`API Key: ${apiKey}`);
    console.log(`Tenant ID: ${tenantId}`);

    // Simular ping al backend local
    const hwId = "PC-SIMULADA-" + Math.floor(Math.random() * 1000);
    const url = `http://127.0.0.1:5001/lispcentral/us-central1/getRoutine?apiKey=${apiKey}&hwId=${hwId}&routine=INDEX`;
    console.log(`Ping to: ${url}`);

    const res = await fetch(url);
    const text = await res.text();
    console.log("Respuesta del Backend:");
    console.log(text.substring(0, 500) + (text.length > 500 ? "..." : ""));

    // Comprobar si se creó el dispositivo en Firestore
    const deviceSnap = await db.collection('users').doc(tenantId).collection('devices').doc(hwId).get();
    if (deviceSnap.exists) {
      console.log(`¡Éxito! Dispositivo ${hwId} registrado en Firestore automáticamente.`);
    } else {
      console.log(`Fallo: Dispositivo ${hwId} NO se registró.`);
    }

  } catch(e) {
    console.error(e);
  }
}

run();
