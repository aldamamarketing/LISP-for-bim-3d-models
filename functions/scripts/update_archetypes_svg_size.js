const fs = require('fs');
const path = require('path');

const catalogPath = 'Z:\\Autocad Config\\LISP\\web\\public\\api\\svg-catalog.json';
const patternsDir = 'Z:\\Autocad Config\\LISP\\web\\src\\components\\tools\\patterns';
const hatchEnginePath = 'Z:\\Autocad Config\\LISP\\web\\src\\components\\tools\\HatchEngine.js';

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

// Eliminar archivos JS viejos en patterns dir
const oldFiles = fs.readdirSync(patternsDir).filter(f => f.endsWith('.js'));
oldFiles.forEach(f => fs.unlinkSync(path.join(patternsDir, f)));

let imports = [];
let arrayItems = [];

catalog.forEach((item, idx) => {
    // Generar nombre de variable JS válido
    let baseName = item.svg.replace('.svg', '');
    let varName = 'arch_' + baseName;
    if (/^[0-9]/.test(varName)) {
        varName = '_' + varName;
    }
    varName = varName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Fallback de categoría
    let cat = (item.categories && item.categories.length > 0) ? item.categories[0] : 'General';
    
    // Leer el SVG para obtener sus dimensiones (viewBox o width/height)
    let svgWidth = 200;
    let svgHeight = 200;
    try {
        const svgContent = fs.readFileSync(path.join('Z:\\Autocad Config\\LISP\\web\\public\\patterns', item.svg), 'utf-8');
        
        // Intentar sacar del viewBox primero: viewBox="0 0 W H"
        const viewBoxMatch = svgContent.match(/viewBox=["'][\d\.\s]+\s+[\d\.\s]+\s+([\d\.]+)\s+([\d\.]+)["']/);
        if (viewBoxMatch) {
            svgWidth = Math.round(parseFloat(viewBoxMatch[1]));
            svgHeight = Math.round(parseFloat(viewBoxMatch[2]));
        } else {
            // Intentar sacar de width y height
            const wMatch = svgContent.match(/width=["']([\d\.]+)["']/);
            const hMatch = svgContent.match(/height=["']([\d\.]+)["']/);
            if (wMatch && hMatch) {
                svgWidth = Math.round(parseFloat(wMatch[1]));
                svgHeight = Math.round(parseFloat(hMatch[2]));
            }
        }
    } catch(e) {
        console.error("Error leyendo SVG " + item.svg, e.message);
    }
    
    const content = `export const ${varName} = {
  id: '${baseName}',
  name: '${item.name.replace(/'/g, "\\'")}',
  category: '${cat.replace(/'/g, "\\'")}',
  controlsType: 'lines',
  iconUrl: '/patterns/${item.svg}',
  controls: ['width', 'height'],
  defaults: {
    width: ${svgWidth},
    height: ${svgHeight},
    joint: 0,
    rows: 2,
    columns: 2
  }
};
`;
    fs.writeFileSync(path.join(patternsDir, baseName + '.js'), content);
    
    imports.push(`import { ${varName} } from './patterns/${baseName}';`);
    arrayItems.push(`    ${varName},`);
});

// Actualizar HatchEngine.js
let engineContent = fs.readFileSync(hatchEnginePath, 'utf-8');

// Reemplazar el bloque de imports y el array ARCHETYPES usando regex.
engineContent = engineContent.replace(/import\s+\{\s*[^}]+\s*\}\s+from\s+'\.\/patterns\/[^']+';\n?/g, '');
engineContent = imports.join('\n') + '\n\n' + engineContent;

engineContent = engineContent.replace(/export const ARCHETYPES = \[\s*([\s\S]*?)\s*\];/, 
    'export const ARCHETYPES = [\n' + arrayItems.join('\n') + '\n];');

fs.writeFileSync(hatchEnginePath, engineContent);

console.log('Se generaron ' + catalog.length + ' archivos JS de arquetipos.');
console.log('HatchEngine.js actualizado correctamente con los nuevos valores.');
