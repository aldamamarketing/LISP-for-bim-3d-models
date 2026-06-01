const fs = require('fs');
const text = fs.readFileSync('C:/Users/TM PROJETOS/Downloads/LC_Loader.lsp', 'utf8');

// remove comments
const noComments = text.replace(/;.*$/gm, '');
// remove strings
const noStrings = noComments.replace(/"(?:\\\\.|[^\\"])*"/g, '""');

// check parens
let open = 0;
let lines = noStrings.split('\n');
lines.forEach((l, i) => {
  for(let char of l) {
    if (char === '(') open++;
    else if (char === ')') open--;
  }
  if (open < 0) console.log('Negative parens at line ' + (i+1));
});
console.log('Final parens count:', open);

lines.forEach((l, i) => {
  if (l.match(/(^|\s)\.(\s|$)/)) {
    console.log('Misplaced dot at line ' + (i+1) + ': ' + l.trim());
  }
});
console.log('Dot check complete.');
