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
  const apiKey = req.query.apiKey;
  const routineId = req.query.routine;

  if (!apiKey) {
    return res.status(400).send("Error: API Key faltante.");
  }

  // MVP: Chave de teste estática
  if (apiKey !== "lispcentral_test_key") {
    return res.status(401).send("Error: API Key no autorizada.");
  }

  if (!routineId) {
    return res.status(400).send("Error: ID de rutina faltante.");
  }

  // Sanitização de segurança básica para evitar Path Traversal
  const safeRoutineId = routineId.replace(/[^a-zA-Z0-9_]/g, "");
  const filename = `${safeRoutineId}.lsp`;
  const filepath = path.join(__dirname, "lisp", filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).send("Error: Rutina no encontrada en el servidor.");
  }

  try {
    const code = fs.readFileSync(filepath, "utf8");
    
    // Injeção de rastreabilidade dinâmica na nuvem
    const header = `;;; =====================================================================================\n` +
                   `;;; SERVIDO POR LISPCENTRAL CLOUD PLATFORM v1.0 (MVP)\n` +
                   `;;; Licença Ativa: aldamadaniel1984@gmail.com\n` +
                   `;;; Timestamp: ${new Date().toISOString()}\n` +
                   `;;; =====================================================================================\n`;
    
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(header + code);
  } catch (err) {
    console.error("Erro ao ler rotina:", err);
    return res.status(500).send("Error interno al leer la rutina.");
  }
});
