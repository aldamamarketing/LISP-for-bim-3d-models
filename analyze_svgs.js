const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'web/public/patterns');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

let md = '| Archivo SVG | ViewBox (Ancho x Largo) | Curvas (path curvas) | Círculos/Elipses | Cantidad de Elementos (Líneas/Paths) |\n';
md += '|---|---|---|---|---|\n';

files.forEach(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Extrar viewBox
    const viewBoxMatch = content.match(/viewBox\s*=\s*['"]([^'"]+)['"]/i);
    let size = 'N/A';
    if (viewBoxMatch) {
        const parts = viewBoxMatch[1].split(/[ ,]+/);
        if (parts.length === 4) {
            size = parts[2] + ' x ' + parts[3];
        } else {
            size = viewBoxMatch[1];
        }
    } else {
        const wMatch = content.match(/width\s*=\s*['"]([^'"]+)['"]/i);
        const hMatch = content.match(/height\s*=\s*['"]([^'"]+)['"]/i);
        if (wMatch && hMatch) {
            size = wMatch[1] + ' x ' + hMatch[1];
        }
    }

    // Extraer paths y buscar curvas
    const pathRegex = /<path[^>]+d\s*=\s*['"]([^'"]+)['"]/gi;
    let hasCurve = false;
    let pathsCount = 0;
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
        pathsCount++;
        const d = match[1];
        if (/[CcQqSsTtAa]/.test(d)) {
            hasCurve = true;
        }
    }

    // Count lines, polylines, polygons, rects
    const linesCount = (content.match(/<line\s/gi) || []).length;
    const polylineCount = (content.match(/<polyline\s/gi) || []).length;
    const polygonCount = (content.match(/<polygon\s/gi) || []).length;
    const rectCount = (content.match(/<rect\s/gi) || []).length;

    const totalLines = pathsCount + linesCount + polylineCount + polygonCount + rectCount;

    // Count circles/ellipses
    const circleCount = (content.match(/<circle\s/gi) || []).length;
    const ellipseCount = (content.match(/<ellipse\s/gi) || []).length;
    const totalCircles = circleCount + ellipseCount;
    
    const hasCircleText = totalCircles > 0 ? 'Sí (' + totalCircles + ')' : 'No';
    const curveText = hasCurve ? 'Sí' : 'No';

    md += '| ' + file + ' | ' + size + ' | ' + curveText + ' | ' + hasCircleText + ' | ' + totalLines + ' |\n';
});

fs.writeFileSync('C:\\Users\\TM PROJETOS\\.gemini\\antigravity-ide\\brain\\ea6716b3-be57-452a-8b1c-adee939efc48\\svg_analysis_report.md', md);
console.log('Report generated');
