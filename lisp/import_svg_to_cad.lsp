(vl-load-com)

(defun lc:process-svg-file ( fn basePt / xmlDoc root pathNodes i node d-string tokens import-ss baseX baseY w h vb boxW boxH vbTokens bboxEnt )
  ;; Crear objeto COM para leer XML (SVG es XML)
  (setq xmlDoc (vlax-create-object "MSXML2.DOMDocument"))
  (vlax-put-property xmlDoc 'async :vlax-false)
  
  (if (= (vlax-invoke-method xmlDoc 'load fn) :vlax-false)
    (progn
      (princ (strcat "\nError al cargar el SVG: " fn))
      (vlax-release-object xmlDoc)
      (exit)
    )
  )
  
  (setq baseX (car basePt))
  (setq baseY (cadr basePt))
  
  (princ "\nAnalizando archivo SVG...")
  
  ;; Función auxiliar local para leer atributos y convertir Variants a String
  (defun get-attr-string (node attrName / val)
    (setq val (vlax-invoke-method node 'getAttribute attrName))
    (if (eq (type val) 'variant) (setq val (vlax-variant-value val)))
    (if (eq (type val) 'vlax-null) (setq val nil))
    val
  )

  ;; --- Dibujar Caja Delimitadora (Verde) ---
  (setq root (vlax-get-property xmlDoc 'documentElement))
  (if root
    (progn
      (setq w (get-attr-string root "width"))
      (setq h (get-attr-string root "height"))
      (setq vb (get-attr-string root "viewBox"))
      
      (setq boxW nil boxH nil)
      (if (and vb (not (vl-catch-all-error-p vb)))
        (progn
          (setq vbTokens (lc:tokenize-svg-path vb))
          (if (>= (length vbTokens) 4)
            (progn
              (setq boxW (atof (nth 2 vbTokens)))
              (setq boxH (atof (nth 3 vbTokens)))
            )
          )
        )
      )
      
      (if (and (not boxW) w h (not (vl-catch-all-error-p w)) (not (vl-catch-all-error-p h)))
        (setq boxW (atof w) boxH (atof h))
      )
      
      (if (and boxW boxH (> boxW 0) (> boxH 0))
        (progn
          (entmake (list '(0 . "LWPOLYLINE")
                         '(100 . "AcDbEntity")
                         '(62 . 3) ;; Color 3 = Green
                         '(100 . "AcDbPolyline")
                         '(90 . 4)
                         '(70 . 1)
                         (cons 10 (list baseX baseY))
                         (cons 10 (list (+ baseX boxW) baseY))
                         (cons 10 (list (+ baseX boxW) (+ baseY (* -1.0 boxH))))
                         (cons 10 (list baseX (+ baseY (* -1.0 boxH))))
                   ))
          ;; Inyectar LDATA en el bounding box (el último objeto creado)
          (setq bboxEnt (entlast))
          (vlax-ldata-put bboxEnt "LC_Hatch" (vl-filename-base fn))
          
          ;; Añadir texto identificativo debajo del recuadro
          (entmake (list '(0 . "TEXT")
                         (cons 10 (list baseX (- baseY boxH (* boxH 0.15)))) ;; 15% más abajo de la caja
                         (cons 40 (* boxH 0.1)) ;; Altura del texto 10%
                         (cons 1 (vl-filename-base fn))
                         '(62 . 7) ;; Color blanco
                   ))
          
          (princ (strcat "\nSe dibujó una caja delimitadora verde (" (rtos boxW 2 2) "x" (rtos boxH 2 2) ") con LDATA [" (vl-filename-base fn) "]."))
        )
      )
    )
  )
  ;; ------------------------------------------

  ;; Buscar todos los <path>
  (setq pathNodes (vlax-invoke-method xmlDoc 'getElementsByTagName "path"))
  (setq i 0)
  (setq import-ss (ssadd))
  (while (< i (vlax-get-property pathNodes 'length))
    (setq node (vlax-get-property pathNodes 'item i))
    (setq d-string (get-attr-string node "d"))
    
    (if (and d-string (/= d-string ""))
      (progn
        ;; Extraemos las coordenadas del string "M... L... Z..."
        (setq tokens (lc:tokenize-svg-path d-string))
        (lc:draw-svg-tokens tokens baseX baseY boxW boxH import-ss)
      )
    )
    (setq i (1+ i))
  )
  
  (vlax-release-object xmlDoc)
  
  (if (> (sslength import-ss) 0)
    (progn
      (princ "\nRecortando excesos y optimizando líneas (OVERKILL)...")
      (command "_.-OVERKILL" import-ss "" "")
    )
  )
  
  (princ (strcat "\n¡Éxito! " (itoa i) " trazados procesados y optimizados."))
  (if (and boxW boxH) (list boxW boxH) nil) ;; Retornar ancho y alto
)

;; Función auxiliar para partir el atributo 'd' del SVG
(defun lc:tokenize-svg-path ( d-str / i len c tokens current )
  (setq d-str (strcase d-str))
  (setq i 1 len (strlen d-str) tokens nil current "")
  (while (<= i len)
    (setq c (substr d-str i 1))
    (cond
      ((member c '("M" "L" "Z" " "))
       (if (/= current "") (setq tokens (append tokens (list current)) current ""))
       (if (/= c " ") (setq tokens (append tokens (list c))))
      )
      ((or (= c ",") (= c "-"))
       (if (and (= c "-") (/= current ""))
         (setq tokens (append tokens (list current)) current "-") ; signo menos arranca número
         (if (= c ",")
           (if (/= current "") (setq tokens (append tokens (list current)) current ""))
           (setq current (strcat current c))
         )
       )
      )
      (t (setq current (strcat current c))) ; números y decimales
    )
    (setq i (1+ i))
  )
  (if (/= current "") (setq tokens (append tokens (list current))))
  tokens
)

;; Cohen-Sutherland Line Clipping
(defun lc:clip-line ( x1 y1 x2 y2 xmin ymin xmax ymax / compute-outcode INSIDE LEFT RIGHT BOTTOM TOP code outcode1 outcode2 accept done x y outcodeOut )
  (setq INSIDE 0 LEFT 1 RIGHT 2 BOTTOM 4 TOP 8)
  
  (defun compute-outcode ( x y )
    (setq code INSIDE)
    (if (< x xmin) (setq code (logior code LEFT))
      (if (> x xmax) (setq code (logior code RIGHT)))
    )
    (if (< y ymin) (setq code (logior code BOTTOM))
      (if (> y ymax) (setq code (logior code TOP)))
    )
    code
  )
  
  (setq outcode1 (compute-outcode x1 y1))
  (setq outcode2 (compute-outcode x2 y2))
  (setq accept nil done nil)
  
  (while (not done)
    (cond
      ((and (= outcode1 0) (= outcode2 0))
       (setq accept t done t)
      )
      ((/= (logand outcode1 outcode2) 0)
       (setq accept nil done t)
      )
      (t
       (setq outcodeOut (if (/= outcode1 0) outcode1 outcode2))
       (if (/= (logand outcodeOut TOP) 0)
         (progn (setq x (+ x1 (* (/ (- x2 x1) (float (- y2 y1))) (- ymax y1)))) (setq y ymax))
         (if (/= (logand outcodeOut BOTTOM) 0)
           (progn (setq x (+ x1 (* (/ (- x2 x1) (float (- y2 y1))) (- ymin y1)))) (setq y ymin))
           (if (/= (logand outcodeOut RIGHT) 0)
             (progn (setq y (+ y1 (* (/ (- y2 y1) (float (- x2 x1))) (- xmax x1)))) (setq x xmax))
             (if (/= (logand outcodeOut LEFT) 0)
               (progn (setq y (+ y1 (* (/ (- y2 y1) (float (- x2 x1))) (- xmin x1)))) (setq x xmin))
             )
           )
         )
       )
       (if (= outcodeOut outcode1)
         (setq x1 x y1 y outcode1 (compute-outcode x1 y1))
         (setq x2 x y2 y outcode2 (compute-outcode x2 y2))
       )
      )
    )
  )
  (if accept
    (list x1 y1 x2 y2)
    nil
  )
)

;; Dibuja líneas en AutoCAD a partir de los tokens
(defun lc:draw-svg-tokens ( tokens baseX baseY boxW boxH ss / pt1 pt2 first-pt cmd valX valY clipped newEnt xmin ymin xmax ymax )
  (setq first-pt nil pt1 nil)
  (setq xmin baseX xmax (+ baseX boxW))
  (setq ymin (- baseY boxH) ymax baseY)
  
  (while tokens
    (setq cmd (car tokens))
    (cond
      ((= cmd "M")
       (setq valX (atof (cadr tokens)))
       (setq valY (atof (caddr tokens)))
       (setq pt1 (list (+ baseX valX) (+ baseY (* -1.0 valY))))
       (setq first-pt pt1)
       (setq tokens (cdddr tokens))
      )
      ((= cmd "L")
       (setq valX (atof (cadr tokens)))
       (setq valY (atof (caddr tokens)))
       (setq pt2 (list (+ baseX valX) (+ baseY (* -1.0 valY))))
       
       (setq clipped (lc:clip-line (car pt1) (cadr pt1) (car pt2) (cadr pt2) xmin ymin xmax ymax))
       (if clipped
         (progn
           (setq newEnt (entmakex (list '(0 . "LINE") (cons 10 (list (nth 0 clipped) (nth 1 clipped))) (cons 11 (list (nth 2 clipped) (nth 3 clipped))))))
           (if (and newEnt ss) (ssadd newEnt ss))
         )
       )
       
       (setq pt1 pt2)
       (setq tokens (cdddr tokens))
      )
      ((= cmd "Z")
       (if (and pt1 first-pt)
         (progn
           (setq clipped (lc:clip-line (car pt1) (cadr pt1) (car first-pt) (cadr first-pt) xmin ymin xmax ymax))
           (if clipped
             (progn
               (setq newEnt (entmakex (list '(0 . "LINE") (cons 10 (list (nth 0 clipped) (nth 1 clipped))) (cons 11 (list (nth 2 clipped) (nth 3 clipped))))))
               (if (and newEnt ss) (ssadd newEnt ss))
             )
           )
         )
       )
       (setq tokens (cdr tokens))
      )
      (t 
       (if (and (car tokens) (cadr tokens))
         (progn
           (setq valX (atof (car tokens)))
           (setq valY (atof (cadr tokens)))
           (setq pt2 (list (+ baseX valX) (+ baseY (* -1.0 valY))))
           
           (if pt1
             (progn
               (setq clipped (lc:clip-line (car pt1) (cadr pt1) (car pt2) (cadr pt2) xmin ymin xmax ymax))
               (if clipped
                 (progn
                   (setq newEnt (entmakex (list '(0 . "LINE") (cons 10 (list (nth 0 clipped) (nth 1 clipped))) (cons 11 (list (nth 2 clipped) (nth 3 clipped))))))
                   (if (and newEnt ss) (ssadd newEnt ss))
                 )
               )
             )
           )
           
           (setq pt1 pt2)
         )
       )
       (setq tokens (cddr tokens))
      )
    )
  )
)

(princ "\nFunciones base de importación SVG cargadas.")
(princ)

;; Función comando original para llamar a la función core
(defun c:LC_IMPORTSVG ( / fn basePt )
  (setq fn (getfiled "Selecciona Archivo SVG" "C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\web\\public\\" "svg" 0))
  (if (not fn) (exit))
  (setq basePt (getpoint "\nSelecciona el punto base de inserción (enter para 0,0): "))
  (if (not basePt) (setq basePt '(0.0 0.0 0.0)))
  (lc:process-svg-file fn basePt)
  (princ)
)
(princ "\nComando LC_IMPORTSVG cargado.")
(princ)
