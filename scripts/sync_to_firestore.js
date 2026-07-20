const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'lispcentral';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

console.log("Getting access token...");
const token = execSync('gcloud auth print-access-token').toString().trim();

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

const WEB_PUBLIC_DIR = path.join(__dirname, '../web/public');
const VISUAL_MATCHES_PATH = path.join(__dirname, 'visual_matches.json');
const HATCH_CATALOG = path.join(__dirname, '../web/public/hatches/catalog.json');
const CADAUTH_CATALOG = path.join(__dirname, '../web/public/hatches-cadauth/catalog.json');

async function deleteQuery(type) {
    console.log(`\nDeleting existing ${type} from publicAssets...`);
    const queryPayload = {
        structuredQuery: {
            from: [{ collectionId: 'publicAssets' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'type' },
                    op: 'EQUAL',
                    value: { stringValue: type }
                }
            }
        }
    };

    const res = await fetch(`${BASE_URL}:runQuery`, {
        method: 'POST',
        headers,
        body: JSON.stringify(queryPayload)
    });

    if (!res.ok) {
        console.error(`Error querying ${type}:`, await res.text());
        return;
    }

    const results = await res.json();
    for (const doc of results) {
        if (doc.document && doc.document.name) {
            console.log(`Deleting ${doc.document.name}...`);
            const delRes = await fetch(`https://firestore.googleapis.com/v1/${doc.document.name}`, {
                method: 'DELETE',
                headers
            });
            if (!delRes.ok) {
                console.error(`Failed to delete ${doc.document.name}`);
            }
        }
    }
}

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

async function processCatalog(catalogPath, baseType) {
    if (!fs.existsSync(catalogPath)) return;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    
    for (const item of catalog) {
        if (!item.matched) continue;
        
        let patFile = item.pat_url ? path.join(WEB_PUBLIC_DIR, item.pat_url) : path.join(path.dirname(catalogPath), item.pat_file);
        let svgFile = item.img_url ? path.join(WEB_PUBLIC_DIR, item.img_url.startsWith('/') ? item.img_url.substring(1) : item.img_url) : null;
        
        if (!fs.existsSync(patFile) || !svgFile || !fs.existsSync(svgFile)) {
            console.log(`[SKIP] Missing files for ${item.id}`);
            continue;
        }

        const patCode = fs.readFileSync(patFile, 'utf-8');
        let iconUrl = '';
        const stats = fs.statSync(svgFile);
        if (stats.size > 700000) {
            iconUrl = item.img_url.startsWith('/') ? item.img_url : `/${item.img_url}`;
        } else {
            const svgCode = fs.readFileSync(svgFile, 'utf-8');
            iconUrl = `data:image/svg+xml;base64,${Buffer.from(svgCode).toString('base64')}`;
        }
        
        const docId = `hatch_${baseType}_${item.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        
        await createOrUpdateDocument(docId, {
            id: docId,
            type: 'hatch',
            name: item.name || item.id,
            description: item.description || "Hatch Pattern",
            category: item.category || (item.categories ? item.categories[0] : (baseType === 'cadauth' ? 'CADAuthority' : 'General')),
            code: patCode,
            iconUrl: iconUrl
        });
        console.log(`[OK] Uploaded catalog match: ${item.id} -> ${docId}`);
    }
}

async function processVisualMatches() {
    if (!fs.existsSync(VISUAL_MATCHES_PATH)) return;
    const matches = JSON.parse(fs.readFileSync(VISUAL_MATCHES_PATH, 'utf-8'));
    
    let catalog = [];
    if (fs.existsSync(HATCH_CATALOG)) {
        catalog = JSON.parse(fs.readFileSync(HATCH_CATALOG, 'utf-8'));
    }

    for (const [patId, svgName] of Object.entries(matches)) {
        if (!svgName) continue;
        
        const catItem = catalog.find(c => c.id === patId);
        if (!catItem || !catItem.pat_url) {
            console.log(`[SKIP] Could not find info in catalog for ${patId}`);
            continue;
        }

        const patFile = path.join(WEB_PUBLIC_DIR, catItem.pat_url);
        const svgFile = path.join(WEB_PUBLIC_DIR, 'hatches-cadauth/assets', svgName);
        
        if (!fs.existsSync(patFile) || !fs.existsSync(svgFile)) {
            console.log(`[SKIP] Missing files for ${patId}`);
            continue;
        }

        const patCode = fs.readFileSync(patFile, 'utf-8');
        let iconUrl = '';
        const stats = fs.statSync(svgFile);
        if (stats.size > 700000) {
            iconUrl = `/hatches-cadauth/assets/${svgName}`;
        } else {
            const svgCode = fs.readFileSync(svgFile, 'utf-8');
            iconUrl = `data:image/svg+xml;base64,${Buffer.from(svgCode).toString('base64')}`;
        }
        
        const docId = `hatch_visual_${patId.toLowerCase()}`;
        await createOrUpdateDocument(docId, {
            id: docId,
            type: 'hatch',
            name: catItem.name || patId,
            description: catItem.description || "Hatch Pattern",
            category: catItem.category || 'General',
            code: patCode,
            iconUrl: iconUrl
        });
        console.log(`[OK] Uploaded visual match: ${patId} -> ${docId}`);
    }
}

async function run() {
    await deleteQuery('hatch');
    await deleteQuery('cadauth');
    
    console.log("\nProcessing hatches/catalog.json...");
    await processCatalog(HATCH_CATALOG, 'revit');
    
    console.log("\nProcessing hatches-cadauth/catalog.json...");
    await processCatalog(CADAUTH_CATALOG, 'cadauth');
    
    console.log("\nProcessing visual matches...");
    await processVisualMatches();
}

run().catch(console.error);
