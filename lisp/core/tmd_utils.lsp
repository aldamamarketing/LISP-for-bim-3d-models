;;;=============================================================================
;;; tmd_utils.lsp — Utilidades compartidas para LispCentral SaaS
;;; Cargado por: tmd_saas_extract.lsp, tmd_saas_apply.lsp
;;;=============================================================================

(vl-load-com)

;;; --- JSON Utilities ---

;; Escapa caracteres especiales en strings para JSON válido
(defun tmd:escape-json-string (str / i char result)
  (if (not str)
    ""
    (progn
      (setq result "")
      (setq i 1)
      (while (<= i (strlen str))
        (setq char (substr str i 1))
        (cond
          ((= char "\\") (setq result (strcat result "\\\\")))
          ((= char "\"") (setq result (strcat result "\\\"")))
          ((= char "\n") (setq result (strcat result "\\n")))
          ((= char "\r") (setq result (strcat result "\\r")))
          ((= char "\t") (setq result (strcat result "\\t")))
          (T             (setq result (strcat result char)))
        )
        (setq i (1+ i))
      )
      result
    )
  )
)

;; Convierte una lista de strings ("k1: v1", "k2: v2") en un objeto JSON
;; Evita el problema de la coma final con vl-string-right-trim
(defun tmd:list->json-object (entries / result i)
  (if (not entries)
    "{}"
    (progn
      (setq result "{")
      (setq i 0)
      (foreach entry entries
        (if (> i 0) (setq result (strcat result ",")))
        (setq result (strcat result entry))
        (setq i (1+ i))
      )
      (strcat result "}")
    )
  )
)

;;; --- HTTP Utilities ---

;; URL de la Cloud Function (producción)
(defun tmd:api-base ()
  "https://us-central1-lispcentral.cloudfunctions.net"
)

;; HTTP POST - retorna el response body como string, o nil en error
(defun tmd:post-json (url payload / http response)
  (setq http (vlax-create-object "WinHttp.WinHttpRequest.5.1"))
  (if (not http)
    (progn (princ "\n[TMD ERROR] WinHttp no disponible.") nil)
    (progn
      (vlax-invoke-method http 'Open "POST" url :vlax-false)
      (vlax-invoke-method http 'SetRequestHeader "Content-Type" "application/json")
      (vl-catch-all-apply 'vlax-invoke-method (list http 'Send payload))
      (setq response (vl-catch-all-apply 'vlax-get-property (list http 'ResponseText)))
      (vlax-release-object http)
      (if (vl-catch-all-error-p response)
        (progn (princ "\n[TMD ERROR] HTTP POST fallido.") nil)
        response
      )
    )
  )
)

;; HTTP GET - retorna el response body como string, o nil en error
(defun tmd:get-json (url / http response)
  (setq http (vlax-create-object "WinHttp.WinHttpRequest.5.1"))
  (if (not http)
    (progn (princ "\n[TMD ERROR] WinHttp no disponible.") nil)
    (progn
      (vlax-invoke-method http 'Open "GET" url :vlax-false)
      (vl-catch-all-apply 'vlax-invoke-method (list http 'Send ""))
      (setq response (vl-catch-all-apply 'vlax-get-property (list http 'ResponseText)))
      (vlax-release-object http)
      (if (vl-catch-all-error-p response)
        (progn (princ "\n[TMD ERROR] HTTP GET fallido.") nil)
        response
      )
    )
  )
)

(princ "\n[TMD] tmd_utils.lsp cargado.")
(princ)
