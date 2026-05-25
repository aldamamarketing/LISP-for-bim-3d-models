;;; ==========================================================================
;;; LISPCENTRAL CLOUD ROUTINE
;;; Comando: LC_FLATZ
;;; Descrição: Zera a coordenada Z de objetos selecionados (Flatten).
;;; ==========================================================================

(defun c:LC_FLATZ ( / ss)
  (princ "\n[LispCentral] Select objects to flatten to Z=0: ")
  (setq ss (ssget))
  (if ss
    (progn
      (command "_.MOVE" ss "" '(0 0 1e99) "")
      (command "_.MOVE" "P" "" '(0 0 -1e99) "")
      (princ "\n[LispCentral] Objects flattened successfully.")
    )
    (princ "\n[LispCentral] No objects selected.")
  )
  (princ)
)
