;;; =====================================================================================
;;; TM DIGITAL - GENERADOR BIM DE VIGAS (TMD_Vigas.lsp)
;;; V2.2 - Motor Centralizado + Interface Restaurada
;;; =====================================================================================

(vl-load-com)

;;; Variables Globales
(if (not *tmd_viga_just*) (setq *tmd_viga_just* "MC")) 
(if (not *tmd_viga_rot*) (setq *tmd_viga_rot* "0"))
(if (not *tmd_viga_nome*) (setq *tmd_viga_nome* ""))

;;; -------------------------------------------------------------------------------------
;;; 1. LECTURA Y ESCRITURA DE CATÁLOGO
;;; -------------------------------------------------------------------------------------

(defun TMD:viga-split-string (str delim / pos lst)
  (while (setq pos (vl-string-search delim str))
    (setq lst (cons (substr str 1 pos) lst))
    (setq str (substr str (+ pos 1 (strlen delim))))
  )
  (reverse (cons str lst))
)

(defun TMD:viga-csv-path ( / p)
  (setq p (findfile "catalogo_metal.csv"))
  (if p p (strcat (getvar "DWGPREFIX") "catalogo_metal.csv"))
)

(defun TMD:viga-load-catalog (/ f line catalog path hr item _x _y _e _l v_forma gen_name)
  (defun fmt (v)
    (setq v (vl-string-right-trim "0" (vl-princ-to-string (atof v))))
    (if (= (substr v (strlen v) 1) ".") (substr v 1 (1- (strlen v))) v)
  )

  (setq catalog nil path (TMD:viga-csv-path))
  (if (and path (setq f (open path "r")))
    (progn
      (setq hr (read-line f)) 
      (while (setq line (read-line f))
        (if (/= (vl-string-trim " \r\n" line) "")
          (progn
            (setq item (TMD:viga-split-string line ","))
            ;; Auto-Migração do catálogo antigo
            (cond
              ((= (length item) 6)
               (setq item (list (nth 0 item) (nth 1 item) (nth 2 item) (nth 3 item) (nth 4 item) "0.0" "ACO_CARBONO" (nth 5 item)))
              )
              ((and (= (length item) 8) (numberp (read (nth 6 item))))
               (setq item (list (nth 0 item) (nth 1 item) (nth 2 item) (nth 3 item) (nth 4 item) (nth 6 item) "ACO_CARBONO" (nth 7 item)))
              )
            )
            
            ;; [AUTO-FORMATADOR] Atualiza todos os nomes antigos para o novo padrão
            (setq v_forma (nth 1 item) _x (fmt (nth 2 item)) _y (fmt (nth 3 item)) _e (fmt (nth 4 item)) _l (fmt (nth 5 item)))
            (cond
              ((= v_forma "RECT_VAZIO") (setq gen_name (strcat "Metalon " _x "x" _y "x" _e " " (nth 6 item))))
              ((= v_forma "CIRC_VAZIO") (setq gen_name (strcat "Tubo Red. Ø" _x "x" _e " " (nth 6 item))))
              ((= v_forma "PERFIL_U") (setq gen_name (strcat "Perfil U " _y "x" _x "x" _e " " (nth 6 item))))
              ((= v_forma "PERFIL_C") (setq gen_name (strcat "Perfil C " _y "x" _x "x" _e " x" _l " " (nth 6 item))))
              ((= v_forma "PERFIL_I") (setq gen_name (strcat "Perfil I " _y "x" _x "x" _e " " (nth 6 item))))
            )
            (setq item (list gen_name (nth 1 item) (nth 2 item) (nth 3 item) (nth 4 item) (nth 5 item) (nth 6 item) (nth 7 item)))
            
            (setq catalog (append catalog (list item)))
          )
        )
      )
      (close f)
      (list "Nome,Forma,Dim_X,Dim_Y,Espessura,Labio,Material,Peso" catalog)
    )
    nil
  )
)

(defun TMD:viga-save-catalog (header catalog-items / path f)
  (setq path (TMD:viga-csv-path))
  (if path
    (progn
      (setq catalog-items 
        (vl-sort catalog-items 
          '(lambda (a b)
             (if (= (nth 1 a) (nth 1 b))
               (< (atof (nth 2 a)) (atof (nth 2 b)))
               (< (nth 1 a) (nth 1 b))
             )
           )
        )
      )
      (setq f (open path "w"))
      (write-line header f)
      (foreach item catalog-items
        (write-line (strcat (nth 0 item) "," (nth 1 item) "," (nth 2 item) "," (nth 3 item) "," (nth 4 item) "," (nth 5 item) "," (nth 6 item) "," (nth 7 item)) f)
      )
      (close f)
      catalog-items
    )
  )
)

(defun TMD:viga-parse-indices (str / l pos)
  (setq l nil)
  (while (setq pos (vl-string-search " " str))
    (setq l (append l (list (atoi (substr str 1 pos)))))
    (setq str (substr str (+ pos 1)))
  )
  (if (and str (/= str "")) (setq l (append l (list (atoi str)))))
  l
)

;;; -------------------------------------------------------------------------------------
;;; 2. MOTOR GEOMÉTRICO CENTRALIZADO (A FONTE DA VERDADE)
;;; -------------------------------------------------------------------------------------

;; [NUEVO] Generador de Envolvente para Juntas (Cutter)
(defun TMD:viga-build-envelope (pt_a pt_b just rot p_x p_y p_forma dist gap / cx cy x2 y2 ent_ghost)
  (if (not just) (setq just "MC"))
  (setq cx (cond ((vl-string-search "L" just) (/ p_x 2.0)) ((vl-string-search "R" just) (* -1.0 (/ p_x 2.0))) (t 0.0)))
  (setq cy (cond ((vl-string-search "B" just) (/ p_y 2.0)) ((vl-string-search "T" just) (* -1.0 (/ p_y 2.0))) (t 0.0)))
  
  (vl-cmdf "_.UCS" "_World")
  (if (> (distance pt_a pt_b) 0.01)
    (progn
      (vl-cmdf "_.UCS" "_ZAxis" "_non" pt_a "_non" pt_b)
      (if (and rot (/= rot 0.0)) (vl-cmdf "_.UCS" "_Z" rot))
      
      (setq x2 (/ p_x 2.0) y2 (/ p_y 2.0))
      
      (cond
        ((= p_forma "CIRC_VAZIO")
         (vl-cmdf "_.CYLINDER" "_non" (list cx cy 0.0) (+ x2 gap) dist)
        )
        (t ;; Para Rectangulares, U, C, I usamos el BOX envolvente
         (vl-cmdf "_.BOX" "_non" (list (- (+ (* -1.0 x2) cx) gap) (- (+ (* -1.0 y2) cy) gap) 0.0) 
                         "_non" (list (+ x2 cx gap) (+ y2 cy gap) dist))
        )
      )
      (setq ent_ghost (entlast))
      (vl-cmdf "_.UCS" "_World")
      ent_ghost
    )
    nil
  )
)

(defun TMD:viga-build-geom (ent_old pt_a pt_b just rot p_nome p_forma p_x p_y p_e p_labio p_material dist / 
                             ent_outer ent_inner cx cy x2 y2 e2 ent1 ent2 ent3 ent4 ent5 j2:bx j2:cyl nivel_global)
  
  ;; Offset de justificação (Centralizado MC se just não existir)
  (if (not just) (setq just "MC"))
  (setq cx (cond ((vl-string-search "L" just) (/ p_x 2.0)) ((vl-string-search "R" just) (* -1.0 (/ p_x 2.0))) (t 0.0)))
  (setq cy (cond ((vl-string-search "B" just) (/ p_y 2.0)) ((vl-string-search "T" just) (* -1.0 (/ p_y 2.0))) (t 0.0)))
  
  ;; Sincronização do Eixo Z Analítico
  (if (< (distance pt_a pt_b) 0.01)
    (progn 
      (princ "\n[!] ERRO: Distância entre pontos insuficiente para gerar sólido.")
      (setq ent_outer nil)
    )
    (progn
      (vl-cmdf "_.UCS" "_World")
      (vl-cmdf "_.UCS" "_ZAxis" "_non" pt_a "_non" pt_b)
      (if (and rot (/= rot 0.0)) (vl-cmdf "_.UCS" "_Z" rot))
    )
  )
  
  ;; Variáveis matemáticas puras
  (setq x2 (/ p_x 2.0) y2 (/ p_y 2.0) e2 (/ p_e 2.0))
  
  ;; Macro de União Geométrica 3D para translação offset
  (defun j2:bx (x1 y1 z1 x2_local y2_local z2)
    (vl-cmdf "_.BOX" "_non" (list (+ x1 cx) (+ y1 cy) z1) "_non" (list (+ x2_local cx) (+ y2_local cy) z2))
    (entlast)
  )
  (defun j2:cyl (r z h)
    (vl-cmdf "_.CYLINDER" "_non" (list cx cy z) r h)
    (entlast)
  )
  
  ;; Construção por Operações Booleanas
  (cond
    ((= p_forma "CIRC_VAZIO")
     (setq ent_outer (j2:cyl x2 0.0 dist))
     (if (> p_e 0)
       (progn
         (setq ent_inner (j2:cyl (- x2 p_e) -1.0 (+ dist 2.0)))
         (vl-cmdf "_.SUBTRACT" ent_outer "" ent_inner "") (setq ent_outer (entlast))
       )
     )
    )
    ((= p_forma "RECT_VAZIO")
     (setq ent_outer (j2:bx (* -1.0 x2) (* -1.0 y2) 0.0 x2 y2 dist))
     (if (> p_e 0)
       (progn
         (setq ent_inner (j2:bx (+ (* -1.0 x2) p_e) (+ (* -1.0 y2) p_e) -1.0 (- x2 p_e) (- y2 p_e) (+ dist 2.0)))
         (vl-cmdf "_.SUBTRACT" ent_outer "" ent_inner "") (setq ent_outer (entlast))
       )
     )
    )
    ((= p_forma "PERFIL_I")
     (setq ent1 (j2:bx (* -1.0 e2) (* -1.0 y2) 0.0 e2 y2 dist))
     (setq ent2 (j2:bx (* -1.0 x2) (* -1.0 y2) 0.0 x2 (+ (* -1.0 y2) p_e) dist))
     (setq ent3 (j2:bx (* -1.0 x2) (- y2 p_e) 0.0 x2 y2 dist))
     (vl-cmdf "_.UNION" ent1 ent2 ent3 "") (setq ent_outer (entlast))
    )
    ((= p_forma "PERFIL_U")
     ;; Assumimos a alma (web) na esquerda (* -1.0 x2)
     (setq ent1 (j2:bx (* -1.0 x2) (* -1.0 y2) 0.0 (+ (* -1.0 x2) p_e) y2 dist))
     (setq ent2 (j2:bx (+ (* -1.0 x2) p_e) (* -1.0 y2) 0.0 x2 (+ (* -1.0 y2) p_e) dist))
     (setq ent3 (j2:bx (+ (* -1.0 x2) p_e) (- y2 p_e) 0.0 x2 y2 dist))
     (vl-cmdf "_.UNION" ent1 ent2 ent3 "") (setq ent_outer (entlast))
    )
    ((= p_forma "PERFIL_C")
     ;; Alma (Costas)
     (setq ent1 (j2:bx (* -1.0 x2) (* -1.0 y2) 0.0 (+ (* -1.0 x2) p_e) y2 dist))
     ;; Abas
     (setq ent2 (j2:bx (+ (* -1.0 x2) p_e) (* -1.0 y2) 0.0 x2 (+ (* -1.0 y2) p_e) dist))
     (setq ent3 (j2:bx (+ (* -1.0 x2) p_e) (- y2 p_e) 0.0 x2 y2 dist))
     
     (if (and p_labio (> p_labio 0.0))
       (progn
         ;; Labios
         (setq ent4 (j2:bx (- x2 p_e) (+ (* -1.0 y2) p_e) 0.0 x2 (+ (* -1.0 y2) p_e p_labio) dist))
         (setq ent5 (j2:bx (- x2 p_e) (- y2 p_e p_labio) 0.0 x2 (- y2 p_e) dist))
         (vl-cmdf "_.UNION" ent1 ent2 ent3 ent4 ent5 "") (setq ent_outer (entlast))
       )
       (progn
         (vl-cmdf "_.UNION" ent1 ent2 ent3 "") (setq ent_outer (entlast))
       )
     )
    )
  )
  
  (vl-cmdf "_.UCS" "_World")
  
  (if ent_outer
    (progn
      (if (and ent_old (entget ent_old)) (entdel ent_old))
      (setq nivel_global (TMD:bim-get-reg "NIVEL_GLOBAL" "0.0"))
      (vlax-ldata-put ent_outer "TMD_CLASSE" "ESTRUTURA")
      (vlax-ldata-put ent_outer "TMD_TIPO" "VIGA")
      (vlax-ldata-put ent_outer "TMD_NOME" p_nome)
      (vlax-ldata-put ent_outer "TMD_NIVEL" (atof nivel_global))
      
      ;; Injetar o ADN 4.0
      (TMD:bim-set-adn ent_outer (list (cons "FORMA" p_forma) (cons "DIM_X" p_x) (cons "DIM_Y" p_y) (cons "ESPESSURA" p_e) (cons "LABIO" p_labio) (cons "MATERIAL" p_material) (cons "DISTANCIA" dist) (cons "JUSTIFICACAO" just) (cons "ROTACAO" rot) (cons "PT_A" pt_a) (cons "PT_B" pt_b)))
      
      (if (not (tblsearch "LAYER" "TMD-3D-MODEL"))
        (vl-cmdf "_.-LAYER" "_M" "TMD-3D-MODEL" "_C" 8 "" "")
      )
      (vl-cmdf "_.CHPROP" ent_outer "" "_LA" "TMD-3D-MODEL" "")
    )
  )
  ent_outer
)

;;; -------------------------------------------------------------------------------------
;;; 3. INTERFACE DE USUÁRIO (RESTAURADA)
;;; -------------------------------------------------------------------------------------

(defun TMD:viga-profile-editor (init_data / dcl_file file_handle dcl_id status res formas p_f)
  (setq dcl_file (vl-filename-mktemp "tmd_viga_edit.dcl"))
  (setq file_handle (open dcl_file "w"))
  (write-line "tmd_viga_edit : dialog { label = \"TMD - Editor de Perfil Metalico\"; " file_handle)
  (write-line "  : popup_list { label=\"Forma Geométrica:\"; key=\"p_forma\"; list=\"RECT_VAZIO\\nCIRC_VAZIO\\nPERFIL_U\\nPERFIL_C\\nPERFIL_I\"; }" file_handle)
  (write-line "  : row {" file_handle)
  (write-line "    : edit_box { label=\"Dim X (mm):\"; key=\"p_x\"; width = 10; }" file_handle)
  (write-line "    : edit_box { label=\"Dim Y (mm):\"; key=\"p_y\"; width = 10; }" file_handle)
  (write-line "    : edit_box { label=\"Espessura (mm):\"; key=\"p_e\"; width = 10; }" file_handle)
  (write-line "  }" file_handle)
  (write-line "  : row {" file_handle)
  (write-line "    : edit_box { label=\"Labio/Rig. (mm):\"; key=\"p_labio\"; width = 10; }" file_handle)
  (write-line "    : edit_box { label=\"Material:\"; key=\"p_material\"; width = 20; }" file_handle)
  (write-line "  }" file_handle)
  (write-line "  : edit_box { label=\"Peso kg/m (Opcional):\"; key=\"p_peso\"; width = 20; }" file_handle)
  (write-line "  ok_cancel; }" file_handle)
  (close file_handle)
  
  (setq dcl_id (load_dialog dcl_file))
  (if (not (new_dialog "tmd_viga_edit" dcl_id)) (exit))
  
  (setq formas (list "RECT_VAZIO" "CIRC_VAZIO" "PERFIL_U" "PERFIL_C" "PERFIL_I"))
  
  (defun tmd_check_labio (val)
    (if (= val "3")
      (mode_tile "p_labio" 0)
      (progn (set_tile "p_labio" "0.0") (mode_tile "p_labio" 1))
    )
  )
  
  (if init_data 
    (progn
      (set_tile "p_forma" (itoa (vl-position (nth 1 init_data) formas)))
      (set_tile "p_x" (vl-princ-to-string (nth 2 init_data)))
      (set_tile "p_y" (vl-princ-to-string (nth 3 init_data)))
      (set_tile "p_e" (vl-princ-to-string (nth 4 init_data)))
      (set_tile "p_labio" (vl-princ-to-string (nth 5 init_data)))
      (set_tile "p_material" (nth 6 init_data))
      (set_tile "p_peso" (vl-princ-to-string (nth 7 init_data)))
      (tmd_check_labio (itoa (vl-position (nth 1 init_data) formas)))
    )
    (progn
      (set_tile "p_forma" "0")
      (set_tile "p_x" "100.0")
      (set_tile "p_y" "100.0")
      (set_tile "p_e" "3.0")
      (set_tile "p_labio" "0.0")
      (set_tile "p_material" "ALUMINIO")
      (set_tile "p_peso" "0.0")
      (tmd_check_labio "0")
    )
  )
  
  (defun tmd_accept_profile ( / v_forma v_x v_y v_e v_l v_m _x _y _e _l gen_name)
    (setq v_forma (nth (atoi (get_tile "p_forma")) formas))
    (setq v_x (get_tile "p_x") v_y (get_tile "p_y") v_e (get_tile "p_e") v_l (get_tile "p_labio") v_m (get_tile "p_material"))
    
    (defun fmt (v)
      (setq v (vl-string-right-trim "0" (vl-princ-to-string (atof v))))
      (if (= (substr v (strlen v) 1) ".") (substr v 1 (1- (strlen v))) v)
    )
    (setq _x (fmt v_x) _y (fmt v_y) _e (fmt v_e) _l (fmt v_l))
    
    (cond
      ((= v_forma "RECT_VAZIO") (setq gen_name (strcat "Metalon " _x "x" _y "x" _e " " v_m)))
      ((= v_forma "CIRC_VAZIO") (setq gen_name (strcat "Tubo Red. Ø" _x "x" _e " " v_m)))
      ((= v_forma "PERFIL_U") (setq gen_name (strcat "Perfil U " _y "x" _x "x" _e " " v_m)))
      ((= v_forma "PERFIL_C") (setq gen_name (strcat "Perfil C " _y "x" _x "x" _e " x" _l " " v_m)))
      ((= v_forma "PERFIL_I") (setq gen_name (strcat "Perfil I " _y "x" _x "x" _e " " v_m)))
    )
    
    (setq res (list gen_name v_forma v_x v_y v_e v_l v_m (get_tile "p_peso")))
    (done_dialog 1)
  )
  
  (action_tile "p_forma" "(tmd_check_labio $value)")
  (action_tile "accept" "(tmd_accept_profile)")
  (action_tile "cancel" "(done_dialog 0)")
  
  (setq status (start_dialog)) 
  (unload_dialog dcl_id) 
  (vl-file-delete dcl_file)
  (if (> status 0) res nil)
)

(defun TMD:viga-main-ui ( / full_cat header cat_list dcl_file file_handle dcl_id status loop disp_list i new_data selected_idx filtros_str current_filter filtered_cat_list real_indices item)
  (setq full_cat (TMD:viga-load-catalog))
  (if (not full_cat) (progn (princ "\n[ERRO] catalogo_metal.csv no encontrado.") (exit)))
  (setq header (nth 0 full_cat) cat_list (nth 1 full_cat))
  
  ;; Auto-Save immediately to commit the formatted names to the disk
  (TMD:viga-save-catalog header cat_list)
  
  (setq dcl_file (vl-filename-mktemp "tmd_viga.dcl"))
  (setq file_handle (open dcl_file "w"))
  (write-line "tmd_viga_main : dialog { label = \"TMD - Catálogo BIM Estructural\"; " file_handle)
  (write-line "  : popup_list { label=\"Filtro de Categoría:\"; key=\"filtro_cat\"; list=\"Todos\\nRectangulares\\nCirculares\\nPerfil U\\nPerfil C\\nPerfil I\"; }" file_handle)
  (write-line "  : list_box { label=\"Perfiles Disponibles:\"; key=\"lst_cat\"; width=60; height=15; }" file_handle)
  (write-line "  : row {" file_handle)
  (write-line "    : button { label=\"Def. Viga\"; key=\"btn_viga\"; width=12; }" file_handle)
  (write-line "    : button { label=\"Def. Coluna\"; key=\"btn_coluna\"; width=12; }" file_handle)
  (write-line "    : button { label=\"Def. Diag.\"; key=\"btn_diag\"; width=12; }" file_handle)
  (write-line "  }" file_handle)
  (write-line "  : row {" file_handle)
  (write-line "    : button { label=\"Novo\"; key=\"btn_new\"; width=12; }" file_handle)
  (write-line "    : button { label=\"Editar\"; key=\"btn_edit\"; width=12; }" file_handle)
  (write-line "    : button { label=\"Aplicar >\"; key=\"btn_apply\"; width=12; is_default=true; }" file_handle)
  (write-line "  }" file_handle)
  (write-line "  ok_cancel; }" file_handle)
  (close file_handle)
  
  (setq loop T current_filter 0)
  (setq filtros_str (list "TODOS" "RECT_VAZIO" "CIRC_VAZIO" "PERFIL_U" "PERFIL_C" "PERFIL_I"))
  
  (while loop
    (setq dcl_id (load_dialog dcl_file))
    (if (not (new_dialog "tmd_viga_main" dcl_id)) (exit))
    
    (set_tile "filtro_cat" (itoa current_filter))
    
    (setq filtered_cat_list nil real_indices nil i 0)
    (foreach item cat_list
      (if (or (= current_filter 0) (= (nth 1 item) (nth current_filter filtros_str)))
        (progn
          (setq filtered_cat_list (append filtered_cat_list (list item)))
          (setq real_indices (append real_indices (list i)))
        )
      )
      (setq i (1+ i))
    )
    
    (setq disp_list nil)
    (foreach item filtered_cat_list 
      (setq disp_list (append disp_list (list (strcat (nth 0 item) " (" (nth 2 item) "x" (nth 3 item) "x" (nth 4 item) "mm)"))))
    )
    (start_list "lst_cat") (mapcar 'add_list disp_list) (end_list)
    (set_tile "lst_cat" "0")
    
    (action_tile "filtro_cat" "(setq current_filter (atoi $value)) (done_dialog 5)")
    
    (action_tile "btn_viga" "(setq selected_idx (nth (atoi (get_tile \"lst_cat\")) real_indices)) (setq *TMD_DEF_VIGA* (list (nth selected_idx cat_list) \"MC\" 0.0)) (alert (strcat \"Viga padrão: \" (car (nth selected_idx cat_list))))")
    (action_tile "btn_coluna" "(setq selected_idx (nth (atoi (get_tile \"lst_cat\")) real_indices)) (setq *TMD_DEF_COLUNA* (list (nth selected_idx cat_list) \"MC\" 0.0)) (alert (strcat \"Coluna padrão: \" (car (nth selected_idx cat_list))))")
    (action_tile "btn_diag" "(setq selected_idx (nth (atoi (get_tile \"lst_cat\")) real_indices)) (setq *TMD_DEF_DIAGONAL* (list (nth selected_idx cat_list) \"MC\" 0.0)) (alert (strcat \"Diagonal padrão: \" (car (nth selected_idx cat_list))))")
    
    (action_tile "btn_new" "(done_dialog 2)")
    (action_tile "btn_edit" "(setq selected_idx (nth (atoi (get_tile \"lst_cat\")) real_indices)) (done_dialog 3)")
    (action_tile "btn_apply" "(setq selected_idx (nth (atoi (get_tile \"lst_cat\")) real_indices)) (done_dialog 4)")
    (action_tile "cancel" "(done_dialog 0)")
    
    (setq status (start_dialog)) 
    (unload_dialog dcl_id)
    
    (cond
      ((= status 0) (setq loop nil))
      ((= status 5) (setq loop T))
      ((= status 2) 
        (setq new_data (TMD:viga-profile-editor nil))
        (if new_data
          (progn
            (setq cat_list (append cat_list (list new_data)))
            (setq cat_list (TMD:viga-save-catalog header cat_list))
          )
        )
      )
      ((= status 3)
        (setq new_data (TMD:viga-profile-editor (nth selected_idx cat_list)))
        (if new_data
          (progn
            (setq cat_list (subst new_data (nth selected_idx cat_list) cat_list))
            (setq cat_list (TMD:viga-save-catalog header cat_list))
          )
        )
      )
      ((= status 4)
        (if TMD:wire-apply-catalog
          (TMD:wire-apply-catalog (nth selected_idx cat_list))
        )
        (setq loop nil)
      )
    )
  )
  (vl-file-delete dcl_file)
  (princ)
)

(defun c:TMD_VIGAS () 
  (if (not TMD:util-help) (load "TMD_Utils.lsp" "\nErro: TMD_Utils.lsp não encontrado."))
  (TMD:viga-main-ui) 
  (princ)
)

(princ "\n[TMD] TMD_Vigas V2.2 Restaurado y Sincronizado.")
(princ)
