;;;=============================================================================
;;; test_saas_palette.lsp — DEV ONLY: carga la paleta SaaS desde build local
;;;
;;; NO incluir en producción. El Loader de producción maneja la carga.
;;; Requiere que *LC-PROJECT-PATH* esté definido, o usa el default.
;;;=============================================================================

;; CONFIGURA ESTO si tu proyecto está en otra ruta:
(if (not (boundp '*LC-PROJECT-PATH*))
  (setq *LC-PROJECT-PATH*
    "C:/Users/TM PROJETOS/3D Objects/Projetos/LispCentral")
)

(defun c:TEST_SAAS_PALETTE (/ loader-js f-js palette-url)
  (vl-load-com)
  (c:TMD_LOAD_CORE)
  (princ "\n[⚙] Cargando SaaS Palette (modo DEV)...")

  ;; Token y HWID: usa globals si ya existen (definidos por el Loader real)
  (if (not (boundp '*LC-SEAT-TOKEN*)) (setq *LC-SEAT-TOKEN* "lc_key_test_dev"))
  (if (not (boundp '*LC-HWID*))       (setq *LC-HWID* "DEV-MACHINE"))

  ;; URL del HTML compilado localmente
  (setq palette-url (strcat
    "file:///"
    *LC-PROJECT-PATH*
    "/web/public/palette-builds/saas-palette.html"
    "?token=" *LC-SEAT-TOKEN*
    "&hwId="  *LC-HWID*
  ))

  ;; Prevent duplicate palettes across drawings using Application Blackboard
  (if (vl-bb-ref '*LC-SAAS-PALETTE-OPEN*)
    (progn
      (princ "\n[DEV] SaaS Palette ya esta activa en esta sesion de AutoCAD.")
      (princ)
    )
    (progn
      ;; Escribir el inyector JS en TEMP
      (setq loader-js (strcat (getenv "TEMP") "\\LC_Dev_Loader.js"))
  (setq f-js (open loader-js "w"))

  (if f-js
    (progn
      (write-line "if (typeof Acad !== 'undefined') {" f-js)
      ;; window._lcPaletteActive persiste en la sesión CEF de AutoCAD.
      ;; Es más confiable que depender del comportamiento de addPalette
      ;; (que varía entre versiones: 2021 puede no lanzar excepción).
      (write-line "  if (!window._lcPaletteActive) {" f-js)
      (write-line "    try {" f-js)
      ;; Intentar remover si existe (por si fue cerrada manualmente)
      (write-line "      try { Acad.Application.removePalette('SaaS Palette'); } catch(x) {}" f-js)
      (write-line (strcat "      Acad.Application.addPalette('SaaS Palette', '" palette-url "');") f-js)
      (write-line "      window._lcPaletteActive = true;" f-js)
      (write-line "      Acad.Editor.writeMessage('\\n[DEV] SaaS Palette created.\\n');" f-js)
      (write-line "    } catch(e) {" f-js)
      (write-line "      Acad.Editor.writeMessage('\\n[DEV ERROR] ' + e.message + '\\n');" f-js)
      (write-line "    }" f-js)
      (write-line "  } else {" f-js)
      (write-line "    Acad.Editor.writeMessage('\\n[DEV] SaaS Palette already active.\\n');" f-js)
      (write-line "  }" f-js)
      (write-line "} else {" f-js)
      (write-line "  console.error('[ERROR] AutoCAD JS API no disponible.');" f-js)
      (write-line "}" f-js)
      (close f-js)

      ;; Inyectar via WEBLOAD
      (command "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
      (vl-bb-set '*LC-SAAS-PALETTE-OPEN* T)
    )
    (princ "\n[ERROR] No se pudo crear el inyector JS.")
  )
  ) ;; End progn false branch
  ) ;; End if blackboard
  (princ)
)

;;;=============================================================================
;;; Carga de módulos core para testing local (simulando el JIT del Loader)
;;; En producción, el Loader los evalúa directamente desde la nube.
;;;=============================================================================

(defun c:TMD_LOAD_CORE (/ core-path)
  (setq core-path (strcat *LC-PROJECT-PATH* "/lisp/core/"))
  (load (strcat core-path "tmd_utils.lsp"))
  (load (strcat core-path "tmd_saas_extract_v2.lsp"))
  (load (strcat core-path "tmd_saas_apply_v2.lsp"))
  (load (strcat core-path "tmd_saas_audit_v2.lsp"))
  (princ "\n[DEV] Core LISP modules cargados en memoria.")
  (princ)
)

(defun c:RESET_SAAS_PALETTE (/ reset-js f)
  (vl-bb-set '*LC-SAAS-PALETTE-OPEN* nil)
  
  (setq reset-js (strcat (getenv "TEMP") "\\LC_Reset_Loader.js"))
  (setq f (open reset-js "w"))
  (if f
    (progn
      (write-line "if (typeof window !== 'undefined') window._lcPaletteActive = false;" f)
      (close f)
      (command "_.WEBLOAD" "_L" (strcat "\"" reset-js "\""))
    )
  )

  (princ "\n[DEV] Estado global reseteado. Ya puedes ejecutar TEST_SAAS_PALETTE de nuevo.")
  (princ)
)

(princ "\n[DEV] test_saas_palette.lsp listo.")
(princ "\n[DEV] Comandos disponibles: TEST_SAAS_PALETTE | TMD_LOAD_CORE | RESET_SAAS_PALETTE")
(princ)
