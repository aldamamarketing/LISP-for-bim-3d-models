const { onRequest } = require("firebase-functions/v2/https");
const fs = require("fs");
const path = require("path");

function getDb() {
  const admin = require("firebase-admin");
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin.firestore();
}

exports.getCatalog = onRequest({ cors: true }, async (req, res) => {
  const catalogType = req.query.type;
  if (!catalogType) return res.status(400).send("Error: Parametro 'type' faltante.");
  try {
    const db = getDb();
    const snapshot = await db.collection("catalogs").doc(catalogType).collection("items").where("active", "==", true).get();
    if (snapshot.empty) return res.status(404).send("");
    let csvData = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      csvData += `${data.name},${data.h},${data.bf},${data.tw},${data.tf},${data.weight}\n`;
    });
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(csvData);
  } catch (err) {
    return res.status(500).send("Error interno de BD.");
  }
});

exports.telemetry = onRequest({ cors: true }, async (req, res) => {
  const apiKey = req.query.apiKey;
  if (!apiKey) return res.status(400).send("Error: API Key faltante.");
  try {
    const db = getDb();
    await db.collection("telemetry").add({
      apiKey: apiKey,
      hwId: req.query.hwId || "unknown",
      acadVer: req.query.acadVer || "unknown",
      status: req.query.status || "INFO",
      details: req.query.details || "No details provided",
      timestamp: new Date().toISOString()
    });
    return res.status(200).send("Log guardado exitosamente.");
  } catch (err) {
    return res.status(500).send("Error interno.");
  }
});

exports.generateLoader = onRequest({ cors: true }, async (req, res) => {
  const apiKey = req.query.apiKey;
  if (!apiKey) return res.status(400).send("Error: API Key faltante.");
  const templatePath = path.join(__dirname, "loader_template.lsp");
  let lispTemplate = fs.readFileSync(templatePath, "utf8");
  lispTemplate = lispTemplate.replace("{{API_KEY}}", apiKey);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=\"LC_Loader.lsp\"");
  return res.status(200).send(lispTemplate);
});
