const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// fix common and others using `0,${totalH}` for vertical lines
code = code.replace(/0,\$\{totalH\}, \$\{h\},-\$\{totalH - h\}\\n\`;/g, '0,${tw}, ${h},-${totalH - h}\\n\`;');
code = code.replace(/90, \$\{offsetX\},\$\{i \* th\}, 0,\$\{totalH\}/g, '90, ${offsetX},${i * th}, 0,${tw}');

// monk and silesian should use totalW
code = code.replace(/monk_bond([\s\S]*?)return pat/g, match => match.replace(/0,\$\{tw\}/g, '0,${totalW}'));
code = code.replace(/silesian_bond([\s\S]*?)return pat/g, match => match.replace(/0,\$\{tw\}/g, '0,${totalW}'));

// flemish
code = code.replace(/flemish\": \([\s\S]*?return \`\*/g, match => match.replace(/0,\$\{th \* 2\}/g, '0,${stepX}'));

// double/triple flemish and gothic
code = code.replace(/double_flemish([\s\S]*?);\\n\`;/g, match => match.replace(/\$\{th\},0, \$\{h\},\$\{j\}\\n/g, '${totalW},0, ${h},${j}\\n'));
code = code.replace(/triple_flemish([\s\S]*?);\\n\`;/g, match => match.replace(/\$\{th\},0, \$\{h\},\$\{j\}\\n/g, '${totalW},0, ${h},${j}\\n'));
code = code.replace(/gothic_bond([\s\S]*?);\\n\`;/g, match => match.replace(/\$\{th\},0, \$\{h\},\$\{j\}\\n/g, '${totalW},0, ${h},${j}\\n'));

// english cross bond
code = code.replace(/english_cross_bond([\s\S]*?);\\n\`;/g, match => match.replace(/\$\{totalH\},0, \$\{h\},\$\{j\}\\n/g, '${tw},0, ${h},${j}\\n'));

fs.writeFileSync('index.js', code);
