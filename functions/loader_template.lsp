;;; ==========================================================================
;;; LISPCENTRAL CLOUD LOADER v3.5 (SaaS)
;;; Não modifique a chave abaixo. Ela vincula sua assinatura.
;;; ==========================================================================

(setq *LISPCENTRAL-KEY* "{{API_KEY}}")
(setq *LISPCENTRAL-ENDPOINT* "https://getroutine-wgpjjgorxa-uc.a.run.app/getRoutine")
(setq *LISPCENTRAL-TELEMETRY* "https://telemetry-wgpjjgorxa-uc.a.run.app/telemetry")

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

;; Funcao utilitaria para codificar espacos na URL
(defun LC:url-encode (str / res i len char)
  (setq res "")
  (setq i 1)
  (setq len (strlen str))
  (while (<= i len)
    (setq char (substr str i 1))
    (if (= char " ")
      (setq res (strcat res "%20"))
      (setq res (strcat res char))
    )
    (setq i (1+ i))
  )
  res
)

;; Funcao para baixar e avaliar codigo na memoria do AutoCAD sem gravar arquivos fisicos
(defun LC:load-remote-routine (routine_id / xmlhttp url status response)
  (princ (strcat "\n[LispCentral] Baixando rotina '" routine_id "'..."))
  (setq url (strcat *LISPCENTRAL-ENDPOINT* "?apiKey=" *LISPCENTRAL-KEY* "&hwId=" (LC:url-encode *LISPCENTRAL-HWID*) "&routine=" routine_id))
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
          ;; Executa o codigo em RAM de forma isolada
          (if (vl-catch-all-error-p (vl-catch-all-apply 'eval (list (read (strcat "(progn\n" response "\n(princ)\n)")))))
            (progn
              (princ (strcat "\n[❌] Erro de sintaxe na rotina: " routine_id))
              (setvar "USERS1" (strcat routine_id ":error"))
              nil
            )
            (progn
              (setvar "USERS1" (strcat routine_id ":success"))
              (princ (strcat "\n[✔] Rotina '" routine_id "' carregada na RAM."))
              t
            )
          )
        )
        (progn
          (princ (strcat "\n[❌] Falha ao baixar '" routine_id "' (Status: " (vl-princ-to-string status) ")."))
          (setvar "USERS1" (strcat routine_id ":error"))
          nil
        )
      )
      (vlax-release-object xmlhttp)
    )
    (progn
      (princ "\n[❌] Falha ao instanciar o objeto XMLHTTP.")
      (setvar "USERS1" (strcat routine_id ":error"))
      nil
    )
  )
  (princ)
)

;; Funcao para rodar um comando garantindo que esteja carregado
(defun LC:run-or-load (routine_name / cmd-sym)
  (setq cmd-sym (read (strcat "c:" routine_name)))
  (if (not (eval (list 'type cmd-sym)))
    (progn
      (princ (strcat "\n[LispCentral] Comando '" routine_name "' nao esta na RAM. Carregando..."))
      (LC:load-remote-routine routine_name)
    )
  )
  (if (eval (list 'type cmd-sym))
    (progn
      (eval (list cmd-sym))
    )
    (alert (strcat "\n[❌] Erro: Nao foi possivel carregar o comando: " routine_name))
  )
  (princ)
)

;; Comando Principal de la Paleta Unificada (CP1)
(defun c:CP1 (/ doc find-path bridge-dir html-path loader-js f-js)
  (vl-load-com)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)
  
  (princ "\n[⚙] Carregando LispCentral Command Palette...")
  
  ;; 1. Localizar o diretório do LISP dinamicamente de forma segura
  (setq find-path (findfile "LC_Loader.lsp"))
  (if find-path
    (setq bridge-dir (vl-filename-directory find-path))
    (progn
      ;; Fallbacks seguros si no está en la ruta de soporte
      (if (vl-file-directory-p "Z:/Autocad Config/LISP")
        (setq bridge-dir "Z:/Autocad Config/LISP")
        (setq bridge-dir "C:/Users/TM PROJETOS/Downloads")
      )
    )
  )
  
  ;; 2. Construir o caminho para o arquivo HTML de la paleta unificada
  (setq html-path (strcat bridge-dir "/web/inspector_unified.html"))
  (setq html-path (vl-string-translate "\\" "/" html-path))
  
  (if (not (vl-string-search "file:///" html-path))
    (if (= (substr html-path 1 1) "/")
      (setq html-path (strcat "file://" html-path))
      (setq html-path (strcat "file:///" html-path))
    )
  )
  
  ;; Codificar espacios
  (while (vl-string-search " " html-path)
    (setq html-path (vl-string-subst "%20" " " html-path))
  )
  
  ;; Añadir parámetros de API Key y HWID de forma segura
  (setq html-path (strcat html-path "?key=" *LISPCENTRAL-KEY* "&hwid=" *LISPCENTRAL-HWID*))
  
  ;; 3. Criar arquivo JavaScript de inicialização (WEBLOAD)
  (setq loader-js (strcat bridge-dir "/web/TMD_Palette_Loader.js"))
  (setq loader-js (vl-string-translate "\\" "/" loader-js))
  
  (setq f-js (open loader-js "w"))
  (if f-js
    (progn
      (write-line "if (typeof Acad !== 'undefined') {" f-js)
      (write-line (strcat "    Acad.Application.addPalette(\"Command Palette\", \"" html-path "\");") f-js)
      (write-line "    Acad.Editor.writeMessage(\"\\n[✔] LispCentral Palette carregada com sucesso.\\n\");" f-js)
      (write-line "} else {" f-js)
      (write-line "    console.error(\"[❌] Error: API de JavaScript de AutoCAD no detectada.\");" f-js)
      (write-line "}" f-js)
      (close f-js)
      
      ;; Carrega o script que executa e compila na hora
      (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
    )
    (princ "\n[❌] Error: Não foi possível carregar a interface da paleta.")
  )
  
  (vla-EndUndoMark doc)
  (princ)
)

;; Alias de compatibilidad para comando de inspección
(defun c:TMD_INSPECT () (c:CP1))
(defun c:LC_INSPECT () (c:CP1))

;; Arranque Automático: Carga la paleta de forma asíncrona de inmediato al abrir AutoCAD
(princ "\n[LispCentral] Inicializando Command Palette asíncrona...")
(c:CP1)
(princ)
