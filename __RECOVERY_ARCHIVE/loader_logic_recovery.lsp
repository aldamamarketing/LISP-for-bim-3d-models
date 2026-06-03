;; ==========================================================================
;; LISP CENTRAL - PALETTE LOADER (Singleton & Event Hub)
;; ==========================================================================

(vl-load-com)

;; --------------------------------------------------------------------------
;; EVENT HUB: Reactor de Cambio de Documento para Paletas Web (LC_SESSION_HUB)
;; --------------------------------------------------------------------------
(defun LC:DocChanged-Callback (reactor args / jsPath f)
  ;; args = (Document object)
  (setq jsPath (strcat (getvar "TEMP") "\\LC_DocEvent.js"))
  ;; Escribir script silente temporal
  (if (setq f (open jsPath "w"))
    (progn
      (write-line "(function(){ try { window.dispatchEvent(new Event('lc_context_changed')); } catch(e){} })();" f)
      (close f)
      ;; Ejecutar silente en todas las paletas web activas
      (vl-cmdf "_.WEBLOAD" jsPath)
    )
  )
  (princ)
)

(defun LC:Init-EventHub ()
  (if (not LC_SESSION_HUB)
    (progn
      (setq LC_SESSION_HUB (vlr-docmanager-reactor nil '((:vlr-documentBecameCurrent . LC:DocChanged-Callback))))
      (princ "\n[LispCentral] Event Hub Inicializado. Escuchando cambios de pestañas.")
    )
  )
  (princ)
)

;; --------------------------------------------------------------------------
;; SINGLETON Y COMANDOS DE APERTURA
;; --------------------------------------------------------------------------

;; Comando primario oculto (cargado en acaddoc)
(defun c:CP1 ( / url )
  (setq url "https://lispcentral.web.app") ; Reemplazar por URL local si aplica
  
  ;; Patrón Singleton: Revisar la pizarra global (Blackboard)
  (if (not (vl-bb-ref 'LC_PALETTE_LOADED))
    (progn
      ;; Asegurar que el entorno de paletas esté listo
      (if (not (eval 'c:COMMANDPALETTE))
        (vl-cmdf "_.COMMANDPALETTE")
      )
      
      ;; Inicializar el Hub de Eventos
      (LC:Init-EventHub)
      
      ;; Crear Paleta
      (vl-cmdf "_.WEBPALETTE" "_NEW" "LispCentral Hub" url)
      
      ;; Marcar globalmente como cargado
      (vl-bb-set 'LC_PALETTE_LOADED T)
      (princ "\n[LispCentral] Paleta asíncrona cargada con éxito.")
    )
    ;; Si ya existe, no creamos otra.
    (princ "\n[LispCentral] La paleta ya existe en la sesión de AutoCAD.")
  )
  (princ)
)

;; Comando de usuario para forzar visibilidad sin chequear Singleton
(defun c:LC_INSPECT ( / url)
  (setq url "https://lispcentral.web.app")
  (vl-cmdf "_.WEBPALETTE" "_NEW" "LispCentral Hub" url)
  (princ "\n[LispCentral] Forzando foco a la Paleta.")
  (princ)
)

(princ "\n[LispCentral] Loader instalado. Ejecute LC_INSPECT para abrir la paleta.")
(princ)
