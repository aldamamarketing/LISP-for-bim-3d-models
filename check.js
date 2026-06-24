const fs = require('fs');

const dataPath = 'C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\svgicons\\architextures_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const svgsDir = 'Z:\\Autocad Config\\LISP\\web\\public\\patterns';
const files = fs.readdirSync(svgsDir).filter(f => f.endsWith('.svg'));

let expectedNames = new Set();
let duplicatesInJSON = [];
let nameToItem = {};

data.forEach(item => {
    if (item.name) {
        const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '.svg';
        if (expectedNames.has(cleanName)) {
            duplicatesInJSON.push(cleanName);
        } else {
            expectedNames.add(cleanName);
            nameToItem[cleanName] = item;
        }
    }
});

let missingSVGs = [];
for (let name of expectedNames) {
    if (!files.includes(name)) {
        missingSVGs.push(name);
    }
}

let extraSVGs = []; // SVGs we have that are not in Architextures JSON
files.forEach(file => {
    if (!expectedNames.has(file)) {
        extraSVGs.push(file);
    }
});

console.log('--- RESUMEN ---');
console.log('Total SVGs en carpeta: ' + files.length);
console.log('Total patrones en Architextures JSON: ' + expectedNames.size);
console.log('Faltantes (en JSON pero no descargados): ' + missingSVGs.length);
if(missingSVGs.length > 0) console.log(missingSVGs.slice(0, 10));

console.log('Extras (descargados pero no están en el JSON o se nombraron distinto): ' + extraSVGs.length);
if(extraSVGs.length > 0) console.log(extraSVGs.slice(0, 10));

console.log('Duplicados en JSON: ' + duplicatesInJSON.length);
if(duplicatesInJSON.length > 0) console.log(duplicatesInJSON);

