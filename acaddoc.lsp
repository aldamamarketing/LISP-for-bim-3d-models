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

(foreach p (list *TMD-LISP-PATH-RAW* (vl-string-right-trim "/" *TMD-CUI-PATH*) (vl-string-right-trim "/" *TMD-ICON-PATH*))
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
    (princ (strcat "\n    [ERRO] Não encontrado: " file))
  )
)

;; 4. CARGA DE SISTEMAS BASE (Ordem Crítica)
(TMD:sys-load "TM_SetupCore.lsp")
(TMD:sys-load "TM_Setup.lsp")
(TMD:sys-load "TMD_Utils.lsp")

;; 5. MÓDULOS ESTRUTURAIS BIM (O Coração do Sistema)
(TMD:sys-load "TMD_Vigas.lsp")
(TMD:sys-load "TMD_Wires.lsp")
(TMD:sys-load "TMD_BUILD.lsp")
(TMD:sys-load "TMD_JOINTS.lsp")
(TMD:sys-load "TMD_MATCH.lsp")
(TMD:sys-load "TMD_Properties.lsp") ; Inspector
(TMD:sys-load "TMD_Palette_Bridge.lsp")
(TMD:sys-load "TMD_Tablas.lsp")
(TMD:sys-load "TMD_Align.lsp")
(TMD:sys-load "TMD_Groups.lsp")
(TMD:sys-load "TMD_Tags.lsp")
(TMD:sys-load "TMD_Niveis.lsp")
(TMD:sys-load "TMD_FACE_CUT.lsp")
(TMD:sys-load "TMD_SYNC.lsp")
(TMD:sys-load "TMD_CNC.lsp")
(TMD:sys-load "TMD_Teja_TR25.lsp")
(TMD:sys-load "TMD_Abas.lsp")

;; 6. MÓDULOS ARQUITETÔNICOS E AUXILIARES
(TMD:sys-load "AcmTools.lsp")
(TMD:sys-load "AcmMVP.lsp")
(TMD:sys-load "ParedeMVP.lsp")
(TMD:sys-load "PortaMVP.lsp")
(TMD:sys-load "TejadoMVP.lsp")
(TMD:sys-load "EstruturaMVP.lsp")
(TMD:sys-load "ColumnaACM.lsp")
(TMD:sys-load "ColumnaCorintia.lsp")
(TMD:sys-load "AbaParam.lsp")
(TMD:sys-load "AbaPerfil.lsp")
(TMD:sys-load "Gerar_Grelha.lsp")
(TMD:sys-load "CortarParedes.lsp")

;; 7. CARGA DO RIBBON (CUI PARCIAL)
(setq cui_file (if (setq flist (vl-directory-files *TMD-CUI-PATH* "TM_Projets.cuix" 1)) (strcat *TMD-CUI-PATH* (car flist)) nil))
(if (and cui_file (not (menugroup "TM_PROJETS"))) 
  (vl-cmdf "_.MENULOAD" cui_file)
)

(princ "\n")
(princ "\n**************************************************************")
(princ "\n*   TM DIGITAL - SISTEMA CORPORATIVO v4.2 (RED)             *")
(princ "\n*   Carga dinâmica via: ")(princ *TMD-BASE-PATH*)
(princ "\n**************************************************************")
(princ "\n")
(princ)
