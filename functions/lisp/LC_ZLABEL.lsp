;;; ==========================================================================
;;; LISPCENTRAL CLOUD ROUTINE
;;; Comando: LC_ZLABEL
;;; Descrição: Etiqueta automaticamente a cota (Z) de um ponto selecionado.
;;; ==========================================================================

(defun c:LC_ZLABEL ( / pt zval txtHeight)
  (setq txtHeight (getvar "TEXTSIZE"))
  (while (setq pt (getpoint "\n[LispCentral] Pick point to label elevation (or ESC to exit): "))
    (setq zval (caddr pt))
    (command "_.TEXT" "_J" "_MC" pt txtHeight 0 (rtos zval 2 2))
  )
  (princ)
)
