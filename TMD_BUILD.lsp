;;; =====================================================================================
;;; TM DIGITAL - MOTOR DE COMPILACIÓN BIM (TMD_BUILD.lsp)
;;; =====================================================================================
;;; v5.2.4 - Integración Estándar con TMD_Wires (Clasificación y Capas)
;;; =====================================================================================

(vl-load-com)

;; Carga de dependencias
(if (not TMD:sync-extract-rotation) (load "TMD_SYNC.lsp" nil))
(if (not TMD:wire-evaluate-vector) (load "TMD_Wires.lsp" nil))

;;; =====================================================================================
;;; 1. COMANDO PRINCIPAL
;;; =====================================================================================
(defun c:TMD_BUILD ( / ss i ent etype wire_list count w_ent)
  (princ "\n[BUILD] Iniciando compilación universal...")
  (setq ss (cadr (ssgetfirst)))
  (if (not ss) (setq ss (ssget '((0 . "LINE,3DSOLID")))))
  (if (not ss) (progn (princ "\n[!] Nenhuma entidade selecionada.") (exit)))

  (setq wire_list (list) i 0 count 0)
  (while (< i (sslength ss))
    (setq ent (ssname ss i) etype (cdr (assoc 0 (entget ent))))
    (cond
      ((= etype "LINE") (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE") (setq wire_list (cons ent wire_list))))
      ((= etype "3DSOLID") (if (vlax-ldata-get ent "TMD_NOME") (progn (setq w_ent (TMD:build-ensure-wire ent)) (if (and w_ent (not (member w_ent wire_list))) (setq wire_list (cons w_ent wire_list))))))
    )
    (setq i (1+ i))
  )

  (if (> (length wire_list) 0)
    (progn
      (setq *TMD-AUTO-JOINT* "Sim")
      (foreach w wire_list (TMD:build-single-wire w) (setq count (1+ count)))
      (princ (strcat "\n[BUILD] Finalizado: " (itoa count) " elementos."))
    )
    (princ "\n[!] Nenhum Wire válido encontrado.")
  )
  (princ)
)

;;; =====================================================================================
;;; 2. FUNCIÓN DE ASEGURAMIENTO (FASE FÉNIX) - INTEGRACIÓN WIRES
;;; =====================================================================================
(defun TMD:build-ensure-wire (s_ent / h_parent w_parent w_ent params p1 p2 s_cent s_bbox old_p1 old_p2 old_mid vec new_p1 new_p2 
                                     curr_h self_h is_clon just p_x p_y v_z v_x v_y 
                                     ati ati_z off1 off2 cutters tipo lay)
  (setq curr_h (vla-get-handle (vlax-ename->vla-object s_ent))
        self_h (vlax-ldata-get s_ent "TMD_SELF_HANDLE")
        is_clon (and self_h (/= curr_h self_h)))
  
  (setq h_parent (vlax-ldata-get s_ent "TMD_PARENT_WIRE")
        w_parent (if h_parent (handent h_parent) nil))
  
  (if (or is_clon (not w_parent) (not (entget w_parent)))
    (progn
      (princ (strcat "\n  [FÉNIX] Resucitando: " curr_h))
      (setq params (vlax-ldata-get s_ent "TMD_PARAMS"))
      
      (if (and params (setq old_p1 (cdr (assoc "PT_A" params))))
        (progn
          ;; 1. Entorno Actual
          (if (not TMD:niveis-get-ativo) (load "TMD_Niveis.lsp" nil))
          (setq ati (TMD:niveis-get-ativo) ati_z 0.0)
          (foreach lvl (TMD:niveis-get) (if (= (car lvl) ati) (setq ati_z (cadr lvl))))

          ;; 2. Posición por Justificación Reversa
          (setq s_bbox (TMD:sync-get-bbox s_ent)
                s_cent (list (/ (+ (car (car s_bbox)) (car (cadr s_bbox))) 2.0) 
                             (/ (+ (cadr (car s_bbox)) (cadr (cadr s_bbox))) 2.0) 
                             (/ (+ (caddr (car s_bbox)) (caddr (cadr s_bbox))) 2.0)))
          (setq old_p2 (cdr (assoc "PT_B" params))
                old_mid (list (/ (+ (car old_p1) (car old_p2)) 2.0) (/ (+ (cadr old_p1) (cadr old_p2)) 2.0) (/ (+ (caddr old_p1) (caddr old_p2)) 2.0)))
          (setq vec (mapcar '- s_cent old_mid)
                new_p1 (mapcar '+ old_p1 vec)
                new_p2 (mapcar '+ old_p2 vec))

          ;; 3. Evaluación de Tipo y Capa (Estándar TMD_Wires)
          (if (not TMD:wire-evaluate-vector) (load "TMD_Wires.lsp" nil))
          (setq tipo (TMD:wire-evaluate-vector new_p1 new_p2))
          (setq lay (strcat "WIRE-" tipo "S"))

          ;; 4. Engendrar Wire en Capa Correcta
          (if (not (tblsearch "LAYER" lay)) (vl-cmdf "_.-LAYER" "_M" lay ""))
          (setq w_ent (entmakex (list '(0 . "LINE") (cons 10 new_p1) (cons 11 new_p2) (cons 8 lay))))
          
          (if w_ent
            (progn
              (vlax-ldata-put w_ent "TMD_CLASSE" "ESTRUTURA_LINE")
              (vlax-ldata-put w_ent "TMD_PARAMS" params)
              (vlax-ldata-put w_ent "TMD_NOME" (vlax-ldata-get s_ent "TMD_NOME"))
              (vlax-ldata-put w_ent "TMD_TIPO" tipo)
              
              (setq off1 (- (caddr new_p1) ati_z) off2 (- (caddr new_p2) ati_z))
              (vlax-ldata-put w_ent "TMD_NIVEL_INI" ati)
              (vlax-ldata-put w_ent "TMD_NIVEL_FIM" ati)
              (vlax-ldata-put w_ent "TMD_AFASTAMENTO" (rtos off1 2 2))
              (vlax-ldata-put w_ent "TMD_AFASTAMENTO_TOPO" (rtos off2 2 2))
              
              (if (and w_parent (entget w_parent))
                (if (setq cutters (vlax-ldata-get w_parent "TMD_CUTTERS")) (vlax-ldata-put w_ent "TMD_CUTTERS" cutters)))
              
              (vlax-ldata-put w_ent "TMD_CHILD_SOLID" (vla-get-handle (vlax-ename->vla-object s_ent)))
              (vlax-ldata-put s_ent "TMD_PARENT_WIRE" (vla-get-handle (vlax-ename->vla-object w_ent)))
              (vlax-ldata-put w_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object w_ent)))
              (vlax-ldata-put s_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object s_ent)))
            )
          )
        )
      )
    )
    (setq w_ent w_parent)
  )
  w_ent
)

;;; =====================================================================================
;;; 3. NÚCLEO COMPILADOR
;;; =====================================================================================
(defun TMD:build-single-wire (ent / params p_nome ptA ptB p_forma p_x p_y p_e dist just rot lay solid_lay solid_ent old_solid_h old_solid real_rot ldata_rot)
  (if (and ent (entget ent) (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE"))
    (progn
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (if params
        (progn
          (setq old_solid_h (vlax-ldata-get ent "TMD_CHILD_SOLID"))
          (if (and old_solid_h (setq old_solid (handent old_solid_h)) (entget old_solid))
            (progn
              (if (and TMD:sync-extract-rotation (setq real_rot (TMD:sync-extract-rotation ent old_solid)))
                (progn
                  (setq ldata_rot (atof (vl-princ-to-string (cdr (assoc "ROTACAO" params)))))
                  (if (not (equal real_rot ldata_rot 1.0))
                    (progn
                      (princ (strcat "\n    [V] Sincronização de Pose: " (rtos real_rot 2 1) "°"))
                      (setq params (subst (cons "ROTACAO" real_rot) (assoc "ROTACAO" params) params))
                      (vlax-ldata-put ent "TMD_PARAMS" params)
                    )
                  )
                )
              )
              (entdel old_solid)
            )
          )
          
          (setq p_nome (vlax-ldata-get ent "TMD_NOME") e_data (entget ent)
                ptA (cdr (assoc 10 e_data)) ptB (cdr (assoc 11 e_data)) dist (distance ptA ptB)
                p_forma (cdr (assoc "FORMA" params)) p_x (cdr (assoc "DIM_X" params))
                p_y (cdr (assoc "DIM_Y" params)) p_e (cdr (assoc "ESPESSURA" params))
                just (cdr (assoc "JUSTIFICACAO" params)) rot (cdr (assoc "ROTACAO" params)))
          
          (setq lay (cdr (assoc 8 e_data)))
          (setq solid_lay (if (vl-string-search "WIRE-" lay) (vl-string-subst "06-" "WIRE-" lay) lay))
          (if (not (tblsearch "LAYER" solid_lay)) (vl-cmdf "_.-LAYER" "_M" solid_lay ""))
          
          (setq solid_ent (TMD:viga-build-geom nil ptA ptB just rot p_nome p_forma p_x p_y p_e 0.0 "ACO" dist))
          
          (if solid_ent
            (progn
              (vlax-ldata-put solid_ent "TMD_PARAMS" params)
              (vlax-ldata-put solid_ent "TMD_NOME" p_nome)
              (vlax-ldata-put solid_ent "TMD_TIPO" (vlax-ldata-get ent "TMD_TIPO"))
              (vlax-ldata-put solid_ent "TMD_NIVEL_INI" (vlax-ldata-get ent "TMD_NIVEL_INI"))
              (vlax-ldata-put solid_ent "TMD_NIVEL_FIM" (vlax-ldata-get ent "TMD_NIVEL_FIM"))
              (vlax-ldata-put solid_ent "TMD_AFASTAMENTO" (vlax-ldata-get ent "TMD_AFASTAMENTO"))
              (vlax-ldata-put solid_ent "TMD_AFASTAMENTO_TOPO" (vlax-ldata-get ent "TMD_AFASTAMENTO_TOPO"))
              
              (vlax-ldata-put solid_ent "TMD_PARENT_WIRE" (vla-get-handle (vlax-ename->vla-object ent)))
              (vlax-ldata-put ent "TMD_CHILD_SOLID" (vla-get-handle (vlax-ename->vla-object solid_ent)))
              (vlax-ldata-put ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object ent)))
              (vlax-ldata-put solid_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object solid_ent)))
            )
          )
        )
      )
    )
  )
)

(princ "\n[TMD] Motor BUILD v5.2.4 (Estándar Wires) Cargado.") (princ)
