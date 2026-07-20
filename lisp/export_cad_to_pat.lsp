(vl-load-com)

;; Devuelve (Num Den prevNum prevDen) para el ratio dado
(defun lc:rational-approx (val tol / num1 den1 num2 den2 rem a prevNum prevDen loop count)
  (setq num1 1.0 den1 0.0)
  (setq num2 (fix val) den2 1.0)
  (setq rem (- val (fix val)))
  
  (setq loop t count 0)
  (while (and loop (> rem 1e-6) (> (abs (- val (/ num2 den2))) tol) (< count 100))
    (setq a (fix (/ 1.0 rem)))
    (setq rem (- (/ 1.0 rem) a))
    
    (setq prevNum num2 prevDen den2)
    (setq num2 (+ (* a num2) num1))
    (setq den2 (+ (* a den2) den1))
    
    (setq num1 prevNum den1 prevDen)
    (setq count (1+ count))
  )
  (list num2 den2 num1 den1)
)


(defun lc:generate-pat-file ( rectEnt linesList fn / rectVla minPt maxPt minX minY maxX maxY W H svgRef f patName pt1 pt2 x1 y1 x2 y2 dx dy len ang dX dY gapX gapY strLine parsedLines L1 L2 keep filteredLines skipped tmp entData )
  ;; Obtener las coordenadas reales del bounding box
  (setq rectVla (vlax-ename->vla-object rectEnt))
  (vla-getboundingbox rectVla 'minPt 'maxPt)
  (setq minPt (vlax-safearray->list minPt))
  (setq maxPt (vlax-safearray->list maxPt))
  
  (setq minX (car minPt) minY (cadr minPt))
  (setq maxX (car maxPt) maxY (cadr maxPt))
  (setq W (- maxX minX))
  (setq H (- maxY minY))
  
  (setq svgRef (vlax-ldata-get rectEnt "LC_Hatch"))
  (if (not svgRef)
    (setq svgRef "mi_patron")
  )
  ;; Generar PAT
  (setq f (open fn "w"))
  (setq patName (vl-filename-base fn))
  
  (write-line (strcat "*" patName ", Created by Lispcentral") f)
  (write-line ";; URL: https://lispcentral.web.app" f)
  (write-line (strcat ";; SVG_REFERENCE: " svgRef ".svg") f)
  (write-line (strcat ";; Actual dimensions: " (rtos W 2 4) "x" (rtos H 2 4)) f)
  
  (setq parsedLines nil)
  (foreach lineEnt linesList
    (setq entData (entget lineEnt))
    (setq pt1 (cdr (assoc 10 entData)))
    (setq pt2 (cdr (assoc 11 entData)))
    
    (setq x1 (- (car pt1) minX))
    (setq y1 (- (cadr pt1) minY))
    (setq x2 (- (car pt2) minX))
    (setq y2 (- (cadr pt2) minY))
    
    ;; Normalizar la dirección
    (if (or (< x2 x1) (and (equal x1 x2 0.001) (< y2 y1)))
      (progn
        (setq tmp x1 x1 x2 x2 tmp)
        (setq tmp y1 y1 y2 y2 tmp)
      )
    )
    (setq parsedLines (append parsedLines (list (list x1 y1 x2 y2))))
  )
  
  ;; Filtrar líneas redundantes en los bordes (Top y Right)
  (setq filteredLines nil)
  (setq skipped 0)
  (foreach L1 parsedLines
    (setq x1 (nth 0 L1) y1 (nth 1 L1) x2 (nth 2 L1) y2 (nth 3 L1))
    (setq keep t)
    
    ;; ¿Es borde superior (Y=H)?
    (if (and (equal y1 H 0.001) (equal y2 H 0.001))
      (foreach L2 parsedLines
        ;; Buscar gemelo en borde inferior (Y=0)
        (if (and (equal (nth 1 L2) 0.0 0.001) (equal (nth 3 L2) 0.0 0.001)
                 (equal (nth 0 L2) x1 0.001) (equal (nth 2 L2) x2 0.001))
          (setq keep nil)
        )
      )
    )
    
    ;; ¿Es borde derecho (X=W)?
    (if (and (equal x1 W 0.001) (equal x2 W 0.001))
      (foreach L2 parsedLines
        ;; Buscar gemelo en borde izquierdo (X=0)
        (if (and (equal (nth 0 L2) 0.0 0.001) (equal (nth 2 L2) 0.0 0.001)
                 (equal (nth 1 L2) y1 0.001) (equal (nth 3 L2) y2 0.001))
          (setq keep nil)
        )
      )
    )
    
    (if keep
      (setq filteredLines (append filteredLines (list L1)))
      (setq skipped (1+ skipped))
    )
  )
  
  (foreach L1 filteredLines
    (setq x1 (nth 0 L1) y1 (nth 1 L1) x2 (nth 2 L1) y2 (nth 3 L1))
    
    (setq dx (- x2 x1))
    (setq dy (- y2 y1))
    (setq len (sqrt (+ (* dx dx) (* dy dy))))
    (setq ang (* (atan dy dx) (/ 180.0 pi)))
    (if (< ang 0.0) (setq ang (+ ang 360.0)))
    
    (cond
      ((or (equal ang 0.0 0.001) (equal ang 180.0 0.001) (equal ang 360.0 0.001))
       (setq dX 0.0 dY H gapX (- W len))
       (if (<= gapX 0.001)
         (setq strLine (strcat (rtos ang 2 4) "," (rtos x1 2 4) "," (rtos y1 2 4) "," (rtos dX 2 4) "," (rtos dY 2 4)))
         (setq strLine (strcat (rtos ang 2 4) "," (rtos x1 2 4) "," (rtos y1 2 4) "," (rtos dX 2 4) "," (rtos dY 2 4) "," (rtos len 2 4) ",-" (rtos gapX 2 4)))
       )
      )
      ((or (equal ang 90.0 0.001) (equal ang 270.0 0.001))
       (setq dX 0.0 dY W gapY (- H len))
       (if (<= gapY 0.001)
         (setq strLine (strcat (rtos ang 2 4) "," (rtos x1 2 4) "," (rtos y1 2 4) "," (rtos dX 2 4) "," (rtos dY 2 4)))
         (setq strLine (strcat (rtos ang 2 4) "," (rtos x1 2 4) "," (rtos y1 2 4) "," (rtos dX 2 4) "," (rtos dY 2 4) "," (rtos len 2 4) ",-" (rtos gapY 2 4)))
       )
      )
      (t
       (setq Aang (* ang (/ pi 180.0)))
       (setq cosA (cos Aang) sinA (sin Aang))
       (setq x1_p (* W cosA) y1_p (* -1.0 W sinA))
       (setq x2_p (* H sinA) y2_p (* H cosA))
       
       (setq ratio (abs (/ y1_p y2_p)))
       ;; Tolerancia de 0.02 asegura fracciones simples y dY manejables
       (setq approx (lc:rational-approx ratio 0.02))
       (setq N_val (nth 0 approx) D_val (nth 1 approx))
       (setq n_val (nth 2 approx) d_val (nth 3 approx))
       
       (if (> (* y1_p y2_p) 0.0)
         (setq N_val (* -1.0 N_val) n_val (* -1.0 n_val))
       )
       
       (setq Lrep (abs (+ (* D_val x1_p) (* N_val x2_p))))
       (setq dX (+ (* d_val x1_p) (* n_val x2_p)))
       (setq dY (+ (* d_val y1_p) (* n_val y2_p)))
       
       (if (< dY 0.0)
         (setq dX (* -1.0 dX) dY (* -1.0 dY))
       )
       
       (if (< (abs dY) 0.0001) (setq dY 0.0001))
       
       (setq gapX (- Lrep len))
       (if (<= gapX 0.001)
         (setq strLine (strcat (rtos ang 2 4) "," (rtos x1 2 4) "," (rtos y1 2 4) "," (rtos dX 2 4) "," (rtos dY 2 4)))
         (setq strLine (strcat (rtos ang 2 4) "," (rtos x1 2 4) "," (rtos y1 2 4) "," (rtos dX 2 4) "," (rtos dY 2 4) "," (rtos len 2 4) ",-" (rtos gapX 2 4)))
       )
      )
    )
    
    (write-line strLine f)
  )
  
  (close f)
  (if (> skipped 0)
    (princ (strcat "\n[EXITO] Archivo .pat generado en: " fn " (Se omitieron " (itoa skipped) " líneas de borde redundantes)"))
    (princ (strcat "\n[EXITO] Archivo .pat generado en: " fn))
  )
)

(defun c:LC_EXPORT_PAT ( / ss i entName entData type rectEnt linesList svgRef baseFolder fn )
  (princ "\n--- EXPORTADOR DE PATRÓN A .PAT ---")
  
  (setq ss nil)
  (while (not ss)
    (princ "\nSelecciona TODO (el recuadro verde y las líneas del patrón): ")
    (setq ss (ssget '((0 . "LINE,LWPOLYLINE"))))
    (if (not ss) (princ "\nNo seleccionaste nada. Inténtalo de nuevo."))
  )
  
  (setq i 0 rectEnt nil linesList nil)
  (while (< i (sslength ss))
    (setq entName (ssname ss i))
    (setq type (cdr (assoc 0 (entget entName))))
    (if (= type "LWPOLYLINE") (setq rectEnt entName) (if (= type "LINE") (setq linesList (append linesList (list entName)))))
    (setq i (1+ i))
  )
  
  (if (not rectEnt) (progn (princ "\n[ERROR] No recuadro.") (exit)))
  (if (not linesList) (progn (princ "\n[ERROR] No líneas.") (exit)))
  
  (setq svgRef (vlax-ldata-get rectEnt "LC_Hatch"))
  (if (not svgRef) (setq svgRef "mi_patron"))
  (setq baseFolder "C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\web\\public\\Pats\\")
  (setq fn (getfiled "Guardar archivo PAT" (strcat baseFolder svgRef) "pat" 1))
  (if (not fn) (progn (princ "\nOperación cancelada.") (exit)))
  
  (lc:generate-pat-file rectEnt linesList fn)
  (princ)
)

(defun c:LC_EXPORTBATCH ( / ssBoxes i successCount baseFolder boxEnt rectVla minPt maxPt ssLines linesList j svgRef fn )
  (princ "\n--- EXPORTADOR MASIVO DE PATRONES ---")
  (princ "\nSelecciona los recuadros delimitadores (polilíneas verdes) de los patrones a exportar: ")
  (setq ssBoxes (ssget '((0 . "LWPOLYLINE"))))
  (if (not ssBoxes) (progn (princ "\nNo se seleccionaron recuadros.") (exit)))
  
  (setq i 0 successCount 0)
  (setq baseFolder "C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\web\\public\\Pats\\")
  
  (while (< i (sslength ssBoxes))
    (setq boxEnt (ssname ssBoxes i))
    
    ;; Filtramos solo polilíneas verdes (Color 3) para asegurarnos que sean bounding boxes
    (if (= (cdr (assoc 62 (entget boxEnt))) 3)
      (progn
        (setq rectVla (vlax-ename->vla-object boxEnt))
        (vla-getboundingbox rectVla 'minPt 'maxPt)
        (setq minPt (vlax-safearray->list minPt))
        (setq maxPt (vlax-safearray->list maxPt))
        
        (setq minX (car minPt) minY (cadr minPt))
        (setq maxX (car maxPt) maxY (cadr maxPt))
        (setq W (- maxX minX) H (- maxY minY))
        
        ;; 1. Intentar recuperar el nombre desde el TEXTO debajo del recuadro
        (setq txtMin (list (- minX 1.0) (- minY (* H 0.3)) 0.0))
        (setq txtMax (list (+ maxX 1.0) (+ minY 1.0) 0.0))
        (setq ssTxt (ssget "C" txtMin txtMax '((0 . "TEXT"))))
        
        (setq svgRef nil)
        (if ssTxt
          (setq svgRef (cdr (assoc 1 (entget (ssname ssTxt 0)))))
        )
        
        ;; 2. Fallback a LDATA si no hay texto
        (if (not svgRef)
          (setq svgRef (vlax-ldata-get boxEnt "LC_Hatch"))
        )
        
        ;; Si definitivamente no hay nombre, asignarle uno numerado
        (if (or (not svgRef) (= svgRef "OriginalSVGName"))
          (setq svgRef (strcat "patron_masivo_" (itoa i)))
        )
        
        ;; Expandir ligerísimamente (0.1 unidades) el bounding box para las líneas
        (setq minPt (list (- minX 0.1) (- minY 0.1) 0.0))
        (setq maxPt (list (+ maxX 0.1) (+ maxY 0.1) 0.0))
        
        (setq ssLines (ssget "C" minPt maxPt '((0 . "LINE"))))
        
        (if ssLines
          (progn
            (setq linesList nil j 0)
            (while (< j (sslength ssLines))
              (setq linesList (append linesList (list (ssname ssLines j))))
              (setq j (1+ j))
            )
            
            (setq fn (strcat baseFolder svgRef ".pat"))
            
            ;; Exportar sin preguntar
            (lc:generate-pat-file boxEnt linesList fn)
            
            ;; Cambiar color de la polilínea a ROJO (1)
            (vla-put-color rectVla 1)
            
            (setq successCount (1+ successCount))
          )
          (princ (strcat "\n[AVISO] No se encontraron líneas dentro del recuadro de " svgRef))
        )
      )
    )
    (setq i (1+ i))
  )
  
  (princ (strcat "\n\n[LOTE EXPORTADO] Se generaron y guardaron " (itoa successCount) " archivos .pat en " baseFolder))
  (princ)
)

(defun c:LC_EXPORT_MANUAL ( / boxEnt txtEnt rectVla minPt maxPt ssLines linesList j svgRef fn baseFolder )
  (setq baseFolder "C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\web\\public\\Pats\\")
  (princ "\n--- EXPORTADOR MANUAL CONTINUO ---")
  (princ "\n(Presiona ENTER al vacío o ESC para terminar el ciclo)")
  
  (while (setq boxEnt (car (entsel "\n1. Selecciona el recuadro verde delimitador (Enter para salir): ")))
    (setq txtEnt (car (entsel "\n2. Selecciona el texto con el nombre del patrón: ")))
    
    (if txtEnt
      (progn
        (setq svgRef (cdr (assoc 1 (entget txtEnt))))
        
        (setq rectVla (vlax-ename->vla-object boxEnt))
        (vla-getboundingbox rectVla 'minPt 'maxPt)
        (setq minPt (vlax-safearray->list minPt))
        (setq maxPt (vlax-safearray->list maxPt))
        
        (setq minPt (list (- (car minPt) 0.1) (- (cadr minPt) 0.1) 0.0))
        (setq maxPt (list (+ (car maxPt) 0.1) (+ (cadr maxPt) 0.1) 0.0))
        
        (setq ssLines (ssget "C" minPt maxPt '((0 . "LINE"))))
        
        (if ssLines
          (progn
            (setq linesList nil j 0)
            (while (< j (sslength ssLines))
              (setq linesList (append linesList (list (ssname ssLines j))))
              (setq j (1+ j))
            )
            
            (setq fn (strcat baseFolder svgRef ".pat"))
            (lc:generate-pat-file boxEnt linesList fn)
            
            (vla-put-color rectVla 1)
            (princ (strcat "\n[EXITO] Exportado: " svgRef "\n"))
          )
          (princ (strcat "\n[ERROR] No se encontraron líneas dentro del recuadro de " svgRef "\n"))
        )
      )
      (princ "\n[AVISO] No seleccionaste texto, omitiendo este recuadro.\n")
    )
  )
  (princ "\n[FIN] Exportador manual finalizado.")
  (princ)
)

(princ "\nComandos cargados: LC_EXPORT_PAT (Individual), LC_EXPORTBATCH (Masivo), LC_EXPORT_MANUAL (2 Clics).")
(princ)
