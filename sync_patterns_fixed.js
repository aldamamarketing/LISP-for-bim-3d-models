const fs = require('fs');
const https = require('https');
const path = require('path');

const dataPath = 'C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\svgicons\\architextures_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const svgsDir = 'Z:\\Autocad Config\\LISP\\web\\public\\patterns';
if (!fs.existsSync(svgsDir)) fs.mkdirSync(svgsDir, { recursive: true });
const files = fs.readdirSync(svgsDir).filter(f => f.endsWith('.svg'));

let expectedMap = new Map();

data.forEach(item => {
    if (item.name && item.thumbnail) {
        const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '.svg';
        const url = 'https://assets.architextures.org' + item.thumbnail;
        if (!expectedMap.has(cleanName)) {
            expectedMap.set(cleanName, url);
        }
    }
});

let deletedCount = 0;
files.forEach(file => {
    if (!expectedMap.has(file)) {
        try {
            fs.unlinkSync(path.join(svgsDir, file));
            deletedCount++;
        } catch(e) {
            console.error('No se pudo borrar ' + file);
        }
    }
});

let toDownload = [];
for (let [name, url] of expectedMap.entries()) {
    if (!fs.existsSync(path.join(svgsDir, name))) {
        toDownload.push({ name, url });
    }
}

console.log('Archivos extras eliminados: ' + deletedCount);
console.log('Faltan por descargar: ' + toDownload.length);

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, response => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                reject(new Error(`Status: ${response.statusCode}`));
            }
        }).on('error', err => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function run() {
    let success = 0;
    for (let i = 0; i < toDownload.length; i++) {
        const item = toDownload[i];
        try {
            await downloadFile(item.url, path.join(svgsDir, item.name));
            success++;
        } catch(e) {
            console.error('Error descargando ' + item.name, e.message);
        }
    }
    console.log('Descargas exitosas: ' + success);
}

run();
