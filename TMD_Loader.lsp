;;; =====================================================================================
;;; LISPCENTRAL - CARREGADOR REMOTO DE ROTINAS (TMD_Loader.lsp)
;;; =====================================================================================
(vl-load-com)

;; Configuração do Servidor LispCentral (Local Emulator / Cloud)
;; Emulador local padrão de Functions V2 roda geralmente na porta 5001.
;; Para usar remoto, mude para a URL gerada pelo Firebase Deploy.
(if (not *LISPCENTRAL-SERVER*)
  (setq *LISPCENTRAL-SERVER* "https://getroutine-wgpjjgorxa-uc.a.run.app")
)
(if (not *LISPCENTRAL-KEY*)
  (setq *LISPCENTRAL-KEY* "lispcentral_test_key")
)

;; Função para baixar e avaliar código na memória do AutoCAD sem gravar arquivos físicos
(defun TMD:load-remote-routine (routine_id / xmlhttp url status response)
  (princ (strcat "\n[LispCentral] Baixando rotina '" routine_id "' da nuvem..."))
  (setq url (strcat *LISPCENTRAL-SERVER* "?apiKey=" *LISPCENTRAL-KEY* "&routine=" routine_id))
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
          ;; Executa o código baixado na RAM do AutoCAD
          (eval (read (strcat "(progn " response "\n(princ)\n)")))
          (princ (strcat "\n[✔] Rotina '" routine_id "' carregada e ativada com sucesso."))
        )
        (progn
          (princ (strcat "\n[⚠] Falha ao baixar '" routine_id "' (Status: " (vl-princ-to-string status) ")."))
          (if (= status 401)
            (princ "\n[⚠] Chave de API inválida ou assinatura expirada.")
          )
        )
      )
      (vlax-release-object xmlhttp)
    )
    (princ "\n[Erro] Falha ao instanciar o objeto XMLHTTP do Windows.")
  )
  (princ)
)

(defun c:TMD_LOAD_REMOTE ()
  (princ "\n[LispCentral] Conectando ao servidor de assinaturas...")
  ;; Sincroniza as rotinas de Juntas e Compilação do MVP
  (TMD:load-remote-routine "TMD_JOINTS")
  (TMD:load-remote-routine "TMD_BUILD")
  (princ "\n[LispCentral] Sincronização finalizada.")
  (princ)
)

(princ "\n[LispCentral] Carregador online pronto. Sincronizando com a nuvem...")
(princ)

;; Executa automaticamente a sincronização ao carregar o arquivo
(c:TMD_LOAD_REMOTE)
