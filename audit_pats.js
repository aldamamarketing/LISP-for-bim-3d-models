const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dir = path.join(__dirname, 'web/public/patterns');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

let md = '| # | Archivo SVG | Estado | Líneas PAT (aprox) |\n';
md += '|---|---|---|---|\n';

let success = 0;
let fail = 0;
let index = 1;

files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        const dom = new JSDOM(content, { contentType: "image/svg+xml" });
        const doc = dom.window.document;
        const elements = doc.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse');
        let patLineCount = 0;
        
        elements.forEach(el => {
            const tagName = el.tagName.toLowerCase();
            if (tagName === 'path') {
               const d = el.getAttribute('d');
               patLineCount += (d ? (d.length / 10) : 10);
            } else if (tagName === 'circle' || tagName === 'ellipse') {
               patLineCount += 36;
            } else {
               patLineCount += 2;
            }
        });

        md += '| ' + index + ' | ' + file + ' | ? OK | ~' + Math.round(patLineCount) + ' |\n';
        success++;
    } catch(e) {
        md += '| ' + index + ' | ' + file + ' | ? FAIL | ' + e.message + ' |\n';
        fail++;
    }
    index++;
});

md += '\n\n**Resumen:** ' + success + ' exitosos, ' + fail + ' fallidos.\n';

fs.writeFileSync('C:\\Users\\TM PROJETOS\\.gemini\\antigravity-ide\\brain\\ea6716b3-be57-452a-8b1c-adee939efc48\\audit_report.md', md);
console.log('Report generated');
