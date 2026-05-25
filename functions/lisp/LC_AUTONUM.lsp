;;; ==========================================================================
;;; LISPCENTRAL CLOUD ROUTINE
;;; Comando: LC_AUTONUM
;;; Descrição: Insere números sequenciais clicando na tela.
;;; ==========================================================================

(defun c:LC_AUTONUM ( / prefix start pt txtHeight)
  (setq prefix (getstring "\n[LispCentral] Enter prefix (or press Enter for none): "))
  (setq start (getint "\n[LispCentral] Enter starting number: "))
  (if (not start) (setq start 1))
  (setq txtHeight (getvar "TEXTSIZE"))
  (while (setq pt (getpoint (strcat "\n[LispCentral] Pick point for " prefix (itoa start) " (or ESC to exit): ")))
    (command "_.TEXT" "_J" "_MC" pt txtHeight 0 (strcat prefix (itoa start)))
    (setq start (1+ start))
  )
  (princ)
)
