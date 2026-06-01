const fs = require('fs');
const file = process.argv[2] || 'test_loader.lsp';
const text = fs.readFileSync(file, 'utf8');
const lines = text.split('\n');

let openParens = 0;
let inString = false;
let escape = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let noCommentLine = line;
  if (!inString) {
    const commentIdx = line.indexOf(';');
    if (commentIdx !== -1) noCommentLine = line.substring(0, commentIdx);
  }
  
  for (let j = 0; j < noCommentLine.length; j++) {
    const char = noCommentLine[j];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
    } else {
      if (char === '"') inString = true;
      else if (char === '(') openParens++;
      else if (char === ')') {
        openParens--;
        if (openParens < 0) {
           console.log('Negative parens at line ' + (i+1));
           openParens = 0; // reset to find others
        }
      }
    }
  }
}
console.log('Final openParens:', openParens);
