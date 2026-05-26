;;; =====================================================================================
;;; TM DIGITAL - MÓDULO CNC / DESPIECE (TMD_CNC.lsp)
;;; Función: Lee los gemelos digitales usando el Estándar LData (Revit-Style)
;;;          y genera bandejas planas de corte y vinco.
;;; =====================================================================================

(vl-load-com)

(defun c:TMD_CNC ( / sel ent mod_name clase tipo params shape w h dev_w is_rolled faces_msg pt aba old_osmode pt_base )
  (princ "\nIniciando Módulo CNC (TM Digital)...")
  
  ;; 1. PREPARACIÓN DE LAS CAPAS (LAYERS) SEGURAS
  (if (not (tblsearch "LAYER" "TM_CNC_CORTE"))
    (command "_.-LAYER" "_Make" "TM_CNC_CORTE" "_Color" "1" "" "") ; Rojo
  )
  (if (not (tblsearch "LAYER" "TM_CNC_VINCO"))
    (command "_.-LAYER" "_Make" "TM_CNC_VINCO" "_Color" "2" "" "") ; Amarillo
  )

  ;; 2. SELECCIÓN DEL GEMELO DIGITAL
  (setq sel (entsel "\nSelecione um sólido TM Digital para gerar o plano CNC: "))
  (if sel
    (progn
      (setq ent (car sel))
      
      ;; 3. EXTRACCIÓN DE DATOS ESTILO REVIT (LDATA)
      (setq clase (vlax-ldata-get ent "TMD_CLASSE"))
      (setq tipo (vlax-ldata-get ent "TMD_TIPO"))
      (setq mod_name (vlax-ldata-get ent "TMD_NOME"))
      
      (if (not mod_name) (setq mod_name "Componente ACM"))
      
      ;; Llamada a la utilidad TMD_Utils.lsp para obtener el ADN (List de Asociación)
      (setq params (TMD:bim-get-adn ent))
      
      (if (and clase params)
        (progn
          ;; Extraer propiedades específicas de CNC desde la Lista (Assoc)
          (setq shape (cdr (assoc "SHAPE" params)))
          (setq w (cdr (assoc "W" params)))
          (setq h (cdr (assoc "H" params)))
          
          (if (not shape) (setq shape "CUADRADA")) ; Fallback temporal
          (if (not w) (setq w 500.0))
          (if (not h) (setq h 500.0))

          ;; 4. LÓGICA DE DESARROLLO (DESDOBRAMENTO)
          (setq dev_w w)
          (setq is_rolled nil)
          (setq faces_msg "")

          (cond
            ((= shape "CILINDRICA") 
             (setq dev_w (* pi w))
             (setq is_rolled T)
             (setq faces_msg " (Corte Único - Calandrar)")
            )
            ((= shape "CUADRADA") 
             (setq dev_w w)
             (setq faces_msg " (1 Face - Cortar 4x)")
            )
            ((= shape "OCTAGONAL") 
             (setq dev_w (* w 0.41421356))
             (setq faces_msg " (1 Face - Cortar 8x)")
            )
            (t
             (setq faces_msg " (Perímetro Lineal Plano)")
            )
          )

          (princ (strcat "\nExtraindo: " mod_name " (" shape ") | Desdobramento: " (rtos dev_w 2 1) " x " (rtos h 2 1) " mm" faces_msg))

          ;; 5. EXPERIENCIA DE USUARIO: PUNTO DE INSERCIÓN
          (setq pt (getpoint "\nClique no chão (Plano XY) para inserir a bandeja CNC: "))
          
          (if pt
            (progn
              (setq aba (getreal "\nMedida da aba de fixação em mm <25>: "))
              (if (not aba) (setq aba 25.0))

              (setq old_osmode (getvar "OSMODE"))
              (setvar "OSMODE" 0)
              (setq pt_base (list (car pt) (cadr pt) 0.0))

              ;; 6. DIBUJO DEL CORTE EXTERNO (Bandeja / Cassette)
              (setvar "CLAYER" "TM_CNC_CORTE")
              (command "_.PLINE"
                (list (car pt_base) (+ (cadr pt_base) aba))
                (list (car pt_base) (+ (cadr pt_base) h aba))
                (list (+ (car pt_base) aba) (+ (cadr pt_base) h aba))
                (list (+ (car pt_base) aba) (+ (cadr pt_base) h (* 2 aba)))
                (list (+ (car pt_base) dev_w aba) (+ (cadr pt_base) h (* 2 aba)))
                (list (+ (car pt_base) dev_w aba) (+ (cadr pt_base) h aba))
                (list (+ (car pt_base) dev_w (* 2 aba)) (+ (cadr pt_base) h aba))
                (list (+ (car pt_base) dev_w (* 2 aba)) (+ (cadr pt_base) aba))
                (list (+ (car pt_base) dev_w aba) (+ (cadr pt_base) aba))
                (list (+ (car pt_base) dev_w aba) (cadr pt_base))
                (list (+ (car pt_base) aba) (cadr pt_base))
                (list (+ (car pt_base) aba) (+ (cadr pt_base) aba))
                "_C"
              )

              ;; 7. DIBUJO DEL VINCO (Corte CNC intermedio)
              (if (not is_rolled)
                (progn
                  (setvar "CLAYER" "TM_CNC_VINCO")
                  (command "_.RECTANG"
                    (list (+ (car pt_base) aba) (+ (cadr pt_base) aba))
                    (list (+ (car pt_base) dev_w aba) (+ (cadr pt_base) h aba))
                  )
                )
              )

              (setvar "OSMODE" old_osmode)
              (setvar "CLAYER" "0")
              (princ "\n[TM Digital] Bandeja CNC gerada com sucesso!")
            )
          )
        )
        (alert "ERRO: O objeto selecionado não possui o ADN TM Digital (TMD_PARAMS).")
      )
    )
    (princ "\nComando cancelado.")
  )
  (princ)
)

(princ "\n[TM Digital] Módulo CNC Carregado. Digite TMD_CNC.")
(princ)