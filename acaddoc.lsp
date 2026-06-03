;;; =====================================================================================
;;; TM DIGITAL - CARGA AUTOMÁTICA CORPORATIVA v4.2 (NETWORK DEPLOYMENT)
;;; =====================================================================================

(vl-load-com)

(princ "\n[TM DIGITAL] Iniciando ambiente corporativo v4.2...")

;; 1. DETECÇÃO DINÂMICA DE REDE
;; Se existir a pasta Z:\Autocad Config\LISP, prioriza a rede corporal.
(if (vl-file-directory-p "Z:/Autocad Config/LISP")
  (setq *TMD-LISP-PATH-RAW* "Z:/Autocad Config/LISP")
  (progn
    (setq *TMD-LISP-PATH-RAW* (vl-filename-directory (findfile "acaddoc.lsp")))
    (if (not *TMD-LISP-PATH-RAW*) (setq *TMD-LISP-PATH-RAW* "Z:/Autocad Config/LISP")) ; Fallback
  )
)
 
(setq *TMD-BASE-PATH* (vl-filename-directory *TMD-LISP-PATH-RAW*)) ; Z:/Autocad Config
(setq *TMD-LISP-PATH* (strcat *TMD-LISP-PATH-RAW* "/"))
(setq *TMD-CUI-PATH*  (strcat *TMD-BASE-PATH* "/CUI/"))
(setq *TMD-ICON-PATH* (strcat *TMD-BASE-PATH* "/ICOS/"))

;; 2. INJEÇÃO DE RUTAS NO SUPORTE (Força AutoCAD a enxergar ICONES e DCLs na rede)
(setq acad_files (vla-get-files (vla-get-preferences (vlax-get-acad-object))))
(setq current_paths (vla-get-SupportPath acad_files))

(foreach p (list *TMD-LISP-PATH-RAW* 
                 (strcat *TMD-LISP-PATH-RAW* "/Suite_Sistema_Core")
                 (strcat *TMD-LISP-PATH-RAW* "/Suite_Arquitectura")
                 (strcat *TMD-LISP-PATH-RAW* "/Suite_Estructura")
                 (strcat *TMD-LISP-PATH-RAW* "/Suite_Topografia")
                 (strcat *TMD-LISP-PATH-RAW* "/Suite_Documentacion_BOM")
                 (vl-string-right-trim "/" *TMD-CUI-PATH*) 
                 (vl-string-right-trim "/" *TMD-ICON-PATH*))
  (if (and p (not (vl-string-search (strcase p) (strcase current_paths))))
    (setq current_paths (strcat p ";" current_paths))
  )
)
(vla-put-SupportPath acad_files current_paths)

;; 2.5 SEGURANÇA (Trusted Locations)
;; Silencia os avisos de segurança para a pasta da rede
(setq current_trusted (getvar "TRUSTEDPATHS"))
(setq tmd_trust (strcat *TMD-BASE-PATH* "/..."))
(if (not (vl-string-search (strcase tmd_trust) (strcase current_trusted)))
  (vl-catch-all-apply 'setvar (list "TRUSTEDPATHS" (strcat current_trusted ";" tmd_trust)))
)

;; 3. FUNÇÃO DE CARGA SEGURA
(defun TMD:sys-load (file / fullpath)
  (setq fullpath (strcat *TMD-LISP-PATH* file))
  (if (findfile fullpath)
    (progn (vl-catch-all-apply 'load (list fullpath)) (princ (strcat "\n    [OK] " file)))
    (princ (strcat "\n    [ERRO] Não encontrado: " fullpath))
  )
)

;; 4. CARGA DE SISTEMAS BASE (Ordem Crítica)
;;(TMD:sys-load "Suite_Sistema_Core/TM_SetupCore.lsp")
;;(TMD:sys-load "Suite_Sistema_Core/TM_Setup.lsp")
;;(TMD:sys-load "Suite_Sistema_Core/TMD_Utils.lsp")
;;(TMD:sys-load "Suite_Sistema_Core/TMD_Palette_Bridge.lsp")

;; 5. MÓDULOS ESTRUTURAIS BIM (O Coração do Sistema)
;;(TMD:sys-load "Suite_Estructura/TMD_Vigas.lsp")
;(TMD:sys-load "Suite_Estructura/TMD_Wires.lsp")
;(TMD:sys-load "Suite_Estructura/TMD_BUILD.lsp")
;(TMD:sys-load "Suite_Estructura/TMD_JOINTS.lsp")
;(TMD:sys-load "Suite_Estructura/TMD_FACE_CUT.lsp")
;(TMD:sys-load "Suite_Estructura/TMD_CNC.lsp")
;(TMD:sys-load "Suite_Estructura/TMD_Teja_TR25.lsp")
;(TMD:sys-load "Suite_Estructura/TMD_Abas.lsp")
;(TMD:sys-load "Suite_Estructura/TejadoMVP.lsp")
;(TMD:sys-load "Suite_Estructura/EstruturaMVP.lsp")
;(TMD:sys-load "Suite_Estructura/AbaParam.lsp")
;(TMD:sys-load "Suite_Estructura/AbaPerfil.lsp")
;(TMD:sys-load "Suite_Estructura/Gerar_Grelha.lsp")
;(TMD:sys-load "Suite_Estructura/LC_STEEL_DRAW.lsp")

;; 6. MÓDULOS ARQUITETÔNICOS E AUXILIARES
;(TMD:sys-load "Suite_Arquitectura/AcmTools.lsp")
;(TMD:sys-load "Suite_Arquitectura/AcmMVP.lsp")
;(TMD:sys-load "Suite_Arquitectura/ParedeMVP.lsp")
;(TMD:sys-load "Suite_Arquitectura/PortaMVP.lsp")
;(TMD:sys-load "Suite_Arquitectura/ColumnaACM.lsp")
;(TMD:sys-load "Suite_Arquitectura/ColumnaCorintia.lsp")
;(TMD:sys-load "Suite_Arquitectura/CortarParedes.lsp")
;(TMD:sys-load "Suite_Arquitectura/TMD_Align.lsp")
;(TMD:sys-load "Suite_Arquitectura/TMD_Groups.lsp")
;(TMD:sys-load "Suite_Arquitectura/LC_WALL_DRAW.lsp")


;; 6.5 MÓDULOS DE TOPOGRAFIA E DOCUMENTAÇÃO/BOM
;(TMD:sys-load "Suite_Topografia/LC_CUADRO_RUMBOS.lsp")
;(TMD:sys-load "Suite_Documentacion_BOM/TMD_BOM.lsp")
;(TMD:sys-load "Suite_Documentacion_BOM/TMD_Tablas.lsp")
;(TMD:sys-load "Suite_Documentacion_BOM/TMD_Tags.lsp")
;(TMD:sys-load "Suite_Documentacion_BOM/TMD_Niveis.lsp")
;(TMD:sys-load "Suite_Documentacion_BOM/TMD_MATCH.lsp")
;(TMD:sys-load "Suite_Documentacion_BOM/TMD_SYNC.lsp")
;(TMD:sys-load "Suite_Documentacion_BOM/LC_BOM_EXPORT.lsp")

;; 7. CARGA DO RIBBON (CUI PARCIAL)
(setq cui_file (if (setq flist (vl-directory-files *TMD-CUI-PATH* "TM_Projets.cuix" 1)) (strcat *TMD-CUI-PATH* (car flist)) nil))
(if (and cui_file (not (menugroup "TM_PROJETS"))) 
  (vl-cmdf "_.MENULOAD" cui_file)
)

;(princ "\n")
;(princ "\n**************************************************************")
;(princ "\n*   TM DIGITAL - SISTEMA CORPORATIVO v4.2 (RED)             *")
;(princ "\n*   Carga dinâmica via: ")(princ *TMD-BASE-PATH*)
;(princ "\n**************************************************************")
(princ "\n")
(princ)
