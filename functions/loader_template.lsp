;;; ==========================================================================
;;; LISPCENTRAL CLOUD LOADER v3.1 (SaaS)
;;; Não modifique a chave abaixo. Ela vincula sua assinatura.
;;; ==========================================================================

(setq *LISPCENTRAL-KEY* "{{API_KEY}}")
(setq *LISPCENTRAL-ENDPOINT* "https://getroutine-wgpjjgorxa-uc.a.run.app")
(setq *LISPCENTRAL-TELEMETRY* "https://telemetry-wgpjjgorxa-uc.a.run.app")

;; Gerando Hash de Hardware (Machine ID) e Versão do AutoCAD
(setq *LISPCENTRAL-HWID* (strcat (getenv "COMPUTERNAME") "@" (getenv "USERNAME")))
(setq *LISPCENTRAL-ACADVER* (getvar "ACADVER"))

;; Funcao profissional para Dialog Box (Yes/No)
(defun TMD:MsgBox (title msg type / wsh res)
  (if (setq wsh (vlax-create-object "WScript.Shell"))
    (progn
      (setq res (vlax-invoke-method wsh 'Popup msg 0 title type))
      (vlax-release-object wsh)
      res
    )
    (progn (alert msg) 0)
  )
)

;; Funcao de Envio de Log
(defun TMD:SendLog (status details / http-obj url)
  (setq url (strcat *LISPCENTRAL-TELEMETRY* 
            "?apiKey=" *LISPCENTRAL-KEY* 
            "&hwId=" *LISPCENTRAL-HWID* 
            "&acadVer=" *LISPCENTRAL-ACADVER* 
            "&status=" status 
            "&details=" details))
  (setq url (vl-string-translate " " "%20" url))
  (if (setq http-obj (vlax-create-object "MSXML2.XMLHTTP"))
    (progn
      (vlax-invoke-method http-obj 'Open "GET" url :vlax-false)
      (vlax-invoke-method http-obj 'Send)
      (vlax-release-object http-obj)
    )
  )
)

(defun TMD:load-remote-routine (routine-name / http-obj url response status eval-result errmsg err-return)
  (setq url (strcat *LISPCENTRAL-ENDPOINT* "?apiKey=" *LISPCENTRAL-KEY* "&hwId=" *LISPCENTRAL-HWID* "&routine=" routine-name))
  (setq url (vl-string-translate " " "%20" url))
  (setq http-obj (vlax-create-object "MSXML2.XMLHTTP"))
  (setq err-return nil)
  (if http-obj
    (progn
      (vlax-invoke-method http-obj 'Open "GET" url :vlax-false)
      (vlax-invoke-method http-obj 'Send)
      (setq status (vlax-get-property http-obj 'Status))
      (if (= status 200)
        (progn
          (setq response (vlax-get-property http-obj 'ResponseText))
          (setq eval-result (vl-catch-all-apply 'eval (list (read (strcat "(progn " response ")")))))
          (if (vl-catch-all-error-p eval-result)
            (progn
              (setq errmsg (vl-catch-all-error-message eval-result))
              (princ (strcat "\n[LispCentral] Erro de codigo ao processar " routine-name ": " errmsg))
              (setq err-return (strcat "CompileError_in_" routine-name "_Msg:" errmsg))
            )
          )
        )
        (progn
          (if (or (= status 401) (= status 403))
            (setq err-return "LICENSE_EXPIRED")
            (progn
              (princ (strcat "\n[LispCentral] Falha ao carregar " routine-name " - Codigo: " (itoa status)))
              (setq err-return (strcat "HTTP_" (itoa status) "_on_" routine-name))
            )
          )
        )
      )
      (vlax-release-object http-obj)
    )
    (setq err-return (strcat "Erro_XMLHTTP_em_" routine-name))
  )
  err-return
)

(defun c:LC_LOAD_REMOTE (/ err-list res msg ans log-msg has-license-error)
  (princ "\n[LispCentral] Conectando ao servidor de assinaturas...")
  (setq err-list '())
  
  (if (setq res (TMD:load-remote-routine "LC_JOINTS")) (setq err-list (append err-list (list res))))
  (if (setq res (TMD:load-remote-routine "LC_BUILD")) (setq err-list (append err-list (list res))))
  (if (setq res (TMD:load-remote-routine "LC_CLEAN")) (setq err-list (append err-list (list res))))
  (if (setq res (TMD:load-remote-routine "LC_FLATZ")) (setq err-list (append err-list (list res))))
  (if (setq res (TMD:load-remote-routine "LC_TLEN")) (setq err-list (append err-list (list res))))
  (if (setq res (TMD:load-remote-routine "LC_TAREA")) (setq err-list (append err-list (list res))))
  (if (setq res (TMD:load-remote-routine "LC_AUTONUM")) (setq err-list (append err-list (list res))))
  (if (setq res (TMD:load-remote-routine "LC_ZLABEL")) (setq err-list (append err-list (list res))))
  
  (if (> (length err-list) 0)
    (progn
      (setq has-license-error (vl-position "LICENSE_EXPIRED" err-list))
      (if has-license-error
        (progn
          (TMD:MsgBox "LispCentral - Acesso Negado" "Acesso negado às ferramentas.\nIsso ocorre porque sua licença expirou ou a suite não está inclusa no seu plano atual.\n\nPor favor, acesse o Portal do Cliente (lispcentral.web.app) e regularize sua assinatura." 48)
        )
        (progn
          (setq msg "Foram encontrados problemas ao carregar os seguintes modulos:\n")
          (foreach err err-list
            (setq msg (strcat msg "\n- " err))
          )
          (setq msg (strcat msg "\n\nDeseja enviar um reporte para nossa equipe analisar e corrigir?"))
          (setq ans (TMD:MsgBox "LispCentral - Reporte de Erros" msg 36))
          (if (= ans 6)
            (progn
              (setq log-msg (vl-string-translate "\n" "|" msg))
              (TMD:SendLog "BATCH_ERROR" log-msg)
              (princ "\n[LispCentral] Reporte de erro enviado. Nossa equipe revisara o problema e o corrigira em breve. Obrigado!")
            )
          )
        )
      )
    )
  )
  (princ "\n[LispCentral] Sincronização finalizada.")
  (princ)
)

(princ "\n[LispCentral] Carregador online v3.1 pronto. Sincronizando com a nuvem...")
(c:LC_LOAD_REMOTE)
(princ)
