const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'lispcentral';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const WEB_PUBLIC_DIR = path.join(__dirname, '../web/public');
const REVIT_CATALOG = path.join(WEB_PUBLIC_DIR, 'hatches/catalog.json');
const CADAUTH_CATALOG = path.join(WEB_PUBLIC_DIR, 'hatches-cadauth/catalog.json');

console.log("Getting access token...");
const token = execSync('gcloud auth print-access-token').toString().trim();

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

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

  // Use PATCH to upsert
  const updateMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const patchUrl = `${url}?${updateMask}`;

  const res = await fetch(patchUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upsert ${docId}: ${res.status} ${res.statusText} - ${errorText}`);
  }
}

async function processCatalog(catalogPath) {
  if (!fs.existsSync(catalogPath)) return;
  
  let catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const successfulKeys = [];

  for (const item of catalog) {
    if (!item.matched || !item.img_url) continue;

    console.log(`\nProcessing ${item.id}...`);

    let patFile = null;
    if (item.pat_url) {
      patFile = path.join(WEB_PUBLIC_DIR, item.pat_url);
    } else if (item.pat_file) {
      // Falback if pat_url is missing
      const baseDir = path.dirname(catalogPath);
      patFile = path.join(baseDir, item.pat_file);
    }
    
    if (!patFile || !fs.existsSync(patFile)) {
      console.log(`[SKIP] PAT file not found locally: ${patFile}`);
      continue;
    }

    // SVG file
    const svgRelativePath = item.img_url.startsWith('/') ? item.img_url.substring(1) : item.img_url;
    const svgFile = path.join(WEB_PUBLIC_DIR, svgRelativePath);
    
    if (!fs.existsSync(svgFile)) {
      console.log(`[SKIP] SVG file not found locally: ${svgFile}`);
      continue;
    }

    try {
      const patCode = fs.readFileSync(patFile, 'utf-8');
      const svgCode = fs.readFileSync(svgFile, 'utf-8');
      
      const svgBase64 = Buffer.from(svgCode).toString('base64');
      const iconUrl = `data:image/svg+xml;base64,${svgBase64}`;

      const safeId = item.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      let typeToken = 'hatch';
      if (item.type === 'cadauthority') typeToken = 'cadauth';
      else if (item.type === 'revit') typeToken = 'revit';
      const docId = `hatch_${typeToken}_${safeId}`;
      
      const payload = {
        id: docId,
        type: 'hatch',
        name: item.name || item.id,
        description: item.description || "Hatch Pattern",
        category: item.category || (item.categories && item.categories.length > 0 ? item.categories[0] : (item.type === 'cadauthority' ? 'CADAuthority' : (item.type === 'revit' ? 'Revit' : 'General'))),
        code: patCode,
        iconUrl: iconUrl
      };

      if (item.categories && Array.isArray(item.categories)) {
          payload.tags = item.categories;
      }

      await createOrUpdateDocument(docId, payload);
      console.log(`[OK] Uploaded ${item.id} to Firestore (${docId})`);
      
      fs.unlinkSync(patFile);
      fs.unlinkSync(svgFile);
      console.log(`[CLEANUP] Deleted local files for ${item.id}`);
      
      successfulKeys.push(item.id);
      
    } catch (e) {
      console.error(`[ERROR] Failed processing ${item.id}:`, e.message);
    }
  }

  if (successfulKeys.length > 0) {
    catalog = catalog.filter(c => !successfulKeys.includes(c.id));
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    console.log(`\nSuccess! Cleaned up ${successfulKeys.length} items from ${catalogPath}.`);
  } else {
    console.log(`\nNo matched items were processed in ${catalogPath}.`);
  }
}

async function run() {
  console.log("Processing CADAuth Catalog...");
  await processCatalog(CADAUTH_CATALOG);
  
  console.log("\nProcessing Revit Catalog...");
  await processCatalog(REVIT_CATALOG);
}

run().catch(console.error);
