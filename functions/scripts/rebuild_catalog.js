const fs = require('fs');
const path = require('path');

const dataPath = 'C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\svgicons\\architextures_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const svgsDir = 'Z:\\Autocad Config\\LISP\\web\\public\\patterns';
const files = fs.readdirSync(svgsDir).filter(f => f.endsWith('.svg'));

// Create a map from cleanName -> full info
const validCatalog = [];
const addedNames = new Set();

data.forEach(item => {
    if (item.thumbnail && item.name) {
        const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '.svg';
        
        if (!addedNames.has(cleanName) && files.includes(cleanName)) {
            let cats = [];
            try {
                if (item.categories) cats = JSON.parse(item.categories);
            } catch(e) {}
            
            validCatalog.push({
                svg: cleanName,
                name: item.name,
                categories: cats
            });
            addedNames.add(cleanName);
        }
    }
});

const outPath = 'Z:\\Autocad Config\\LISP\\web\\public\\api\\svg-catalog.json';
fs.writeFileSync(outPath, JSON.stringify(validCatalog, null, 2));
console.log('Catálogo reconstruido con éxito. Entradas: ' + validCatalog.length);
