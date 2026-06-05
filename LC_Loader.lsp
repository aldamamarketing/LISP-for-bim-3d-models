;;; ==========================================================================
;;; LISPCENTRAL CLOUD LOADER (SaaS Multi-Tenant)
;;; Licenciado para: Engenheiro(a)
;;; Não modifique o Seat Token abaixo. Ele vincula seu assento e empresa.
;;; ==========================================================================

(setq *LC-SEAT-TOKEN* "lc_key_20260603_123456")
(setq *LC-API-ENDPOINT* "https://getroutine-wgpjjgorxa-uc.a.run.app/getRoutine")

;; Gerando Hash de Hardware (Machine ID) e Versão do AutoCAD
(setq *LC-HWID* (strcat (getenv "COMPUTERNAME") "@" (getenv "USERNAME")))
(setq *LC-ACADVER* (getvar "ACADVER"))

;; Funcao profesional para Dialog Box (Yes/No)
(defun LC:MsgBox (title msg type / wsh res)
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

;; Funcao para baixar e avaliar codigo na memoria do AutoCAD sem gravar arquivos fisicos (Online-Only)
(defun LC:load-remote-routine (lisp_id / xmlhttp url status response)
  (princ (strcat "\n[LispCentral] Baixando pacote '" lisp_id "'..."))
  ;; Usamos token y lispId como parametros semanticos
  (setq url (strcat *LC-API-ENDPOINT* "?token=" *LC-SEAT-TOKEN* "&hwId=" (LC:url-encode *LC-HWID*) "&lispId=" lisp_id))
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
              (princ (strcat "\n[❌] Erro de sintaxe na rotina: " lisp_id))
              (setvar "USERS1" (strcat lisp_id ":error"))
              nil
            )
            (progn
              (setvar "USERS1" (strcat lisp_id ":success"))
              (princ) ;; Silent success
              t
            )
          )
        )
        (progn
          (princ (strcat "\n[❌] Falha ao baixar '" lisp_id "' (Status: " (vl-princ-to-string status) ")."))
          (setvar "USERS1" (strcat lisp_id ":error"))
          nil
        )
      )
      (vlax-release-object xmlhttp)
    )
    (progn
      (princ "\n[❌] Falha ao instanciar o objeto XMLHTTP.")
      (setvar "USERS1" (strcat lisp_id ":error"))
      nil
    )
  )
  (princ)
)

;; Mapeamento de nome de arquivo para o comando real definido em LISP
(defun LC:get-command-name (lisp_id / r-upper)
  (setq r-upper (strcase lisp_id))
  (cond
    ((= r-upper "ABAPARAM") "ABA_PARAM")
    ((= r-upper "ABAPERFIL") "ABA_PERFIL")
    ((= r-upper "ACMMVP") "ACM")
    ((= r-upper "ACMTOOLS") "ABA_CRIAR")
    ((= r-upper "CORTARPAREDES") "CORTARPAREDE")
    ((= r-upper "ESTRUTURAMVP") "VIGA")
    ((= r-upper "PAREDEMVP") "PAREDE")
    ((= r-upper "PORTAMVP") "PORTA")
    ((= r-upper "TEJADOMVP") "TELHADO")
    (t lisp_id)
  )
)

;; Funcao para rodar um comando garantindo que esteja carregado
(defun LC:run-or-load (lisp_id / cmd-name cmd-sym)
  (setq cmd-name (LC:get-command-name lisp_id))
  (setq cmd-sym (read (strcat "c:" cmd-name)))
  (if (not (eval (list 'type cmd-sym)))
    (progn
      (princ) ;; Silent redirection
      (LC:load-remote-routine lisp_id)
    )
  )
  (if (eval (list 'type cmd-sym))
    (progn
      (eval (list cmd-sym))
    )
    (alert (strcat "\n[❌] Erro: Nao foi possivel carregar o comando: " cmd-name))
  )
  (princ)
)

;; --------------------------------------------------------------------------
;; EVENT HUB: Reactor de Cambio de Documento para Paletas Web (LC_SESSION_HUB)
;; --------------------------------------------------------------------------
(defun LC:DocChanged-Callback (reactorObj eventList / activeDoc f-js event-js)
  (vl-catch-all-apply
    '(lambda ()
       (setq event-js (strcat (getenv "TEMP") "\\LC_DocEvent.js"))
       (setq event-js (vl-string-translate "\\" "/" event-js))
       
       (setq f-js (open event-js "w"))
       (if f-js
         (progn
           (write-line "if (typeof window !== 'undefined') {" f-js)
           (write-line "    window.dispatchEvent(new CustomEvent('lc_context_changed'));" f-js)
           (write-line "    console.log('[LC Event Hub] Cambio de documento activo notificado a las paletas.');" f-js)
           (write-line "}" f-js)
           (close f-js)
           (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" event-js "\""))
         )
       )
     )
  )
  (princ)
)

(defun LC:Init-EventHub ()
  (vl-load-com)
  (if (and (boundp '*LC-DOC-REACTOR*) *LC-DOC-REACTOR*)
    (vlr-remove *LC-DOC-REACTOR*)
  )
  (setq *LC-DOC-REACTOR*
    (vlr-docmanager-reactor 
      nil 
      (list (cons :vlr-documentBecameCurrent 'LC:DocChanged-Callback))
    )
  )
  (princ "\n[LC Event Hub] Reactor Global de Sesión Inicializado.")
)

;; --------------------------------------------------------------------------
;; BASE64 DECODER
;; --------------------------------------------------------------------------
(defun LC:b64d (str / xmlNode stream txt)
  (setq xmlNode (vlax-create-object "MSXML2.DOMDocument.6.0"))
  (if xmlNode
    (progn
      (setq xmlNode (vlax-invoke-method xmlNode 'createElement "b64"))
      (vlax-put-property xmlNode 'dataType "bin.base64")
      (vlax-put-property xmlNode 'text str)
      (setq stream (vlax-create-object "ADODB.Stream"))
      (if stream
        (progn
          (vlax-put-property stream 'Type 1) ; adTypeBinary
          (vlax-invoke-method stream 'Open)
          (vlax-invoke-method stream 'Write (vlax-get-property xmlNode 'nodeTypedValue))
          (vlax-put-property stream 'Position 0)
          (vlax-put-property stream 'Type 2) ; adTypeText
          (vlax-put-property stream 'Charset "utf-8")
          (setq txt (vlax-invoke-method stream 'ReadText -1))
          (vlax-invoke-method stream 'Close)
          (vlax-release-object stream)
        )
      )
      (vlax-release-object xmlNode)
    )
  )
  (if txt txt "")
)

;; --------------------------------------------------------------------------
;; RESOURCE PALETTE: Aplicar Hatches e Linetypes dos favoritos cloud
;; --------------------------------------------------------------------------

;; Aplica um Hatch recebido da paleta de recursos (dados em Base64)
(defun LC_ApplyHatch (patName codeB64 / tmpDir tmpFile f)
  (setq tmpDir (getenv "TEMP"))
  (setq tmpFile (strcat tmpDir "\\LC_" patName ".pat"))
  (setq f (open tmpFile "w"))
  (if f
    (progn
      (write-line (strcat "*" patName ", LispCentral Cloud") f)
      ;; Decodifica Base64 inline: el frontend envia el patCode codificado
      (write-line (vl-catch-all-apply 'eval (list (read (strcat "(LC:b64d \"" codeB64 "\")")))) f)
      (close f)
      (setenv "ACAD" (strcat (getenv "ACAD") ";" tmpDir))
      (setvar "HPNAME" patName)
      (princ (strcat "\\n[LC] Hachura '" patName "' pronta. Use HATCH."))
    )
    (princ "\\n[LC] Erro ao salvar hachura temp.")
  )
  (princ)
)

;; Aplica um Linetype recebido da paleta de recursos
(defun LC_ApplyLinetype (linName codeB64 / tmpDir tmpFile f)
  (setq tmpDir (getenv "TEMP"))
  (setq tmpFile (strcat tmpDir "\\LC_" linName ".lin"))
  (setq f (open tmpFile "w"))
  (if f
    (progn
      (write-line (strcat "*" linName ", LispCentral Cloud") f)
      (write-line (vl-catch-all-apply 'eval (list (read (strcat "(LC:b64d \"" codeB64 "\")")))) f)
      (close f)
      (vl-cmdf "._-LINETYPE" "_Load" linName tmpFile "")
      (princ (strcat "\\n[LC] Linha '" linName "' carregada."))
    )
    (princ "\\n[LC] Erro ao salvar linha temp.")
  )
  (princ)
)

 ;; Comando Principal de la Paleta Unificada (CP1)
(defun c:CP1 (/ doc loader-js f-js)
  (vl-load-com)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)
  
  (princ "\n[⚙] Abrindo LispCentral Palette...")
  
  ;; Construir URL
  (setq *LC-PALETTE-URL* (strcat "https://lispcentral.web.app/palette?token=" *LC-SEAT-TOKEN* "&hwid=" *LC-HWID*))
  
  ;; Solo inyectar si la paleta NO fue creada (previene duplicados)
  (if (not (boundp '*LC-PALETTE-ACTIVE*))
    (progn
      (setq loader-js (strcat (getenv "TEMP") "/LC_Palette_Loader.js"))
      (setq loader-js (vl-string-translate "\\" "/" loader-js))
      (setq f-js (open loader-js "w"))
      (if f-js
        (progn
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line (strcat "    Acad.Application.addPalette(\"Command Palette\", \"" *LC-PALETTE-URL* "\");") f-js)
          (write-line "}" f-js)
          (close f-js)
          (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
          (setq *LC-PALETTE-ACTIVE* T)
          (LC:Init-EventHub)
          (princ "\n[✔] LispCentral Palette pronta.")
        )
        (princ "\n[❌] Erro ao criar arquivo JS da paleta.")
      )
    )
    (princ "\n[✔] Paleta já ativa. LC_RESET para forçar.")
  )
  
  (vla-EndUndoMark doc)
  (princ)
)

;; Comando da Paleta de Recursos
(defun c:LC_RES (/ doc loader-js f-js)
  (vl-load-com)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)
  
  (princ "\n[⚙] Abrindo Resource Palette...")
  
  (setq *LC-RESOURCE-URL* (strcat "https://lispcentral.web.app/resource-palette?token=" *LC-SEAT-TOKEN* "&hwid=" *LC-HWID*))
  
  (if (not (boundp '*LC-RESOURCE-ACTIVE*))
    (progn
      (setq loader-js (strcat (getenv "TEMP") "/LC_Resource_Loader.js"))
      (setq loader-js (vl-string-translate "\\" "/" loader-js))
      (setq f-js (open loader-js "w"))
      (if f-js
        (progn
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line (strcat "    Acad.Application.addPalette(\"LispCentral Recursos\", \"" *LC-RESOURCE-URL* "\");") f-js)
          (write-line "}" f-js)
          (close f-js)
          (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
          (setq *LC-RESOURCE-ACTIVE* T)
          (princ "\n[✔] Resource Palette pronta.")
        )
        (princ "\n[❌] Erro ao criar arquivo JS da paleta de recursos.")
      )
    )
    (princ "\n[✔] Paleta de Recursos já ativa. LC_RESET para forçar.")
  )
  
  (vla-EndUndoMark doc)
  (princ)
)

;; Alias Oficiales
(defun c:LC_INSPECT () (c:CP1))
(defun c:TMD_INSPECT () (c:CP1))
(defun c:LC () (c:CP1))
(defun c:PALETA () (c:CP1))
(defun c:PALETTE () (c:CP1))

(defun c:RECURSOS () (c:LC_RES))
(defun c:HATCHES () (c:LC_RES))
(defun c:LINHAS () (c:LC_RES))

;; Reset: fuerza reabrir paleta
(defun c:LC_RESET ()
  (setq *LC-PALETTE-ACTIVE* nil)
  (setq *LC-PALETTE-URL* nil)
  (setq *LC-RESOURCE-ACTIVE* nil)
  (setq *LC-RESOURCE-URL* nil)
  (princ "\n[LC] Paletas resetadas.")
  (c:CP1)
)

;; Ajuda
(defun c:LC_HELP ()
  (princ "\n  LC / PALETA / CP1 .. Abrir Palette")
  (princ "\n  LC_RES / RECURSOS .. Abrir Paleta de Recursos")
  (princ "\n  LC_RESET .......... Reabrir paletas")
  (princ "\n  LC_HELP ........... Esta ajuda")
  (princ "\n")
  (princ)
)

;; Arranque
(princ "\n[LispCentral] Inicializando...")
(c:CP1)
(princ "\n[LispCentral] LC_HELP para comandos.")

