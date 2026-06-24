const fs = require('fs');
const path = require('path');

const catalogPath = 'Z:\\Autocad Config\\LISP\\web\\public\\api\\svg-catalog.json';
const patternsDir = 'Z:\\Autocad Config\\LISP\\web\\src\\components\\tools\\patterns';

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

function getSmartDescriptions(cats, name) {
    let type = 'Generic';
    if (cats.includes('Brick Bond')) type = 'Brick';
    else if (cats.includes('Roofing')) type = 'Roof';
    else if (cats.includes('Paving') || cats.includes('Parquetry')) type = 'Floor';
    
    let es, en, pt;
    switch(type) {
        case 'Brick':
            es = `Patrón de mampostería tipo ${name}. Ideal en vistas de alzado para fachadas o muros portantes.`;
            en = `Masonry pattern type ${name}. Ideal for elevation views of facades or load-bearing walls.`;
            pt = `Padrão de alvenaria tipo ${name}. Ideal em vistas de elevação para fachadas ou paredes estruturais.`;
            break;
        case 'Roof':
            es = `Patrón de cubierta. Uso recomendado en planta de techos arquitectónicos.`;
            en = `Roofing pattern. Recommended for architectural roof plan views.`;
            pt = `Padrão de cobertura. Uso recomendado em plantas de telhados arquitetônicos.`;
            break;
        case 'Floor':
            es = `Patrón de pavimento o suelo tipo ${name}. Ideal para plantas arquitectónicas y revestimientos de piso.`;
            en = `Paving or flooring pattern type ${name}. Ideal for architectural floor plans and surface coverings.`;
            pt = `Padrão de pavimento ou piso tipo ${name}. Ideal para plantas arquitetônicas e revestimentos de piso.`;
            break;
        default:
            es = `Patrón de sombreado tipo ${name}. Uso general para representación CAD geométrica.`;
            en = `Hatch pattern type ${name}. General use for geometric CAD representation.`;
            pt = `Padrão de hachura tipo ${name}. Uso geral para representação CAD geométrica.`;
            break;
    }
    return { es, en, pt };
}

catalog.forEach((item, idx) => {
    let baseName = item.svg.replace('.svg', '');
    let varName = 'arch_' + baseName;
    if (/^[0-9]/.test(varName)) varName = '_' + varName;
    varName = varName.replace(/[^a-zA-Z0-9]/g, '_');
    
    let svgWidth = 200;
    let svgHeight = 200;
    try {
        const svgContent = fs.readFileSync(path.join('Z:\\Autocad Config\\LISP\\web\\public\\patterns', item.svg), 'utf-8');
        const viewBoxMatch = svgContent.match(/viewBox=["'][\d\.\s]+\s+[\d\.\s]+\s+([\d\.]+)\s+([\d\.]+)["']/);
        if (viewBoxMatch) {
            svgWidth = Math.round(parseFloat(viewBoxMatch[1]));
            svgHeight = Math.round(parseFloat(viewBoxMatch[2]));
        } else {
            const wMatch = svgContent.match(/width=["']([\d\.]+)["']/);
            const hMatch = svgContent.match(/height=["']([\d\.]+)["']/);
            if (wMatch && hMatch) {
                svgWidth = Math.round(parseFloat(wMatch[1]));
                svgHeight = Math.round(parseFloat(hMatch[2]));
            }
        }
    } catch(e) {}

    const catsArr = item.categories || [];
    const descs = getSmartDescriptions(catsArr, item.name);
    
    const content = `export const ${varName} = {
  id: '${baseName}',
  name: '${item.name.replace(/'/g, "\\'")}',
  categories: ${JSON.stringify(catsArr)},
  controlsType: 'lines',
  iconUrl: '/patterns/${item.svg}',
  controls: ['width', 'height'],
  defaults: {
    width: ${svgWidth},
    height: ${svgHeight},
    joint: 0,
    rows: 2,
    columns: 2
  },
  i18n: {
    es: {
      name: '${item.name.replace(/'/g, "\\'")}',
      description: '${descs.es.replace(/'/g, "\\'")}'
    },
    en: {
      name: '${item.name.replace(/'/g, "\\'")}',
      description: '${descs.en.replace(/'/g, "\\'")}'
    },
    pt: {
      name: '${item.name.replace(/'/g, "\\'")}',
      description: '${descs.pt.replace(/'/g, "\\'")}'
    }
  }
};
`;
    fs.writeFileSync(path.join(patternsDir, baseName + '.js'), content);
});

console.log('Regenerated ' + catalog.length + ' archetypes with i18n & multi-categories.');
