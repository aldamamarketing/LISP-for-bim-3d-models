const fs = require('fs');
const path = require('path');

const dataPath = 'C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\svgicons\\architextures_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const svgsDir = 'Z:\\Autocad Config\\LISP\\web\\public\\patterns';
const files = fs.readdirSync(svgsDir).filter(f => f.endsWith('.svg'));

// Create a map from hash -> full info
const hashInfo = {};
data.forEach(item => {
    if (item.thumbnail) {
        const hash = item.thumbnail.replace('/patterns/', '');
        const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '.svg';
        
        let cats = [];
        try {
            if (item.categories) cats = JSON.parse(item.categories);
        } catch(e) {}
        
        hashInfo[cleanName] = {
            svg: cleanName,
            name: item.name,
            categories: cats
        };
    }
});

// Build the final catalog for existing files
const finalCatalog = [];
files.forEach(file => {
    if (hashInfo[file]) {
        finalCatalog.push(hashInfo[file]);
    } else {
        // Find if any existing data matches
        let found = false;
        for (let key in hashInfo) {
            if (hashInfo[key].svg === file) {
                finalCatalog.push(hashInfo[key]);
                found = true;
                break;
            }
        }
        if (!found) {
            finalCatalog.push({
                svg: file,
                name: file.replace('.svg', ''),
                categories: []
            });
        }
    }
});

const outPath = 'Z:\\Autocad Config\\LISP\\web\\public\\api\\svg-catalog.json';
fs.writeFileSync(outPath, JSON.stringify(finalCatalog, null, 2));
console.log('Created svg-catalog.json with ' + finalCatalog.length + ' entries.');
