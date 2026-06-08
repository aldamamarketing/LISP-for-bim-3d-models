const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");

// Lazy imports de módulos nativos
function getOpenAI() {
  const OpenAI = require("openai");
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
  });
}

// Lazy imports de módulos nativos
function getDeps() {
  return {
    fs: require("fs"),
    path: require("path"),
    admin: require("firebase-admin")
  };
}

function getDb() {
  const { admin } = getDeps();
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin.firestore();
}

exports.getRoutine = onRequest({ cors: true }, async (req, res) => {
  const { fs, path } = getDeps();
  // Soporte de compatibilidad y arquitectura SaaS: token/lispId (Nuevo) o apiKey/routine (Legacy)
  const rawToken = req.query.token || req.query.apiKey;
  const rawLispId = req.query.lispId || req.query.routine;
  const apiKey = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const routineId = Array.isArray(rawLispId) ? rawLispId[0] : rawLispId;
  const rawHwId = Array.isArray(req.query.hwId) ? req.query.hwId[0] : req.query.hwId;
  
  // Decodifica espacios y caracteres especiales de URL en el hardware ID
  const hwId = rawHwId ? decodeURIComponent(rawHwId) : null;

  if (!apiKey) {
    return res.status(400).send("Error: API Key faltante.");
  }

  try {
    const db = getDb();
    const snapshot = await db.collection("users").where("apiKey", "==", apiKey).limit(1).get();

    if (snapshot.empty) {
      if (apiKey !== "lispcentral_test_key" && !apiKey.startsWith("trial_tmd_")) {
        return res.status(401).send("Error: API Key no autorizada.");
      }
    }

    let userEmail = "Trial User";
    let userDocRef = null;
    let registeredDevice = null;
    let userData = null;

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      userDocRef = userDoc.ref;
      userData = userDoc.data();
      userEmail = userData.email || "Cliente Registrado";
      registeredDevice = userData.registeredDevice || null;
    }
    // 1. Registrar el equipo en el Pool y evaluar Auto-Vinculación de Suite Global
    let isGlobalLinked = false;
    let hasGranularLicense = false;

    if (hwId && userDocRef && userData) {
      const { admin } = getDeps();
      const maxSeats = userData.maxSeats || 1;
      
      try {
        const devRef = db.collection("users").doc(userDocRef.id).collection("devices").doc(hwId);
        const devSnap = await devRef.get();
        
        if (devSnap.exists) {
          // Mantenemos soporte al flag legacy por si acaso
          if (devSnap.data().globalLinked === true) isGlobalLinked = true;
          // Actualizamos lastActive
          await devRef.update({ lastActive: admin.firestore.FieldValue.serverTimestamp() });
        } else {
          // El dispositivo es nuevo en el Pool
          await devRef.set({
            hwId: hwId,
            name: hwId,
            globalLinked: false, // La vinculación real ahora es vía suscripción
            lastActive: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Lógica de Suite Global mediante Subscriptions
        const globalSubId = `sub_global_${userDocRef.id}`;
        const globalSubRef = db.collection("subscriptions").doc(globalSubId);
        const globalSubSnap = await globalSubRef.get();
        
        if (globalSubSnap.exists) {
          const subData = globalSubSnap.data();
          const assignedDevices = subData.assignedDevices || [];
          
          if (assignedDevices.includes(hwId)) {
            // Verificar si NO está en sobregiro
            if (assignedDevices.length <= (subData.purchasedSeats || 1)) {
              isGlobalLinked = true; // El hwId ya tiene el asiento global asignado
            }
          } else if (subData.isAutoAssignable && assignedDevices.length < subData.purchasedSeats) {
            // Auto-asignar silenciosamente
            await globalSubRef.update({
              assignedDevices: admin.firestore.FieldValue.arrayUnion(hwId)
            });
            isGlobalLinked = true;
          }
        } else {
          // Fallback Legacy si no existe la suscripción global (ej. usuarios no migrados)
          if (!devSnap.exists) {
            const activeDevsSnap = await db.collection("users").doc(userDocRef.id).collection("devices")
              .where("globalLinked", "==", true)
              .get();
            let linkedCount = activeDevsSnap.size;
            const oldDevices = userData.registeredDevices || [];
            oldDevices.forEach(oldId => {
              if (!activeDevsSnap.docs.find(d => d.id === oldId)) linkedCount++;
            });
            if (linkedCount < maxSeats) {
              isGlobalLinked = true; 
              await devRef.update({ globalLinked: true });
            }
          }
        }
      } catch(e) { console.error("Error managing device:", e); }

      // 2. Validar Suscripciones de Terceros (Fase 3)
      try {
        const subSnap = await db.collection("subscriptions")
          .where("tenantId", "==", userDocRef.id)
          .where("assignedDevices", "array-contains", hwId)
          .get(); // Retiramos limit(1) para buscar la primera NO sobregirada
          
        if (!subSnap.empty) {
          for (const doc of subSnap.docs) {
            const subData = doc.data();
            if ((subData.assignedDevices || []).length <= (subData.purchasedSeats || 1)) {
              hasGranularLicense = true;
              break;
            }
          }
        }
      } catch(e) { console.error("Error checking subscriptions:", e); }

      // 3. Bloqueo si no tiene acceso por ninguna de las vías
      if (!isGlobalLinked && !hasGranularLicense) {
        const drmAlert = `(alert "\\n[TM Digital] PROTECAO ATIVADA:\\nLimite de assentos atingido (${maxSeats}).\\n\\nAcesse o Painel Web para desvincular um equipamento ou vincular manualmente este PC.")\n(princ)`;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(200).send(drmAlert);
      }
    }

    const lispDir = path.join(__dirname, "lisp");
    let responseCode = "";
    let routinesLoaded = [];

    if (routineId && routineId.toUpperCase() === "INDEX") {
      // Si el usuario es antiguo y no tiene activeSuites, le damos acceso a las básicas de la beta
      const activeSuites = userData.activeSuites || ["core", "structures_pro", "architecture", "quantities"];
      const lispsRef = db.collection("lispFiles").where("tenantId", "==", userDocRef.id);
      const snapshotLisps = await lispsRef.get();
      
      const commands = [];
      snapshotLisps.forEach(docSnap => {
        const data = docSnap.data();
        commands.push({
          name: data.lispId,
          friendly: data.friendlyName || data.lispId,
          desc: data.description || "Comando Cloud",
          group: data.group || "Custom Tools",
          doc: "#",
          svgIcon: data.svgIcon || ""
        });
      });
      
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).send(JSON.stringify(commands));
    }

    if (!routineId || routineId.toUpperCase() === "ALL") {
      const files = fs.readdirSync(lispDir);
      
      files.forEach(file => {
        if (file.endsWith(".lsp") && file !== "acaddoc.lsp" && file !== "TMD_Loader.lsp" && file !== "TM_Setup.lsp" && file !== "TM_SetupCore.lsp") {
          const filepath = path.join(lispDir, file);
          let filecode = fs.readFileSync(filepath, "utf8");
          
          filecode = filecode.replace(/;+.*$/gm, ""); 
          filecode = filecode.replace(/^\s*[\r\n]/gm, "");
          
          const escapedCode = filecode
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');
          
          responseCode += `\n;;; ROUTINE: ${file}\n` +
                          `(vl-catch-all-apply 'eval (list (read "(progn\\n${escapedCode}\\n(princ)\\n)"))) (princ)\n`;
          
          routinesLoaded.push(file.replace(".lsp", ""));
        }
      });
      
      const header = `;;; =====================================================================================\n` +
                     `;;; SERVIDO POR LISPCENTRAL CLOUD PLATFORM v2.0 (SaaS)\n` +
                     `;;; Pacote Consolidado de Ferramentas Carregado em RAM\n` +
                     `;;; Licença Ativa: ${userEmail}\n` +
                     `;;; Módulos incluídos: ${routinesLoaded.join(", ")}\n` +
                     `;;; Timestamp: ${new Date().toISOString()}\n` +
                     `;;; =====================================================================================\n`;
      
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(header + responseCode);

    } else {
      const safeRoutineId = routineId.replace(/[^a-zA-Z0-9_-]/g, "");
      let filename = `${safeRoutineId}.lsp`;
      let isLC = safeRoutineId.startsWith("LC_");
      let originalName = safeRoutineId;
      let filepath = path.join(lispDir, filename);

      if (!fs.existsSync(filepath) && isLC) {
        filename = filename.replace("LC_", "TMD_");
        originalName = safeRoutineId.replace("LC_", "TMD_");
        filepath = path.join(lispDir, filename);
      }

      let code = "";

      if (!fs.existsSync(filepath)) {
        // Búsqueda Global: Permitimos Cross-Tenant (Fase 3)
        if (!userDocRef) {
          return res.status(404).send(`Error: Rutina ${originalName} no encontrada.`);
        }

        const lispsSnapshot = await db.collection("lispFiles")
          .where("lispId", "==", safeRoutineId)
          .limit(1)
          .get();

        if (lispsSnapshot.empty) {
          return res.status(404).send(`Error: Rutina ${originalName} no encontrada en el ecosistema LispCentral.`);
        }

        const lispData = lispsSnapshot.docs[0].data();
        const creatorId = lispData.tenantId;

        // Validar si tiene derecho a usar este código
        let isAuthorizedForThisFile = false;
        if (creatorId === userDocRef.id) {
          // El propio creador. Ya pasó los checks de HWID arriba.
          isAuthorizedForThisFile = true;
        } else {
          // Cross-Tenant: Debe tener una licencia granular asignada a este HWID
          if (hasGranularLicense) {
             // TODO: Más adelante filtraremos por suiteId específico usando lispData.suiteId
             isAuthorizedForThisFile = true;
          }
        }

        if (!isAuthorizedForThisFile) {
          const authAlert = `(alert "\\n[LispCentral] ACCESO DENEGADO:\\nNo tienes una licencia asignada a este dispositivo para usar comandos de esta Suite.")\n(princ)`;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          return res.status(200).send(authAlert);
        }

        const { admin } = getDeps();
        const bucket = admin.storage().bucket("lispcentral.firebasestorage.app");
        const file = bucket.file(lispData.storagePath);
        
        try {
          const [content] = await file.download();
          code = content.toString("utf8");
        } catch (e) {
          return res.status(500).send(`Error: Fallo al descargar rutina del Workspace.`);
        }
      } else {
        // Leer localmente del Core
        code = fs.readFileSync(filepath, "utf8");
      }

      if (isLC) {
        code = code.replace(/c:TMD_/gi, "c:LC_");
        code = code.replace(/\(TMD_/gi, "(LC_");
      }

      // Minificación LISP estricta para inyección en RAM (Zero-Disk)
      code = code.replace(/;.*$/gm, ""); // Remover todos los comentarios
      code = code.replace(/\r\n/g, "\n"); // Normalizar saltos de línea
      // Envolvemos en progn en el backend para entregar una S-Expression perfecta
      code = `(progn\n${code}\n(princ)\n)`;


      const header = `;;; =====================================================================================\n` +
                     `;;; SERVIDO POR LISPCENTRAL CLOUD PLATFORM v2.0 (SaaS)\n` +
                     `;;; Licença Ativa: ${userEmail}\n` +
                     `;;; Timestamp: ${new Date().toISOString()}\n` +
                     `;;; =====================================================================================\n`;
      
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(header + code);
    }
  } catch (err) {
    console.error("Erro ao ler rotina:", err);
    return res.status(500).send("Error interno al leer la rutina.");
  }
});

exports.generateLoader = onRequest({ cors: true }, async (req, res) => {
  const { fs, path, admin } = getDeps();
  const token = req.query.token || req.query.apiKey;
  if (!token) return res.status(400).send("Falta Token.");

  const db = getDb();
  const snapshot = await db.collection("users").where("apiKey", "==", token).limit(1).get();
  if (snapshot.empty) return res.status(404).send("Token invalido.");

  const tenantName = snapshot.docs[0].data().name || "Cliente";

  const templatePath = path.join(__dirname, "loader_template.lsp");
  if (!fs.existsSync(templatePath)) {
    return res.status(500).send("Error interno: loader_template.lsp no encontrado.");
  }

  let loaderCode = fs.readFileSync(templatePath, "utf8");

  // Reemplazar variables dinámicas
  loaderCode = loaderCode.replace("{{SEAT_TOKEN}}", token);
  loaderCode = loaderCode.replace("{{TENANT_NAME}}", tenantName);

  res.setHeader("Content-Disposition", 'attachment; filename="LC_Loader.lsp"');
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.status(200).send(loaderCode);
});

// Endpoint para el Generador de Iconos IA
exports.generateIcons = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 300 }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { theme, styleOption, prompts } = req.body;

  if (!prompts || !Array.isArray(prompts)) {
    return res.status(400).send("Bad Request: prompts array required");
  }

  try {
    const openai = getOpenAI();

    const systemPrompt = `Eres un diseñador experto de iconos SVG.
Genera iconos limpios y profesionales basados en estos comandos o descripciones.

Contexto / Industria: ${theme}
El estilo visual que el usuario desea es: "${styleOption}". Usa esto como dirección de arte.

REGLAS DE DISEÑO ESTRICTAS (Bicolor/Tricolor):
1. Genera SIEMPRE 3 variaciones exactas para cada comando solicitado.
2. No uses colores hex (como #000000 o #FFFFFF). 
3. Para las líneas y trazados principales estáticos, usa EXACTAMENTE \`currentColor\`.
4. Para elementos dinámicos, flechas de acción o partes destacadas, usa EXACTAMENTE \`var(--icon-accent)\`.
5. Para rellenos suaves, sombras, elementos secundarios o fondos de apoyo, usa EXACTAMENTE \`var(--icon-secondary)\`.
6. Grosor de línea: Usa trazos finos y precisos (\`stroke-width="1.5"\` o \`1\`).
7. Bordes y uniones: Usa bordes rectos/cuadrados, NO redondeados. Usa \`stroke-linecap="square"\` y \`stroke-linejoin="miter"\`. Nada de "round".
8. El viewBox DEBE ser "0 0 32 32".
9. El código debe ser SVG puro. No pongas etiquetas XML extra. No pongas markdown. Solo el \`<svg>...</svg>\`.
10. FILTRO DE SEGURIDAD (CRÍTICO): RECHAZA cualquier icono de odio, desnudos, esvásticas, símbolos religiosos o discriminación. Si lo detectas, omítelo de los resultados.

INSTRUCCIONES DE FORMATO DE RESPUESTA:
Debes responder ÚNICAMENTE con un objeto JSON (sin markdown, sin bloques de código) con esta estructura exacta:
{
  "results": [
    { "id": "uuid1", "name": "Name in English", "category": "English Category", "filename": "SHORT_NAME", "description": "Short description in English", "svgCode": "<svg>...</svg>" },
    { "id": "uuid2", "filename": "NOMBRE_CORTO_VAR_2", "description": "Breve desc", "svgCode": "<svg>...</svg>" },
    { "id": "uuid3", "filename": "NOMBRE_CORTO_VAR_3", "description": "Breve desc", "svgCode": "<svg>...</svg>" }
  ]
}`;

    const userPrompt = `Comandos solicitados:\n${prompts.join('\n')}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "deepseek-chat",
      response_format: { type: "json_object" }
    });

    const jsonResult = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error("Error generando iconos:", error);
    return res.status(500).send("Error: " + error.message + " - Stack: " + error.stack);
  }
});

// Endpoint para generar Hatch Patterns (.pat)
exports.generateHatch = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 300 }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const { prompts, theme } = req.body;
  if (!prompts || !Array.isArray(prompts)) return res.status(400).send("Bad Request");

  try {
    const openai = getOpenAI();
    const systemPrompt = `Eres un experto matemático y programador en AutoLISP.
Genera patrones de sombreado (Hatch) de AutoCAD (.pat) basados en estas descripciones.
Contexto: ${theme}

REGLAS DE DISEÑO:
1. El código PAT debe ser válido matemáticamente. Formato: "ángulo, x-origen, y-origen, delta-x, delta-y, dash-1, dash-2".
   - ATENCIÓN CRÍTICA: "delta-x" es el desplazamiento PARALELO a la línea. "delta-y" es el desplazamiento PERPENDICULAR a la línea (separación entre líneas de la familia).
   - ERROR COMÚN A EVITAR: Para líneas verticales (ángulo 90), la separación entre columnas DEBE ir en "delta-y", NO en "delta-x". (Ej. "90, 0,0, 0,41" separa las líneas verticales 41 unidades. Si escribes "90, 0,0, 41,0", todas se dibujan en la misma columna X).
2. Genera exactamente 1 patrón de alta calidad por cada descripción.
3. PRECISIÓN ESTRUCTURAL Y DIMENSIONAL (CRÍTICO): 
   - Respeta escrupulosamente la geometría solicitada (ej. "matajuntas" o "stretcher bond" NO es "herringbone" o "espina de pez").
   - Si el usuario provee medidas (ej. 40x20cm, juntas de 1cm, ángulos), DEBES aplicar la matemática exacta para que las proporciones del Hatch reflejen esas medidas a escala 1:1.
4. TRUCO PARA MATAJUNTAS (STRETCHER BOND): Para ladrillos intercalados, NUNCA uses una cuadrícula continua. Las líneas verticales DEBEN ser segmentadas y desfasadas usando dash y delta-x. Fórmula para bloque LxC (Largo x Alto):
   - Horizontales: "0, 0,0, 0,C"
   - Verticales: "90, 0,0, C,L, C,-C"
5. Formato de salida: JSON con "results" Array: { "id": "uuid", "name": "English Name", "category": "Architecture", "filename": "SHORT_NAME", "description": "Concise description (e.g. 'Stretcher bond 40x20cm blocks with 1cm joints')", "patCode": "0, 0,0..." }. Devuelve SOLO las líneas matemáticas en patCode.
6. FILTRO DE SEGURIDAD (CRÍTICO): RECHAZA símbolos de odio, esvásticas, cruces, etc. Devuelve "results" vacío si detectas esto.`;

    const userPrompt = `Descripciones:\n${prompts.join('\n')}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      model: "deepseek-chat",
      response_format: { type: "json_object" }
    });

    const jsonResult = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error("Error generando hatch:", error);
    return res.status(500).send("Error: " + error.message);
  }
});

// Endpoint para generar Linetypes (.lin)
exports.generateLinetype = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 300 }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const { prompts } = req.body;
  if (!prompts || !Array.isArray(prompts)) return res.status(400).send("Bad Request");

  try {
    const openai = getOpenAI();
    const systemPrompt = `Eres un experto en AutoCAD.
Genera definiciones de tipos de línea complejos (.lin) basados en estas descripciones.

REGLAS DE DISEÑO:
1. El código LIN define la secuencia de pluma: trazo (positivo), espacio (negativo), punto (0), y texto/formas.
2. PRECISIÓN (CRÍTICO): Si el usuario provee medidas o textos, aplícalos de forma exacta en la definición LIN.
3. Formato de salida: Objeto JSON con una propiedad "results" que sea un Array con objetos: { "id": "uuid", "name": "Line Name in English", "category": "Engineering", "filename": "SHORT_NAME", "description": "DETAILED description in English including specs", "linCode": "A,10,-5..." }.
4. Devuelve SOLO la definición de la línea (empieza por A), NO incluyas el asterisco (*Nombre).
5. FILTRO DE SEGURIDAD (CRÍTICO): RECHAZA solicitudes con símbolos de odio, contenido adulto o discriminación devolviendo un "results" vacío.`;

    const userPrompt = `Descripciones:\n${prompts.join('\n')}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      model: "deepseek-chat",
      response_format: { type: "json_object" }
    });

    const jsonResult = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error("Error generando linetype:", error);
    return res.status(500).send("Error: " + error.message);
  }
});

// Endpoint para que la paleta embebida en AutoCAD obtenga los favoritos del usuario
// Autenticación por apiKey (token del Loader), sin necesidad de Firebase Auth SDK
exports.getUserResources = onRequest({ cors: true }, async (req, res) => {
  const token = req.query.token || req.query.apiKey;
  const type = req.query.type || 'hatch'; // 'hatch', 'lin', 'icon'

  if (!token) {
    return res.status(400).json({ error: "Token ausente." });
  }

  try {
    const db = getDb();

    // Buscar usuario por apiKey
    const userSnap = await db.collection("users").where("apiKey", "==", token).limit(1).get();
    if (userSnap.empty) {
      return res.status(401).json({ error: "Token inválido." });
    }

    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;

    // Obtener IDs de favoritos del usuario
    const favSnap = await db.collection(`users/${userId}/favorites`).get();
    const favIds = favSnap.docs.map(d => d.id);

    if (favIds.length === 0) {
      return res.status(200).json([]);
    }

    // Obtener los assets públicos que coincidan con los favoritos y el tipo
    const assetsSnap = await db.collection("publicAssets").where("type", "==", type).get();
    const results = assetsSnap.docs
      .filter(d => favIds.includes(d.id))
      .map(d => ({ id: d.id, ...d.data() }));

    res.setHeader("Cache-Control", "public, max-age=30"); // Cache corto para sync rápido
    return res.status(200).json(results);
  } catch (err) {
    console.error("Error en getUserResources:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// Trigger para crear la Suite Global Inicial automáticamente al registrar un nuevo usuario/tenant
exports.onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const userId = event.params.userId;
  const db = getDb();
  const { admin } = getDeps();
  
  try {
    // 1. Crear la Suite Global inmutable
    const globalSuiteId = `global_${userId}`;
    await db.collection("suites").doc(globalSuiteId).set({
      ownerId: userId,
      name: "Suite Global (Herramientas Propias)",
      description: "Agrupa todos tus comandos LISP subidos. Creada automáticamente por el sistema.",
      type: "global",
      visibility: "private",
      isEditable: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Crear la Suscripción Global (Entitlement) con 1 asiento auto-asignable
    const globalSubId = `sub_global_${userId}`;
    await db.collection("subscriptions").doc(globalSubId).set({
      suiteId: globalSuiteId,
      tenantId: userId,
      purchasedSeats: 1,
      assignedDevices: [],
      isGlobal: true,
      isAutoAssignable: true,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Global Suite and Subscription created for user ${userId}`);
  } catch (err) {
    console.error(`Error creating Global Suite for user ${userId}:`, err);
  }
});

// Endpoint Seguro para Asignar/Desasignar Equipos (Aplica Reglas de Negocio en Backend)
exports.toggleDeviceAssignment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debe estar autenticado.");
  }

  const { subId, deviceId, action } = request.data;
  if (!subId || !deviceId || !["assign", "unassign"].includes(action)) {
    throw new HttpsError("invalid-argument", "Parámetros inválidos.");
  }

  const db = getDb();
  const { admin } = getDeps();
  const subRef = db.collection("subscriptions").doc(subId);

  try {
    return await db.runTransaction(async (transaction) => {
      const subDoc = await transaction.get(subRef);
      if (!subDoc.exists) throw new HttpsError("not-found", "Suscripción no encontrada.");
      
      const subData = subDoc.data();
      if (subData.tenantId !== request.auth.uid) {
        throw new HttpsError("permission-denied", "No eres el dueño de esta suscripción.");
      }

      const currentAssigned = subData.assignedDevices || [];
      const purchasedSeats = subData.purchasedSeats || 1;
      const penaltyBox = subData.penaltyBox || {};

      if (action === "assign") {
        if (currentAssigned.includes(deviceId)) return { success: true }; // Ya asignado
        
        // 1. Regla de Negocio: Límite de Asientos
        if (currentAssigned.length >= purchasedSeats) {
          throw new HttpsError("resource-exhausted", `Límite de asientos alcanzado (${purchasedSeats}).`);
        }

        // 2. Regla de Negocio: Penalty Box (7 Días Cooldown)
        if (penaltyBox[deviceId]) {
          const unlinkedDate = penaltyBox[deviceId].toDate();
          const daysPassed = (new Date() - unlinkedDate) / (1000 * 60 * 60 * 24);
          if (daysPassed < 7) {
            const daysLeft = Math.ceil(7 - daysPassed);
            throw new HttpsError("failed-precondition", `Anti-Abuso: Espera ${daysLeft} días para reasignar este PC.`);
          }
        }

        const newAssigned = [...currentAssigned, deviceId];
        transaction.update(subRef, { assignedDevices: newAssigned });
        return { success: true, message: "Equipo asignado con éxito." };
      } 
      else if (action === "unassign") {
        if (!currentAssigned.includes(deviceId)) return { success: true };
        
        const newAssigned = currentAssigned.filter(id => id !== deviceId);
        const updates = { 
          assignedDevices: newAssigned,
          [`penaltyBox.${deviceId}`]: admin.firestore.FieldValue.serverTimestamp()
        };
        transaction.update(subRef, updates);
        return { success: true, message: "Equipo desvinculado. Bloqueado por 7 días." };
      }
    });
  } catch (error) {
    console.error("Error en toggleDeviceAssignment:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Error procesando la solicitud.");
  }
});
