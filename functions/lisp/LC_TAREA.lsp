;;; ==========================================================================
;;; LISPCENTRAL CLOUD ROUTINE
;;; Comando: LC_TAREA
;;; Descrição: Soma a área de objetos fechados.
;;; ==========================================================================

(vl-load-com)
(defun c:LC_TAREA ( / ss i ent obj area total)
  (setq total 0.0)
  (princ "\n[LispCentral] Select closed objects to sum area: ")
  (if (setq ss (ssget '((0 . "CIRCLE,LWPOLYLINE,POLYLINE,SPLINE,REGION,HATCH"))))
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq obj (vlax-ename->vla-object ent))
        (if (vlax-property-available-p obj 'Area)
          (setq area (vlax-get-property obj 'Area))
          (setq area 0.0)
        )
        (setq total (+ total area))
        (setq i (1+ i))
      )
      (princ (strcat "\n[LispCentral] Total Area: " (rtos total 2 2)))
    )
    (princ "\n[LispCentral] No valid objects selected.")
  )
  (princ)
)
