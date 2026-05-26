const fs = require('fs');
const path = require('path');

const lispDir = path.join(__dirname, 'functions', 'lisp');
const files = fs.readdirSync(lispDir);

files.forEach(file => {
  if (file.endsWith('.lsp') && file !== "acaddoc.lsp" && file !== "TMD_Loader.lsp" && file !== "TM_Setup.lsp" && file !== "TM_SetupCore.lsp") {
    const filepath = path.join(lispDir, file);
    let code = fs.readFileSync(filepath, 'utf8');
    
    // 1. Remover comentarios multilineas ;| ... |;
    code = code.replace(/;\|[\s\S]*?\|;/g, '');
    
    // 2. Remover comentarios simples ; ...
    code = code.replace(/;+.*$/gm, '');
    
    // 3. Remover strings "..." para evitar contar parentesis dentro de textos
    code = code.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""');
    
    // Contar paréntesis
    let openCount = 0;
    let closeCount = 0;
    
    for (let char of code) {
      if (char === '(') openCount++;
      if (char === ')') closeCount++;
    }
    
    if (openCount !== closeCount) {
      console.log(`❌ FILE: ${file} is UNBALANCED. Open: ${openCount}, Close: ${closeCount} (Diff: ${openCount - closeCount})`);
    }
  }
});
console.log("Check completed.");
