const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'lispcentral';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

console.log("Obteniendo token de acceso de Google Cloud...");
let token;
try {
    token = execSync('gcloud auth print-access-token').toString().trim();
} catch (e) {
    console.error("Error al obtener el token.");
    process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

const PATS_DIR = path.join(__dirname, '../web/public/Pats');
const SVG_DIR = path.join(__dirname, '../web/public/patterns');

const baseName = "1470x1635_j6";
const patContent = `*1470x1635_j6, Bandejas Modulares 1470x1635 junta 6mm
;; Generado manualmente por Antigravity
0, 0,0, 0,1641, 1470,-6
0, 0,1635, 0,1641, 1470,-6
90, 0,0, 0,1476, 1635,-6
90, 1470,0, 0,1476, 1635,-6
`;

const svgContent = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2952 3282" width="200" height="200">
	<style type="text/css">.shape {stroke-width: 4; vector-effect: non-scaling-stroke; fill:none; stroke: #000; stroke-linecap: round; stroke-linejoin: miter;}</style>
	<rect x="0" y="0" width="1470" height="1635" class="shape" />
	<rect x="1476" y="0" width="1470" height="1635" class="shape" />
	<rect x="0" y="1641" width="1470" height="1635" class="shape" />
	<rect x="1476" y="1641" width="1470" height="1635" class="shape" />
</svg>`;

async function createOrUpdateDocument(docId, data) {
    const url = `${BASE_URL}/publicAssets/${docId}`;
    
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string') fields[k] = { stringValue: v };
        else if (typeof v === 'number') fields[k] = { doubleValue: v };
        else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
        else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map(str => ({ stringValue: str })) } };
        else if (v === null) fields[k] = { nullValue: null };
    }

    const body = { fields };
    const updateMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
    
    const res = await fetch(`${url}?${updateMask}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        throw new Error(`Failed to upsert ${docId}: ${res.status} - ${await res.text()}`);
    }
}

async function run() {
    // 1. Guardar archivos localmente
    fs.writeFileSync(path.join(PATS_DIR, `${baseName}.pat`), patContent);
    fs.writeFileSync(path.join(SVG_DIR, `${baseName}.svg`), svgContent);
    console.log("Archivos locales creados.");

    // 2. Subir a Firestore
    const iconUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    const docId = `hatch_custom_${baseName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    await createOrUpdateDocument(docId, {
        id: docId,
        type: 'hatch',
        name: "1470x1635 Junta 6mm",
        description: "Bandejas Modulares o Falso Techo",
        category: "Custom",
        code: patContent,
        iconUrl: iconUrl,
        pat_url: `/Pats/${baseName}.pat`,
        img_url: `/patterns/${baseName}.svg`
    });
    console.log(`[ÉXITO] Patrón ${baseName} subido a Firestore.`);
}

run().catch(console.error);
