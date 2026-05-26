;;; =====================================================================================
;;; TM DIGITAL - GERADOR DE TELHADOS MVP (V4.2 - Final)
;;; Correções: Z-Vector Auto-Flip, SLICE Dinâmico com Alero, Persistência no Registro.
;;; =====================================================================================

(vl-load-com)

;;; --- FUNÇÕES AUXILIARES (VETORES E LISTAS) ---
(defun vec-sub (pA pB) (list (- (car pA) (car pB)) (- (cadr pA) (cadr pB)) (- (caddr pA) (caddr pB))))
(defun cross-product (vA vB)
  (list (- (* (cadr vA) (caddr vB)) (* (caddr vA) (cadr vB)))
        (- (* (caddr vA) (car vB)) (* (car vA) (caddr vB)))
        (- (* (car vA) (cadr vB)) (* (cadr vA) (car vB)))))

(defun ss-to-list (ss / i lst)
  (setq i 0 lst nil)
  (if ss (while (< i (sslength ss)) (setq lst (cons (ssname ss i) lst) i (1+ i))))
  (reverse lst)
)

;;; --- COMANDO PRINCIPAL ---
(defun c:TELHADO ( / dcl_id res old_osmode sel ent_edit is_edit tmd_params tmd_pts tmd_handles
                     reg_path get-reg set-reg
                     v_largura v_altura v_espaco v_corte e_espessura t_espessura ref_z 
                     a_esq a_dir a_inf a_sup v_dim_x v_dim_y v_duas_aguas
                     num_largura num_altura num_espaco num_entablado num_telha num_ref_z 
                     num_a_esq num_a_dir num_a_inf num_a_sup num_dim_x num_dim_y
                     p1 p2 p3 e1 e2 r v1 v2 norm dist_x dist_y current_x start_x end_x start_y end_y shift_z
                     ss_vigas ss_all pc_loc1 pc_loc2 pc_loc3 p_corte1 p_corte2 p_corte3 handles_list piece
                     pc_top1 pc_top2 pc_top3 p_cumeira1 p_cumeira2 p_cumeira3 ss_mirror pt1 pt2 pt3 e1_m e2_m r_m handles_m piece_m)

  (setq old_osmode (getvar "OSMODE"))
  (vl-cmdf "_.UCS" "_World") 

  ;; 1. MEMÓRIA DO SISTEMA (Registro do Windows)
  (setq reg_path "HKEY_CURRENT_USER\\Software\\TMDigital\\Telhados")
  (defun get-reg (k d / v) (setq v (vl-registry-read reg_path k)) (if v v d))
  (defun set-reg (k v) (vl-registry-write reg_path k v))

  ;; Carrega valores do sistema
  (setq v_largura (get-reg "v_largura" "50") v_altura (get-reg "v_altura" "150") v_espaco (get-reg "v_espaco" "600")
        v_corte (get-reg "v_corte" "1") e_espessura (get-reg "e_espessura" "15") t_espessura (get-reg "t_espessura" "50")
        ref_z (get-reg "ref_z" "1") a_esq (get-reg "a_esq" "0") a_dir (get-reg "a_dir" "0")
        a_inf (get-reg "a_inf" "0") a_sup (get-reg "a_sup" "0") v_dim_x (get-reg "v_dim_x" "3000") v_dim_y (get-reg "v_dim_y" "4000") v_duas_aguas "0")

  ;; 2. LEITURA DE ADN (EDIÇÃO OU NOVO)
  (setq is_edit nil)
  (princ "\n[TM Digital Telhados]")
  (setq sel (entsel "\nSelecione um Telhado para EDITAR ou pressione [ENTER] para NOVO: "))
  
  (if sel
    (progn
      (setq ent_edit (car sel))
      (setq tmd_params (vlax-ldata-get ent_edit "TMD_PARAMS"))
      (if tmd_params
        (progn
          (setq is_edit T)
          (setq tmd_pts (vlax-ldata-get ent_edit "TMD_PTS"))
          (setq tmd_handles (vlax-ldata-get ent_edit "TMD_HANDLES"))
          
          (setq v_largura (nth 0 tmd_params) v_altura (nth 1 tmd_params) v_espaco (nth 2 tmd_params)
                v_corte (nth 3 tmd_params) e_espessura (nth 4 tmd_params) t_espessura (nth 5 tmd_params)
                ref_z (nth 6 tmd_params) a_esq (nth 7 tmd_params) a_dir (nth 8 tmd_params)
                a_inf (nth 9 tmd_params) a_sup (nth 10 tmd_params) v_dim_x (nth 11 tmd_params) v_dim_y (nth 12 tmd_params))
        )
      )
    )
    (progn
      ;; NOVO: Pede 3 cliques
      (setvar "OSMODE" 39) 
      (setq p1 (getpoint "\n1. Linha da Base: Clique na quina inicial (Origem): "))
      (setq p2 (getpoint p1 "\n2. Linha da Base: Clique na quina da largura (Direção X): "))
      (setq p3 (getpoint p1 "\n3. Ponto no topo/cumeira (Profundidade Y): "))
      (setvar "OSMODE" 0)

      ;; AUTO-FLIP (Proteção contra cliques da Direita para Esquerda - Mantém Z pra cima)
      (setq v1 (vec-sub p2 p1) v2 (vec-sub p3 p1))
      (setq norm (cross-product v1 v2))
      (if (< (caddr norm) 0.0)
        (setq e1 p2 e2 p1 r p3) ; Inverte os pontos base matematicamente
        (setq e1 p1 e2 p2 r p3) ; Mantém normal
      )

      (vl-cmdf "_.UCS" "_3P" "_non" e1 "_non" e2 "_non" r)
      (setq dist_x (car (trans e2 0 1))) 
      (setq dist_y (cadr (trans r 0 1))) 
      (vl-cmdf "_.UCS" "_World") 
      
      (setq v_dim_x (rtos (abs dist_x) 2 1) v_dim_y (rtos (abs dist_y) 2 1))
    )
  )

  ;; 3. CARREGAR INTERFACE DCL
  (setq dcl_id (load_dialog "TejadoMVP.dcl"))
  (if (not (new_dialog "TejadoMVP_Main" dcl_id)) (exit))

  (set_tile "v_largura" v_largura) (set_tile "v_altura" v_altura) (set_tile "v_espaco" v_espaco)
  (set_tile "corte_prumo" v_corte) (set_tile "e_espessura" e_espessura) (set_tile "t_espessura" t_espessura)
  (set_tile "ref_z" ref_z) 
  (set_tile "a_esq" a_esq) (set_tile "a_dir" a_dir) (set_tile "a_inf" a_inf) (set_tile "a_sup" a_sup)
  (set_tile "dim_x" v_dim_x) (set_tile "dim_y" v_dim_y)
  (if is_edit (mode_tile "duas_aguas" 1))

  (action_tile "accept" 
    "(setq v_largura (get_tile \"v_largura\") v_altura (get_tile \"v_altura\") v_espaco (get_tile \"v_espaco\")
           v_corte (get_tile \"corte_prumo\") e_espessura (get_tile \"e_espessura\") t_espessura (get_tile \"t_espessura\")
           ref_z (get_tile \"ref_z\") a_esq (get_tile \"a_esq\") a_dir (get_tile \"a_dir\") a_inf (get_tile \"a_inf\") a_sup (get_tile \"a_sup\")
           v_dim_x (get_tile \"dim_x\") v_dim_y (get_tile \"dim_y\") v_duas_aguas (get_tile \"duas_aguas\"))
     (done_dialog 1)"
  )
  (action_tile "cancel" "(done_dialog 0)")
  (setq res (start_dialog))
  (unload_dialog dcl_id)

  ;; 4. EXECUÇÃO DO MOTOR GEOMÉTRICO
  (if (= res 1)
    (progn
      ;; Salva os dados no Sistema para a próxima execução
      (set-reg "v_largura" v_largura) (set-reg "v_altura" v_altura) (set-reg "v_espaco" v_espaco)
      (set-reg "v_corte" v_corte) (set-reg "e_espessura" e_espessura) (set-reg "t_espessura" t_espessura)
      (set-reg "ref_z" ref_z) (set-reg "a_esq" a_esq) (set-reg "a_dir" a_dir)
      (set-reg "a_inf" a_inf) (set-reg "a_sup" a_sup) (set-reg "v_dim_x" v_dim_x) (set-reg "v_dim_y" v_dim_y)

      (setq num_largura (atof v_largura) num_altura (atof v_altura) num_espaco (atof v_espaco)
            num_entablado (atof e_espessura) num_telha (atof t_espessura) num_ref_z (atoi ref_z)
            num_a_esq (atof a_esq) num_a_dir (atof a_dir) num_a_inf (atof a_inf) num_a_sup (atof a_sup)
            num_dim_x (atof v_dim_x) num_dim_y (atof v_dim_y))

      (if is_edit
        (progn
          (setq e1 (nth 0 tmd_pts) e2 (nth 1 tmd_pts) r (nth 2 tmd_pts))
          (foreach h tmd_handles (if (entget (handent h)) (entdel (handent h))))
        )
      )

      ;; Seta o UCS
      (vl-cmdf "_.UCS" "_3P" "_non" e1 "_non" e2 "_non" r)

      (setq start_x (- num_a_esq) end_x (+ num_dim_x num_a_dir)
            start_y (- num_a_inf) end_y (+ num_dim_y num_a_sup))

      (setq shift_z (cond ((= num_ref_z 0) (* -1.0 (+ num_entablado num_telha))) ((= num_ref_z 1) 0.0) ((= num_ref_z 2) num_altura)))
      (setq ss_vigas (ssadd) ss_all (ssadd))

      ;; GERAR CAIBROS
      (setq current_x start_x)
      (while (<= current_x (- end_x num_largura))
        (vl-cmdf "_.BOX" "_non" (list current_x start_y (+ shift_z 0.0)) "_non" (list (+ current_x num_largura) end_y (+ shift_z (* num_altura -1.0))))
        (ssadd (entlast) ss_vigas) (ssadd (entlast) ss_all)
        (setq current_x (+ current_x num_espaco))
      )
      (if (> (- end_x (+ (- current_x num_espaco) num_largura)) 1.0)
        (progn
          (vl-cmdf "_.BOX" "_non" (list (- end_x num_largura) start_y (+ shift_z 0.0)) "_non" (list end_x end_y (+ shift_z (* num_altura -1.0))))
          (ssadd (entlast) ss_vigas) (ssadd (entlast) ss_all)
        )
      )

      ;; ENTABLADO E TELHAS
      (vl-cmdf "_.BOX" "_non" (list start_x start_y (+ shift_z 0.0)) "_non" (list end_x end_y (+ shift_z num_entablado)))
      (ssadd (entlast) ss_all)
      (vl-cmdf "_.BOX" "_non" (list start_x start_y (+ shift_z num_entablado)) "_non" (list end_x end_y (+ shift_z (+ num_entablado num_telha))))
      (ssadd (entlast) ss_all)

      ;; CORTE A PRUMO NO BEIRAL INFERIOR (Calculado respeitando o Alero)
      (if (= v_corte "1")
        (progn
          (vl-cmdf "_.UCS" "_3P" "_non" e1 "_non" e2 "_non" r)
          (setq pc_loc1 (list 0.0 start_y 0.0) pc_loc2 (list 1.0 start_y 0.0) pc_loc3 (list 0.0 start_y -1.0))
          (vl-cmdf "_.UCS" "_World") 
          (setq p_corte1 (trans pc_loc1 1 0) p_corte2 (trans pc_loc2 1 0) p_corte3 (trans pc_loc3 1 0))
          (vl-cmdf "_.SLICE" ss_all "" "_3P" "_non" p_corte1 "_non" p_corte2 "_non" p_corte3 "_non" r)
        )
      )

      ;; CORTE VERTICAL NA CUMEIRA (A FACA INTELIGENTE)
      (vl-cmdf "_.UCS" "_3P" "_non" e1 "_non" e2 "_non" r)
      (setq pc_top1 (list 0.0 end_y 0.0) pc_top2 (list 1.0 end_y 0.0) pc_top3 (list 0.0 end_y -1.0))
      (vl-cmdf "_.UCS" "_World")
      (setq p_cumeira1 (trans pc_top1 1 0) p_cumeira2 (trans pc_top2 1 0) p_cumeira3 (trans pc_top3 1 0))
      (vl-cmdf "_.SLICE" ss_all "" "_3P" "_non" p_cumeira1 "_non" p_cumeira2 "_non" p_cumeira3 "_non" e1)
      
      ;; INJETAR ADN - ÁGUA 1
      (setq handles_list (mapcar '(lambda (x) (cdr (assoc 5 (entget x)))) (ss-to-list ss_all)))
      (setq tmd_params_list (list v_largura v_altura v_espaco v_corte e_espessura t_espessura ref_z a_esq a_dir a_inf a_sup v_dim_x v_dim_y))
      (foreach piece (ss-to-list ss_all)
        (vlax-ldata-put piece "TMD_PARAMS" tmd_params_list)
        (vlax-ldata-put piece "TMD_PTS" (list e1 e2 r))
        (vlax-ldata-put piece "TMD_HANDLES" handles_list)
      )
      (vl-cmdf "_.-GROUP" "_Create" "*" "TMD_Agua_1" ss_all "")

      ;; LÓGICA DE 2 ÁGUAS (ESPELHO)
      (if (= v_duas_aguas "1")
        (progn
          (vl-cmdf "_.UCS" "_World")
          (vl-cmdf "_.MIRROR3D" ss_all "" "_non" p_cumeira1 "_non" p_cumeira2 "_non" p_cumeira3 "_N")
          (setq ss_mirror (ssget "_P"))
          
          (vl-cmdf "_.POINT" "_non" e1) (setq pt1 (entlast))
          (vl-cmdf "_.POINT" "_non" e2) (setq pt2 (entlast))
          (vl-cmdf "_.POINT" "_non" r)  (setq pt3 (entlast))
          
          (vl-cmdf "_.MIRROR3D" pt1 pt2 pt3 "" "_non" p_cumeira1 "_non" p_cumeira2 "_non" p_cumeira3 "_Y")
          (setq e1_m (cdr (assoc 10 (entget pt1))) e2_m (cdr (assoc 10 (entget pt2))) r_m  (cdr (assoc 10 (entget pt3))))
          (entdel pt1) (entdel pt2) (entdel pt3)

          (setq handles_m (mapcar '(lambda (x) (cdr (assoc 5 (entget x)))) (ss-to-list ss_mirror)))
          (foreach piece_m (ss-to-list ss_mirror)
            (vlax-ldata-put piece_m "TMD_PARAMS" tmd_params_list)
            (vlax-ldata-put piece_m "TMD_PTS" (list e1_m e2_m r_m))
            (vlax-ldata-put piece_m "TMD_HANDLES" handles_m)
          )
          (vl-cmdf "_.-GROUP" "_Create" "*" "TMD_Agua_2" ss_mirror "")
        )
      )

      (vl-cmdf "_.UCS" "_World")
      (setvar "OSMODE" old_osmode)
      (princ "\n[TMD] Telhado processado com sucesso!")
    )
    (princ "\nComando cancelado.")
  )
  (princ)
)

(princ "\n[TM Digital] Tejado MVP V4.2 Carregado. Digite TELHADO.")
(princ)