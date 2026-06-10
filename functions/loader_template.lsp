;;; ==========================================================================
;;; LISPCENTRAL CLOUD LOADER (SaaS Multi-Tenant)
;;; Licensed to: {{TENANT_NAME}}
;;; 
;;; LEGAL NOTICE:
;;; This is a lightweight Bootstrap Loader. To guarantee maximum security
;;; and ensure you always run the latest version, the LispCentral Core Engine
;;; is downloaded dynamically from our servers and executed directly in 
;;; AutoCAD's memory, leaving no traces on your hard drive. This protects
;;; the intellectual property of the developers.
;;; 
;;; WARNING: Do not modify the Seat Token below. It links your seat and company.
;;; ==========================================================================

(
  (lambda ( / xmlhttp url status response hwid)
    (princ "\n[LispCentral] Initializing Cloud Bootstrap...")
    (setq hwid (strcat (getenv "COMPUTERNAME") "@" (getenv "USERNAME")))
    
    ;; Simple inline URL encoder for the HWID
    (defun LC-inline-encode (str / res i len char) 
      (setq res "")
      (setq i 1)
      (setq len (strlen str))
      (while (<= i len) 
        (setq char (substr str i 1))
        (if (= char " ") (setq res (strcat res "%20")) (setq res (strcat res char)))
        (setq i (1+ i))
      )
      res
    )

    (setq url (strcat "https://us-central1-lispcentral.cloudfunctions.net/getRoutine?token={{SEAT_TOKEN}}&hwId=" (LC-inline-encode hwid) "&routine=BOOT"))
    
    (setq xmlhttp (vlax-create-object "MSXML2.XMLHTTP.6.0"))
    (if xmlhttp 
      (progn 
        (vl-catch-all-apply 
          '(lambda () 
             (vlax-invoke-method xmlhttp 'open "GET" url :vlax-false)
             (vlax-invoke-method xmlhttp 'send)
           )
        )
        (setq status (vl-catch-all-apply 'vlax-get-property (list xmlhttp 'status)))
        (if (= status 200) 
          (progn 
            (setq response (vlax-get-property xmlhttp 'responseText))
            (if (vl-catch-all-error-p (vl-catch-all-apply 'eval (list (read response))))
              (princ "\n[CRITICAL ERROR] Core Engine execution failed. Contact support.")
              (princ "\n[SUCCESS] LispCentral connected securely.")
            )
          )
          (princ (strcat "\n[ERROR] Bootstrap failed. HTTP Status: " (vl-princ-to-string status)))
        )
        (vlax-release-object xmlhttp)
      )
      (princ "\n[CRITICAL ERROR] Failed to instantiate MSXML2.XMLHTTP object.")
    )
    (princ)
  )
)