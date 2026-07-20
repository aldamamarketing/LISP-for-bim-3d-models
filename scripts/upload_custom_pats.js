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
    console.error("Error al obtener el token. Asegúrate de estar logueado con 'gcloud auth login'.");
    process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

const PATS_DIR = path.join(__dirname, '../web/public/Pats');
const SVG_DIR = path.join(__dirname, '../web/public/patterns');

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

function formatName(base) {
    return base.replace(/_/g, ' ')
               .replace(/\b\w/g, c => c.toUpperCase());
}

async function uploadCustomPats() {
    if (!fs.existsSync(PATS_DIR)) {
        console.error(`Directorio no encontrado: ${PATS_DIR}`);
        return;
    }

    const files = fs.readdirSync(PATS_DIR).filter(f => f.endsWith('.pat'));
    console.log(`Se encontraron ${files.length} archivos .pat para subir.`);

    let success = 0;
    for (const patFile of files) {
        const baseName = path.basename(patFile, '.pat');
        const patPath = path.join(PATS_DIR, patFile);
        const svgPath = path.join(SVG_DIR, `${baseName}.svg`);

        if (!fs.existsSync(svgPath)) {
            console.log(`[OMITIDO] No se encontró el SVG correspondiente para: ${baseName}`);
            continue;
        }

        const patCode = fs.readFileSync(patPath, 'utf-8');
        const svgCode = fs.readFileSync(svgPath, 'utf-8');
        
        // Base64 para el ícono visual
        const iconUrl = `data:image/svg+xml;base64,${Buffer.from(svgCode).toString('base64')}`;
        
        // ID único para Firestore
        const docId = `hatch_custom_${baseName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        
        try {
            await createOrUpdateDocument(docId, {
                id: docId,
                type: 'hatch',
                name: formatName(baseName),
                description: "Generado en CAD (LispCentral)",
                category: "Custom",
                code: patCode,
                iconUrl: iconUrl,
                pat_url: `/Pats/${baseName}.pat`,
                img_url: `/patterns/${baseName}.svg`
            });
            console.log(`[ÉXITO] Subido: ${baseName}`);
            success++;
        } catch (e) {
            console.error(`[ERROR] Falló al subir ${baseName}: ${e.message}`);
        }
    }
    
    console.log(`\n¡Listo! Se subieron ${success} patrones a la base de datos de producción.`);
}

uploadCustomPats().catch(console.error);
