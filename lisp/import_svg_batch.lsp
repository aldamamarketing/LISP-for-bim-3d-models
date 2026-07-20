(vl-load-com)

(defun c:LC_IMPORTBATCH ( / sh shFolder folderPath basePt svgFiles currentX currentY w gap )
  ;; Abrir diálogo de selección de carpeta de Windows
  (setq sh (vlax-create-object "Shell.Application"))
  (setq defaultPath "C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\web\\public\\patterns")
  (setq shFolder (vlax-invoke-method sh 'BrowseForFolder 0 "Selecciona la carpeta con los archivos SVG" 0 defaultPath))
  (if shFolder
    (progn
      (setq folderPath (vlax-get-property (vlax-get-property shFolder 'Self) 'Path))
      (vlax-release-object shFolder)
    )
  )
  (vlax-release-object sh)
  
  (if (not folderPath) (exit))
  
  (setq basePt (getpoint "\nPunto de inserción inicial para el lote: "))
  (if (not basePt) (setq basePt '(0.0 0.0 0.0)))
  
  ;; Listar todos los archivos .svg en la carpeta seleccionada
  (setq svgFiles (vl-directory-files folderPath "*.svg" 1))
  (if (not svgFiles)
    (progn (princ "\nNo se encontraron archivos SVG en la carpeta seleccionada.") (exit))
  )
  
  (setq startX (car basePt))
  (setq currentX startX)
  (setq currentY (cadr basePt))
  
  (setq cols 30) ;; Tabla de 30 columnas
  (setq count 0)
  (setq maxHInRow 0.0)
  (setq gap 100.0) ;; Espacio (gap) en unidades entre cada SVG importado
  
  ;; Asegurarnos de que el core (lc:process-svg-file) exista en memoria
  (if (not (type lc:process-svg-file))
    (progn
      (princ "\nATENCIÓN: Debes cargar primero 'import_svg_to_cad.lsp' antes de usar el procesador por lotes.")
      (exit)
    )
  )
  
  ;; Procesar cada archivo en bucle (Formato Tabla 10x30)
  (foreach svgFile svgFiles
    (princ (strcat "\nProcesando: " svgFile " ..."))
    (setq dims (lc:process-svg-file (strcat folderPath "\\" svgFile) (list currentX currentY 0.0)))
    
    (setq w 1000.0 h 1000.0) ;; Fallbacks
    (if (and dims (listp dims) (= (length dims) 2))
      (setq w (car dims) h (cadr dims))
    )
    
    (if (> h maxHInRow) (setq maxHInRow h))
    
    (setq currentX (+ currentX w gap))
    (setq count (1+ count))
    
    ;; Salto de línea al llegar a las columnas deseadas
    (if (>= count cols)
      (progn
        (setq currentX startX)
        (setq currentY (- currentY maxHInRow gap (* maxHInRow 0.25))) ;; Mover Y hacia abajo (considerando el texto debajo)
        (setq count 0)
        (setq maxHInRow 0.0)
      )
    )
  )
  
  (princ (strcat "\n\n[LOTE COMPLETADO] Se importaron y alinearon " (itoa (length svgFiles)) " archivos SVG."))
  (princ)
)

(princ "\nComando LC_IMPORTBATCH cargado. Escribe LC_IMPORTBATCH para procesar carpetas enteras.")
(princ)
