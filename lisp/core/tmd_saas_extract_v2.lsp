;;;=============================================================================
;;; tmd_saas_extract.lsp - Extracts active DWG standards to the Cloud
;;; Dependencies: tmd_utils.lsp (loaded previously by Loader)
;;;=============================================================================

;;; --- Type Extractors ---

;; Layers: extracts all layers (excludes XREFs with "|")
(defun tmd:get-layers-json (/ doc layers entries name color ltype lw plottable desc)
  (setq doc    (vla-get-activedocument (vlax-get-acad-object)))
  (setq layers (vla-get-layers doc))
  (setq entries '())
  (vlax-for layer layers
    (setq name (vla-get-name layer))
    (if (not (vl-string-search "|" name))
      (progn
        (setq color     (vla-get-color layer))
        (setq ltype     (vla-get-linetype layer))
        (setq lw        (vla-get-lineweight layer))
        (setq plottable (if (= (vla-get-plottable layer) :vlax-true) "true" "false"))
        (setq desc      (vl-catch-all-apply 'vla-get-description (list layer)))
        (if (vl-catch-all-error-p desc) (setq desc ""))
        (setq entries (cons
          (strcat
            "\"" (tmd:escape-json-string name) "\":"
            "{\"color\":"       (itoa color)
            ",\"ltype\":\""     (tmd:escape-json-string ltype) "\""
            ",\"lineweight\":"  (itoa lw)
            ",\"plottable\":"   plottable
            ",\"description\":\"" (tmd:escape-json-string desc) "\"}"
          ) entries))
      )
    )
  )
  (tmd:list->json-object (reverse entries))
)

;; TextStyles: extracts text styles (excludes XREFs)
(defun tmd:get-textstyles-json (/ tbl entries name font bigfont height)
  (setq tbl (tblnext "STYLE" T))
  (setq entries '())
  (while tbl
    (setq name    (cdr (assoc 2  tbl)))
    (setq font    (cdr (assoc 3  tbl)))
    (setq bigfont (cdr (assoc 4  tbl)))
    (setq height  (cdr (assoc 40 tbl)))
    (if (not (vl-string-search "|" name))
      (setq entries (cons
        (strcat
          "\"" (tmd:escape-json-string name) "\":"
          "{\"font\":\""    (tmd:escape-json-string (if font font "")) "\""
          ",\"bigfont\":\"" (tmd:escape-json-string (if bigfont bigfont "")) "\""
          ",\"height\":"    (rtos (if height height 0.0) 2 4) "}"
        ) entries))
    )
    (setq tbl (tblnext "STYLE"))
  )
  (tmd:list->json-object (reverse entries))
)

;; DimStyles: extracts dimension styles with key properties
;; DXF codes: 40=DIMSCALE, 140=DIMTXT, 41=DIMASZ, 271=DIMDEC, 147=DIMGAP
(defun tmd:get-dimstyles-json (/ tbl entries name scale txth arrowsz dimdec dimgap)
  (setq tbl (tblnext "DIMSTYLE" T))
  (setq entries '())
  (while tbl
    (setq name    (cdr (assoc 2   tbl)))
    (setq scale   (cdr (assoc 40  tbl)))
    (setq txth    (cdr (assoc 140 tbl)))
    (setq arrowsz (cdr (assoc 41  tbl)))
    (setq dimdec  (cdr (assoc 271 tbl)))
    (setq dimgap  (cdr (assoc 147 tbl)))
    (if (not (vl-string-search "|" name))
      (setq entries (cons
        (strcat
          "\"" (tmd:escape-json-string name) "\":"
          "{\"dimscale\":" (rtos (if scale   scale   1.0) 2 4)
          ",\"dimtxt\":"   (rtos (if txth    txth    2.5) 2 4)
          ",\"dimasz\":"   (rtos (if arrowsz arrowsz 2.5) 2 4)
          ",\"dimdec\":"   (itoa (if dimdec  dimdec  4))
          ",\"dimgap\":"   (rtos (if dimgap  dimgap  0.625) 2 4)
          "}"
        ) entries))
    )
    (setq tbl (tblnext "DIMSTYLE"))
  )
  (tmd:list->json-object (reverse entries))
)

;; Linetypes
(defun tmd:get-linetypes-json (/ tbl entries name desc)
  (setq tbl (tblnext "LTYPE" T))
  (setq entries '())
  (while tbl
    (setq name (cdr (assoc 2 tbl)))
    (setq desc (cdr (assoc 3 tbl)))
    (if (not (vl-string-search "|" name))
      (setq entries (cons
        (strcat "\"" (tmd:escape-json-string name) "\":{\"desc\":\"" (tmd:escape-json-string (if desc desc "")) "\"}")
      entries))
    )
    (setq tbl (tblnext "LTYPE"))
  )
  (tmd:list->json-object (reverse entries))
)

;; GlobalVars
(defun tmd:get-globalvars-json (/ ins lt ds meas)
  (setq ins (getvar "INSUNITS"))
  (setq lt  (getvar "LTSCALE"))
  (setq ds  (getvar "DIMSCALE"))
  (setq meas(getvar "MEASUREMENT"))
  (strcat "{"
    "\"INSUNITS\":{\"value\":" (itoa ins) "},"
    "\"LTSCALE\":{\"value\":" (rtos lt 2 4) "},"
    "\"DIMSCALE\":{\"value\":" (rtos ds 2 4) "},"
    "\"MEASUREMENT\":{\"value\":" (itoa meas) "}"
  "}")
)

;; MLeaderStyles
(defun tmd:get-mleaderstyles-json (/ doc dicts mldict entries name result)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq dicts (vla-get-dictionaries doc))
  (setq result (vl-catch-all-apply 'vla-item (list dicts "ACAD_MLEADERSTYLE")))
  (setq entries '())
  (if (not (vl-catch-all-error-p result))
    (vlax-for obj result
      (setq name (vla-get-name obj))
      (if (not (vl-string-search "|" name))
        (setq entries (cons (strcat "\"" (tmd:escape-json-string name) "\":{}") entries))
      )
    )
  )
  (tmd:list->json-object (reverse entries))
)

;; TableStyles
(defun tmd:get-tablestyles-json (/ doc dicts entries name result)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq dicts (vla-get-dictionaries doc))
  (setq result (vl-catch-all-apply 'vla-item (list dicts "ACAD_TABLESTYLE")))
  (setq entries '())
  (if (not (vl-catch-all-error-p result))
    (vlax-for obj result
      (setq name (vla-get-name obj))
      (if (not (vl-string-search "|" name))
        (setq entries (cons (strcat "\"" (tmd:escape-json-string name) "\":{}") entries))
      )
    )
  )
  (tmd:list->json-object (reverse entries))
)

;;; --- Main command ---

(defun tmd:extract-stds (teamId token / payload url res)
  (princ (strcat "\n[SAAS] Extracting standard for team: " teamId "..."))
  (setq payload (strcat "{"
    "\"token\":\""     (tmd:escape-json-string token)  "\","
    "\"teamId\":\""    (tmd:escape-json-string teamId) "\","
    "\"standardData\":{"
      "\"layers\":"         (tmd:get-layers-json)         ","
      "\"textStyles\":"     (tmd:get-textstyles-json)     ","
      "\"dimStyles\":"      (tmd:get-dimstyles-json)      ","
      "\"linetypes\":"      (tmd:get-linetypes-json)      ","
      "\"globalVars\":"     (tmd:get-globalvars-json)     ","
      "\"mleaderStyles\":"  (tmd:get-mleaderstyles-json)  ","
      "\"tableStyles\":"    (tmd:get-tablestyles-json)
    "}}"
  ))
  (setq url (strcat (tmd:api-base) "/uploadDraft"))
  (setq res (tmd:post-json url payload))
  (if res
    (progn
      (princ (strcat "\n[SAAS] Server responded: " res))
      (setvar "USERS1" "LC_SAAS_DRAFT_READY")
    )
    (princ "\n[SAAS] Error contacting server.")
  )
  (princ)
)

(princ "\n[TMD] tmd_saas_extract_v2.lsp loaded.")
(princ)
