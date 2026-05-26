;;; ==========================================================================
;;; LISPCENTRAL - TOPOGRAFÍA 2D (MVP MOCKUPS)
;;; Archivo: LC_CUADRO_RUMBOS.lsp
;;; Función: Extrae coordenadas de una polilínea para la paleta web.
;;; ==========================================================================

(vl-load-com)

(defun c:LC_CUADRO_RUMBOS ( / ent obj verts i pt json_str)
  (princ "\n[LC] Seleccione polilínea (Lote) para generar Cuadro de Rumbos...")

  (setq ent (car (entsel)))
  (if (and ent (= (cdr (assoc 0 (entget ent))) "LWPOLYLINE"))
    (progn
      (setq obj (vlax-ename->vla-object ent))
      (setq verts (vlax-get obj 'Coordinates))

      ;; Iniciar JSON
      (setq json_str "[")

      (setq i 0)
      (while (< i (length verts))
        ;; LWPolyline vertices son 2D (X, Y)
        (setq pt (list (nth i verts) (nth (+ i 1) verts)))

        (setq json_str
              (strcat json_str
                      "{\"vertice\": " (itoa (/ i 2)) ", "
                      "\"este_X\": " (rtos (car pt) 2 4) ", "
                      "\"norte_Y\": " (rtos (cadr pt) 2 4) "},"
              )
        )
        (setq i (+ i 2))
      )

      ;; Cerrar JSON
      (if (> (strlen json_str) 1)
        (setq json_str (substr json_str 1 (1- (strlen json_str))))
      )
      (setq json_str (strcat json_str "]"))

      ;; Enviar a la Web (simulado vía archivo temporal)
      (setq file (open "C:\\Temp\\lc_topografia.json" "w"))
      (if file
        (progn
          (write-line json_str file)
          (close file)
          (princ "\n[LC] Datos topográficos listos para la Paleta Web. (Ver C:\\Temp\\lc_topografia.json)")
        )
      )
    )
    (princ "\n[LC] Error: Debe seleccionar una polilínea (LWPOLYLINE).")
  )
  (princ)
)