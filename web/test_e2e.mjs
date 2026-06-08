import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADsqbH_lKKFcugqTexryO40u5VMJxzx0c",
  authDomain: "lispcentral.firebaseapp.com",
  projectId: "lispcentral",
  storageBucket: "lispcentral.firebasestorage.app",
  messagingSenderId: "439823418692",
  appId: "1:439823418692:web:1ed8a76b9e2c4cc0d12e69"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  console.log("Iniciando sesión...");
  const creds = await signInWithEmailAndPassword(auth, "123456@gmail.com", "123456");
  const uid = creds.user.uid;
  const token = await creds.user.getIdToken();
  console.log(`UID: ${uid}`);

  const subId = `sub_global_${uid}`;
  const suiteId = `global_${uid}`;

  console.log("Asegurando que la suscripción exista...");
  await setDoc(doc(db, "subscriptions", subId), {
    suiteId: suiteId,
    tenantId: uid,
    purchasedSeats: 1,
    assignedDevices: [],
    isGlobal: true,
    isAutoAssignable: true,
    status: "active"
  }, { merge: true });

  const deviceId1 = "TEST_PC_001";
  const deviceId2 = "TEST_PC_002";
  const FUNCTION_URL = `https://toggledeviceassignment-wgpjjgorxa-uc.a.run.app`;

  const callFunction = async (payload) => {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ data: payload })
    });
    return res.json();
  };

  console.log(`\n▶ PRUEBA 1: Asignar equipo (${deviceId1}) a la Suite...`);
  const res1 = await callFunction({ subId, deviceId: deviceId1, action: 'assign' });
  if (res1.result && res1.result.success) console.log("✅ ÉXITO: Equipo asignado correctamente.");
  else console.log("❌ ERROR INESPERADO:", res1);

  console.log(`\n▶ PRUEBA 2: Intentar SOBREGIRO asignando 2do equipo (${deviceId2})...`);
  const res2 = await callFunction({ subId, deviceId: deviceId2, action: 'assign' });
  if (res2.error && res2.error.status === 'RESOURCE_EXHAUSTED') {
    console.log("✅ REGLA VALIDADA: El backend bloqueó el sobregiro.");
  } else console.log("❌ FALLO DE SEGURIDAD:", res2);

  console.log(`\n▶ PRUEBA 3: Desvincular equipo (${deviceId1}) para activar Penalty Box...`);
  const res3 = await callFunction({ subId, deviceId: deviceId1, action: 'unassign' });
  if (res3.result && res3.result.success) console.log("✅ ÉXITO: Equipo desvinculado (Penalty Box activado).");
  else console.log("❌ ERROR INESPERADO:", res3);

  console.log(`\n▶ PRUEBA 4: Intentar reasignar inmediatamente el equipo en Penalty Box...`);
  const res4 = await callFunction({ subId, deviceId: deviceId1, action: 'assign' });
  if (res4.error && res4.error.status === 'FAILED_PRECONDITION') {
    console.log("✅ REGLA VALIDADA: Penalty Box bloqueó la reasignación.");
  } else console.log("❌ FALLO DE SEGURIDAD:", res4);

  process.exit(0);
}

run().catch(console.error);
