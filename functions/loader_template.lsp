;;; ==========================================================================
;;; LISPCENTRAL CLOUD LOADER (SaaS Multi-Tenant)
;;; Licensed to: {{TENANT_NAME}}
;;; 
;;; LEGAL NOTICE:
;;; Both this code and the LispCentral application are the exclusive 
;;; property of Daniel Aldama. Provided 'as is', without any warranties. 
;;; It is left in plain, commented text for your consideration, security
;;; auditing, and transparency.
;;; 
;;; WARNING: Do not modify the Seat Token below. It links your seat and company.
;;; ==========================================================================

(setq *LC-SEAT-TOKEN* "{{SEAT_TOKEN}}")
(setq *LC-API-ENDPOINT* "https://us-central1-lispcentral.cloudfunctions.net/getRoutine")

;; Generate Hardware Hash (Machine ID) and AutoCAD Version.
;; This is used to securely identify this specific computer to the cloud backend.
(setq *LC-HWID* (strcat (getenv "COMPUTERNAME") "@" (getenv "USERNAME")))
(setq *LC-ACADVER* (getvar "ACADVER"))

;;; ==========================================================================
;;; CORE UTILITIES
;;; ==========================================================================


;; Utility function to URL-encode spaces and special characters for HTTP requests.
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

;;; ==========================================================================
;;; JUST-IN-TIME (JIT) ENGINE
;;; ==========================================================================

;; Fetches and evaluates code directly in AutoCAD's RAM (Zero-Disk payload execution).
;; This ensures that your proprietary commands are never saved to the local hard drive.
(defun LC:load-remote-routine (lisp_id / xmlhttp url status response) 
  (princ (strcat "\n[LispCentral] Fetching remote package '" lisp_id "'..."))

  ;; Construct semantic URL with authorization and hardware identification.
  (setq url (strcat *LC-API-ENDPOINT* 
                    "?token="
                    *LC-SEAT-TOKEN*
                    "&hwId="
                    (LC:url-encode *LC-HWID*)
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
          ;; Execute the sandboxed minified code delivered by the backend directly in memory.
          (if 
            (vl-catch-all-error-p (vl-catch-all-apply 'eval (list (read response))))
            (progn 
              (princ (strcat "\n[ERROR] Syntax error evaluating routine: " lisp_id))
              (setvar "USERS1" (strcat lisp_id ":error"))
              nil
            )
            (progn 
              (setvar "USERS1" (strcat lisp_id ":success"))
              (princ 
                (strcat "\n[SUCCESS] Package '" 
                        lisp_id
                        "' loaded successfully into RAM."
                )
              )
              t
            )
          )
        )
        (progn 
          (princ 
            (strcat "\n[ERROR] Failed to fetch '" 
                    lisp_id
                    "' (HTTP Status: "
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
      (princ "\n[CRITICAL ERROR] Failed to instantiate MSXML2.XMLHTTP object. Ensure Windows components are updated.")
      (setvar "USERS1" (strcat lisp_id ":error"))
      nil
    )
  )
  (princ)
)

;; Global tracking list for JIT-loaded routines to prevent duplicate downloads.
(if (not *LC-LOADED-ROUTINES*) (setq *LC-LOADED-ROUTINES* nil))

;; Core wrapper to run a command. If the command is not in RAM, it falls back to JIT loading from the cloud.
(defun LC:run-or-load (lisp_id / cmd-sym) 
  (setq cmd-sym (read (strcat "c:" lisp_id)))

  (if (not (member lisp_id *LC-LOADED-ROUTINES*)) 
    (progn 
      (princ 
        (strcat "\n[LispCentral] Command '" 
                lisp_id
                "' not found in RAM. Initiating Just-In-Time Load..."
        )
      )
      (LC:load-remote-routine lisp_id)
      (setq *LC-LOADED-ROUTINES* (cons lisp_id *LC-LOADED-ROUTINES*))
    )
  )

  (if (member lisp_id *LC-LOADED-ROUTINES*) 
    (progn 
      ;; Evaluates the actual command loaded in memory.
      (eval (list cmd-sym))
    )
    (alert 
      (strcat "\n[FATAL ERROR] Could not resolve and load JIT command: " lisp_id)
    )
  )
  (princ)
)

;; Directive for dependency injection. 
;; Use (LC:Require "LibraryName") in your LISP files to automatically load dependencies from the cloud.
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

;; Parses 'name' values from JSON response string efficiently without requiring an external JSON library.
(defun LC:parse-json-names (jsonStr / pos start end cmd-list name) 
  (setq cmd-list nil)
  (setq pos 0)
  (while (setq start (vl-string-search "\"name\":\"" jsonStr pos)) 
    (setq start (+ start 8)) ; length of "\"name\":\""
    (setq end (vl-string-search "\"" jsonStr start))
    (if end 
      (progn 
        (setq name (substr jsonStr (1+ start) (- end start)))
        (setq cmd-list (append cmd-list (list (list name name))))
        (setq pos end)
      )
      (setq pos (strlen jsonStr))
    )
  )
  cmd-list
)

;; Cloud Handshake: Fetches the command index upon launch and registers lightweight 'Ghost Commands'.
;; This allows AutoCAD to recognize commands instantly without downloading their logic until requested.
(defun LC:register-ghosts (/ xmlhttp index-url status response cmds item) 
  (princ "\n[LispCentral] Authenticating and syncing your cloud commands...")

  (setq index-url (strcat *LC-API-ENDPOINT* 
                          "?token="
                          *LC-SEAT-TOKEN*
                          "&hwId="
                          (LC:url-encode *LC-HWID*)
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
                ;; Creates a ghost command in memory (e.g. c:MY_COMMAND) that points to the JIT loader `LC:run-or-load`.
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
              (princ 
                (strcat " OK. (" 
                        (itoa (length cmds))
                        " ghost commands now active in RAM)"
                )
              )
            )
            (princ " ERROR: No commands received from the cloud INDEX. Check your suite permissions.")
          )
        )
        (princ 
          (strcat " ERROR: HTTP Authentication failed. Status " 
                  (vl-princ-to-string status)
          )
        )
      )
      (vlax-release-object xmlhttp)
    )
    (princ " ERROR: Failed to instantiate MSXML2.XMLHTTP. Check Windows COM permissions.")
  )
  (princ)
)

;; Trigger initial handshake on AutoCAD launch to map all commands into memory.
(LC:register-ghosts)

;;; ==========================================================================
;;; RESOURCE PALETTE MODULE: Applies Hatches and Linetypes directly from the cloud
;;; ==========================================================================

;; Simple Base64 decoder for converting ASCII patterns and line types received from the cloud.
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

;; Generates a temporary .pat file from cloud data and activates it in the current drawing.
(defun LC_ApplyHatch (patName codeB64 / tmpDir tmpFile f decoded) 
  ;; Temporarily write the resource to the universal %TEMP% folder for immediate consumption.
  (setq tmpDir (getenv "TEMP"))
  (setq tmpFile (strcat tmpDir "\\LC_" patName ".pat"))
  (setq decoded (LC:b64-decode codeB64))
  (setq f (open tmpFile "w"))
  (if f 
    (progn 
      (write-line (strcat "*" patName ", LispCentral Cloud Resource") f)
      (write-line decoded f)
      (close f)
      ;; Append path and activate hatch
      (setvar "HPNAME" patName)
      (setenv "ACAD" (strcat (getenv "ACAD") ";" tmpDir))
      (princ 
        (strcat "\n[LispCentral] Hatch '" 
                patName
                "' is now available. Use the HATCH command to apply."
        )
      )
    )
    (princ "\n[ERROR] Failed to create temporary hatch file in %TEMP%. Check your permissions.")
  )
  (princ)
)

;; Generates a temporary .lin file from cloud data and loads it into the current drawing.
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
      ;; Load linetype directly into document
      (vl-cmdf "._-LINETYPE" "_Load" linName tmpFile "")
      (princ (strcat "\n[LispCentral] Linetype '" linName "' loaded successfully."))
    )
    (princ "\n[ERROR] Failed to create temporary linetype file in %TEMP%. Check your permissions.")
  )
  (princ)
)

;;; ==========================================================================
;;; EVENT HUB: Web Palette Context Synchronization
;;; ==========================================================================

;; Reactor Callback: Notifies our HTML palettes when the user changes active drawings.
(defun LC:DocChanged-Callback (reactorObj eventList / activeDoc f-js event-js) 
  (vl-catch-all-apply 
    '(lambda () 
       ;; Injects a tiny JS script to trigger the global 'lc_context_changed' event.
       (setq event-js (strcat (getenv "TEMP") "\\\\LC_DocEvent.js"))
       (setq event-js (vl-string-translate "\\" "/" event-js))

       (setq f-js (open event-js "w"))
       (if f-js 
         (progn 
           (write-line "if (typeof window !== 'undefined') {" f-js)
           (write-line "    window.dispatchEvent(new CustomEvent('lc_context_changed'));" 
                       f-js
           )
           (write-line "    console.log('[LispCentral Hub] Active document change notified to palettes.');" 
                       f-js
           )
           (write-line "}" f-js)
           (close f-js)
           ;; Run the script in AutoCAD JS context
           (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" event-js "\""))
         )
       )
     )
  )
  (princ)
)

;; Initializes the global reactor listening to document swaps.
(defun LC:Init-EventHub () 
  (vl-load-com)
  ;; Deregister if already exists to prevent duplicate events.
  (if (and (boundp '*LC-DOC-REACTOR*) *LC-DOC-REACTOR*) 
    (vlr-remove *LC-DOC-REACTOR*)
  )
  ;; Register the document change reactor.
  (setq *LC-DOC-REACTOR* (vlr-docmanager-reactor 
                           nil
                           (list 
                             (cons :vlr-documentBecameCurrent 
                                   'LC:DocChanged-Callback
                             )
                           )
                         )
  )
  (princ "\n[LispCentral Hub] Global Session Reactor initialized.")
)

;;; ==========================================================================
;;; LOCAL HTML WRAPPER (Iframe Bridge for WebView2/CEF)
;;; ==========================================================================

;; Creates a local HTML file serving as an iframe wrapper to load remote Cloud Palettes.
;; This bypasses some AutoCAD WebView2 cross-origin execution limits.
(defun LC:Create-Palette-Wrapper (fileName url / htmlPath f-html) 
  ;; The wrapper is always saved in %TEMP% ensuring universal write access across machines.
  (setq htmlPath (strcat (getenv "TEMP") "\\\\" fileName))
  (setq f-html (open htmlPath "w"))
  (if f-html 
    (progn 
      (write-line "<!DOCTYPE html><html><head><style>body,html{margin:0;padding:0;height:100%;overflow:hidden;background-color:#222;}iframe{width:100%;height:100%;border:none;}</style></head><body>" f-html)
      (write-line (strcat "<iframe src=\"" url "\" allow=\"clipboard-read; clipboard-write\"></iframe>") f-html)
      (write-line "<script>" f-html)
      
      ;; 1. Native Bridge (ACAD_COMMAND execution channel)
      (write-line "window.addEventListener('message', function(event) {" f-html)
      (write-line "  if (event.data && event.data.type === 'ACAD_COMMAND') {" f-html)
      ;; Clear trailing newlines to allow AutoCAD to parse it accurately.
      (write-line "    var cmd = event.data.command.replace(/[\\\\n\\\\r\\\\s]+$/, '');" f-html)
      (write-line "    console.log('[Local Wrapper] Attempting to execute command:', cmd);" f-html)
      (write-line "    if (typeof exec !== 'undefined') {" f-html)
      (write-line "      exec(JSON.stringify({functionName: 'Ac_EditorInterop.executeCommand', functionParams: { commands: cmd }}));" f-html)
      (write-line "    } else if (typeof execAsync !== 'undefined') {" f-html)
      (write-line "      execAsync(JSON.stringify({functionName: 'Ac_EditorInterop.executeCommand', functionParams: { commands: cmd }}));" f-html)
      (write-line "    } else {" f-html)
      (write-line "      console.error('LispCentral Bridge: execution API not found in current environment.');" f-html)
      (write-line "    }" f-html)
      (write-line "  }" f-html)
      (write-line "});" f-html)

      (write-line "</script></body></html>" f-html)
      (close f-html)
      (vl-string-translate "\\" "/" htmlPath)
    )
    nil
  )
)



    ;; Safely downloads binary assets (e.g. HTML files, images) from cloud to disk without UTF-8 corruption.
    (defun LC:Download-Asset (url dest / xmlhttp ado result) 
      (setq result nil)
      ;; Utilizing 6.0 mitigates COM parameter errors in older AutoLISP versions.
      (setq xmlhttp (vlax-create-object "MSXML2.XMLHTTP.6.0"))
      (if (not xmlhttp) (setq xmlhttp (vlax-create-object "MSXML2.XMLHTTP")))
      (if xmlhttp 
        (progn 
          (vl-catch-all-apply 'vlax-invoke-method 
                              (list xmlhttp 'open "GET" url :vlax-false)
          )
          (vl-catch-all-apply 'vlax-invoke-method (list xmlhttp 'send))
          (if (= (vlax-get-property xmlhttp 'status) 200) 
            (progn 
              (setq ado (vlax-create-object "ADODB.Stream"))
              (if ado 
                (progn 
                  (vlax-put-property ado 'Type 1) ; adTypeBinary for safe writes
                  (vl-catch-all-apply 'vlax-invoke-method (list ado 'Open))
                  (vl-catch-all-apply 'vlax-invoke-method 
                                      (list ado 
                                            'Write
                                            (vlax-get-property xmlhttp 
                                                               'responseBody
                                            )
                                      )
                  )
                  (vl-catch-all-apply 'vlax-invoke-method 
                                      (list ado 'SaveToFile dest 2)
                  ) ; adSaveCreateOverWrite
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

    ;;; ==========================================================================
    ;;; PALETTE COMMANDS & ALIASES
    ;;; ==========================================================================

    ;; Main Command Palette Command
    (defun c:LC_PALETTE (/ doc loader-js f-js local-html source-url temp-html) 
      (vl-load-com)
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)

      (princ "\n[⚙] Initializing LispCentral Main Palette...")

      ;; Cache URL to prevent duplicate palette spawning
      (if (not (boundp '*LC-PALETTE-URL*)) 
        (setq *LC-PALETTE-URL* (strcat "https://lispcentral.web.app/palette?token=" 
                                       *LC-SEAT-TOKEN*
                                       "&hwid="
                                       *LC-HWID*
                               )
        )
      )

      ;; JS injector generated in %TEMP%
      (setq loader-js (strcat (getenv "TEMP") "\\\\LC_Palette_Loader.js"))

      (setq f-js (open loader-js "w"))
      (if f-js 
        (progn 
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          ;; Close existing before re-opening to ensure fresh state
          (write-line "    try { Acad.Application.removePalette('Command Palette'); } catch(e) {}" 
                      f-js
          )

          ;; Download fresh production UI from Firebase Hosting
          (setq source-url (strcat "https://lispcentral.web.app/palette-builds/palette.html?v=" 
                                   (rtos (getvar "MILLISECS") 2 0)
                           )
          )
          (setq temp-html (strcat (getenv "TEMP") "\\\\LC_Palette.html"))

          (princ "\n[LispCentral] Syncing latest UI from cloud...")
          (LC:Download-Asset source-url temp-html)

          (setq local-html (strcat "file:///" 
                                   (vl-string-translate "\\\\" "/" temp-html)
                                   "?token="
                                   *LC-SEAT-TOKEN*
                                   "&hwId="
                                   (LC:url-encode *LC-HWID*)
                                   "&v="
                                   (rtos (getvar "MILLISECS") 2 0)
                           )
          )
          (write-line 
            (strcat "    Acad.Application.addPalette(\"Command Palette\", \"" 
                    local-html
                    "\");"
            )
            f-js
          )
          (write-line "    Acad.Editor.writeMessage(\"\\n[SUCCESS] LispCentral Palette is ready.\\n\");" 
                      f-js
          )
          (write-line "} else {" f-js)
          (write-line "    console.error(\"[ERROR] AutoCAD JavaScript API not detected.\");" 
                      f-js
          )
          (write-line "}" f-js)
          (close f-js)

          (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))

          ;; Only initialize the EventHub on the very first palette launch.
          (if (not (vl-bb-ref 'LC_PALETTE_LOADED)) 
            (progn 
              (LC:Init-EventHub)
              (vl-bb-set 'LC_PALETTE_LOADED T)
            )
          )
        )
        (princ "\n[ERROR] Could not create Palette JS injector file.")
      )

      (vla-EndUndoMark doc)
      (princ)
    )

    ;; Resource Palette Command (Hatches & Linetypes)
    (defun c:LC_RESOURCES (/ doc loader-js f-js local-html) 
      (vl-load-com)
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)

      (princ "\n[⚙] Initializing Resource Palette...")

      (if (not (boundp '*LC-RESOURCE-URL*)) 
        (setq *LC-RESOURCE-URL* (strcat "https://lispcentral.web.app/resource-palette?token=" 
                                        *LC-SEAT-TOKEN*
                                        "&hwid="
                                        *LC-HWID*
                                )
        )
      )

      (setq loader-js (strcat (getenv "TEMP") "\\\\LC_Resource_Loader.js"))

      (setq f-js (open loader-js "w"))
      (if f-js 
        (progn 
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line "    try { Acad.Application.removePalette('LispCentral Resources'); } catch(e) {}" 
                      f-js
          )
          (setq local-html (LC:Create-Palette-Wrapper 
                             "LC_Resource_Wrapper.html"
                             *LC-RESOURCE-URL*
                           )
          )
          (write-line 
            (strcat "    Acad.Application.addPalette(\"LispCentral Resources\", \"" 
                    local-html
                    "\");"
            )
            f-js
          )
          (write-line "    Acad.Editor.writeMessage(\"\\n[SUCCESS] Resource Palette is ready.\\n\");" 
                      f-js
          )
          (write-line "} else {" f-js)
          (write-line "    console.error(\"[ERROR] AutoCAD JavaScript API not detected.\");" 
                      f-js
          )
          (write-line "}" f-js)
          (close f-js)

          (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
        )
        (princ "\n[ERROR] Could not create Resource Palette JS injector file.")
      )

      (vla-EndUndoMark doc)
      (princ)
    )

    ;; Properties Palette Command
    (defun c:LC_PROPERTIES (/ doc loader-js f-js local-html) 
      (vl-load-com)
      (if (not (boundp '*LC-PROPERTIES-URL*)) 
        (setq *LC-PROPERTIES-URL* (strcat "https://lispcentral.web.app/properties-palette?token=" 
                                          *LC-SEAT-TOKEN*
                                          "&hwid="
                                          (LC:url-encode *LC-HWID*)
                                  )
        )
      )
      (setq doc (vla-get-activedocument (vlax-get-acad-object)))
      (princ "\n[⚙] Initializing Properties Palette...")

      (setq loader-js (strcat (getenv "TEMP") "\\\\LC_Prop_Loader.js"))
      (if (setq f-js (open loader-js "w")) 
        (progn 
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line "    try { Acad.Application.removePalette('LispCentral Properties'); } catch(e) {}" 
                      f-js
          )
          (setq local-html (LC:Create-Palette-Wrapper 
                             "LC_Prop_Wrapper.html"
                             *LC-PROPERTIES-URL*
                           )
          )
          (write-line 
            (strcat "    Acad.Application.addPalette(\"LispCentral Properties\", \"" 
                    local-html
                    "\");"
            )
            f-js
          )
          (write-line "    Acad.Editor.writeMessage(\"\\n[SUCCESS] Properties Palette is ready.\\n\");" 
                      f-js
          )
          (write-line "} else {" f-js)
          (write-line "    console.error(\"[ERROR] AutoCAD JavaScript API not detected.\");" 
                      f-js
          )
          (write-line "}" f-js)
          (close f-js)

          (command "_.WEBLOAD" "_L" loader-js)
        )
        (princ "\n[ERROR] Could not create Properties Palette JS injector file.")
      )
      (princ)
    )

    ;; Hard Reset Command to clear variables and force UI reload
    (defun c:LC_RESET () 
      (setq *LC-PALETTE-ACTIVE* nil)
      (setq *LC-PALETTE-URL* nil)
      (setq *LC-RESOURCE-ACTIVE* nil)
      (setq *LC-RESOURCE-URL* nil)
      (setq *LC-PROPERTIES-URL* nil)
      (setq *LC-FORCE-RELOAD* T)
      (princ "\n[LispCentral] Palette state reset.")
      (c:LC_PALETTE)
      (c:LC_RESOURCES)
      (c:LC_PROPERTIES)
      (setq *LC-FORCE-RELOAD* nil)
    )

    ;; Intuitive Command Aliases (Shortcuts)
    (defun c:LC_INSPECT () (c:LC_PALETTE))
    (defun c:LC () (c:LC_PALETTE))
    (defun c:PALETA () (c:LC_PALETTE))
    (defun c:PALETTE () (c:LC_PALETTE))

    (defun c:RECURSOS () (c:LC_RESOURCES))
    (defun c:HATCHES () (c:LC_RESOURCES))
    (defun c:LINHAS () (c:LC_RESOURCES))

    ;; Help Menu Command
    (defun c:LC_HELP () 
      (princ "\n")
      (princ "\n  ================================================================")
      (princ "\n                  LISPCENTRAL - AVAILABLE COMMANDS                ")
      (princ "\n  ================================================================")
      (princ "\n                                                                  ")
      (princ "\n  • LC / PALETA / LC_PALETTE .... Open Main Command Palette     ")
      (princ "\n  • LC_RES / RECURSOS ........... Open Resource Palette         ")
      (princ "\n  • LC_PROP / LC_PROPERTIES ..... Open Properties Palette       ")
      (princ "\n  • LC_RESET .................... Force reload all UI elements  ")
      (princ "\n  • LC_HELP ..................... Show this help menu           ")
      (princ "\n                                                                  ")
      (princ "\n  Tip: If you close a palette, type its command again to reopen.  ")
      (princ "\n                                                                  ")
      (princ "\n  ================================================================")
      (princ "\n")
      (princ)
    )

    ;; Run the Main Palette automatically on boot
    (c:LC_PALETTE)
    (princ "\n[LispCentral] Type 'LC' to open the palette, or 'LC_HELP' for more info.")