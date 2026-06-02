;;; ==========================================================================
;;; TM DIGITAL CLOUD LOADER (SaaS Multi-Tenant)
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

;; Registro instantaneo de Ghost Commands (Stubs) para JIT Loading Zero-Disk
(defun LC:register-ghosts (/ cmds) 
  (princ "\n[LispCentral] Injetando Ghost Commands (JIT)...")
  (setq cmds '(("ABA_PARAM" "AbaParam")
               ("ABA_PERFIL" "AbaPerfil")
               ("ACM" "AcmMVP")
               ("ABA_CRIAR" "AcmTools")
               ("CORTARPAREDE" "CortarParedes")
               ("VIGA" "EstruturaMVP")
               ("PAREDE" "ParedeMVP")
               ("PORTA" "PortaMVP")
               ("TELHADO" "TejadoMVP")
               ("BOM" "TMD_BOM")
               ("JOINTS" "TMD_JOINTS")
               ("BUILD" "TMD_BUILD")
               ("WIRES" "TMD_Wires")
               ("NIVEIS" "TMD_Niveis")
               ("SYNC" "TMD_SYNC")
               ("TAGS" "TMD_Tags")
               ("MATCH" "TMD_MATCH")
               ("ALIGN" "TMD_Align")
               ("GROUPS" "TMD_Groups")
               ("FACECUT" "TMD_FACE_CUT")
               ("TABLAS" "TMD_Tablas")
               ("CNC" "TMD_CNC")
               ("TR25" "TMD_Teja_TR25")
               ("UTILS" "TMD_Utils")
               ("LC_CLEAN" "LC_CLEAN")
               ("LC_FLATZ" "LC_FLATZ")
               ("LC_ZLABEL" "LC_ZLABEL")
               ("ARQ-SYS-Config" "ARQ-SYS-Config")
               ("ARQ-GRID-Axes" "ARQ-GRID-Axes")
               ("ARQ-GRID-Line" "ARQ-GRID-Line")
               ("ARQ-WALL-Draw" "ARQ-WALL-Draw")
               ("ARQ-WALL-FromAxis" "ARQ-WALL-FromAxis")
               ("ARQ-WALL-Thickness" "ARQ-WALL-Thickness")
               ("ARQ-WALL-Trim" "ARQ-WALL-Trim")
               ("ARQ-COL-Insert" "ARQ-COL-Insert")
               ("ARQ-DOOR-Insert" "ARQ-DOOR-Insert")
               ("ARQ-WIN-Insert" "ARQ-WIN-Insert")
               ("ARQ-WALL-MoveOpening" "ARQ-WALL-MoveOpening")
               ("ARQ-WALL-ResizeOpening" "ARQ-WALL-ResizeOpening")
               ("ARQ-DIM-Opening" "ARQ-DIM-Opening")
               ("ARQ-DIM-Quick" "ARQ-DIM-Quick")
               ("ARQ-SYM-Level" "ARQ-SYM-Level")
              )
  )
  (foreach item cmds 
    (eval 
      (list 'defun 
            (read (strcat "c:" (car item)))
            '()
            (list 'LC:run-or-load (cadr item))
      )
    )
  )
  (princ " OK.")
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
       (setq event-js (strcat (getenv "TEMP") "\\LC_DocEvent.js"))
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

;; Comando Principal de la Paleta Unificada (CP1)
(defun c:CP1 (/ doc loader-js f-js) 
  (vl-load-com)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)

  (princ "\n[⚙] Abrindo LispCentral Palette...")

  ;; Cachear la URL para que siempre sea idéntica (previene duplicados)
  (if (not (boundp '*LC-PALETTE-URL*))
    (setq *LC-PALETTE-URL* (strcat "https://lispcentral.web.app/palette?token=" *TMD-SEAT-TOKEN* "&hwid=" *TMD-HWID*))
  )

  ;; 3. Inyectar/Reabrir Palette via JS
  (setq loader-js (strcat (getenv "TEMP") "\\LC_Palette_Loader.js"))

  (setq f-js (open loader-js "w"))
  (if f-js 
    (progn 
      (write-line "if (typeof Acad !== 'undefined') {" f-js)
      ;; Intentar remover la paleta existente antes de re-agregarla (previene duplicados)
      (write-line "    try { Acad.Application.removePalette('Command Palette'); } catch(e) {}" f-js)
      (write-line 
        (strcat "    Acad.Application.addPalette(\"Command Palette\", \"" 
                *LC-PALETTE-URL*
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

  (setq loader-js (strcat (getenv "TEMP") "\\LC_Resource_Loader.js"))

  (setq f-js (open loader-js "w"))
  (if f-js 
    (progn 
      (write-line "if (typeof Acad !== 'undefined') {" f-js)
      (write-line "    try { Acad.Application.removePalette('LispCentral Recursos'); } catch(e) {}" f-js)
      (write-line 
        (strcat "    Acad.Application.addPalette(\"LispCentral Recursos\", \"" 
                *LC-RESOURCE-URL*
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
      (setq loader-js (strcat (getenv "TEMP") "\\LC_Prop_Loader.js"))
      (if (setq f-js (open loader-js "w"))
        (progn
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line "    try { Acad.Application.removePalette('LispCentral Propriedades'); } catch(e) {}" f-js)
          (write-line 
            (strcat "    Acad.Application.addPalette(\"LispCentral Propriedades\", \"" 
                    *LC-PROPERTIES-URL*
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
