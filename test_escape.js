const fs = require('fs');

// 1. Un archivo .pat complejo y real
const rawPatCode = `*TESTHATCH, Un hatch de prueba complicado con saltos y diagonales \\ y comillas "
45, 0,0, 0,1
0, 0,0, 0,1, 1,-1
90, 0,0, 0,1, 1,-1
// Comentario "Raro" \\n
`;

// 2. La lógica de chunking propuesta para AutoCAD
const chunkSize = 20; // Tamaño muy pequeño para forzar que corte a la mitad de un \\n
const rawChunks = [];
for (let i = 0; i < rawPatCode.length; i += chunkSize) {
    rawChunks.push(rawPatCode.substring(i, i + chunkSize));
}

let lispOutput = ';; -- SIMULACION DE INYECCION DESDE JS --\n';
lispOutput += '(setq *LC-ASSET-CODE* "")\n';

// 3. Escapamos cada chunk de manera independiente
rawChunks.forEach((chunk, index) => {
    const escaped = chunk
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    
    lispOutput += `(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "${escaped}")) ; Chunk ${index + 1}\n`;
});

// 4. Lógica de LISP para escribir el resultado a un archivo
lispOutput += `
;; -- LOGICA NATIVA LISP (core_engine.lsp) --
(setq tmpDir (strcat (getenv "TEMP") "\\\\LC_Assets"))
(vl-mkdir tmpDir)
(setq tmpFile (strcat tmpDir "\\\\TESTHATCH.pat"))
(setq f (open tmpFile "w"))
(if f
  (progn
    (princ "Escribiendo archivo reconstruido...")
    (write-line *LC-ASSET-CODE* f)
    (close f)
    (princ (strcat "\\nArchivo creado en: " tmpFile))
  )
  (princ "\\nError al abrir archivo")
)
(princ)
`;

// 5. Guardar la prueba
fs.writeFileSync('test_acad.lsp', lispOutput, 'utf8');
console.log("Prueba generada en test_acad.lsp");
