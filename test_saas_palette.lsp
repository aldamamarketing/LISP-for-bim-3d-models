;;;=============================================================================
;;; DEPRECATED — Este archivo fue movido a lisp/dev/test_saas_palette.lsp
;;; Se mantiene en la raíz solo para compatibilidad con sesiones existentes.
;;;=============================================================================
(princ "\n[AVISO] Cargando desde nueva ubicación: lisp/dev/test_saas_palette.lsp")

(if (not (boundp '*LC-PROJECT-PATH*))
  (setq *LC-PROJECT-PATH* "C:/Users/TM PROJETOS/3D Objects/Projetos/LispCentral")
)

(load (strcat *LC-PROJECT-PATH* "/lisp/dev/test_saas_palette.lsp"))
