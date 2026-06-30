;; -- SIMULACION DE INYECCION DESDE JS --
(setq *LC-ASSET-CODE* "")
(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "*TESTHATCH, Un hatch")) ; Chunk 1
(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* " de prueba complicad")) ; Chunk 2
(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "o con saltos y diago")) ; Chunk 3
(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "nales \\ y comillas \"")) ; Chunk 4
(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "\n45, 0,0, 0,1\n0, 0,0")) ; Chunk 5
(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* ", 0,1, 1,-1\n90, 0,0,")) ; Chunk 6
(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* " 0,1, 1,-1\n// Coment")) ; Chunk 7
(setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "ario \"Raro\" \\n\n")) ; Chunk 8

;; -- LOGICA NATIVA LISP (core_engine.lsp) --
(setq tmpDir (strcat (getenv "TEMP") "\\LC_Assets"))
(vl-mkdir tmpDir)
(setq tmpFile (strcat tmpDir "\\TESTHATCH.pat"))
(setq f (open tmpFile "w"))
(if f
  (progn
    (princ "Escribiendo archivo reconstruido...")
    (write-line *LC-ASSET-CODE* f)
    (close f)
    (princ (strcat "\nArchivo creado en: " tmpFile))
  )
  (princ "\nError al abrir archivo")
)
(princ)
