;;;=============================================================================
;;; tmd_saas_audit.lsp - Extracts DWG and reports standard violations
;;; Dependencies: tmd_utils.lsp, tmd_saas_extract.lsp (in memory)
;;;
;;; FLOW:
;;; 1. Palette calls (tmd:run-audit teamId token)
;;; 2. This LISP extracts current DWG (same logic as extract)
;;; 3. Uploads snapshot to an endpoint
;;; 4. Backend/Frontend compares with saved standard
;;; 5. Palette shows violations panel with fix options
;;;
;;; NOTE: Comparison logic lives in the frontend (DiffMergePanel).
;;; LISP only provides the DWG data. This keeps LISP simple
;;; and business logic in JS where it is easier to maintain.
;;;=============================================================================

;; Runs audit: extracts DWG and uploads for comparison.
;; Identical to tmd:extract-stds but used for audit workflow.
;; Palette will receive snapshot via polling and show
;; the audit panel (reverse of DiffMergePanel).
(defun tmd:run-audit (teamId token / payload url res)
  (princ (strcat "\n[SAAS] Starting audit for team: " teamId "..."))

  (setq payload (strcat "{"
    "\"token\":\"" (tmd:escape-json-string token) "\","
    "\"teamId\":\"" (tmd:escape-json-string teamId) "\","
    "\"standardData\":{"
      "\"layers\":"     (tmd:get-layers-json)     ","
      "\"textStyles\":" (tmd:get-textstyles-json) ","
      "\"dimStyles\":"  (tmd:get-dimstyles-json)
    "}}"
  ))

  ;; Same endpoint as extract for MVP.
  (setq url (strcat (tmd:api-base) "/uploadDraft"))
  (setq res (tmd:post-json url payload))

  (if res
    (progn
      (princ (strcat "\n[SAAS] Audit sent: " res))
      ;; Same signal as extract - palette opens DiffMergePanel in Audit mode
      (setvar "USERS1" "LC_SAAS_DRAFT_READY")
    )
    (princ "\n[SAAS] Error sending audit.")
  )
  (princ)
)

(princ "\n[TMD] tmd_saas_audit_v2.lsp loaded.")
(princ)
