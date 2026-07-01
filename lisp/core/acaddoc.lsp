;;;=============================================================================
;;; acaddoc.lsp — Cargado automáticamente por AutoCAD al abrir cada DWG
;;; PRODUCCION: el Loader descarga los módulos y evalúa este archivo JIT.
;;; Los módulos LISP son compartidos entre documentos (namespace MDI global).
;;;=============================================================================

;;; --- 1. Cargar módulos core (idempotente: safe en cada nuevo documento) ---
;;; En producción, el Loader ya los habrá evaluado en memoria antes de esto.
;;; Esta sección es un fallback/garantía.
;;; (load "tmd_saas_extract_v2.lsp")
;;; (load "tmd_saas_apply_v2.lsp")
;;; (load "tmd_saas_audit_v2.lsp")

;;; --- 2. Abrir la paleta (idempotente: no recrea si ya existe) ---
;;; addPalette lanza excepción si el nombre ya está registrado.
;;; Esto garantiza que solo existe UNA instancia de la paleta, sin importar
;;; cuántos DWGs se abran en la sesión. El estado React se conserva.

(defun lc:open-palette ( / f-js loader-js palette-url token hwid)
  (vl-load-com)

  ;; Credenciales inyectadas por el Loader antes de ejecutar este archivo
  (if (not (boundp '*LC-SEAT-TOKEN*)) (setq *LC-SEAT-TOKEN* ""))
  (if (not (boundp '*LC-HWID*))       (setq *LC-HWID* ""))

  ;; URL de la paleta: en producción apunta al HTML en %TEMP%
  ;; El Loader habrá descargado saas-palette.html a TEMP antes de este punto
  (setq palette-url (strcat
    "file:///" (vl-string-translate "\\" "/" (getenv "TEMP"))
    "/LC_Standards/saas-palette.html"
    "?token=" *LC-SEAT-TOKEN*
    "&hwId="  *LC-HWID*
  ))

  ;; Inyectar via WEBLOAD: intenta crear, no-op si ya existe
  (setq loader-js (strcat (getenv "TEMP") "\\LC_Palette_Loader.js"))
  (setq f-js (open loader-js "w"))
  (if f-js
    (progn
      (write-line "if (typeof Acad !== 'undefined') {" f-js)
      (write-line "  try {" f-js)
      (write-line (strcat "    Acad.Application.addPalette('LispCentral', '" palette-url "');") f-js)
      (write-line "  } catch(e) {" f-js)
      ;; Paleta ya existe: no hacer nada. Estado React intacto.
      ;; Los comandos LISP operan sobre vla-get-activedocument automáticamente.
      (write-line "    // Palette exists: no-op. LISP functions operate on active document." f-js)
      (write-line "  }" f-js)
      (write-line "}" f-js)
      (close f-js)
      (command "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
    )
  )
  (princ)
)

(lc:open-palette)

;;; NOTA ARQUITECTURAL:
;;; - El namespace LISP en AutoCAD MDI es COMPARTIDO entre documentos.
;;; - tmd:extract-stds, tmd:apply-layer, etc. cargados con DWG 1
;;;   están disponibles cuando DWG 2 se activa. No hay que recargarlos.
;;; - Todas las funciones usan (vla-get-activedocument ...) que siempre
;;;   retorna el DWG activo en ese momento — inherentemente multi-documento.
;;; - FUTURO: vlr-document-reactor para notificar a la paleta el DWG activo.
