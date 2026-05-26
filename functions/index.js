const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function getDb() {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin.firestore();
}

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
    "LC_JOINTS": "structures_pro",
    "LC_BUILD": "structures_pro",
    "LC_CLEAN": "core",
    "LC_FLATZ": "core",
    "LC_TLEN": "quantities",
    "LC_TAREA": "quantities",
    "LC_AUTONUM": "arquitetura",
    "LC_ZLABEL": "topografia"
  };

  try {
    // 1. Buscar al usuario por API Key en Firestore
    const db = getDb();
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("apiKey", "==", apiKey).limit(1).get();

    if (snapshot.empty) {
      // Sigue permitiendo las trial keys temporales para no romper lo que ya está en vivo
      if (apiKey !== "lispcentral_test_key" && !apiKey.startsWith("trial_tmd_")) {
        return res.status(401).send("Error: API Key no autorizada o expirada.");
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
      return res.status(403).send(`Error: Comando ${routineId} no autorizado para esta licencia.`);
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
    
    // Tratamos de buscar el archivo original. Si no existe y es LC_, intentamos con el prefijo legacy TMD_
    let filename = `${safeRoutineId}.lsp`;
    let isLC = safeRoutineId.startsWith("LC_");
    let originalName = safeRoutineId;
    let filepath = path.join(__dirname, "lisp", filename);

    if (!fs.existsSync(filepath) && isLC) {
      filename = filename.replace("LC_", "TMD_");
      originalName = safeRoutineId.replace("LC_", "TMD_");
      filepath = path.join(__dirname, "lisp", filename);
    }

    if (!fs.existsSync(filepath)) {
      return res.status(404).send(`Error: Rutina ${originalName} no encontrada en el servidor.`);
    }

    let code = fs.readFileSync(filepath, "utf8");
    
    // OFUSCACIÓN BÁSICA Y TRANSPOSICIÓN
    if (isLC) {
      // Reemplazamos las definiciones locales c:TMD_ por c:LC_
      code = code.replace(/c:TMD_/gi, "c:LC_");
      // Reemplazamos llamadas internas si es necesario TMD_ por LC_
      code = code.replace(/\(TMD_/gi, "(LC_");
    }

    // Remover comentarios (líneas que empiezan con ; o bloques completos de comentarios)
    // Esto minifica y ofusca el código enviado al cliente.
    code = code.replace(/;+.*$/gm, ""); // Remueve comentarios
    code = code.replace(/^\s*[\r\n]/gm, ""); // Remueve lineas vacías

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
 * API Endpoint para obtener catálogos de Firestore y enviarlos a AutoCAD en formato plano
 * GET /getCatalog?type=W_Profiles
 */
exports.getCatalog = onRequest({ cors: true }, async (req, res) => {
  const catalogType = req.query.type;
  
  if (!catalogType) {
    return res.status(400).send("Error: Parametro 'type' faltante.");
  }

  try {
    const db = getDb();
    const snapshot = await db.collection("catalogs").doc(catalogType).collection("items").where("active", "==", true).get();
    
    if (snapshot.empty) {
      return res.status(404).send(""); // Vacío si no hay datos
    }

    // Generamos un string delimitado por comas para que AutoLISP lo parsee fácilmente
    // Ejemplo de formato: Nombre,h,bf,tw,tf,peso
    let csvData = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      // Formato estandarizado que LISP puede leer con un loop
      csvData += `${data.name},${data.h},${data.bf},${data.tw},${data.tf},${data.weight}\n`;
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(csvData);
  } catch (err) {
    console.error("Erro ao buscar catálogo:", err);
    return res.status(500).send("Error interno de BD.");
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
    const db = getDb();
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

/**
 * API Endpoint para generar y descargar el Loader seguro
 * GET /generateLoader?apiKey=...
 */
exports.generateLoader = onRequest({ cors: true }, async (req, res) => {
  const apiKey = req.query.apiKey;

  if (!apiKey) {
    return res.status(400).send("Error: API Key faltante.");
  }

  // Validación básica del formato o contra Firestore si se desea mayor seguridad
  // Para el MVP, si llega la key, generamos el archivo.
  
  // Leemos la plantilla desde el archivo externo
  const templatePath = path.join(__dirname, "loader_template.lsp");
  let lispTemplate = fs.readFileSync(templatePath, "utf8");
  lispTemplate = lispTemplate.replace("{{API_KEY}}", apiKey);

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=\"LC_Loader.lsp\"");
  return res.status(200).send(lispTemplate);
});

/**
 * AI AGENT SUPERVISOR (Mockup/Esqueleto)
 * Escucha nuevos feedbacks y los procesa con IA
 */
exports.aiFeedbackMonitor = onDocumentCreated("feedback/{docId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();

  console.log(`[AI AGENT] Analizando nuevo feedback de ${data.userEmail}: ${data.message}`);
  
  // Aquí se llamaría a la API de OpenAI/Gemini con un prompt
  const category = data.message.toLowerCase().includes('erro') || data.message.toLowerCase().includes('bug') ? 'bug' : 'sugerencia';
  
  return snapshot.ref.update({
    aiProcessed: true,
    aiCategory: category,
    aiSentiment: "neutral"
  });
});

/**
 * AI AGENT SUPERVISOR (Mockup/Esqueleto)
 * Escucha nuevos reportes de errores (telemetry) para agrupar y diagnosticar
 */
exports.aiTelemetryMonitor = onDocumentCreated("telemetry/{docId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();

  if (data.status === "ERROR") {
    console.log(`[AI AGENT] Diagnosticando error crítico: ${data.details}`);
    // Integración de IA para leer el 'details' (código de error LISP) y proponer parche.
    return snapshot.ref.update({
      aiProcessed: true,
      aiRecommendation: "Revisar logs en AutoCAD. Posible error de tipos LISP."
    });
  }
});
