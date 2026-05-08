;;; =====================================================================================
;;; TM DIGITAL - B.I.M INSPECTOR & PINCEL (V5.2.2)
;;; =====================================================================================
;;; v5.2.2 - Re-activación de Auto-Sanado (Guardian de integridad física)
;;; =====================================================================================

(vl-load-com)

;; Carga de dependencias
(if (not TMD:viga-load-catalog) (load "TMD_Vigas.lsp" "\nErro: TMD_Vigas.lsp não encontrado."))

;;; -------------------------------------------------------------------------------------
;;; COMANDO PRINCIPAL
;;; -------------------------------------------------------------------------------------
(defun c:TMD_PROPERTIES ( / sel mode)
  (princ "\n[BIM] Abrindo Inspector...")
  (setq sel (cadr (ssgetfirst))) 
  (if (not sel) (setq sel (ssget "_I"))) 
  
  (if (not sel)
    (setq mode 0) ; Modo 0: Pincel (Creación)
    (if (= (sslength sel) 1)
      (setq mode 1) ; Modo 1: Inspector (Edición Unica)
      (setq mode 2) ; Modo 2: Multi-Edición (Filtro)
    )
  )
  
  ;; [ACTIVO] Auto-Corrección: Garantiza que el LData coincida con la Z real del objeto.
  ;; Si el nivel cambió pero el objeto no se movió, el Inspector ajusta el desfase.
  (if (> mode 0) (TMD:prop-auto-correct-z sel))
  
  (TMD:prop-dialog-manager sel mode)
  (princ)
)

;;; -------------------------------------------------------------------------------------
;;; FUNCIÓN DE SANEADO: Sincronización de Realidad Física
;;; -------------------------------------------------------------------------------------
(defun TMD:prop-auto-correct-z (sel / i ent obj_type w_ent p1 p2 n_ini n_fim l_ini l_fim af_ini af_fim ph)
  (setq i 0)
  (while (< i (sslength sel))
    (setq ent (ssname sel i))
    (setq obj_type (cdr (assoc 0 (entget ent))))
    ;; Identificar el Wire padre (la línea analítica es la fuente de la verdad)
    (setq w_ent (if (= obj_type "LINE") ent (if (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE")) (handent ph) nil)))
    
    (if (and w_ent (entget w_ent))
      (progn
        (setq p1 (cdr (assoc 10 (entget w_ent))) p2 (cdr (assoc 11 (entget w_ent))))
        (setq n_ini (vlax-ldata-get w_ent "TMD_NIVEL_INI") n_fim (vlax-ldata-get w_ent "TMD_NIVEL_FIM"))
        (setq l_ini (TMD:prop-get-level-z n_ini) l_fim (TMD:prop-get-level-z n_fim))
        
        ;; Si el nivel existe, recalcular el desfase para que coincida con la posición física actual.
        (if l_ini 
          (progn (setq af_ini (- (caddr p1) l_ini)) (vlax-ldata-put w_ent "TMD_AFASTAMENTO" (rtos af_ini 2 2))))
        (if l_fim 
          (progn (setq af_fim (- (caddr p2) l_fim)) (vlax-ldata-put w_ent "TMD_AFASTAMENTO_TOPO" (rtos af_fim 2 2))))
      )
    )
    (setq i (1+ i))
  )
)

(defun TMD:prop-get-level-z (lvl_name / levels res)
  (if (or (not lvl_name) (= lvl_name "-"))
    nil
    (progn
      (setq levels (if TMD:niveis-get (TMD:niveis-get) nil))
      (setq res nil)
      (if levels (foreach l levels (if (= (car l) lvl_name) (setq res (cadr l)))))
      res
    )
  )
)

;;; [RESTAURADO] GESTOR DCL MAESTRO
(defun TMD:prop-dialog-manager (sel mode / dcl_file handle dcl_id status levels lvl_names just_list perf_list
                                           v_tipo v_perfil v_just v_rot v_nini v_afini v_nfim v_affim v_link
                                           lst_tipos full_cat cat_items
                                           idx_tipo idx_nini idx_nfim idx_just idx_perfil
                                           res_tipo res_nini res_nfim res_just res_afini res_affim res_rot res_link res_perfil)
                                           
  (setq levels (if TMD:niveis-get (TMD:niveis-get) nil))
  (setq lvl_names (list "-"))
  (if levels (foreach l levels (setq lvl_names (append lvl_names (list (car l))))))
  (setq just_list (list "TL" "TC" "TR" "ML" "MC" "MR" "BL" "BC" "BR"))
  
  (setq full_cat (TMD:viga-load-catalog))
  (if full_cat 
    (progn (setq cat_items (nth 1 full_cat)) (setq perf_list (mapcar 'car cat_items)))
    (setq perf_list (list "PADRÃO" "W150x13" "W200x15" "Metalon 40x20x1.5"))
  )
  
  (if (= mode 0)
    (progn
      (setq lst_tipos (list "VIGA" "COLUNA" "CONTRAVENTAMENTO"))
      (setq v_tipo (TMD:to-str (TMD:prop-get-pincel "TIPO" "VIGA")))
      (setq v_perfil (TMD:to-str (TMD:prop-get-pincel "PERFIL" "PADRÃO")))
      (setq v_just (TMD:to-str (TMD:prop-get-pincel "JUST" "MC")))
      (setq v_rot (TMD:to-str (TMD:prop-get-pincel "ROT" "0.0")))
      (setq v_nini (TMD:to-str (TMD:prop-get-pincel "N_INI" "-")))
      (setq v_afini (TMD:to-str (TMD:prop-get-pincel "AF_INI" "0.00")))
      (setq v_nfim (TMD:to-str (TMD:prop-get-pincel "N_FIM" "-")))
      (setq v_affim (TMD:to-str (TMD:prop-get-pincel "AF_FIM" "0.00")))
      (setq v_link (TMD:to-str (TMD:prop-get-pincel "LINK" "1")))
    )
    (progn
      (if (= mode 1)
        (setq lst_tipos (list (TMD:prop-get-common sel "TMD_TIPO" "VIGA")))
        (setq lst_tipos (list "TODOS" "VIGA" "COLUNA" "CONTRAVENTAMENTO"))
      )
      (setq v_tipo (TMD:to-str (if (= mode 1) (nth 0 lst_tipos) "TODOS")))
      (setq v_perfil (TMD:to-str (TMD:prop-get-common sel "TMD_NOME" "PADRÃO")))
      (setq v_just (TMD:to-str (TMD:prop-get-common sel "TMD_JUSTIFICACAO" "MC")))
      (setq v_rot (TMD:to-str (TMD:prop-get-common sel "TMD_ROTACAO" "0.0")))
      (setq v_nini (TMD:to-str (TMD:prop-get-common sel "TMD_NIVEL_INI" "-")))
      (setq v_afini (TMD:to-str (TMD:prop-get-common sel "TMD_AFASTAMENTO" "0.00")))
      (setq v_nfim (TMD:to-str (TMD:prop-get-common sel "TMD_NIVEL_FIM" "-")))
      (setq v_affim (TMD:to-str (TMD:prop-get-common sel "TMD_AFASTAMENTO_TOPO" "0.00")))
      (if (= v_afini v_affim) (setq v_link "1") (setq v_link "0"))
      (if (= v_tipo "COLUNA") (setq v_link "0"))
    )
  )
  
  (if (and v_perfil (/= v_perfil "") (not (member v_perfil perf_list))) (setq perf_list (cons v_perfil perf_list)))

  (setq dcl_file (vl-filename-mktemp "tmd_prop.dcl"))
  (setq handle (open dcl_file "w"))
  (write-line "tmd_prop_v5 : dialog { label = \"TM Digital - B.I.M Inspector (v5.2.2)\"; " handle)
  (write-line "  : popup_list { label = \"Filtro / Tipo:\"; key = \"cbo_tipo\"; }" handle)
  (write-line "  : boxed_column { label = \"Níveis (Z)\";" handle)
  (write-line "    : popup_list { label = \"Nível Topo:\"; key = \"cbo_niv_topo\"; }" handle)
  (write-line "    : edit_box { label = \"Afastamento Topo (mm):\"; key = \"eb_af_topo\"; width=15;}" handle)
  (write-line "    : toggle { label = \"Vincular Base (Vigas planas)\"; key = \"chk_link\"; }" handle)
  (write-line "    : popup_list { label = \"Nível Base:\"; key = \"cbo_niv_base\"; }" handle)
  (write-line "    : edit_box { label = \"Afastamento Base (mm):\"; key = \"eb_af_base\"; width=15;}" handle)
  (write-line "  }" handle)
  (write-line "  : boxed_column { label = \"Propriedades Físicas\";" handle)
  (write-line "    : popup_list { label = \"Perfil Real (Catálogo):\"; key = \"cbo_perfil\"; }" handle)
  (write-line "    : popup_list { label = \"Justificação:\"; key = \"cbo_just\"; }" handle)
  (write-line "    : row { " handle)
  (write-line "      : edit_box { label = \"Rotação (°):\"; key = \"eb_rot\"; width=15;}" handle)
  (write-line "      : button { label = \"Rotacionar +90°\"; key = \"btn_rot90\"; }" handle)
  (write-line "    }" handle)
  (write-line "  }" handle)
  (write-line "  : row { : button { label=\"Aplicar e Sincronizar\"; key=\"accept\"; is_default=true; } cancel_button; }" handle)
  (write-line "}" handle)
  (close handle)

  (setq dcl_id (load_dialog dcl_file))
  (if (not (new_dialog "tmd_prop_v5" dcl_id)) (exit))

  (start_list "cbo_tipo") (mapcar 'add_list lst_tipos) (end_list)
  (start_list "cbo_niv_base") (mapcar 'add_list lvl_names) (end_list)
  (start_list "cbo_niv_topo") (mapcar 'add_list lvl_names) (end_list)
  (start_list "cbo_just") (mapcar 'add_list just_list) (end_list)
  (start_list "cbo_perfil") (mapcar 'add_list perf_list) (end_list)

  (TMD:prop-set-list-index "cbo_tipo" lst_tipos v_tipo)
  (TMD:prop-set-list-index "cbo_niv_base" lvl_names v_nini)
  (TMD:prop-set-list-index "cbo_niv_topo" lvl_names v_nfim)
  (TMD:prop-set-list-index "cbo_just" just_list v_just)
  (TMD:prop-set-list-index "cbo_perfil" perf_list v_perfil)
  
  (set_tile "eb_af_base" v_afini) (set_tile "eb_af_topo" v_affim) (set_tile "eb_rot" v_rot) (set_tile "chk_link" v_link)
  
  (if (= mode 1) (mode_tile "cbo_tipo" 1))
  (action_tile "chk_link" "(TMD:prop-ui-link-toggle $value)")
  (action_tile "btn_rot90" "(TMD:prop-ui-rot-add)")
  (action_tile "accept" "(progn (setq idx_tipo (get_tile \"cbo_tipo\")) (setq idx_nini (get_tile \"cbo_niv_base\")) (setq idx_nfim (get_tile \"cbo_niv_topo\")) (setq idx_just (get_tile \"cbo_just\")) (setq idx_perfil (get_tile \"cbo_perfil\")) (setq res_afini (get_tile \"eb_af_base\")) (setq res_affim (get_tile \"eb_af_topo\")) (setq res_rot (get_tile \"eb_rot\")) (setq res_link (get_tile \"chk_link\")) (done_dialog 1))")
  (action_tile "cancel" "(done_dialog 0)")
  
  (setq status (start_dialog))
  (unload_dialog dcl_id) (vl-file-delete dcl_file)

  (if (= status 1)
    (progn
      (setq res_tipo (nth (atoi idx_tipo) lst_tipos))
      (setq res_nini (nth (atoi idx_nini) lvl_names))
      (setq res_nfim (nth (atoi idx_nfim) lvl_names))
      (setq res_just (nth (atoi idx_just) just_list))
      (setq res_perfil (nth (atoi idx_perfil) perf_list))
      (if (= mode 0)
        (progn
          (vlax-ldata-put "dict_TMDigital" "PINCEL_TIPO" res_tipo)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_PERFIL" res_perfil)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_JUST" res_just)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_ROT" res_rot)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_N_INI" res_nini)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_AF_INI" res_afini)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_LINK" res_link)
          (if (= res_link "1") (progn (vlax-ldata-put "dict_TMDigital" "PINCEL_N_FIM" res_nini) (vlax-ldata-put "dict_TMDigital" "PINCEL_AF_FIM" res_afini)) (progn (vlax-ldata-put "dict_TMDigital" "PINCEL_N_FIM" res_nfim) (vlax-ldata-put "dict_TMDigital" "PINCEL_AF_FIM" res_affim)))
          (vla-sendcommand (vla-get-activedocument (vlax-get-acad-object)) "TMD_WIRES_PINCEL ")
        )
        (TMD:prop-apply-changes sel res_tipo res_perfil res_just res_rot res_nini res_afini res_nfim res_affim res_link cat_items)
      )
    )
  )
)

;;; [RESTAURADO] APLICADOR Y HELPERS
(defun TMD:prop-apply-changes (sel f_tipo perfil just rot nini afini nfim affim link cat_items / i ent obj_type w_ent t_tipo needs_rebuild p_dict item old_p1 old_p2 p1 p2 curr_nini curr_afini l_z1 l_z2 curr_nfim curr_affim delta_z1 delta_z2 v_obj solid_h s_ent ph)
  (setq i 0)
  (while (< i (sslength sel))
    (setq ent (ssname sel i))
    (setq obj_type (cdr (assoc 0 (entget ent))))
    (setq w_ent (if (= obj_type "LINE") ent (if (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE")) (handent ph) nil)))
    (if (and w_ent (entget w_ent))
      (progn
        (setq t_tipo (vlax-ldata-get w_ent "TMD_TIPO"))
        (if (or (= f_tipo "TODOS") (= f_tipo t_tipo))
          (progn
            (setq needs_rebuild nil)
            (if (and perfil (not (vl-string-search "*Varios*" perfil))) 
              (if (/= perfil (vlax-ldata-get w_ent "TMD_NOME"))
                (progn (setq item (assoc perfil cat_items)) (if item (progn (vlax-ldata-put w_ent "TMD_NOME" (nth 0 item)) (setq p_dict (list (cons "FORMA" (nth 1 item)) (cons "DIM_X" (atof (vl-princ-to-string (nth 2 item)))) (cons "DIM_Y" (atof (vl-princ-to-string (nth 3 item)))) (cons "ESPESSURA" (atof (vl-princ-to-string (nth 4 item)))) (cons "LABIO" (atof (vl-princ-to-string (nth 5 item)))) (cons "MATERIAL" (nth 6 item)) (cons "JUSTIFICACAO" just) (cons "ROTACAO" (atof rot)) (cons "PT_A" (cdr (assoc 10 (entget w_ent)))) (cons "PT_B" (cdr (assoc 11 (entget w_ent)))))) (vlax-ldata-put w_ent "TMD_PARAMS" p_dict) (setq needs_rebuild T))))))
            (if (and just (not (vl-string-search "*Varios*" just)) (/= just (vlax-ldata-get w_ent "TMD_JUSTIFICACAO"))) (progn (vlax-ldata-put w_ent "TMD_JUSTIFICACAO" just) (setq needs_rebuild T)))
            (if (and rot (not (vl-string-search "*Varios*" rot)) (/= rot (vlax-ldata-get w_ent "TMD_ROTACAO"))) (progn (vlax-ldata-put w_ent "TMD_ROTACAO" rot) (setq needs_rebuild T)))
            (vlax-ldata-put w_ent "TMD_NIVEL_INI" nini) (vlax-ldata-put w_ent "TMD_AFASTAMENTO" afini)
            (if (= link "1") (progn (vlax-ldata-put w_ent "TMD_NIVEL_FIM" nini) (vlax-ldata-put w_ent "TMD_AFASTAMENTO_TOPO" afini)) (progn (vlax-ldata-put w_ent "TMD_NIVEL_FIM" nfim) (vlax-ldata-put w_ent "TMD_AFASTAMENTO_TOPO" affim)))
            (setq old_p1 (cdr (assoc 10 (entget w_ent))) old_p2 (cdr (assoc 11 (entget w_ent))) p1 old_p1 p2 old_p2)
            (setq curr_nini (vlax-ldata-get w_ent "TMD_NIVEL_INI") curr_afini (vlax-ldata-get w_ent "TMD_AFASTAMENTO") l_z1 (TMD:prop-get-level-z curr_nini)) (if l_z1 (setq p1 (list (car p1) (cadr p1) (+ l_z1 (atof curr_afini)))))
            (setq curr_nfim (vlax-ldata-get w_ent "TMD_NIVEL_FIM") curr_affim (vlax-ldata-get w_ent "TMD_AFASTAMENTO_TOPO") l_z2 (TMD:prop-get-level-z curr_nfim)) (if l_z2 (setq p2 (list (car p2) (cadr p2) (+ l_z2 (atof curr_affim)))))
            (setq delta_z1 (- (caddr p1) (caddr old_p1)) delta_z2 (- (caddr p2) (caddr old_p2))) (if (> (abs (- delta_z1 delta_z2)) 0.001) (setq needs_rebuild T))
            (if needs_rebuild (progn (setq e_data (entget w_ent)) (setq e_data (subst (cons 10 p1) (assoc 10 e_data) e_data)) (setq e_data (subst (cons 11 p2) (assoc 11 e_data) e_data)) (entmod e_data) (entupd w_ent) (setq p_dict (vlax-ldata-get w_ent "TMD_PARAMS")) (if p_dict (progn (setq p_dict (subst (cons "PT_A" p1) (assoc "PT_A" p_dict) p_dict)) (setq p_dict (subst (cons "PT_B" p2) (assoc "PT_B" p_dict) p_dict)) (vlax-ldata-put w_ent "TMD_PARAMS" p_dict))) (if TMD:build-single-wire (TMD:build-single-wire w_ent))) (if (> (abs delta_z1) 0.001) (progn (setq v_obj (vlax-ename->vla-object w_ent)) (vla-Move v_obj (vlax-3d-point '(0 0 0)) (vlax-3d-point (list 0 0 delta_z1))) (setq solid_h (vlax-ldata-get w_ent "TMD_CHILD_SOLID")) (if (and solid_h (setq s_ent (handent solid_h)) (entget s_ent)) (vla-Move (vlax-ename->vla-object s_ent) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list 0 0 delta_z1)))) (setq p_dict (vlax-ldata-get w_ent "TMD_PARAMS")) (if p_dict (progn (setq p_dict (subst (cons "PT_A" p1) (assoc "PT_A" p_dict) p_dict)) (setq p_dict (subst (cons "PT_B" p2) (assoc "PT_B" p_dict) p_dict)) (vlax-ldata-put w_ent "TMD_PARAMS" p_dict))))))
          )
        )
      )
    )
    (setq i (1+ i))
  )
)

(defun TMD:to-str (v) (cond ((not v) "") ((= (type v) 'STR) v) ((= (type v) 'REAL) (rtos v 2 2)) (t (vl-princ-to-string v))))

(defun TMD:prop-get-common (sel k d / i e v f m obj_type w_ent ph) 
  (setq i 0 m nil f nil) 
  (while (< i (sslength sel)) 
    (setq e (ssname sel i) obj_type (cdr (assoc 0 (entget e))) w_ent (if (= obj_type "LINE") e (if (setq ph (vlax-ldata-get e "TMD_PARENT_WIRE")) (handent ph) nil)))
    (if (and w_ent (entget w_ent)) (progn (setq v (vlax-ldata-get w_ent k)) (if (not v) (setq v d)) (if (= i 0) (setq f v) (if (not (equal v f)) (setq m T)))))
    (setq i (1+ i))
  ) 
  (if m "*Varios*" (if f f d))
)

(defun TMD:prop-get-pincel (k d) (setq v (vlax-ldata-get "dict_TMDigital" (strcat "PINCEL_" k))) (if v v d))

(defun TMD:prop-set-list-index (tile lst val / i idx) 
  (setq idx "0" i 0) 
  (if (and val (not (vl-string-search "*Varios*" val))) 
    (foreach it lst (if (= it val) (setq idx (itoa i))) (setq i (1+ i)))
  ) 
  (set_tile tile idx)
)

(defun TMD:prop-ui-link-toggle (v) (mode_tile "cbo_niv_topo" (if (= v "1") 1 0)) (mode_tile "eb_af_topo" (if (= v "1") 1 0)))

(defun TMD:prop-ui-rot-add (/ cur_rot new_rot cur_idx_just cur_just new_just lst) (setq cur_rot (atof (get_tile "eb_rot")) new_rot (+ cur_rot 90.0)) (if (>= new_rot 360.0) (setq new_rot (- new_rot 360.0))) (set_tile "eb_rot" (rtos new_rot 2 0)) (setq lst '("TL" "TC" "TR" "ML" "MC" "MR" "BL" "BC" "BR") cur_idx_just (atoi (get_tile "cbo_just")) cur_just (nth cur_idx_just lst)) (if (not TMD:wire-get-smart-just) (load "TMD_Wires.lsp")) (setq new_just (if TMD:wire-get-smart-just (TMD:wire-get-smart-just cur_just) cur_just)) (TMD:prop-set-list-index "cbo_just" lst new_just))

(princ "\n[TM Digital] TMD_Properties v5.2.2 Cargado.") (princ)
