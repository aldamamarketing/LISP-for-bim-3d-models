const fs = require('fs');
const path = require('path');

const quarantineDir = path.join(__dirname, '../web/public/hatches/quarantine');
const catalogPath = path.join(__dirname, '../web/public/hatches-cadauth/catalog.json');
let catalogData = [];
if (fs.existsSync(catalogPath)) {
    catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
}

const files = fs.readdirSync(quarantineDir).filter(f => f.endsWith('.pat'));

const map = {};

files.forEach(file => {
    // Only target HT series variants.
    // e.g. HT1001ET -> dimension 100, variant 1ET
    const match = file.match(/^HT([\dxX]+)(\dET)\.pat$/);
    if (match) {
        const dimStr = match[1];
        const variant = match[2];
        const baseName = "HT_" + variant;
        if (!map[baseName]) map[baseName] = [];
        
        let sortValue = 0;
        if (dimStr.includes('x') || dimStr.includes('X')) {
            const parts = dimStr.toLowerCase().split('x');
            sortValue = parseInt(parts[0]) * parseInt(parts[1]);
        } else {
            sortValue = parseInt(dimStr);
        }
        
        map[baseName].push({ file: file, remainder: dimStr, val: sortValue });
    }
});

let deletedCount = 0;
let keptIds = new Set();
let deletedFiles = new Set();

for (const base in map) {
    const list = map[base];
    if (list.length <= 1) {
        keptIds.add(list[0].file.replace('.pat', '').toLowerCase());
        continue;
    }
    
    // Sort logic: if it's HT, sort by numeric dimension
    list.sort((a, b) => {
        // If string length is different, maybe prefer shorter string?
        if (a.val !== b.val) return a.val - b.val;
        return a.remainder.localeCompare(b.remainder);
    });
    
    console.log(`\nSerie: ${base}`);
    console.log(`  Mantenemos (más pequeño): ${list[0].file}`);
    keptIds.add(list[0].file.replace('.pat', '').toLowerCase());
    
    for (let i = 1; i < list.length; i++) {
        console.log(`  Borrando: ${list[i].file}`);
        deletedFiles.add(list[i].file.replace('.pat', '').toLowerCase());
        const p = path.join(quarantineDir, list[i].file);
        if (fs.existsSync(p)) {
            fs.unlinkSync(p);
        }
        deletedCount++;
    }
}

if (catalogData.length > 0) {
    const initialLen = catalogData.length;
    catalogData = catalogData.filter(item => {
        if (item.type === 'cadauthority') {
            const id = item.id.replace('hatch_', '').split('_').pop().toLowerCase();
            if (deletedFiles.has(id)) {
                return false;
            }
        }
        return true;
    });
    
    fs.writeFileSync(catalogPath, JSON.stringify(catalogData, null, 2));
    console.log(`\nCatálogo actualizado: eliminados ${initialLen - catalogData.length} registros.`);
}

console.log(`Eliminados ${deletedCount} archivos .pat duplicados.`);
