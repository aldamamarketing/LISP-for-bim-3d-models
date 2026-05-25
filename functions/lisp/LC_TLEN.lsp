;;; ==========================================================================
;;; LISPCENTRAL CLOUD ROUTINE
;;; Comando: LC_TLEN
;;; Descrição: Soma o comprimento total de linhas, arcos e polilinhas.
;;; ==========================================================================

(vl-load-com)
(defun c:LC_TLEN ( / ss i ent obj len total)
  (setq total 0.0)
  (princ "\n[LispCentral] Select lines, arcs, or polylines to sum length: ")
  (if (setq ss (ssget '((0 . "LINE,ARC,LWPOLYLINE,POLYLINE,SPLINE"))))
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq obj (vlax-ename->vla-object ent))
        (if (vlax-property-available-p obj 'Length)
          (setq len (vlax-get-property obj 'Length))
          (if (vlax-property-available-p obj 'ArcLength)
            (setq len (vlax-get-property obj 'ArcLength))
            (setq len 0.0)
          )
        )
        (setq total (+ total len))
        (setq i (1+ i))
      )
      (princ (strcat "\n[LispCentral] Total Length: " (rtos total 2 2)))
    )
    (princ "\n[LispCentral] No valid objects selected.")
  )
  (princ)
)
