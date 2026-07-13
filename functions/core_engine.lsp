;;; ==========================================================================
;;; LISPCENTRAL CORE ENGINE (JIT & PALETTES)
;;; This file is served dynamically to RAM and never saved to disk.
;;; ==========================================================================

;;; ==========================================================================
;;; SECCIÓN 0: VARIABLES GLOBALES (inyectadas por servidor en BOOT)
;;; ==========================================================================
;; The server injects:
;; *LC-SEAT-TOKEN*
;; *LC-HWID*
;; *LC-API-ENDPOINT*
;; (and in the future *LC-PLATFORM-ID* and *LC-PLATFORM-MAP*)

;; Global tracking list for JIT-loaded routines
(if (not *LC-LOADED-ROUTINES*) (setq *LC-LOADED-ROUTINES* nil))

;; Global tracking list for Ghost Commands (Stubs) to allow live purging
(if (not *LC-GHOST-ROUTINES*) (setq *LC-GHOST-ROUTINES* nil))

;; Cache de sesión para assets descargados
(if (not *LC-ASSET-CACHE*) (setq *LC-ASSET-CACHE* nil))

;;; ==========================================================================
;;; SECCIÓN 1: HTTP LAYER
;;; ==========================================================================
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

;; Obtiene la ruta base removiendo "/getRoutine" (ej: http://.../us-central1)
(defun LC:get-api-base ()
  (vl-string-subst "" "/getRoutine" *LC-API-ENDPOINT*)
)

;; GET unificado (MSXML2)
(defun LC:http-get (url / obj response status)
  (setq obj (vl-catch-all-apply 'vlax-create-object '("MSXML2.XMLHTTP.6.0")))
  (if (vl-catch-all-error-p obj)
    (setq obj (vl-catch-all-apply 'vlax-create-object '("MSXML2.XMLHTTP")))
  )
  (if (and obj (not (vl-catch-all-error-p obj)))
    (progn
      (vl-catch-all-apply 'vlax-invoke-method (list obj 'open "GET" url :vlax-false))
      (vl-catch-all-apply 'vlax-invoke-method (list obj 'send))
      (setq status (vl-catch-all-apply 'vlax-get-property (list obj 'status)))
      (if (and (not (vl-catch-all-error-p status)) (= status 200))
        (setq response (vl-catch-all-apply 'vlax-get-property (list obj 'responseText)))
      )
      (vl-catch-all-apply 'vlax-release-object (list obj))
      (if (vl-catch-all-error-p response) nil response)
    )
  )
)

;; POST unificado con JSON payload (WinHttp)
(defun LC:http-post (url payload / obj response)
  (setq obj (vl-catch-all-apply 'vlax-create-object '("WinHttp.WinHttpRequest.5.1")))
  (if (and obj (not (vl-catch-all-error-p obj)))
    (progn
      (vl-catch-all-apply 'vlax-invoke-method (list obj 'Open "POST" url :vlax-false))
      (vl-catch-all-apply 'vlax-invoke-method (list obj 'SetRequestHeader "Content-Type" "application/json"))
      (vl-catch-all-apply 'vlax-invoke-method (list obj 'Send payload))
      (setq response (vl-catch-all-apply 'vlax-get-property (list obj 'ResponseText)))
      (vl-catch-all-apply 'vlax-release-object (list obj))
      (if (vl-catch-all-error-p response) nil response)
    )
  )
)

;;; ==========================================================================
;;; SECCIÓN 2: JIT ENGINE
;;; ==========================================================================
(defun LC:load-remote-routine (lisp_id / url response) 
  (princ (strcat "\n[LispCentral] Fetching remote package '" lisp_id "'..."))
  (setq url (strcat *LC-API-ENDPOINT* 
                    "?token=" *LC-SEAT-TOKEN*
                    "&hwId=" (LC:url-encode *LC-HWID*)
                    "&lispId=" lisp_id))
  (setq response (LC:http-get url))
  (if response
    (if (vl-catch-all-error-p (vl-catch-all-apply 'eval (list (read response))))
      (progn 
        (princ (strcat "\n[ERROR] Syntax error evaluating routine: " lisp_id))
        (setvar "USERS1" (strcat lisp_id ":error"))
        nil
      )
      (progn 
        (setvar "USERS1" (strcat lisp_id ":success"))
        (princ (strcat "\n[SUCCESS] Package '" lisp_id "' loaded successfully into RAM."))
        t
      )
    )
    (progn 
      (princ (strcat "\n[ERROR] Failed to fetch '" lisp_id "'."))
      (setvar "USERS1" (strcat lisp_id ":error"))
      nil
    )
  )
)

(defun LC:run-or-load (lisp_id / cmd-sym) 
  (setq cmd-sym (read (strcat "c:" lisp_id)))
  (if (not (member lisp_id *LC-LOADED-ROUTINES*)) 
    (progn 
      (princ (strcat "\n[LispCentral] Command '" lisp_id "' not found in RAM. Initiating Just-In-Time Load..."))
      (LC:load-remote-routine lisp_id)
      (setq *LC-LOADED-ROUTINES* (cons lisp_id *LC-LOADED-ROUTINES*))
    )
  )
  (if (member lisp_id *LC-LOADED-ROUTINES*) 
    (eval (list cmd-sym))
    (alert (strcat "\n[FATAL ERROR] Could not resolve and load JIT command: " lisp_id))
  )
  (princ)
)

(defun LC:Require (lisp_id) 
  (if (not (member lisp_id *LC-LOADED-ROUTINES*)) 
    (progn 
      (princ (strcat "\n[LispCentral] Resolving required dependency: " lisp_id))
      (LC:load-remote-routine lisp_id)
      (setq *LC-LOADED-ROUTINES* (cons lisp_id *LC-LOADED-ROUTINES*))
    )
  )
  (princ)
)

;;; ==========================================================================
;;; SECCIÓN 3: INDEX & GHOST REGISTRATION
;;; ==========================================================================
(defun LC:parse-json-names (jsonStr / pos start end cmd-list name) 
  (setq cmd-list nil pos 0)
  (while (setq start (vl-string-search "\"name\":\"" jsonStr pos)) 
    (setq start (+ start 8))
    (setq end (vl-string-search "\"" jsonStr start))
    (if end 
      (progn 
        (setq name (substr jsonStr (1+ start) (- end start)))
        (setq cmd-list (cons (list name name) cmd-list)) ; ⚡ Bolt: Use cons for O(1) list building instead of O(N^2) append
        (setq pos end)
      )
      (setq pos (strlen jsonStr))
    )
  )
  (reverse cmd-list)
)

(defun LC:register-ghosts (/ index-url response cmds item) 
  (princ "\n[LispCentral] Authenticating and syncing your cloud commands...")
  (setq index-url (strcat *LC-API-ENDPOINT* 
                          "?token=" *LC-SEAT-TOKEN*
                          "&hwId=" (LC:url-encode *LC-HWID*)
                          "&routine=INDEX"))
  (setq response (LC:http-get index-url))
  (if response
    (progn 
      (setq cmds (LC:parse-json-names response))
      (if cmds 
        (progn 
          (foreach item cmds 
            (if (not (member (cadr item) *LC-LOADED-ROUTINES*)) 
              (progn
                (eval (list 'defun (read (strcat "c:" (car item))) '() (list 'LC:run-or-load (cadr item))))
                (if (not (member (car item) *LC-GHOST-ROUTINES*))
                  (setq *LC-GHOST-ROUTINES* (cons (car item) *LC-GHOST-ROUTINES*))
                )
              )
            )
          )
          (princ (strcat " OK. (" (itoa (length cmds)) " ghost commands now active in RAM)"))
        )
        (princ " ERROR: No commands received from the cloud INDEX. Check your suite permissions.")
      )
    )
    (princ " ERROR: HTTP Authentication failed.")
  )
  (princ)
)

;;; ==========================================================================
;;; SECCIÓN 4: ASSET ENGINE (Hatches & Linetypes)
;;; ==========================================================================
(defun c:LC_APPLY_ASSET (/ assetType assetName codeB64 cachedCode tmpDir tmpFile f decoded)
  (setq assetType *LC-ASSET-TYPE*)
  (setq assetName *LC-ASSET-NAME*)
  (setq codeB64   *LC-ASSET-CODE*)

  (setq *LC-ASSET-TYPE* nil *LC-ASSET-NAME* nil *LC-ASSET-CODE* nil)

  (if (not (and assetType assetName))
    (princ "\n[LC] Selecione um padrão na paleta primeiro.")
    (progn
      (setq cachedCode (cdr (assoc assetName *LC-ASSET-CACHE*)))
      (if (not cachedCode)
        (if codeB64
          (progn
            (setq decoded codeB64)
            (setq *LC-ASSET-CACHE* (cons (cons assetName decoded) *LC-ASSET-CACHE*))
            (setq cachedCode decoded)
          )
          (princ (strcat "\n[LC] Código do padrão '" assetName "' não encontrado."))
        )
      )

      (if cachedCode
        (progn
          (setq tmpDir (strcat (getenv "TEMP") "\\LC_Assets"))
          (vl-mkdir tmpDir)

          (if (= assetType "hatch")
            (progn
              (if (= (substr cachedCode 1 1) "*")
                (progn
                  (setq comma-pos (vl-string-search "," cachedCode))
                  (if comma-pos
                    (setq hpname-to-use (substr cachedCode 2 (1- comma-pos)))
                    (setq hpname-to-use assetName)
                  )
                )
                (setq hpname-to-use assetName)
              )
              (setq tmpFile (strcat tmpDir "\\" hpname-to-use ".pat"))
              (setq f (open tmpFile "w"))
              (if f
                (progn
                  (if (not (= (substr cachedCode 1 1) "*"))
                    (write-line (strcat "*" hpname-to-use ", LispCentral") f)
                  )
                  (write-line cachedCode f)
                  (close f)
                  (vl-catch-all-apply
                    '(lambda (/ acadObj prefObj curPaths)
                       (setq acadObj (vlax-get-acad-object))
                       (setq prefObj (vla-get-Preferences acadObj))
                       (setq curPaths (vla-get-SupportPath (vla-get-Files prefObj)))
                       (if (not (vl-string-search (strcase tmpDir) (strcase curPaths)))
                         (vla-put-SupportPath (vla-get-Files prefObj)
                                              (strcat curPaths ";" tmpDir))
                       )
                     )
                    '()
                  )
                  (setvar "HPNAME" hpname-to-use)
                  (princ (strcat "\n[LC] Hachura '" hpname-to-use "' disponivel. Selecione a area interna..."))
                  (vla-sendcommand (vla-get-ActiveDocument (vlax-get-acad-object)) "._BHATCH ")
                )
                (princ "\n[LC][ERRO] Falha ao criar arquivo temporário. Verifique permissões do %TEMP%.")
              )
            )
            (progn
              (setq tmpFile (strcat tmpDir "\\" assetName ".lin"))
              (setq f (open tmpFile "w"))
              (if f
                (progn
                  (if (not (= (substr cachedCode 1 1) "*"))
                    (write-line (strcat "*" assetName ", LispCentral") f)
                  )
                  (write-line cachedCode f)
                  (close f)
                  (vl-cmdf "._-LINETYPE" "_Load" assetName tmpFile "")
                  (princ (strcat "\n[LC] Tipo de linha '" assetName "' carregado com sucesso."))
                )
                (princ "\n[LC][ERRO] Falha ao criar arquivo temporário de linetype.")
              )
            )
          )
        )
      )
    )
  )
  (princ)
)

(defun LC_ApplyHatch (patName codeB64)
  (setq *LC-ASSET-TYPE* "hatch" *LC-ASSET-NAME* patName *LC-ASSET-CODE* codeB64)
  (c:LC_APPLY_ASSET)
)

(defun LC_ApplyLinetype (linName codeB64)
  (setq *LC-ASSET-TYPE* "lin" *LC-ASSET-NAME* linName *LC-ASSET-CODE* codeB64)
  (c:LC_APPLY_ASSET)
)

;;; ==========================================================================
;;; SECCIÓN 5: PALETTE ENGINE
;;; ==========================================================================

(defun LC:get-palette-url (key / base)
  (setq base "https://lispcentral.web.app")
  (if (and (boundp '*LC-PLATFORM-MAP*) *LC-PLATFORM-MAP*)
    (cdr (assoc key *LC-PLATFORM-MAP*))
    (cond
      ((= key "palette")   (strcat base "/palette"))
      ((= key "resources") (strcat base "/resource-palette"))
      ((= key "properties")(strcat base "/properties-palette"))
      ((= key "standards") (strcat base "/standards-palette"))
      (T base)
    )
  )
)

(defun LC:open-palette (id name active-var guard-var dummy-html / doc loader-js f-js local-html source-url temp-html f-html html-content)
  (if (and (vl-bb-ref active-var) (not *LC-FORCE-RELOAD*))
    (princ (strcat "\n[LispCentral] " name " already active in this session."))
    (progn
      (vl-load-com)
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)
      (princ (strcat "\n[⚙] Initializing " name "..."))

      (if (not (vl-bb-ref '*LC-SESSION-VERSION*))
        (vl-bb-set '*LC-SESSION-VERSION* (rtos (getvar "MILLISECS") 2 0))
      )
      
      (setq source-url (strcat (LC:get-palette-url id) "?v=" (rtos (getvar "MILLISECS") 2 0)))
      (setq temp-html (strcat (getenv "TEMP") "\\LC_" id ".html"))
      
      (if dummy-html
        (progn
          (setq f-html (open temp-html "w"))
          (if f-html
            (progn
              (write-line dummy-html f-html)
              (close f-html)
            )
          )
        )
        (progn
          (princ (strcat "\n[LispCentral] Syncing " name " UI from cloud..."))
          (setq html-content (LC:http-get source-url))
          (if html-content
            (progn
              (setq f-html (open temp-html "w"))
              (if f-html
                (progn
                  (princ html-content f-html)
                  (close f-html)
                )
              )
            )
          )
        )
      )

      (setq local-html (strcat "file:///" (vl-string-translate "\\" "/" temp-html)
                               "?token=" *LC-SEAT-TOKEN*
                               "&hwId="  (LC:url-encode *LC-HWID*)
                               "&v="     (vl-bb-ref '*LC-SESSION-VERSION*)))

      (setq loader-js (strcat (getenv "TEMP") "\\LC_" id "_Loader.js"))
      (setq f-js (open loader-js "w"))
      (if f-js
        (progn
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line (strcat "  if (!window." guard-var ") {") f-js)
          (write-line "    try {" f-js)
          (write-line (strcat "      try { Acad.Application.removePalette('" name "'); } catch(x) {}") f-js)
          (write-line (strcat "      Acad.Application.addPalette('" name "', '" local-html "');") f-js)
          (write-line (strcat "      window." guard-var " = true;") f-js)
          (write-line (strcat "      Acad.Editor.writeMessage('\\n[SUCCESS] " name " is ready.\\n');") f-js)
          (write-line "    } catch(e) {" f-js)
          (write-line "      Acad.Editor.writeMessage('\\n[LC ERROR] ' + e.message + '\\n');" f-js)
          (write-line "    }" f-js)
          (write-line "  } else {" f-js)
          (write-line (strcat "    Acad.Editor.writeMessage('\\n[LispCentral] " name " already active.\\n');") f-js)
          (write-line "  }" f-js)
          (write-line "} else {" f-js)
          (write-line "  console.error('[ERROR] AutoCAD JavaScript API not detected.');" f-js)
          (write-line "}" f-js)
          (close f-js)
          
          (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
          (vl-bb-set active-var T)

          ;; Init EventHub once
          (if (not (vl-bb-ref 'LC_PALETTE_LOADED))
            (progn
              (LC:Init-EventHub)
              (vl-bb-set 'LC_PALETTE_LOADED T)
            )
          )
        )
        (princ (strcat "\n[ERROR] Could not create " name " JS injector file."))
      )
      (vla-EndUndoMark doc)
    )
  )
  (princ)
)

(defun c:LC_PALETTE ()   (LC:open-palette "palette"   "Command Palette"       '*LC-PALETTE-ACTIVE*    "_lcCmdPaletteActive" nil))
(defun c:LC_RESOURCES () (LC:open-palette "resources" "LispCentral Resources" '*LC-RESOURCE-ACTIVE*   "_lcResourceActive" nil))
(defun c:LC_STANDARDS () (LC:open-palette "standards" "LispCentral Standards" '*LC-STANDARDS-ACTIVE*  "_lcStandardsActive" nil))

;; Dummy fallback for properties
(defun c:LC_PROPERTIES () 
  (LC:open-palette "properties" "LispCentral Properties" '*LC-PROPERTIES-ACTIVE* "_lcPropertiesActive"
    "<!DOCTYPE html><html><head><style>body{background:#222;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head><body><h3>Próximamente...</h3></body></html>"
  )
)

;;; ==========================================================================
;;; SECCIÓN 6: STANDARDS ENGINE
;;; ==========================================================================

;; JSON Escaping
(defun LC:json-escape (str / i char result)
  (if (not str) ""
    (progn
      (setq result "" i 1)
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

(defun LC:list->json-obj (entries / result i)
  (if (not entries) "{}"
    (progn
      (setq result "{" i 0)
      (foreach entry entries
        (if (> i 0) (setq result (strcat result ",")))
        (setq result (strcat result entry))
        (setq i (1+ i))
      )
      (strcat result "}")
    )
  )
)

;; Extractors
(defun LC:get-layers-json (/ doc layers entries name color ltype lw plottable desc)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq layers (vla-get-layers doc) entries '())
  (vlax-for layer layers
    (setq name (vla-get-name layer))
    (if (not (vl-string-search "|" name))
      (progn
        (setq color     (vla-get-color layer))
        (setq ltype     (vla-get-linetype layer))
        (setq lw        (vla-get-lineweight layer))
        (setq plottable (if (= (vla-get-plottable layer) :vlax-true) "true" "false"))
        (setq desc      (vl-catch-all-apply 'vla-get-description (list layer)))
        (if (vl-catch-all-error-p desc) (setq desc ""))
        (setq entries (cons
          (strcat "\"" (LC:json-escape name) "\":"
                  "{\"color\":"       (itoa color)
                  ",\"ltype\":\""     (LC:json-escape ltype) "\""
                  ",\"lineweight\":"  (itoa lw)
                  ",\"plottable\":"   plottable
                  ",\"description\":\"" (LC:json-escape desc) "\"}") entries))
      )
    )
  )
  (LC:list->json-obj (reverse entries))
)

(defun LC:get-textstyles-json (/ tbl entries name font bigfont height)
  (setq tbl (tblnext "STYLE" T) entries '())
  (while tbl
    (setq name    (cdr (assoc 2  tbl)))
    (setq font    (cdr (assoc 3  tbl)))
    (setq bigfont (cdr (assoc 4  tbl)))
    (setq height  (cdr (assoc 40 tbl)))
    (if (not (vl-string-search "|" name))
      (setq entries (cons
        (strcat "\"" (LC:json-escape name) "\":"
                "{\"font\":\""    (LC:json-escape (if font font "")) "\""
                ",\"bigfont\":\"" (LC:json-escape (if bigfont bigfont "")) "\""
                ",\"height\":"    (rtos (if height height 0.0) 2 4) "}") entries))
    )
    (setq tbl (tblnext "STYLE"))
  )
  (LC:list->json-obj (reverse entries))
)

(defun LC:get-dimstyles-json (/ tbl entries name scale txth arrowsz dimdec dimgap)
  (setq tbl (tblnext "DIMSTYLE" T) entries '())
  (while tbl
    (setq name    (cdr (assoc 2   tbl)))
    (setq scale   (cdr (assoc 40  tbl)))
    (setq txth    (cdr (assoc 140 tbl)))
    (setq arrowsz (cdr (assoc 41  tbl)))
    (setq dimdec  (cdr (assoc 271 tbl)))
    (setq dimgap  (cdr (assoc 147 tbl)))
    (if (not (vl-string-search "|" name))
      (setq entries (cons
        (strcat "\"" (LC:json-escape name) "\":"
                "{\"dimscale\":" (rtos (if scale scale 1.0) 2 4)
                ",\"dimtxt\":"   (rtos (if txth txth 2.5) 2 4)
                ",\"dimasz\":"   (rtos (if arrowsz arrowsz 2.5) 2 4)
                ",\"dimdec\":"   (itoa (if dimdec dimdec 4))
                ",\"dimgap\":"   (rtos (if dimgap dimgap 0.625) 2 4) "}") entries))
    )
    (setq tbl (tblnext "DIMSTYLE"))
  )
  (LC:list->json-obj (reverse entries))
)

(defun LC:get-linetypes-json (/ tbl entries name desc)
  (setq tbl (tblnext "LTYPE" T) entries '())
  (while tbl
    (setq name (cdr (assoc 2 tbl)))
    (setq desc (cdr (assoc 3 tbl)))
    (if (not (vl-string-search "|" name))
      (setq entries (cons (strcat "\"" (LC:json-escape name) "\":{\"desc\":\"" (LC:json-escape (if desc desc "")) "\"}") entries))
    )
    (setq tbl (tblnext "LTYPE"))
  )
  (LC:list->json-obj (reverse entries))
)

(defun LC:get-globalvars-json (/ ins lt ds meas)
  (setq ins (getvar "INSUNITS") lt (getvar "LTSCALE") ds (getvar "DIMSCALE") meas (getvar "MEASUREMENT"))
  (strcat "{\"INSUNITS\":{\"value\":" (itoa ins) "},"
          "\"LTSCALE\":{\"value\":" (rtos lt 2 4) "},"
          "\"DIMSCALE\":{\"value\":" (rtos ds 2 4) "},"
          "\"MEASUREMENT\":{\"value\":" (itoa meas) "}}")
)

(defun LC:get-dict-keys (dictName / dict keys)
  (setq dict (dictsearch (namedobjdict) dictName) keys '())
  (if dict
    (foreach item dict
      (if (= (car item) 3)
        (setq keys (cons (cdr item) keys))
      )
    )
  )
  (reverse keys)
)

(defun LC:get-mleaderstyles-json (/ keys entries name)
  (setq keys (LC:get-dict-keys "ACAD_MLEADERSTYLE") entries '())
  (foreach name keys
    (if (not (vl-string-search "|" name))
      (setq entries (cons (strcat "\"" (LC:json-escape name) "\":{}") entries))
    )
  )
  (LC:list->json-obj (reverse entries))
)

(defun LC:get-tablestyles-json (/ keys entries name)
  (setq keys (LC:get-dict-keys "ACAD_TABLESTYLE") entries '())
  (foreach name keys
    (if (not (vl-string-search "|" name))
      (setq entries (cons (strcat "\"" (LC:json-escape name) "\":{}") entries))
    )
  )
  (LC:list->json-obj (reverse entries))
)

(defun LC:get-scalelists-json (/ keys entries name)
  (setq keys (LC:get-dict-keys "ACAD_SCALELIST") entries '())
  (foreach name keys
    (if (not (vl-string-search "|" name))
      (setq entries (cons (strcat "\"" (LC:json-escape name) "\":{}") entries))
    )
  )
  (LC:list->json-obj (reverse entries))
)

;; Appliers
(defun LC:ensure-linetype (ltype-name doc / ltypes result)
  (if (or (= (strcase ltype-name) "CONTINUOUS") (= ltype-name "")) T
    (progn
      (setq ltypes (vla-get-linetypes doc))
      (setq result (vl-catch-all-apply 'vla-item (list ltypes ltype-name)))
      (if (vl-catch-all-error-p result)
        (vl-catch-all-apply 'vla-load (list ltypes ltype-name "acad.lin")) T
      )
    )
  )
)

(defun LC:apply-layer (name color ltype lineweight / doc layers layer result)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq layers (vla-get-layers doc))
  (LC:ensure-linetype ltype doc)
  (setq result (vl-catch-all-apply 'vla-item (list layers name)))
  (if (vl-catch-all-error-p result)
    (setq layer (vla-add layers name))
    (setq layer result)
  )
  (vl-catch-all-apply 'vla-put-color      (list layer color))
  (vl-catch-all-apply 'vla-put-linetype   (list layer ltype))
  (vl-catch-all-apply 'vla-put-lineweight (list layer lineweight))
  (princ (strcat "\n[LC] Layer: " name))
)

(defun LC:apply-textstyle (name font height / doc styles style result)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq styles (vla-get-textstyles doc))
  (setq result (vl-catch-all-apply 'vla-item (list styles name)))
  (if (vl-catch-all-error-p result)
    (setq style (vla-add styles name))
    (setq style result)
  )
  (if (and font (> (strlen font) 0)) (vl-catch-all-apply 'vla-put-fontfile (list style font)))
  (if (and height (> height 0.0))    (vl-catch-all-apply 'vla-put-height (list style (float height))))
  (princ (strcat "\n[LC] TextStyle: " name))
)

(defun LC:rename-layer (old-name new-name / doc layers result layer)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq layers (vla-get-layers doc))
  (setq result (vl-catch-all-apply 'vla-item (list layers old-name)))
  (if (vl-catch-all-error-p result)
    (progn (princ (strcat "\n[LC ERROR] Layer not found: " old-name)) nil)
    (progn
      (setq layer result)
      (vl-catch-all-apply 'vla-put-name (list layer new-name))
      (princ (strcat "\n[LC] Renamed: " old-name " -> " new-name))
      T
    )
  )
)

(defun LC:apply-dimstyle (name dimscale dimtxt dimdec / doc styles style result)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq styles (vla-get-dimstyles doc))
  (setq result (vl-catch-all-apply 'vla-item (list styles name)))
  (if (vl-catch-all-error-p result)
    (setq style (vla-add styles name))
    (setq style result)
  )
  (vl-catch-all-apply 'vla-put-activedimstyle (list doc style))
  (if (and dimscale (> dimscale 0.0)) (vl-catch-all-apply 'setvar (list "DIMSCALE" (float dimscale))))
  (if (and dimtxt (> dimtxt 0.0))     (vl-catch-all-apply 'setvar (list "DIMTXT" (float dimtxt))))
  (if (and dimdec (>= dimdec 0))      (vl-catch-all-apply 'setvar (list "DIMDEC" dimdec)))
  (vl-catch-all-apply 'vla-copyfrom (list style doc))
  (princ (strcat "\n[LC] DimStyle: " name))
)

(defun c:LC_APPLY_COMPLETE ( / doc)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (vl-catch-all-apply 'vla-regen (list doc 1))
  (princ "\n[LC] Standard applied to drawing.")
  (princ)
)

(defun LC:apply-linetype (name / doc)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (LC:ensure-linetype name doc)
  (princ (strcat "\n[LC] Linetype ensured: " name))
)

(defun LC:apply-mleaderstyle (name / doc dicts mlDict result)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq dicts (vla-get-dictionaries doc))
  (setq mlDict (vl-catch-all-apply 'vla-item (list dicts "ACAD_MLEADERSTYLE")))
  (if (not (vl-catch-all-error-p mlDict))
    (progn
      (setq result (vl-catch-all-apply 'vla-item (list mlDict name)))
      (if (vl-catch-all-error-p result)
        (progn
          (vl-catch-all-apply 'vla-addobject (list mlDict name "AcDbMLeaderStyle"))
          (princ (strcat "\n[LC] MLeaderStyle created: " name))
        )
      )
    )
  )
)

(defun LC:apply-tablestyle (name / doc dicts tblDict result)
  (setq doc (vla-get-activedocument (vlax-get-acad-object)))
  (setq dicts (vla-get-dictionaries doc))
  (setq tblDict (vl-catch-all-apply 'vla-item (list dicts "ACAD_TABLESTYLE")))
  (if (not (vl-catch-all-error-p tblDict))
    (progn
      (setq result (vl-catch-all-apply 'vla-item (list tblDict name)))
      (if (vl-catch-all-error-p result)
        (progn
          (vl-catch-all-apply 'vla-addobject (list tblDict name "AcDbTableStyle"))
          (princ (strcat "\n[LC] TableStyle created: " name))
        )
      )
    )
  )
)

(defun LC:apply-scale (name /)
  (princ (strcat "\n[LC] Scale ensured: " name))
)

;; Web API communication for Standards
(defun LC:extract-standards (/ payload url res)
  (princ "\n[LispCentral] Extracting standard for team...")
  (setq payload (strcat "{"
    "\"token\":\""     (LC:json-escape *LC-SEAT-TOKEN*)  "\","
    "\"teamId\":\""    (LC:json-escape *LC-HWID*) "\","
    "\"standardData\":{"
      "\"layers\":"         (LC:get-layers-json)         ","
      "\"textStyles\":"     (LC:get-textstyles-json)     ","
      "\"dimStyles\":"      (LC:get-dimstyles-json)      ","
      "\"linetypes\":"      (LC:get-linetypes-json)      ","
      "\"globalVars\":"     (LC:get-globalvars-json)     ","
      "\"mleaderStyles\":"  (LC:get-mleaderstyles-json)  ","
      "\"tableStyles\":"    (LC:get-tablestyles-json)    ","
      "\"scaleLists\":"     (LC:get-scalelists-json)
    "}}"
  ))
  (setq url (strcat (LC:get-api-base) "/uploadDraft"))
  (setq res (LC:http-post url payload))
  (if res
    (progn
      (princ (strcat "\n[LispCentral] Server responded: " res))
      (setvar "USERS1" "LC_SAAS_DRAFT_READY")
    )
    (princ "\n[LispCentral] Error contacting server.")
  )
  (princ)
)

(defun LC:run-audit (/ payload url res)
  (princ "\n[LispCentral] Starting audit for team...")
  (setq payload (strcat "{"
    "\"token\":\"" (LC:json-escape *LC-SEAT-TOKEN*) "\","
    "\"teamId\":\"" (LC:json-escape *LC-HWID*) "\","
    "\"standardData\":{"
      "\"layers\":"     (LC:get-layers-json)     ","
      "\"textStyles\":" (LC:get-textstyles-json) ","
      "\"dimStyles\":"  (LC:get-dimstyles-json)
    "}}"
  ))
  (setq url (strcat (LC:get-api-base) "/uploadDraft"))
  (setq res (LC:http-post url payload))
  (if res
    (progn
      (princ (strcat "\n[LispCentral] Audit sent: " res))
      (setvar "USERS1" "LC_SAAS_DRAFT_READY")
    )
    (princ "\n[LispCentral] Error sending audit.")
  )
  (princ)
)

;;; ==========================================================================
;;; SECCIÓN 7: EVENT HUB & REACTOR
;;; ==========================================================================
(defun LC:DocChanged-Callback (reactorObj eventList / f-js event-js) 
  (vl-catch-all-apply 
    '(lambda () 
       (setq event-js (strcat (getenv "TEMP") "\\LC_DocEvent.js"))
       (setq event-js (vl-string-translate "\\" "/" event-js))
       (setq f-js (open event-js "w"))
       (if f-js 
         (progn 
           (write-line "if (typeof window !== 'undefined') {" f-js)
           (write-line "    window.dispatchEvent(new CustomEvent('lc_context_changed'));" f-js)
           (write-line "    console.log('[LispCentral Hub] Active document change notified to palettes.');" f-js)
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
  (setq *LC-DOC-REACTOR* (vlr-docmanager-reactor nil (list (cons :vlr-documentBecameCurrent 'LC:DocChanged-Callback))))
  (princ "\n[LispCentral Hub] Global Session Reactor initialized.")
)

;;; ==========================================================================
;;; SECCIÓN 8: COMANDOS DE SISTEMA
;;; ==========================================================================
(defun c:LC_SYNC ()
  (princ "\n[LispCentral] Iniciando Live Sync (Garbage Collection)...")
  (if *LC-GHOST-ROUTINES*
    (progn
      (foreach cmd *LC-GHOST-ROUTINES*
        (eval (list 'setq (read (strcat "c:" cmd)) nil))
      )
      (setq *LC-GHOST-ROUTINES* nil)
      (princ "\n[LispCentral] Fantasmas anteriores destruidos.")
    )
  )
  (setq *LC-LOADED-ROUTINES* nil)
  (princ "\n[LispCentral] Cache JIT limpiada.")
  (LC:register-ghosts)
  (princ)
)

(defun c:LC_RESET ()
  (vl-bb-set '*LC-PALETTE-ACTIVE*    nil)
  (vl-bb-set '*LC-RESOURCE-ACTIVE*   nil)
  (vl-bb-set '*LC-PROPERTIES-ACTIVE* nil)
  (vl-bb-set '*LC-STANDARDS-ACTIVE*  nil)
  (vl-bb-set '*LC-SESSION-VERSION* (rtos (getvar "MILLISECS") 2 0))
  (setq *LC-FORCE-RELOAD* T)
  (princ "\n[LispCentral] Palette state reset. Reloading all palettes...")
  (c:LC_PALETTE)
  (c:LC_RESOURCES)
  (c:LC_PROPERTIES)
  (c:LC_STANDARDS)
  (setq *LC-FORCE-RELOAD* nil)
)

(defun c:LC_INSPECT () (c:LC_PALETTE))
(defun c:LC () (c:LC_PALETTE))
(defun c:PALETA () (c:LC_PALETTE))
(defun c:PALETTE () (c:LC_PALETTE))
(defun c:RECURSOS () (c:LC_RESOURCES))
(defun c:HATCHES () (c:LC_RESOURCES))
(defun c:LINHAS () (c:LC_RESOURCES))
(defun c:PADROES () (c:LC_STANDARDS))
(defun c:STANDARDS () (c:LC_STANDARDS))

(defun c:LC_HELP () 
  (princ "\n")
  (princ "\n  ================================================================")
  (princ "\n                  LISPCENTRAL - AVAILABLE COMMANDS                ")
  (princ "\n  ================================================================")
  (princ "\n                                                                  ")
  (princ "\n  • LC / PALETA / LC_PALETTE .... Open Main Command Palette     ")
  (princ "\n  • LC_RES / RECURSOS ........... Open Resource Palette         ")
  (princ "\n  • LC_PROP / LC_PROPERTIES ..... Open Properties Palette       ")
  (princ "\n  • LC_STANDARDS / PADROES ...... Open Standards Palette        ")
  (princ "\n  • LC_RESET .................... Force reload all UI elements  ")
  (princ "\n  • LC_HELP ..................... Show this help menu           ")
  (princ "\n                                                                  ")
  (princ "\n  Tip: If you close a palette, type its command again to reopen.  ")
  (princ "\n  ================================================================")
  (princ "\n")
  (princ)
)

;;; ==========================================================================
;;; SECCIÓN 9: INICIALIZACIÓN
;;; ==========================================================================
(vl-load-com)
(LC:register-ghosts)
(princ "\n[LispCentral] Core Engine loaded. Type 'LC' to open the palette.")
(princ)
