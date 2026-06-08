import fs from 'fs';

const API_KEY = "AIzaSyADsqbH_lKKFcugqTexryO40u5VMJxzx0c";
const EMAIL = "123456@gmail.com";
const PASSWORD = "123456";
const PROJECT_ID = "lispcentral";
const REGION = "us-central1";

const FUNCTION_URL = `https://toggledeviceassignment-wgpjjgorxa-uc.a.run.app`;

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE REGLAS DE NEGOCIO ===");

  // 1. Obtener Token de Autenticación
  console.log("\n1. Autenticando usuario de prueba...");
  const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
  });

  const authData = await authRes.json();
  if (authData.error) {
    console.error("Error de Auth:", authData.error.message);
    return;
  }

  const token = authData.idToken;
  const userId = authData.localId;
  console.log(`✅ Autenticado como ${EMAIL} (UID: ${userId})`);

  const subId = `sub_global_${userId}`;
  const deviceId = "TEST_PC_001";
  const deviceId2 = "TEST_PC_002";

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

  // PRUEBA 1: Asignar un equipo válido
  console.log(`\n▶ PRUEBA 1: Asignar equipo (${deviceId}) a la Suite...`);
  const res1 = await callFunction({ subId, deviceId, action: 'assign' });
  if (res1.result && res1.result.success) {
    console.log("✅ ÉXITO: Equipo asignado correctamente.");
  } else {
    console.log("❌ ERROR INESPERADO:", res1.error || res1);
  }

  // PRUEBA 2: Intentar sobregiro (Asignar 2do equipo en suite de 1 asiento)
  console.log(`\n▶ PRUEBA 2: Intentar SOBREGIRO asignando 2do equipo (${deviceId2})...`);
  const res2 = await callFunction({ subId, deviceId: deviceId2, action: 'assign' });
  if (res2.error && res2.error.status === 'RESOURCE_EXHAUSTED') {
    console.log("✅ REGLA VALIDADA: El backend bloqueó el sobregiro correctamente.");
    console.log(`   Mensaje del servidor: "${res2.error.message}"`);
  } else {
    console.log("❌ FALLO DE SEGURIDAD: Se permitió el sobregiro o ocurrió un error distinto.", res2);
  }

  // PRUEBA 3: Desvincular equipo (Aplica Penalty Box)
  console.log(`\n▶ PRUEBA 3: Desvincular equipo (${deviceId}) para activar Penalty Box...`);
  const res3 = await callFunction({ subId, deviceId, action: 'unassign' });
  if (res3.result && res3.result.success) {
    console.log("✅ ÉXITO: Equipo desvinculado. Penalty Box activado por 7 días.");
  } else {
    console.log("❌ ERROR INESPERADO:", res3);
  }

  // PRUEBA 4: Anti-Abuso (Intentar reasignar antes de 7 días)
  console.log(`\n▶ PRUEBA 4: Intentar reasignar inmediatamente el equipo en Penalty Box...`);
  const res4 = await callFunction({ subId, deviceId, action: 'assign' });
  if (res4.error && res4.error.status === 'FAILED_PRECONDITION') {
    console.log("✅ REGLA VALIDADA: Penalty Box funciona. El backend rechazó la reasignación.");
    console.log(`   Mensaje del servidor: "${res4.error.message}"`);
  } else {
    console.log("❌ FALLO DE SEGURIDAD: Se permitió evadir el Penalty Box.", res4);
  }

  console.log("\n=== PRUEBAS FINALIZADAS ===");
}

runTests();
