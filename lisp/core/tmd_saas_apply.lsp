;;;=============================================================================
;;; tmd_saas_apply.lsp - Applies Cloud Standards to the active DWG
;;; Dependencies: tmd_utils.lsp (loaded previously)
;;;
;;; ARCHITECTURE:
;;; Functions are called individually from the JavaScript palette.
;;; JS parses the standard JSON and calls:
;;;   (tmd:apply-layer "NAME" COLOR "LTYPE" LINEWEIGHT)
;;; for each element, avoiding JSON parsing in LISP.
;;;=============================================================================

;;; --- Helpers ---

;; Loads a linetype from acad.lin if not present in the document.
;; "Continuous" always exists - skipped to avoid errors.
(defun tmd:ensure-linetype (ltype-name doc / ltypes result)
  (if (or (= (strcase ltype-name) "CONTINUOUS") (= ltype-name ""))
    T
    (progn
      (setq ltypes (vla-get-linetypes doc))
      (setq result (vl-catch-all-apply 'vla-item (list ltypes ltype-name)))
      (if (vl-catch-all-error-p result)
        ;; Not found in DWG: attempt to load from acad.lin
        (vl-catch-all-apply 'vla-load (list ltypes ltype-name "acad.lin"))
        T
      )
    )
  )
)

;;; --- Type Applicators ---

;; Creates or updates a layer with standard properties.
;; Called from JS: (tmd:apply-layer "NAME" COLOR "LTYPE" LINEWEIGHT)
(defun tmd:apply-layer (name color ltype lineweight / doc layers layer result)
  (setq doc    (vla-get-activedocument (vlax-get-acad-object)))
  (setq layers (vla-get-layers doc))

  ;; Ensure linetype is loaded before assigning
  (tmd:ensure-linetype ltype doc)

  ;; Get existing layer or create new one
  (setq result (vl-catch-all-apply 'vla-item (list layers name)))
  (if (vl-catch-all-error-p result)
    (setq layer (vla-add layers name))
    (setq layer result)
  )

  ;; Apply properties individually with catch for robustness
  (vl-catch-all-apply 'vla-put-color      (list layer color))
  (vl-catch-all-apply 'vla-put-linetype   (list layer ltype))
  (vl-catch-all-apply 'vla-put-lineweight (list layer lineweight))

  (princ (strcat "\n[TMD] Layer: " name))
)

;; Creates or updates a text style.
;; Called from JS: (tmd:apply-textstyle "NAME" "FONT" HEIGHT)
(defun tmd:apply-textstyle (name font height / doc styles style result)
  (setq doc    (vla-get-activedocument (vlax-get-acad-object)))
  (setq styles (vla-get-textstyles doc))

  (setq result (vl-catch-all-apply 'vla-item (list styles name)))
  (if (vl-catch-all-error-p result)
    (setq style (vla-add styles name))
    (setq style result)
  )

  (if (and font (> (strlen font) 0))
    (vl-catch-all-apply 'vla-put-fontfile (list style font))
  )
  (if (and height (> height 0.0))
    (vl-catch-all-apply 'vla-put-height (list style (float height)))
  )

  (princ (strcat "\n[TMD] TextStyle: " name))
)

;; Renames a layer. All objects follow automatically (O(1)).
;; This is the correct operation to normalize names without moving entities.
;; Called from JS: (tmd:rename-layer "OLD" "NEW")
(defun tmd:rename-layer (old-name new-name / doc layers result layer)
  (setq doc    (vla-get-activedocument (vlax-get-acad-object)))
  (setq layers (vla-get-layers doc))
  (setq result (vl-catch-all-apply 'vla-item (list layers old-name)))
  (if (vl-catch-all-error-p result)
    (progn (princ (strcat "\n[TMD ERROR] Layer not found: " old-name)) nil)
    (progn
      (setq layer result)
      (vl-catch-all-apply 'vla-put-name (list layer new-name))
      (princ (strcat "\n[TMD] Renamed: " old-name " -> " new-name))
      T
    )
  )
)

;;; --- Completion Signal ---

;; Called by JS when all apply-layer calls have finished.
;; Regen so colors and linetypes display immediately.
;; Note: acAllViewports = 1 (ActiveX constant, hardcoded for portability)
(defun c:TMD_APPLY_COMPLETE ( / doc)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (vl-catch-all-apply 'vla-regen (list doc 1))
  (princ "\n[TMD] Standard applied to drawing.")
  (princ)
)

(princ "\n[TMD] tmd_saas_apply.lsp loaded.")
(princ)
