const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'lispcentral';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const QUARANTINE_DIR = path.join(__dirname, '../web/public/hatches/quarantine');
const CADAUTH_DIR = path.join(__dirname, '../web/public/hatches-cadauth');
const CATALOG_PATH = path.join(CADAUTH_DIR, 'catalog.json');
const MATCHES_PATH = path.join(__dirname, 'ai_matches.json');

console.log("Getting access token...");
const token = execSync('gcloud auth print-access-token').toString().trim();

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function createOrUpdateDocument(docId, data) {
  const url = `${BASE_URL}/publicAssets/${docId}`;
  
  // Convert our flat JS object to Firestore typed format
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (v === null) fields[k] = { nullValue: null };
  }

  const body = { fields };

  // Use PATCH to upsert (update if exists, create if not)
  // We need to provide updateMask for PATCH if we only want to update certain fields,
  // but if we don't provide it, it replaces the entire document. Wait, Firestore REST PATCH without updateMask
  // might fail or replace. Actually, to be safe, we just use PATCH with updateMask for all fields,
  // or just use the document. Wait, replacing the whole document is fine.
  
  // Wait, the correct way to upsert in REST API is PATCH without updateMask, but sometimes it requires updateMask.
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

async function run() {
  if (!fs.existsSync(MATCHES_PATH)) {
    console.log("No ai_matches.json found. Nothing to upload.");
    return;
  }

  const matches = JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf-8'));
  let catalog = [];
  if (fs.existsSync(CATALOG_PATH)) {
    catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  }

  const successfulKeys = [];

  for (const [patId, matchData] of Object.entries(matches)) {
    console.log(`\nProcessing ${patId}...`);
    
    // Find the PAT file
    const patFile = path.join(QUARANTINE_DIR, `${patId}.pat`);
    if (!fs.existsSync(patFile)) {
      console.log(`[SKIP] PAT file not found locally: ${patFile}`);
      continue;
    }

    // Find the SVG file
    // matchData.img_url is like "/hatches-cadauth/assets/octagon_square.svg" or "/hatches-cadauth/generated/HATCH_0001.svg"
    if (!matchData.img_url) {
      console.log(`[SKIP] No SVG image mapped for ${patId}`);
      continue;
    }
    
    // Convert public URL path to local file path
    // "/hatches-cadauth/..." -> "web/public/hatches-cadauth/..."
    const svgRelativePath = matchData.img_url.replace('/hatches-cadauth/', '');
    const svgFile = path.join(CADAUTH_DIR, svgRelativePath);
    
    if (!fs.existsSync(svgFile)) {
      console.log(`[SKIP] SVG file not found locally: ${svgFile}`);
      continue;
    }

    try {
      const patCode = fs.readFileSync(patFile, 'utf-8');
      const svgCode = fs.readFileSync(svgFile, 'utf-8');
      
      // Convert SVG to data URL
      const svgBase64 = Buffer.from(svgCode).toString('base64');
      const iconUrl = `data:image/svg+xml;base64,${svgBase64}`;

      const docId = `hatch_cadauth_${patId.toLowerCase()}`;
      
      const payload = {
        id: docId,
        type: 'hatch',
        name: patId,
        description: matchData.name || patId,
        category: 'CADAuthority',
        code: patCode,
        iconUrl: iconUrl
      };

      await createOrUpdateDocument(docId, payload);
      console.log(`[OK] Uploaded ${patId} to Firestore (${docId})`);
      
      // Upload successful, delete local files
      fs.unlinkSync(patFile);
      fs.unlinkSync(svgFile);
      console.log(`[CLEANUP] Deleted local files for ${patId}`);
      
      successfulKeys.push(patId);
      
    } catch (e) {
      console.error(`[ERROR] Failed processing ${patId}:`, e.message);
    }
  }

  // Update catalog and matches JSON to remove successful ones
  if (successfulKeys.length > 0) {
    catalog = catalog.filter(c => !successfulKeys.includes(c.id));
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    
    successfulKeys.forEach(k => delete matches[k]);
    fs.writeFileSync(MATCHES_PATH, JSON.stringify(matches, null, 2));
    
    console.log(`\nSuccess! Cleaned up ${successfulKeys.length} items from local environment.`);
  } else {
    console.log("\nNo items were successfully uploaded.");
  }
}

run().catch(console.error);
