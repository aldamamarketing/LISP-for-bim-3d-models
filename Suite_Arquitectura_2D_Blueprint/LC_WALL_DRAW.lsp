;;; ==========================================================================
;;; LISPCENTRAL - ARQUITECTURA 2D (MVP MOCKUPS)
;;; Archivo: LC_WALL_DRAW.lsp
;;; Función: Dibuja muros 2D (doble línea) con LDATA.
;;; ==========================================================================

(vl-load-com)

(defun c:LC_WALL_DRAW ( / espesor material pt1 pt2 ang dist offset_pt1a offset_pt1b offset_pt2a offset_pt2b p_a p_b dict)
  (princ "\n[LC] Iniciando trazado de Muro Inteligente...")

  ;; Simulación de variables desde la Paleta Web
  (setq espesor (atof (cond ((getvar "USERS1")) ("150.0")))) ; Espesor en mm
  (setq material (cond ((getvar "USERS2")) ("Ladrillo")))

  (setq pt1 (getpoint "\n[LC] Punto de inicio del muro: "))
  (if pt1 (setq pt2 (getpoint pt1 "\n[LC] Punto final del muro: ")))

  (if (and pt1 pt2)
    (progn
      (setq ang (angle pt1 pt2))
      (setq dist (distance pt1 pt2))

      ;; Calcular offsets para doble línea (justificación central por defecto)
      (setq offset_pt1a (polar pt1 (+ ang (/ pi 2)) (/ espesor 2.0)))
      (setq offset_pt1b (polar pt1 (- ang (/ pi 2)) (/ espesor 2.0)))
      (setq offset_pt2a (polar pt2 (+ ang (/ pi 2)) (/ espesor 2.0)))
      (setq offset_pt2b (polar pt2 (- ang (/ pi 2)) (/ espesor 2.0)))

      ;; Dibujar las dos caras del muro
      (command "_.LINE" "_non" offset_pt1a "_non" offset_pt2a "")
      (setq p_a (entlast))
      (command "_.LINE" "_non" offset_pt1b "_non" offset_pt2b "")
      (setq p_b (entlast))

      ;; Crear un grupo o polilínea cerrada (simplificado para el mockup)
      (command "_.LAYER" "_M" "LC-ARQ-MUROS" "_C" "1" "" "")
      (command "_.CHPROP" p_a p_b "" "_LA" "LC-ARQ-MUROS" "")

      ;; Inyectar LDATA en la línea principal
      (setq dict (list
                   (cons "TIPO" "MURO")
                   (cons "MATERIAL" material)
                   (cons "ESPESOR" espesor)
                 ))
      (vlax-ldata-put p_a "LC_ARQ_DATA" dict)

      (princ (strcat "\n[LC] Muro de " material " (" (rtos espesor 2 0) "mm) dibujado."))
    )
  )
  (princ)
)