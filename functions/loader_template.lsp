;;; ==========================================================================
;;; TM DIGITAL CLOUD LOADER (SaaS Multi-Tenant)
;;; Licenciado para: {{TENANT_NAME}}
;;; Não modifique o Seat Token abaixo. Ele vincula seu assento e empresa.
;;; ==========================================================================

(setq *TMD-SEAT-TOKEN* "{{SEAT_TOKEN}}")
(setq *TMD-API-ENDPOINT* "https://getroutine-wgpjjgorxa-uc.a.run.app/getRoutine")

;; Gerando Hash de Hardware (Machine ID) e Versão do AutoCAD
(setq *TMD-HWID* (strcat (getenv "COMPUTERNAME") "@" (getenv "USERNAME")))
(setq *TMD-ACADVER* (getvar "ACADVER"))

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

;; Funcao para baixar e avaliar codigo na memoria do AutoCAD sem gravar arquivos fisicos (Online-Only)
(defun LC:load-remote-routine (lisp_id / xmlhttp url status response) 
  (princ (strcat "\n[TM Digital] Baixando pacote '" lisp_id "'..."))
  ;; Usamos token y lispId como parametros semanticos
  (setq url (strcat *TMD-API-ENDPOINT* 
                    "?token="
                    *TMD-SEAT-TOKEN*
                    "&hwId="
                    (LC:url-encode *TMD-HWID*)
                    "&lispId="
                    lisp_id
            )
  )
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
          ;; Executa o codigo em RAM de forma isolada (backend ja entrega minificado e com progn)
          (if 
            (vl-catch-all-error-p (vl-catch-all-apply 'eval (list (read response))))
            (progn 
              (princ (strcat "\n[❌] Erro de sintaxe na rotina: " lisp_id))
              (setvar "USERS1" (strcat lisp_id ":error"))
              nil
            )
            (progn 
              (setvar "USERS1" (strcat lisp_id ":success"))
              (princ (strcat "\n[✔] Rotina '" lisp_id "' carregada na RAM."))
              t
            )
          )
        )
        (progn 
          (princ 
            (strcat "\n[❌] Falha ao baixar '" 
                    lisp_id
                    "' (Status: "
                    (vl-princ-to-string status)
                    ")."
            )
          )
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
(defun LC:get-command-name (routine_name / r-upper) 
  (setq r-upper (strcase routine_name))
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
    ((= r-upper "TMD_GROUPS") "TMD_GROUP")
    (t routine_name)
  )
)

;; Lista global de rotinas JIT carregadas na RAM
(if (not *LC-LOADED-ROUTINES*) (setq *LC-LOADED-ROUTINES* nil))

;; Funcao para rodar um comando com JIT Loading
(defun LC:run-or-load (lisp_id / cmd-name cmd-sym) 
  (setq cmd-name (LC:get-command-name lisp_id))
  (setq cmd-sym (read (strcat "c:" cmd-name)))

  (if (not (member lisp_id *LC-LOADED-ROUTINES*)) 
    (progn 
      (princ 
        (strcat "\n[TM Digital] Comando '" 
                cmd-name
                "' nao esta na RAM. Fazendo JIT Load..."
        )
      )
      (LC:load-remote-routine lisp_id)
      (setq *LC-LOADED-ROUTINES* (cons lisp_id *LC-LOADED-ROUTINES*))
    )
  )

  (if (member lisp_id *LC-LOADED-ROUTINES*) 
    (progn 
      (eval (list cmd-sym))
    )
    (alert 
      (strcat "\n[❌] Erro: Nao foi possivel carregar o comando JIT: " cmd-name)
    )
  )
  (princ)
)

;; Función para parsear los "name" del JSON
;; ⚡ Bolt Optimization: Replace O(N^2) append with O(N) cons/reverse
(defun LC:parse-json-names (jsonStr / pos start end cmd-list name)
  (setq cmd-list nil)
  (setq pos 0)
  (while (setq start (vl-string-search "\"name\":\"" jsonStr pos))
    (setq start (+ start 8)) ; length of "\"name\":\""
    (setq end (vl-string-search "\"" jsonStr start))
    (if end
      (progn
        (setq name (substr jsonStr (1+ start) (- end start)))
        ;; O(1) insertion at the head instead of O(N) append
        (setq cmd-list (cons (list name name) cmd-list))
        (setq pos end)
      )
      (setq pos (strlen jsonStr))
    )
  )
  ;; Reverse the list at the end to maintain original order in O(N) time
  (reverse cmd-list)
)

;; Registro instantaneo de Ghost Commands (Stubs) desde la nube (Handshake)
(defun LC:register-ghosts (/ xmlhttp index-url status response cmds item)
  (princ "\n[LispCentral] Autenticando e sincronizando comandos...")
  
  (setq index-url (strcat *TMD-API-ENDPOINT* 
                          "?token=" *TMD-SEAT-TOKEN* 
                          "&hwId=" (LC:url-encode *TMD-HWID*) 
                          "&routine=INDEX"
                  )
  )
  
  (setq xmlhttp (vlax-create-object "MSXML2.XMLHTTP.6.0"))
  (if xmlhttp 
    (progn 
      (vl-catch-all-apply 
        '(lambda () 
           (vlax-invoke-method xmlhttp 'open "GET" index-url :vlax-false)
           (vlax-invoke-method xmlhttp 'send)
         )
      )
      (setq status (vl-catch-all-apply 'vlax-get-property (list xmlhttp 'status)))
      (if (= status 200) 
        (progn 
          (setq response (vlax-get-property xmlhttp 'responseText))
          (setq cmds (LC:parse-json-names response))
          (if cmds
            (progn
              (foreach item cmds 
                (if (not (member (cadr item) *LC-LOADED-ROUTINES*))
                  (eval 
                    (list 'defun 
                          (read (strcat "c:" (car item)))
                          '()
                          (list 'LC:run-or-load (cadr item))
                    )
                  )
                )
              )
              (princ (strcat " OK. (" (itoa (length cmds)) " ghost commands in RAM)"))
            )
            (princ " ERRO: Nenhum comando recebido do INDEX.")
          )
        )
        (princ (strcat " ERRO: HTTP " (vl-princ-to-string status)))
      )
      (vlax-release-object xmlhttp)
    )
    (princ " ERRO: Falha ao instanciar MSXML2.XMLHTTP.")
  )
  (princ)
)

;; Sincronización Manual (Botón Sync de la Paleta)
(defun c:LC_SYNC ()
  (LC:register-ghosts)
  (princ)
)

(LC:register-ghosts)

;; --------------------------------------------------------------------------
;; RESOURCE PALETTE: Funciones para aplicar Hatches y Linetypes desde favoritos
;; --------------------------------------------------------------------------

;; Decodifica Base64 (simplificado, para ASCII/PAT/LIN)
(defun LC:b64-decode (b64str / idx ch val buf result pad charset) 
  (setq charset "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/")
  (setq result ""
        buf    0
        idx    1
        pad    0
  )
  (while (<= idx (strlen b64str)) 
    (setq ch (substr b64str idx 1))
    (if (= ch "=") 
      (progn (setq pad (1+ pad)) (setq idx (1+ idx)))
      (progn 
        (setq val (1- (vl-string-search ch charset)))
        (if (and val (>= val 0)) 
          (progn 
            (setq buf (logior (lsh buf 6) val))
            (if (= 0 (rem idx 4)) 
              (progn 
                (setq result (strcat result 
                                     (chr (logand (lsh buf -16) 255))
                                     (chr (logand (lsh buf -8) 255))
                                     (chr (logand buf 255))
                             )
                )
                (setq buf 0)
              )
            )
          )
        )
        (setq idx (1+ idx))
      )
    )
  )
  result
)

;; Aplica un Hatch desde la paleta de recursos
(defun LC_ApplyHatch (patName codeB64 / tmpDir tmpFile f decoded) 
  (setq tmpDir (getenv "TEMP"))
  (setq tmpFile (strcat tmpDir "\\LC_" patName ".pat"))
  (setq decoded (LC:b64-decode codeB64))
  (setq f (open tmpFile "w"))
  (if f 
    (progn 
      (write-line (strcat "*" patName ", LispCentral Cloud Resource") f)
      (write-line decoded f)
      (close f)
      ;; Agregar ruta de busqueda temporalmente
      (setvar "HPNAME" patName)
      (setenv "ACAD" (strcat (getenv "ACAD") ";" tmpDir))
      (princ 
        (strcat "\n[LC] Hachura '" patName "' disponível. Use HATCH para aplicar.")
      )
    )
    (princ "\n[LC] Erro ao criar arquivo temporário de hachura.")
  )
  (princ)
)

;; Aplica un Linetype desde la paleta de recursos
(defun LC_ApplyLinetype (linName codeB64 / tmpDir tmpFile f decoded) 
  (setq tmpDir (getenv "TEMP"))
  (setq tmpFile (strcat tmpDir "\\LC_" linName ".lin"))
  (setq decoded (LC:b64-decode codeB64))
  (setq f (open tmpFile "w"))
  (if f 
    (progn 
      (write-line (strcat "*" linName ", LispCentral Cloud Resource") f)
      (write-line decoded f)
      (close f)
      ;; Cargar el linetype en el dibujo actual
      (vl-cmdf "._-LINETYPE" "_Load" linName tmpFile "")
      (princ (strcat "\n[LC] Linha '" linName "' carregada com sucesso."))
    )
    (princ "\n[LC] Erro ao criar arquivo temporário de linha.")
  )
  (princ)
)


;; --------------------------------------------------------------------------
;; EVENT HUB: Reactor de Cambio de Documento para Paletas Web (LC_SESSION_HUB)
;; --------------------------------------------------------------------------
(defun LC:DocChanged-Callback (reactorObj eventList / activeDoc f-js event-js) 
  ;; Se dispara cuando el usuario cambia de pestaña de dibujo
  (vl-catch-all-apply 
    '(lambda () 
       ;; Inyectamos un pequeño script JS que dispara el evento global
       (setq event-js (strcat (getenv "TEMP") "\\\\LC_DocEvent.js"))
       (setq event-js (vl-string-translate "\\" "/" event-js))

       (setq f-js (open event-js "w"))
       (if f-js 
         (progn 
           (write-line "if (typeof window !== 'undefined') {" f-js)
           (write-line "    window.dispatchEvent(new CustomEvent('lc_context_changed'));" 
                       f-js
           )
           (write-line "    console.log('[LC Event Hub] Cambio de documento activo notificado a las paletas.');" 
                       f-js
           )
           (write-line "}" f-js)
           (close f-js)
           ;; Disparamos el script en el entorno de AutoCAD
           (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" event-js "\""))
         )
       )
     )
  )
  (princ)
)

(defun LC:Init-EventHub () 
  (vl-load-com)
  ;; Desregistrar si ya existe (prevención de errores)
  (if (and (boundp '*LC-DOC-REACTOR*) *LC-DOC-REACTOR*) 
    (vlr-remove *LC-DOC-REACTOR*)
  )
  ;; Registrar el reactor de cambio de documento
  (setq *LC-DOC-REACTOR* (vlr-docmanager-reactor 
                           nil
                           (list 
                             (cons :vlr-documentBecameCurrent 
                                   'LC:DocChanged-Callback
                             )
                           )
                         )
  )
  (princ "\n[LC Event Hub] Reactor Global de Sesión Inicializado.")
)

;; --------------------------------------------------------------------------
;; LOCAL HTML WRAPPER (Iframe Bridge para WebView2/CEF)
;; --------------------------------------------------------------------------
(defun LC:Create-Palette-Wrapper (fileName url / htmlPath f-html) 
  ;; Guardar el wrapper en la ruta de red confiable (Z:) en lugar de TEMP
  (setq htmlPath (strcat (getenv "TEMP") "\\\\" fileName))
  (setq f-html (open htmlPath "w"))
  (if f-html 
    (progn 
      (write-line "<!DOCTYPE html><html><head><style>body,html{margin:0;padding:0;height:100%;overflow:hidden;background-color:#222;}iframe{width:100%;height:100%;border:none;}</style></head><body>" f-html)
      (write-line (strcat "<iframe src=\"" url "\" allow=\"clipboard-read; clipboard-write\"></iframe>") f-html)
      (write-line "<script>" f-html)
      
      ;; 1. Puente Nativo (ACAD_COMMAND)
      (write-line "window.addEventListener('message', function(event) {" f-html)
      (write-line "  if (event.data && event.data.type === 'ACAD_COMMAND') {" f-html)
      ;; Eliminar cualquier \n final o espacio que ya traiga el comando. AutoCAD procesa asincronamente el final solo.
      (write-line "    var cmd = event.data.command.replace(/[\\\\n\\\\r\\\\s]+$/, '');" f-html)
      (write-line "    console.log('[Wrapper Local] Intentando ejecutar sin espacios/enters:', cmd);" f-html)
      (write-line "    if (typeof exec !== 'undefined') {" f-html)
      (write-line "      exec(JSON.stringify({functionName: 'Ac_EditorInterop.executeCommand', functionParams: { commands: cmd }}));" f-html)
      (write-line "    } else if (typeof execAsync !== 'undefined') {" f-html)
      (write-line "      execAsync(JSON.stringify({functionName: 'Ac_EditorInterop.executeCommand', functionParams: { commands: cmd }}));" f-html)
      (write-line "    } else {" f-html)
      (write-line "      console.error('LispCentral Bridge: exec no encontrado en entorno local');" f-html)
      (write-line "    }" f-html)
      (write-line "  }" f-html)
      (write-line "});" f-html)
      
      ;; 2. Telemetria Silenciosa (Agent Eyes & Hands)
      (write-line "async function poll() {" f-html)
      (write-line "  try {" f-html)
      (write-line "    const res = await fetch('http://localhost:3010/command');" f-html)
      (write-line "    const data = await res.json();" f-html)
      (write-line "    if (data.command) {" f-html)
      (write-line "      let result;" f-html)
      (write-line "      try {" f-html)
      (write-line "        let evalRes = eval(data.command);" f-html)
      (write-line "        if (evalRes instanceof Promise) { evalRes = await evalRes; }" f-html)
      (write-line "        result = (evalRes === undefined) ? 'undefined' : JSON.stringify(evalRes, Object.getOwnPropertyNames(evalRes), 2);" f-html)
      (write-line "      } catch(e) {" f-html)
      (write-line "        result = 'Error: ' + e.message;" f-html)
      (write-line "      }" f-html)
      (write-line "      await fetch('http://localhost:3010/result', { method: 'POST', body: result });" f-html)
      (write-line "    }" f-html)
      (write-line "  } catch(e) {}" f-html)
      (write-line "  setTimeout(poll, 1000);" f-html)
      (write-line "}" f-html)
      (write-line "poll();" f-html)

      (write-line "</script></body></html>" f-html)
      (close f-html)
      (vl-string-translate "\\" "/" htmlPath)
    )
    nil
  )
)

;; Download Binary File to Disk (Safe for UTF-8 and Binaries)
(defun LC:DownloadFile (url dest / xmlhttp ado result)
  (setq result nil)
  ;; Usar 6.0 para evitar errores de parámetros COM estrictos en algunas versiones de AutoLISP
  (setq xmlhttp (vlax-create-object "MSXML2.XMLHTTP.6.0"))
  (if (not xmlhttp) (setq xmlhttp (vlax-create-object "MSXML2.XMLHTTP")))
  (if xmlhttp
    (progn
      (vl-catch-all-apply 'vlax-invoke-method (list xmlhttp 'open "GET" url :vlax-false))
      (vl-catch-all-apply 'vlax-invoke-method (list xmlhttp 'send))
      (if (= (vlax-get-property xmlhttp 'status) 200)
        (progn
          (setq ado (vlax-create-object "ADODB.Stream"))
          (if ado
            (progn
              (vlax-put-property ado 'Type 1) ; adTypeBinary
              ;; Envolvemos en catch-all para evitar "too few actual parameters" si COM exige opcionales
              (vl-catch-all-apply 'vlax-invoke-method (list ado 'Open))
              (vl-catch-all-apply 'vlax-invoke-method (list ado 'Write (vlax-get-property xmlhttp 'responseBody)))
              (vl-catch-all-apply 'vlax-invoke-method (list ado 'SaveToFile dest 2)) ; adSaveCreateOverWrite
              (vl-catch-all-apply 'vlax-invoke-method (list ado 'Close))
              (vlax-release-object ado)
              (setq result t)
            )
          )
        )
      )
      (vlax-release-object xmlhttp)
    )
  )
  result
)

;; Comando Principal de la Paleta Unificada (CP1)
(defun c:CP1 (/ doc loader-js f-js local-html source-url temp-html) 
  (vl-load-com)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)

  (princ "\n[⚙] Abrindo LispCentral Palette...")

  ;; Cachear la URL para que siempre sea idéntica (previene duplicados)
  (if (not (boundp '*LC-PALETTE-URL*))
    (setq *LC-PALETTE-URL* (strcat "https://lispcentral.web.app/palette?token=" *TMD-SEAT-TOKEN* "&hwid=" *TMD-HWID*))
  )

  ;; 3. Inyectar/Reabrir Palette via JS (En TEMP para produccion)
  (setq loader-js (strcat (getenv "TEMP") "\\\\LC_Palette_Loader.js"))

  (setq f-js (open loader-js "w"))
  (if f-js 
    (progn 
      (write-line "if (typeof Acad !== 'undefined') {" f-js)
      ;; Intentar remover la paleta existente antes de re-agregarla (previene duplicados)
      (write-line "    try { Acad.Application.removePalette('Command Palette'); } catch(e) {}" f-js)
      ;; Estrategia de Producción: Descargar la paleta desde Firebase Hosting al directorio TEMP
      (setq source-url (strcat "https://lispcentral.web.app/palette-builds/palette.html?v=" (rtos (getvar "MILLISECS") 2 0)))
      (setq temp-html (strcat (getenv "TEMP") "\\\\LC_Palette.html"))
      
      (princ "\n[TM Digital] Sincronizando paleta desde la nube...")
      (LC:DownloadFile source-url temp-html)
      
      ;; Usar la ruta del TEMP y convertir barras para la URL, añadiendo un Cache-Buster local
      (setq local-html (strcat "file:///" (vl-string-translate "\\\\" "/" temp-html) "?v=" (rtos (getvar "MILLISECS") 2 0)))
      (write-line 
        (strcat "    Acad.Application.addPalette(\"Command Palette\", \"" 
                local-html
                "\");"
        )
        f-js
      )
      (write-line "    Acad.Editor.writeMessage(\"\\n[✔] LispCentral Palette pronta.\\n\");" 
                  f-js
      )
      (write-line "} else {" f-js)
      (write-line "    console.error(\"[❌] API de JavaScript de AutoCAD não detectada.\");" 
                  f-js
      )
      (write-line "}" f-js)
      (close f-js)

      (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))

      ;; Inicializar EventHub (solo la primera vez)
      (if (not (vl-bb-ref 'LC_PALETTE_LOADED)) 
        (progn 
          (LC:Init-EventHub)
          (vl-bb-set 'LC_PALETTE_LOADED T)
        )
      )
    )
    (princ "\n[❌] Erro: Não foi possível criar o arquivo JS da paleta.")
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

  (if (not (boundp '*LC-RESOURCE-URL*))
    (setq *LC-RESOURCE-URL* (strcat "https://lispcentral.web.app/resource-palette?token=" *TMD-SEAT-TOKEN* "&hwid=" *TMD-HWID*))
  )

  (setq loader-js (strcat (getenv "TEMP") "\\\\LC_Resource_Loader.js"))

  (setq f-js (open loader-js "w"))
  (if f-js 
    (progn 
      (write-line "if (typeof Acad !== 'undefined') {" f-js)
      (write-line "    try { Acad.Application.removePalette('LispCentral Recursos'); } catch(e) {}" f-js)
      (setq local-html (LC:Create-Palette-Wrapper "LC_Resource_Wrapper.html" *LC-RESOURCE-URL*))
      (write-line 
        (strcat "    Acad.Application.addPalette(\"LispCentral Recursos\", \"" 
                local-html
                "\");"
        )
        f-js
      )
      (write-line "    Acad.Editor.writeMessage(\"\\n[✔] Resource Palette pronta.\\n\");" 
                  f-js
      )
      (write-line "} else {" f-js)
      (write-line "    console.error(\"[❌] API de JavaScript não detectada.\");" f-js)
      (write-line "}" f-js)
      (close f-js)

      (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
    )
    (princ "\n[❌] Erro ao criar arquivo JS da paleta de recursos.")
  )

  (vla-EndUndoMark doc)
  (princ)
)

;; Alias Oficiales (comandos intuitivos para reabrir la paleta)
;; Reset: fuerza reabrir paleta
(defun c:LC_RESET ()
  (setq *LC-PALETTE-ACTIVE* nil)
  (setq *LC-PALETTE-URL* nil)
  (setq *LC-RESOURCE-ACTIVE* nil)
  (setq *LC-RESOURCE-URL* nil)
  (setq *LC-PROPERTIES-URL* nil)
  (setq *LC-FORCE-RELOAD* T)
  (princ "\n[LC] Paletas resetadas.")
  (c:CP1)
  (c:LC_RES)
  (c:LC_PROP)
  (setq *LC-FORCE-RELOAD* nil)
)

;; Comando da Paleta de Propriedades
(defun c:LC_PROP (/ doc loader-js f-js) 
  (vl-load-com)
  (if (not (boundp '*LC-PROPERTIES-URL*))
    (setq *LC-PROPERTIES-URL* (strcat "https://lispcentral.web.app/properties-palette?token=" *LC-SEAT-TOKEN* "&hwid=" *LC-HWID*))
  )
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (if (not (member "LispCentral Propriedades" (LC_GetPaletteNames)))
    (progn
      (princ "\n[\u2699] Abrindo Paleta de Propriedades...")
      (setq loader-js (strcat (getenv "TEMP") "\\\\LC_Prop_Loader.js"))
      (if (setq f-js (open loader-js "w"))
        (progn
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line "    try { Acad.Application.removePalette('LispCentral Propriedades'); } catch(e) {}" f-js)
          (setq local-html (LC:Create-Palette-Wrapper "LC_Prop_Wrapper.html" *LC-PROPERTIES-URL*))
          (write-line 
            (strcat "    Acad.Application.addPalette(\"LispCentral Propriedades\", \"" 
                    local-html
                    "\");"
            ) f-js
          )
          (write-line "    Acad.Editor.writeMessage(\"\\n[\\u2714] Paleta de Propriedades pronta.\\n\");" f-js)
          (write-line "} else {" f-js)
          (write-line "    console.error(\"[LC] AutoCAD JS API n\u00e3o detectada.\");" f-js)
          (write-line "}" f-js)
          (close f-js)
          
          (command "_.WEBLOAD" "_L" loader-js)
        )
        (princ "\n[?] Erro ao criar arquivo JS da paleta de propriedades.")
      )
    )
    (princ "\n[?] Paleta de Propriedades j\u00e1 ativa.")
  )
  (princ)
)

(defun c:LC_INSPECT () (c:CP1))
(defun c:TMD_INSPECT () (c:CP1))
(defun c:LC () (c:CP1))
(defun c:PALETA () (c:CP1))
(defun c:PALETTE () (c:CP1))

(defun c:RECURSOS () (c:LC_RES))
(defun c:HATCHES () (c:LC_RES))
(defun c:LINHAS () (c:LC_RES))

;; Comando de ajuda
(defun c:LC_HELP () 
  (princ "\n")
  (princ "\n  ╔══════════════════════════════════════════════════╗")
  (princ "\n  ║       LISPCENTRAL — COMANDOS DISPONÍVEIS         ║")
  (princ "\n  ╠══════════════════════════════════════════════════╣")
  (princ "\n  ║                                                  ║")
  (princ "\n  •  LC / PALETA / CP1 .. Abrir Command Palette      •")
  (princ "\n  •  LC_RES / RECURSOS .. Abrir Paleta de Recursos   •")
  (princ "\n  •  LC_PROP ............ Abrir Paleta de Propriedades •")
  (princ "\n  •  LC_HELP ........... Mostrar esta ajuda          •")
  (princ "\n  •                                                  •")
  (princ "\n  ║  Dica: Se fechou a paleta, digite o comando      ║")
  (princ "\n  ║  novamente para reabri-la.                       ║")
  (princ "\n  ║                                                  ║")
  (princ "\n  ╚══════════════════════════════════════════════════╝")
  (princ "\n")
  (princ)
)

;; Arranque Automático del Loader
(c:CP1)
(princ "\n[LispCentral] Digite LC para abrir a paleta. LC_HELP para ajuda.")
