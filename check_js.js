const fs = require('fs');
const path = require('path');

const jsDir = 'Z:\\Autocad Config\\LISP\\web\\src\\components\\tools\\patterns';
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

let notFound = [];
files.forEach(f => {
    const content = fs.readFileSync(path.join(jsDir, f), 'utf-8');
    const match = content.match(/iconUrl:\s*'\/patterns\/(.+?\.svg)'/);
    if (match) {
        const svg = match[1];
        if (!fs.existsSync(path.join('Z:\\Autocad Config\\LISP\\web\\public\\patterns', svg))) {
            notFound.push(svg);
        }
    }
});
console.log('Total JS files: ' + files.length);
console.log('SVGs missing on disk referenced in JS: ' + notFound.length);
if (notFound.length > 0) console.log(notFound.slice(0, 10));
