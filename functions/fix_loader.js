const fs = require('fs');
const code = fs.readFileSync('index.js', 'utf8');
const match = code.match(/const loaderCode = `([\s\S]*?)`;/);
if (match) {
  let lisp = match[1];
  lisp = lisp.replace(/\$\{tenantName\}/g, 'Cliente');
  lisp = lisp.replace(/\$\{token\}/g, 'lc_key_S5ggQl1Gk4f3');
  // Handle double backslashes which are escaped in the JS string
  lisp = lisp.replace(/\\\\/g, '\\');
  fs.writeFileSync('C:/Users/TM PROJETOS/Downloads/LC_Loader.lsp', lisp);
  console.log('Loader arreglado exitosamente en Downloads');
} else {
  console.log('No se pudo encontrar el template en index.js');
}
