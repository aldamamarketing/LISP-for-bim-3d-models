;;; ==========================================================================
;;; LISPCENTRAL CLOUD ROUTINE
;;; Comando: LC_CLEAN
;;; Descrição: Purge e Audit profundo automático.
;;; ==========================================================================

(defun c:LC_CLEAN ()
  (princ "\n[LispCentral] Running Deep Clean...")
  (command "_.PURGE" "_A" "*" "_N")
  (command "_.PURGE" "_A" "*" "_N")
  (command "_.PURGE" "_A" "*" "_N")
  (command "_.AUDIT" "_Y")
  (princ "\n[LispCentral] Drawing cleaned and audited successfully.")
  (princ)
)
