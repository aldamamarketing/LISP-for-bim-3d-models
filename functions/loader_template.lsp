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
  (setq url (strcat *TMD-API-ENDPOINT* "?token=" *TMD-SEAT-TOKEN* "&hwId=" (LC:url-encode *TMD-HWID*) "&lispId=" lisp_id))
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
          (if (vl-catch-all-error-p (vl-catch-all-apply 'eval (list (read response))))
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
      (princ (strcat "\n[TM Digital] Comando '" cmd-name "' nao esta na RAM. Fazendo JIT Load..."))
      (LC:load-remote-routine lisp_id)
      (setq *LC-LOADED-ROUTINES* (cons lisp_id *LC-LOADED-ROUTINES*))
    )
  )
  
  (if (member lisp_id *LC-LOADED-ROUTINES*)
    (progn
      (eval (list cmd-sym))
    )
    (alert (strcat "\n[❌] Erro: Nao foi possivel carregar o comando JIT: " cmd-name))
  )
  (princ)
)

;; Registro instantaneo de Ghost Commands (Stubs) para JIT Loading Zero-Disk
(defun LC:register-ghosts (/ cmds)
  (princ "\n[LispCentral] Injetando Ghost Commands (JIT)...")
  (setq cmds '(("ABA_PARAM" "AbaParam") ("ABA_PERFIL" "AbaPerfil") ("ACM" "AcmMVP") ("ABA_CRIAR" "AcmTools")
               ("CORTARPAREDE" "CortarParedes") ("VIGA" "EstruturaMVP") ("PAREDE" "ParedeMVP")
               ("PORTA" "PortaMVP") ("TELHADO" "TejadoMVP") ("BOM" "TMD_BOM") ("JOINTS" "TMD_JOINTS")
               ("BUILD" "TMD_BUILD") ("WIRES" "TMD_Wires") ("NIVEIS" "TMD_Niveis") ("SYNC" "TMD_SYNC")
               ("TAGS" "TMD_Tags") ("MATCH" "TMD_MATCH") ("ALIGN" "TMD_Align") ("GROUPS" "TMD_Groups")
               ("FACECUT" "TMD_FACE_CUT") ("TABLAS" "TMD_Tablas") ("CNC" "TMD_CNC")
               ("TR25" "TMD_Teja_TR25") ("UTILS" "TMD_Utils") ("LC_CLEAN" "LC_CLEAN") 
               ("LC_FLATZ" "LC_FLATZ") ("LC_ZLABEL" "LC_ZLABEL")
               ("ARQ-SYS-Config" "ARQ-SYS-Config") ("ARQ-GRID-Axes" "ARQ-GRID-Axes") ("ARQ-GRID-Line" "ARQ-GRID-Line")
               ("ARQ-WALL-Draw" "ARQ-WALL-Draw") ("ARQ-WALL-FromAxis" "ARQ-WALL-FromAxis") ("ARQ-WALL-Thickness" "ARQ-WALL-Thickness")
               ("ARQ-WALL-Trim" "ARQ-WALL-Trim") ("ARQ-COL-Insert" "ARQ-COL-Insert") ("ARQ-DOOR-Insert" "ARQ-DOOR-Insert")
               ("ARQ-WIN-Insert" "ARQ-WIN-Insert") ("ARQ-WALL-MoveOpening" "ARQ-WALL-MoveOpening") ("ARQ-WALL-ResizeOpening" "ARQ-WALL-ResizeOpening")
               ("ARQ-DIM-Opening" "ARQ-DIM-Opening") ("ARQ-DIM-Quick" "ARQ-DIM-Quick") ("ARQ-SYM-Level" "ARQ-SYM-Level")))
  (foreach item cmds
    (eval (list 'defun (read (strcat "c:" (car item))) '()
                (list 'LC:run-or-load (cadr item))
          ))
  )
  (princ " OK.")
)
(LC:register-ghosts)


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
  
  ;; Añadir parámetros de Seat Token y HWID de forma segura
  (setq html-path (strcat html-path "?token=" *TMD-SEAT-TOKEN* "&hwid=" *TMD-HWID*))
  
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
