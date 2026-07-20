(defun c:PAT2SVG ( / rectEnt rectVla minPt maxPt minX minY maxX maxY W H ss i ent entType pt1 pt2 x1 y1 x2 y2 fn f pts isClosed ptsStr x y)
  (vl-load-com)
  
  (princ "\n--- EXPORTADOR DE HATCH A SVG ---")
  
  ;; 1. Seleccionar el rectangulo limite
  (setq rectEnt (car (entsel "\nSelecciona el rectangulo (Polilinea) que define el tile del patron: ")))
  (if (not rectEnt)
    (progn (princ "\nNo seleccionaste nada. Saliendo...") (exit))
  )
  
  ;; Obtener Bounding Box del rectangulo
  (setq rectVla (vlax-ename->vla-object rectEnt))
  (vla-getboundingbox rectVla 'minPt 'maxPt)
  (setq minPt (vlax-safearray->list minPt))
  (setq maxPt (vlax-safearray->list maxPt))
  
  (setq minX (car minPt) minY (cadr minPt))
  (setq maxX (car maxPt) maxY (cadr maxPt))
  (setq W (- maxX minX))
  (setq H (- maxY minY))
  
  (princ (strcat "\nDimensiones del Tile -> Ancho: " (rtos W 2 4) " Alto: " (rtos H 2 4)))
  (princ "\n(El Origen X=0,Y=0 del SVG se asignara automaticamente a la esquina superior izquierda del rectangulo)")
  
  ;; 2. Seleccionar las lineas del patron
  (princ "\nSelecciona las LINEAS o POLILINEAS del patron a exportar (ignora otras cosas): ")
  (setq ss (ssget '((0 . "LINE,LWPOLYLINE"))))
  (if (not ss)
    (progn (princ "\nNo se seleccionaron lineas. Saliendo...") (exit))
  )
  (princ (strcat "\nSe encontraron " (itoa (sslength ss)) " lineas para exportar."))
  
  ;; 3. Dialogo para guardar el archivo
  (setq suggestedName (vlax-ldata-get rectEnt "LC_Hatch" "OriginalSVGName"))
  (setq baseFolder "C:\\Users\\TM PROJETOS\\3D Objects\\Projetos\\LispCentral\\web\\public\\")
  
  (if (not suggestedName)
    (setq defaultPath baseFolder)
    (setq defaultPath (strcat baseFolder suggestedName))
  )
  
  (setq fn (getfiled "Guardar SVG (Usa el mismo nombre que el .pat)" defaultPath "svg" 1))
  (if (not fn)
    (progn (princ "\nOperacion cancelada por el usuario.") (exit))
  )
  
  ;; 4. Generar y escribir el archivo SVG
  (setq f (open fn "w"))
  
  ;; Encabezado del SVG
  (write-line (strcat "<svg width=\"" (rtos W 2 4) "\" height=\"" (rtos H 2 4) "\" viewBox=\"0 0 " (rtos W 2 4) " " (rtos H 2 4) "\" xmlns=\"http://www.w3.org/2000/svg\" overflow=\"hidden\">") f)
  ;; Fondo opcional (transparente por defecto, pero si quieres previsualizarlo mejor en algunos sitios)
  ;; (write-line (strcat "  <rect width=\"100%\" height=\"100%\" fill=\"none\" />") f)
  
  (setq i 0)
  (while (< i (sslength ss))
    (setq ent (entget (ssname ss i)))
    (setq entType (cdr (assoc 0 ent)))
    
    (if (= entType "LINE")
      (progn
        (setq pt1 (cdr (assoc 10 ent)))
        (setq pt2 (cdr (assoc 11 ent)))
        
        (setq x1 (- (car pt1) minX))
        (setq y1 (- maxY (cadr pt1)))
        
        (setq x2 (- (car pt2) minX))
        (setq y2 (- maxY (cadr pt2)))
        
        (write-line (strcat "  <line x1=\"" (rtos x1 2 4) "\" y1=\"" (rtos y1 2 4) "\" x2=\"" (rtos x2 2 4) "\" y2=\"" (rtos y2 2 4) "\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"square\" />") f)
      )
    )
    
    (if (= entType "LWPOLYLINE")
      (progn
        (setq pts nil)
        (foreach item ent
          (if (= (car item) 10)
            (progn
              (setq x (- (cadr item) minX))
              (setq y (- maxY (caddr item)))
              (setq pts (append pts (list (strcat (rtos x 2 4) "," (rtos y 2 4)))))
            )
          )
        )
        (setq ptsStr "")
        (foreach p pts (setq ptsStr (strcat ptsStr p " ")))
        
        (setq isClosed (and (assoc 70 ent) (= (logand (cdr (assoc 70 ent)) 1) 1)))
        
        (if isClosed
          (write-line (strcat "  <polygon points=\"" ptsStr "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linejoin=\"round\" />") f)
          (write-line (strcat "  <polyline points=\"" ptsStr "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linejoin=\"round\" stroke-linecap=\"square\" />") f)
        )
      )
    )
    
    (setq i (1+ i))
  )
  
  ;; Cierre del SVG
  (write-line "</svg>" f)
  (close f)
  
  (princ (strcat "\n[EXITO] SVG guardado perfectamente en: " fn))
  (princ)
)

(princ "\nComando PAT2SVG cargado. Escribe PAT2SVG para ejecutarlo.")
(princ)
