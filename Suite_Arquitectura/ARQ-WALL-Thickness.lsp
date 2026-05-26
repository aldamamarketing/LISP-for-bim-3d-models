;; TMD - ARQ-WALL-Thickness
;; Comando descriptivo semántico para cambiar el grosor de las paredes seleccionadas.

(defun c:ARQ-WALL-Thickness ()
  (princ "\n[LispCentral] Comando ejecutado: ARQ-WALL-Thickness")
  (setvar "USERS1" "ARQ-WALL-Thickness:active")
  (princ "\nSeleccione los muros para cambiarles el grosor...")
  (princ)
)
