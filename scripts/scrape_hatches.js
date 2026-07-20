const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_URL = 'https://www.rvtfiles.com/download-free-revit-hatch-pattern-third-page';
const BASE_ZYRO = 'https://assets.zyrosite.com/Awvj08R1ZPhBLyW4/';
const OUTPUT_DIR = path.join(__dirname, '../web/public/hatches/assets');
const CATALOG_PATH = path.join(__dirname, '../web/public/hatches/catalog.json');

// Crear directorios si no existen
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      return resolve(dest); // Skip if already downloaded
    }
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlink(dest, () => reject(`Failed with status: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err.message));
    });
  });
}

function categorize(name) {
  const lowName = name.toLowerCase();
  if (lowName.includes('wood') || lowName.includes('board') || lowName.includes('timber')) return 'Wood';
  if (lowName.includes('brick') || lowName.includes('masonry')) return 'Brick';
  if (lowName.includes('stone') || lowName.includes('rock') || lowName.includes('rubble') || lowName.includes('gravel')) return 'Stone';
  if (lowName.includes('tile') || lowName.includes('paver')) return 'Tile';
  if (lowName.includes('concrete') || lowName.includes('sand') || lowName.includes('earth')) return 'Concrete / Earth';
  if (lowName.includes('roof') || lowName.includes('shingle')) return 'Roofing';
  if (lowName.includes('glass') || lowName.includes('panel')) return 'Architecture';
  return 'General';
}

function formatName(filename) {
  // Ej: rf_pat_wood-planks_01a-mP4o... -> Wood Planks 01a
  let clean = filename.replace(/^rf_pat_/, '').split('-')[0];
  clean = clean.replace(/_/g, ' ').replace(/-/g, ' ');
  return clean.replace(/\b\w/g, c => c.toUpperCase());
}

async function scrape() {
  console.log(`Fetching ${TARGET_URL}...`);
  
  const html = await new Promise((resolve, reject) => {
    let data = '';
    https.get(TARGET_URL, (res) => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  // Extraer PATs
  const patRegex = /href=\"(https:\/\/assets\.zyrosite\.com\/Awvj08R1ZPhBLyW4\/([^\"]+\.pat))\"/g;
  const pats = [];
  let m;
  while ((m = patRegex.exec(html)) !== null) {
    pats.push({ url: m[1], filename: m[2] });
  }

  // Extraer JPGs
  const imgRegex = /src=\"(https:\/\/assets\.zyrosite\.com\/cdn-cgi\/image\/[^\/]+\/Awvj08R1ZPhBLyW4\/([^\"]+\.jpg))\"/g;
  const imgs = [];
  while ((m = imgRegex.exec(html)) !== null) {
    imgs.push({ url: m[1], filename: m[2] });
  }

  // Agrupar por prefijo
  const items = [];
  const seenPrefixes = new Set();
  let idCounter = 1;

  for (const pat of pats) {
    // Prefix: rf_pat_name-hash.pat -> rf_pat_name
    const prefix = pat.filename.substring(0, pat.filename.lastIndexOf('-'));
    
    if (seenPrefixes.has(prefix)) continue;
    seenPrefixes.add(prefix);

    // Buscar imagen correspondiente
    const img = imgs.find(i => i.filename.startsWith(prefix + '-'));
    if (!img) continue; // Si no hay imagen, saltar

    const name = formatName(pat.filename);
    const category = categorize(name);

    // Obtener la URL original de Zyro (sin cdn-cgi)
    const imgUrlOriginal = BASE_ZYRO + img.filename;

    items.push({
      id: `HATCH_${idCounter.toString().padStart(4, '0')}`,
      name: name,
      category: category,
      originalPatFile: pat.filename,
      originalImgFile: img.filename,
      patUrl: pat.url,
      imgUrl: imgUrlOriginal
    });
    idCounter++;
  }

  console.log(`Found ${items.length} unique hatch patterns.`);

  const catalog = [];
  
  for (const item of items) {
    const localPatPath = path.join(OUTPUT_DIR, item.originalPatFile);
    const localImgPath = path.join(OUTPUT_DIR, item.originalImgFile);
    
    console.log(`Downloading ${item.name}...`);
    try {
      await downloadFile(item.patUrl, localPatPath);
      await downloadFile(item.imgUrl, localImgPath);
      
      catalog.push({
        id: item.id,
        name: item.name,
        category: item.category,
        pat_url: `/hatches/assets/${item.originalPatFile}`,
        image_url: `/hatches/assets/${item.originalImgFile}`
      });
    } catch(err) {
      console.error(`Failed to download ${item.name}: ${err}`);
    }
  }

  // Guardar catálogo
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(`\nSuccess! Catalog saved with ${catalog.length} items at ${CATALOG_PATH}`);
}

scrape().catch(console.error);
