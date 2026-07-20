const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'lispcentral';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const QUARANTINE_DIR = path.join(__dirname, '../web/public/hatches/quarantine');
const CADAUTH_CATALOG = path.join(__dirname, '../web/public/hatches-cadauth/catalog.json');

// Ensure directories exist
fs.mkdirSync(QUARANTINE_DIR, { recursive: true });

// Get token
console.log("Getting access token...");
const token = execSync('gcloud auth print-access-token').toString().trim();

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

const MARKER_PAT = `*SQUARE_MARKER, Patrón temporal en revisión
0, 0,0, 0,10
90, 0,0, 0,10
`;

async function fetchDocuments(pageToken = '') {
  let url = `${BASE_URL}/publicAssets?pageSize=100`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
      throw new Error(`Failed to fetch documents: ${res.statusText}`);
  }
  return res.json();
}

async function updateDocument(name, newCode) {
  // name is already the full path like "projects/lispcentral/databases/(default)/documents/publicAssets/docId"
  const url = `https://firestore.googleapis.com/v1/${name}?updateMask=code`;
  const body = {
      fields: {
          code: { stringValue: newCode }
      }
  };

  const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
  });

  if (!res.ok) {
      throw new Error(`Failed to update ${name}: ${res.statusText}`);
  }
}

async function processPat(doc) {
  const fields = doc.fields;
  if (!fields) return null;

  const assetType = fields.type?.stringValue;
  if (assetType !== 'hatch') {
      return null;
  }

  const needsReview = fields.needsReview?.booleanValue;
  // If needsReview is missing, we might still want to extract it if the PAT code is in description
  // But let's log everything that is a hatch
  const docId = doc.name.split('/').pop();
  const name = fields.name?.stringValue || docId || 'UNNAMED';
  const rawPat = fields.code?.stringValue || fields.description?.stringValue || '';

  if (!rawPat.startsWith('*') && !rawPat.includes('SQUARE_MARKER')) {
      console.log(`[SKIPPED] ${name}: Description/code is not a PAT.`);
      return null;
  }

  if (rawPat.includes('SQUARE_MARKER')) {
      console.log(`[SKIPPED] ${name} is already a marker.`);
      return null;
  }

  // Limpieza simple del PAT
  let cleanPat = rawPat.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Guardar en cuarentena
  const patPath = path.join(QUARANTINE_DIR, `${name}.pat`);
  fs.writeFileSync(patPath, cleanPat);
  console.log(`[SAVED] ${name} to quarantine.`);

  // Actualizar en Firestore
  try {
      await updateDocument(doc.name, MARKER_PAT);
      console.log(`[UPDATED] ${name} in Firestore with marker.`);
  } catch (e) {
      console.error(`Failed to update ${name} in Firestore:`, e.message);
  }

  return {
      id: name,
      name: name,
      type: "cadauthority",
      pat_url: `/hatches/quarantine/${name}.pat`,
      img_url: "",
      source: "Firestore",
      description: cleanPat.split('\n')[0]
  };
}

async function run() {
  console.log("Starting extraction...");
  let pageToken = '';
  let extracted = [];
  
  do {
      const data = await fetchDocuments(pageToken);
      console.log(`Fetched page, got documents:`, data.documents ? data.documents.length : 0);
      if (!data.documents) break;
      
      for (const doc of data.documents) {
          try {
              const res = await processPat(doc);
              if (res) extracted.push(res);
          } catch(e) {
              console.error(`Error processing doc ${doc.name}:`, e.message);
          }
      }
      pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Finished extraction. Extracted ${extracted.length} patterns.`);

  // Append to catalog if needed for matcher
  if (extracted.length > 0) {
      let cadauthData = [];
      if (fs.existsSync(CADAUTH_CATALOG)) {
          cadauthData = JSON.parse(fs.readFileSync(CADAUTH_CATALOG, 'utf-8'));
      }
      
      // Merge, avoid duplicates by ID
      const newIds = new Set(extracted.map(x => x.id));
      cadauthData = cadauthData.filter(x => !newIds.has(x.id)).concat(extracted);
      
      fs.writeFileSync(CADAUTH_CATALOG, JSON.stringify(cadauthData, null, 2));
      console.log("Updated cadauth catalog with extracted items for matching.");
  }
}

run().catch(console.error);
