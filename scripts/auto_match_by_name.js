const fs = require('fs');
const path = require('path');

const CADAUTH_CATALOG = path.join(__dirname, '../web/public/hatches-cadauth/catalog.json');
const ASSETS_DIR = path.join(__dirname, '../web/public/hatches-cadauth/assets');
const PATTERNS_DIR = path.join(__dirname, '../web/public/patterns');

let catalog = JSON.parse(fs.readFileSync(CADAUTH_CATALOG, 'utf-8'));
let matchedCount = 0;

const patFiles = [];
if (fs.existsSync(ASSETS_DIR)) {
    fs.readdirSync(ASSETS_DIR).filter(f => f.endsWith('.pat')).forEach(f => {
        patFiles.push({ file: f, dir: ASSETS_DIR, url: `/hatches-cadauth/assets/${f}` });
    });
}
if (fs.existsSync(PATTERNS_DIR)) {
    fs.readdirSync(PATTERNS_DIR).filter(f => f.endsWith('.pat')).forEach(f => {
        patFiles.push({ file: f, dir: PATTERNS_DIR, url: `/patterns/${f}` });
    });
}

patFiles.forEach(patInfo => {
    const baseName = patInfo.file.replace('.pat', '');
    const svgFile = path.join(patInfo.dir, baseName + '.svg');
    
    if (fs.existsSync(svgFile)) {
        // Find in catalog
        const idx = catalog.findIndex(c => c.pat_url === patInfo.url || c.id === baseName);
        if (idx !== -1) {
            if (!catalog[idx].matched) {
                catalog[idx].matched = true;
                catalog[idx].img_url = patInfo.url.replace('.pat', '.svg');
                matchedCount++;
                console.log(`Auto-matched: ${baseName}`);
            }
        }
    }
});

if (matchedCount > 0) {
    fs.writeFileSync(CADAUTH_CATALOG, JSON.stringify(catalog, null, 2));
    console.log(`Successfully auto-matched ${matchedCount} items in catalog.json!`);
} else {
    console.log(`No new auto-matches found.`);
}
