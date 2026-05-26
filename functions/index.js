const { onRequest } = require("firebase-functions/v2/https");

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
  const apiKey = Array.isArray(req.query.apiKey) ? req.query.apiKey[0] : req.query.apiKey;
  const routineId = Array.isArray(req.query.routine) ? req.query.routine[0] : req.query.routine;
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

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      userDocRef = userDoc.ref;
      const userData = userDoc.data();
      userEmail = userData.email || "Cliente Registrado";
      registeredDevice = userData.registeredDevice || null;
    }

    if (hwId && userDocRef) {
      if (!registeredDevice) {
        await userDocRef.update({ registeredDevice: hwId });
        registeredDevice = hwId;
      } else if (registeredDevice !== hwId) {
        const drmAlert = `(alert "\\n[LispCentral] PROTECAO ATIVADA:\\nEsta licenca ja esta em uso no computador: ${registeredDevice}.\\nVoce esta tentando usar a partir de: ${hwId}.\\n\\nAcesse o Portal do Cliente para desvincular seu equipamento antigo se necessario.")\n(princ)`;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(200).send(drmAlert);
      }
    }

    const lispDir = path.join(__dirname, "lisp");
    let responseCode = "";
    let routinesLoaded = [];

    if (routineId && routineId.toUpperCase() === "INDEX") {
      const files = fs.readdirSync(lispDir);
      const list = files
        .filter(file => file.endsWith(".lsp") && file !== "acaddoc.lsp" && file !== "TMD_Loader.lsp" && file !== "TM_Setup.lsp" && file !== "TM_SetupCore.lsp")
        .map(file => file.replace(".lsp", ""));
      
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(list.join(","));
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
      const safeRoutineId = routineId.replace(/[^a-zA-Z0-9_]/g, "");
      let filename = `${safeRoutineId}.lsp`;
      let isLC = safeRoutineId.startsWith("LC_");
      let originalName = safeRoutineId;
      let filepath = path.join(lispDir, filename);

      if (!fs.existsSync(filepath) && isLC) {
        filename = filename.replace("LC_", "TMD_");
        originalName = safeRoutineId.replace("LC_", "TMD_");
        filepath = path.join(lispDir, filename);
      }

      if (!fs.existsSync(filepath)) {
        return res.status(404).send(`Error: Rutina ${originalName} no encontrada en el servidor.`);
      }

      let code = fs.readFileSync(filepath, "utf8");
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
