const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const engineCode = fs.readFileSync(path.join(__dirname, 'web/src/utils/SvgToPatEngine.js'), 'utf8');
const classCode = engineCode.replace('export class SvgToPatEngine', 'global.SvgToPatEngine = class SvgToPatEngine');
eval(classCode);

const dir = path.join(__dirname, 'web/public/patterns');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

let md = '| # | Archivo SVG | Instrucciones SVG | Lineas PAT (FUSIONADAS) | % Reduccion |\n';
md += '|---|---|---|---|---|\n';

let totalOriginal = 0;
let totalMerged = 0;
let index = 1;

global.DOMParser = new JSDOM().window.DOMParser;

files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        let originalCount = 0;
        
        const dom = new JSDOM(content, { contentType: "image/svg+xml" });
        const doc = dom.window.document;
        
        doc.querySelectorAll('path').forEach(p => {
             const d = p.getAttribute('d');
             if (d) {
                  let cmds = d.match(/[a-zA-Z][^a-zA-Z]*/g);
                  if (cmds) originalCount += cmds.length;
             }
        });
        originalCount += doc.querySelectorAll('line').length;
        originalCount += doc.querySelectorAll('rect').length * 4;

        const patCode = global.SvgToPatEngine.convertSvgToPat(content, 'test');
        const patLines = patCode.split('\n').length - 1;

        let diff = originalCount - patLines;
        let pct = originalCount > 0 ? Math.round((diff / originalCount) * 100) : 0;
        
        md += '| ' + index + ' | ' + file + ' | ' + originalCount + ' | **' + patLines + '** | ' + pct + '% |\n';
        
        totalOriginal += originalCount;
        totalMerged += patLines;
    } catch(e) {
        md += '| ' + index + ' | ' + file + ' | ERROR | ERROR | 0% |\n';
        console.error(e);
    }
    index++;
});

let totalPct = totalOriginal > 0 ? Math.round(((totalOriginal - totalMerged) / totalOriginal) * 100) : 0;
md += '\n\n**Resumen Global:** Instrucciones SVG Totales: ' + totalOriginal + ' | Lineas Finales en AutoCAD: ' + totalMerged + ' | **Reduccion Promedio: ' + totalPct + '%**\n';

fs.writeFileSync('C:\\Users\\TM PROJETOS\\.gemini\\antigravity-ide\\brain\\ea6716b3-be57-452a-8b1c-adee939efc48\\final_pat_audit_report.md', md);
console.log('Report generated successfully.');
