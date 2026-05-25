const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

/**
 * API Endpoint para obter rotinas AutoLISP sob demanda
 * GET /getRoutine?apiKey=lispcentral_test_key&routine=TMD_JOINTS
 */
exports.getRoutine = onRequest({ cors: true }, async (req, res) => {
  const apiKey = Array.isArray(req.query.apiKey) ? req.query.apiKey[0] : req.query.apiKey;
  const routineId = Array.isArray(req.query.routine) ? req.query.routine[0] : req.query.routine;
  const hwId = Array.isArray(req.query.hwId) ? req.query.hwId[0] : req.query.hwId;

  if (!apiKey) {
    return res.status(400).send("Error: API Key faltante.");
  }

  // MAPEO DE SUITES (Fase 5 - 80/20)
  const ROUTINE_SUITES = {
    "TMD_JOINTS": "structures_pro",
    "TMD_BUILD": "structures_pro",
    "LC_CLEAN": "core",
    "LC_FLATZ": "core",
    "LC_TLEN": "quantities",
    "LC_TAREA": "quantities",
    "LC_AUTONUM": "arquitetura",
    "LC_ZLABEL": "topografia"
  };

  try {
    // 1. Buscar al usuario por API Key en Firestore
    const db = admin.firestore();
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("apiKey", "==", apiKey).limit(1).get();

    if (snapshot.empty) {
      // Sigue permitiendo las trial keys temporales para no romper lo que ya está en vivo
      if (apiKey !== "lispcentral_test_key" && !apiKey.startsWith("trial_tmd_")) {
        return res.status(401).send("Error: API Key no autorizada.");
      }
    }

    let userEmail = "Trial User";
    let activeSuites = ["core"]; // Default suites para trial keys
    let userDocRef = null;
    let registeredDevice = null;

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      userDocRef = userDoc.ref;
      const userData = userDoc.data();
      userEmail = userData.email || "Cliente Registrado";
      activeSuites = userData.activeSuites || ["core"];
      registeredDevice = userData.registeredDevice || null;
    }

    if (!routineId) {
      return res.status(400).send("Error: ID de rutina faltante.");
    }

    // 2. Verificar Permisos de Suite
    const requiredSuite = ROUTINE_SUITES[routineId] || "core";
    if (!activeSuites.includes(requiredSuite)) {
      const accessDeniedLisp = `(alert "\\n[LispCentral] Comando ${routineId} nao autorizado.\\nAtualize sua assinatura no Portal do Cliente.")\n(princ)`;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(accessDeniedLisp);
    }

    // 3. Sistema Anti-Piratería (Machine ID)
    if (hwId && userDocRef) {
      if (!registeredDevice) {
        // Primer uso: vincular automáticamente el dispositivo
        await userDocRef.update({ registeredDevice: hwId });
        registeredDevice = hwId;
      } else if (registeredDevice !== hwId) {
        // Intento de uso desde otro dispositivo
        const drmAlert = `(alert "\\n[LispCentral] PROTECAO ATIVADA:\\nEsta licenca ja esta em uso no computador: ${registeredDevice}.\\nVoce esta tentando usar a partir de: ${hwId}.\\n\\nAcesse o Portal do Cliente para desvincular seu equipamento antigo se necessario.")\n(princ)`;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(200).send(drmAlert);
      }
    }

    // Sanitização de segurança básica para evitar Path Traversal
    const safeRoutineId = routineId.replace(/[^a-zA-Z0-9_]/g, "");
    const filename = `${safeRoutineId}.lsp`;
    const filepath = path.join(__dirname, "lisp", filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).send(`Error: Rutina ${routineId} no encontrada en el servidor.`);
    }

    const code = fs.readFileSync(filepath, "utf8");
    
    // Injeção de rastreabilidade dinâmica na nuvem
    const header = `;;; =====================================================================================\n` +
                   `;;; SERVIDO POR LISPCENTRAL CLOUD PLATFORM v2.0 (SaaS)\n` +
                   `;;; Licença Ativa: ${userEmail}\n` +
                   `;;; Timestamp: ${new Date().toISOString()}\n` +
                   `;;; =====================================================================================\n`;
    
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(header + code);
  } catch (err) {
    console.error("Erro ao ler rotina:", err);
    return res.status(500).send("Error interno al leer la rutina.");
  }
});

/**
 * API Endpoint para Telemetría y Reportes de Errores
 * GET /telemetry?apiKey=...&hwId=...&acadVer=...&status=...&details=...
 */
exports.telemetry = onRequest({ cors: true }, async (req, res) => {
  const apiKey = req.query.apiKey;
  const hwId = req.query.hwId || "unknown";
  const acadVer = req.query.acadVer || "unknown";
  const status = req.query.status || "INFO";
  const details = req.query.details || "No details provided";

  if (!apiKey) {
    return res.status(400).send("Error: API Key faltante.");
  }

  try {
    const db = admin.firestore();
    await db.collection("telemetry").add({
      apiKey: apiKey,
      hwId: hwId,
      acadVer: acadVer,
      status: status,
      details: details,
      timestamp: new Date().toISOString()
    });
    return res.status(200).send("Log guardado exitosamente.");
  } catch (err) {
    console.error("Error guardando telemetria:", err);
    return res.status(500).send("Error interno al guardar el log.");
  }
});
