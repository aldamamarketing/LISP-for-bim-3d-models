;;; =====================================================================================
;;; TM DIGITAL - GERADOR DE ACM (V2.2 - BLINDAGEM E ROTAÇÃO DE VEIO)
;;; =====================================================================================

(vl-load-com)

(if (not *tmd_acm_preview_ss*) (setq *tmd_acm_preview_ss* (ssadd)))

;;; --- UTILITÁRIOS ---
(defun tmd-ceiling (val) (if (= val (fix val)) (fix val) (+ (fix val) 1)))

(defun tmd-calc-fit-per-sheet (flat_w flat_h)
  (setq fit1 (* (fix (/ 1220.0 flat_w)) (fix (/ 5000.0 flat_h))))
  (setq fit2 (* (fix (/ 1220.0 flat_h)) (fix (/ 5000.0 flat_w))))
  (max fit1 fit2)
)

(defun tmd-acm-get-registry ( / reg_path)
  (setq reg_path "HKEY_CURRENT_USER\\Software\\TMDigital\\ACM")
  (setq *tmd_acm_vals* (list 
    (vl-registry-read reg_path "b_largura") (vl-registry-read reg_path "b_altura")
    (vl-registry-read reg_path "b_dobra") (vl-registry-read reg_path "b_fuga")
    (vl-registry-read reg_path "lst_just_h") (vl-registry-read reg_path "lst_just_v")
    (vl-registry-read reg_path "b_retorno") (vl-registry-read reg_path "lst_modo")
    (vl-registry-read reg_path "lst_veio")
  ))
  ;; Valores Iniciais Seguros
  (if (not (nth 0 *tmd_acm_vals*)) (setq *tmd_acm_vals* '("1200" "3000" "30" "15" "1" "1" "100" "0" "0")))
  (if (not (nth 7 *tmd_acm_vals*)) (setq *tmd_acm_vals* (append *tmd_acm_vals* '("0" "0"))))
  (if (not (nth 8 *tmd_acm_vals*)) (setq *tmd_acm_vals* (append *tmd_acm_vals* '("0"))))
)

(defun tmd-acm-set-registry ( / reg_path)
  (setq reg_path "HKEY_CURRENT_USER\\Software\\TMDigital\\ACM")
  (vl-registry-write reg_path "b_largura" (nth 0 *tmd_acm_vals*))
  (vl-registry-write reg_path "b_altura" (nth 1 *tmd_acm_vals*))
  (vl-registry-write reg_path "b_dobra" (nth 2 *tmd_acm_vals*))
  (vl-registry-write reg_path "b_fuga" (nth 3 *tmd_acm_vals*))
  (vl-registry-write reg_path "lst_just_h" (nth 4 *tmd_acm_vals*))
  (vl-registry-write reg_path "lst_just_v" (nth 5 *tmd_acm_vals*))
  (vl-registry-write reg_path "b_retorno" (nth 6 *tmd_acm_vals*))
  (vl-registry-write reg_path "lst_modo" (nth 7 *tmd_acm_vals*))
  (vl-registry-write reg_path "lst_veio" (nth 8 *tmd_acm_vals*))
)

(defun tmd-set-visible (handles is_visible / ent vla_obj)
  (if handles
    (foreach h handles
      (if (setq ent (handent h))
        (progn (setq vla_obj (vlax-ename->vla-object ent))
               (if is_visible (vla-put-Visible vla_obj :vlax-true) (vla-put-Visible vla_obj :vlax-false)))))))

;;; --- MOTOR DE DESENHO E NESTING ---
(defun tmd-draw-acm-grid ( f_w f_h b_w b_h b_d b_f b_r just_h just_v modo is_final / 
                           start_x start_y cur_x cur_y p1_x p1_y p2_x p2_y ent
                           edge_L edge_R edge_B edge_T final_handles
                           flat_w flat_h panels_data total_sheets error_limit fit_qty z_depth)
  
  (setq final_handles nil panels_data nil error_limit nil)
  (if (and *tmd_acm_preview_ss* (> (sslength *tmd_acm_preview_ss*) 0))
    (progn (vl-cmdf "_.ERASE" *tmd_acm_preview_ss* "") (setq *tmd_acm_preview_ss* (ssadd))))

  ;; Profundidade Z (Face Acabada)
  (setq z_depth (if (= modo "1") 5.0 (if (<= b_d 0.0) 1.0 b_d)))

  ;; Justificação Segura (Evita Divisão por Zero)
  (if (<= (+ b_w b_f) 0) (setq b_w 100.0 b_f 10.0))
  (if (<= (+ b_h b_f) 0) (setq b_h 100.0 b_f 10.0))

  (setq start_x (cond ((= just_h "0") 0.0) 
                      ((= just_h "1") (/ (- f_w (- (* (fix (/ (+ f_w b_f) (+ b_w b_f))) (+ b_w b_f)) b_f)) 2.0))
                      ((= just_h "2") (+ (/ (- f_w (- (* (fix (/ (+ f_w b_f) (+ b_w b_f))) (+ b_w b_f)) b_f)) 2.0) (/ b_w 2.0))) 
                      ((= just_h "3") (- f_w (- (* (fix (/ (+ f_w b_f) (+ b_w b_f))) (+ b_w b_f)) b_f))) 
                      (t 0.0)))
  (while (> start_x 0.0) (setq start_x (- start_x (+ b_w b_f))))

  (setq start_y (cond ((= just_v "0") 0.0) 
                      ((= just_v "1") (/ (- f_h (- (* (fix (/ (+ f_h b_f) (+ b_h b_f))) (+ b_h b_f)) b_f)) 2.0))
                      ((= just_v "2") (+ (/ (- f_h (- (* (fix (/ (+ f_h b_f) (+ b_h b_f))) (+ b_h b_f)) b_f)) 2.0) (/ b_h 2.0)))    
                      ((= just_v "3") (- f_h (- (* (fix (/ (+ f_h b_f) (+ b_h b_f))) (+ b_h b_f)) b_f))) 
                      (t 0.0)))
  (while (> start_y 0.0) (setq start_y (- start_y (+ b_h b_f))))

  ;; Desenho da Malha
  (setq cur_x start_x)
  (while (< cur_x f_w)
    (setq cur_y start_y)
    (while (< cur_y f_h)
      (setq p1_x (max 0.0 cur_x) p1_y (max 0.0 cur_y)
            p2_x (min f_w (+ cur_x b_w)) p2_y (min f_h (+ cur_y b_h)))

      (if (and (> (- p2_x p1_x) 1.0) (> (- p2_y p1_y) 1.0)) ; Ignora retalhos menores que 1mm
        (progn
          (if is_final
            (vl-cmdf "_.BOX" "_non" (list p1_x p1_y 0.0) "_non" (list p2_x p2_y (- z_depth)))
            (vl-cmdf "_.RECTANG" "_non" (list p1_x p1_y 0.0) "_non" (list p2_x p2_y 0.0)))
          
          (if is_final
            (progn (setq ent (entlast))
                   (setq final_handles (cons (cdr (assoc 5 (entget ent))) final_handles))
                   (setq edge_L (if (<= p1_x 0.01) 1 0) edge_R (if (>= p2_x (- f_w 0.01)) 1 0)
                         edge_B (if (<= p1_y 0.01) 1 0) edge_T (if (>= p2_y (- f_h 0.01)) 1 0))
                   
                   ;; Adiciona o retorno apenas se for modo Bandeja (0). Colado (1) ignora o retorno físico no plano de corte
                   (setq flat_w (+ (- p2_x p1_x) (if (= modo "0") (if (= edge_L 1) b_r b_d) 0.0) (if (= modo "0") (if (= edge_R 1) b_r b_d) 0.0)))
                   (setq flat_h (+ (- p2_y p1_y) (if (= modo "0") (if (= edge_B 1) b_r b_d) 0.0) (if (= modo "0") (if (= edge_T 1) b_r b_d) 0.0)))
                   
                   (if (or (> flat_w 1220.0) (> flat_h 5000.0)) (setq error_limit T))
                   (setq panels_data (cons (cons flat_w flat_h) panels_data))
                   
                   (vlax-ldata-put ent "TMD_CLASSE" "COM_VISUAL")
                   (vlax-ldata-put ent "TMD_TIPO" (if (= modo "1") "ACM_COLADO" "BANDEJA_ACM")))
            (ssadd (entlast) *tmd_acm_preview_ss*))))
      (setq cur_y (+ cur_y b_h b_f)))
    (setq cur_x (+ cur_x b_w b_f)))

  ;; Dashboard
  (if is_final
    (progn (setq total_sheets 0)
           (foreach p panels_data
             (setq fit_qty (tmd-calc-fit-per-sheet (car p) (cdr p)))
             (if (> fit_qty 0) (setq total_sheets (+ total_sheets (/ 1.0 fit_qty))) (setq error_limit T)))
           (alert (strcat "RELATÓRIO DE PRODUÇÃO (NESTING)\n\n"
                          "Total de Painéis: " (itoa (length panels_data)) " unidades\n"
                          "Chapas (1.22x5m) Estimadas: " (itoa (tmd-ceiling total_sheets)) " chapas\n"
                          (if error_limit "\n[!] ALERTA: Uma ou mais bandejas\nexcedem 1220mm no corte plano!\nNecessita emenda manual." "")))))
  final_handles
)

;;; --- COMANDO PRINCIPAL ---
(defun c:ACM ( / *error* old_osmode old_3dosmode old_ucsdetect sel ent saved_params saved_pts old_children skip_pts
                 pt_orig pt_x pt_y f_w f_h dcl_id res dcl_loop 
                 b_w b_h b_d b_f b_r just_h just_v modo veio new_handles old_ent
                 b_w_real b_h_real)
  
  (defun *error* (msg)
    (if old_children (tmd-set-visible old_children T))
    (if (and *tmd_acm_preview_ss* (> (sslength *tmd_acm_preview_ss*) 0)) (vl-cmdf "_.ERASE" *tmd_acm_preview_ss* ""))
    (vl-cmdf "_.UCS" "_World")
    (if old_osmode (setvar "OSMODE" old_osmode))
    (if old_3dosmode (setvar "3DOSMODE" old_3dosmode))
    (if old_ucsdetect (setvar "UCSDETECT" old_ucsdetect))
    (princ (strcat "\n[Comando Cancelado] " msg)) (princ)
  )

  (setq old_osmode (getvar "OSMODE") old_3dosmode (getvar "3DOSMODE") old_ucsdetect (getvar "UCSDETECT"))
  (setvar "CMDECHO" 0) (tmd-acm-get-registry)

  (vl-cmdf "_.UCS" "_World")
  (setq sel (entsel "\n[Aldama] Selecione a Fachada ou [ENTER] para desenhar plano: "))
  (if sel
    (progn 
      (setq ent (car sel) 
            saved_params (vlax-ldata-get ent "TMD_ACM_CONFIG")
            saved_pts (vlax-ldata-get ent "TMD_ACM_PTS") 
            old_children (vlax-ldata-get ent "TMD_ACM_CHILDREN"))
      
      ;; Proteção contra LData corrompido de versões antigas
      (if (and saved_params saved_pts (= (length saved_pts) 3))
        (progn 
          (setq *tmd_acm_vals* saved_params)
          (setq pt_orig (nth 0 saved_pts) pt_x (nth 1 saved_pts) pt_y (nth 2 saved_pts))
          (if (and pt_orig pt_x pt_y)
            (progn 
               (setq skip_pts T)
               (princ "\n[TMD] Edição detectada! Ocultando bandejas antigas...")
               (tmd-set-visible old_children nil)
            )
          )
        )
      )
    )
  )

  (if (not skip_pts)
    (progn 
      (if (> (getvar "OSMODE") 16384) (setvar "OSMODE" (- (getvar "OSMODE") 16384))) 
      (setvar "OSMODE" 39) (setvar "3DOSMODE" 3) (setvar "UCSDETECT" 0)
      (setq pt_orig (getpoint "\n[1/3] Origem (Inf. Esq.): ")) (if (not pt_orig) (exit))
      (setq pt_x (getpoint pt_orig "\n[2/3] Largura (Inf. Dir.): ")) (if (not pt_x) (exit))
      (setq pt_y (getpoint pt_orig "\n[3/3] Altura (Sup. Esq.): ")) (if (not pt_y) (exit))
    )
  )

  (setvar "OSMODE" 0)
  (vl-cmdf "_.UCS" "_3" "_non" pt_orig "_non" pt_x "_non" pt_y)
  
  ;; Proteção contra pontos coincidentes (Distância Zero)
  (setq f_w (distance pt_orig pt_x) f_h (distance pt_orig pt_y))
  (if (or (not f_w) (<= f_w 0.0)) (setq f_w 1000.0))
  (if (or (not f_h) (<= f_h 0.0)) (setq f_h 1000.0))
  
  (setq dcl_loop T)
  (while dcl_loop
    (setq dcl_id (load_dialog "AcmMVP.dcl"))
    (if (not (new_dialog "AcmMVP_Main" dcl_id)) (exit))
    
    (set_tile "b_largura" (nth 0 *tmd_acm_vals*)) (set_tile "b_altura" (nth 1 *tmd_acm_vals*))
    (set_tile "b_dobra" (nth 2 *tmd_acm_vals*)) (set_tile "b_fuga" (nth 3 *tmd_acm_vals*))
    (set_tile "lst_just_h" (nth 4 *tmd_acm_vals*)) (set_tile "lst_just_v" (nth 5 *tmd_acm_vals*))
    (set_tile "b_retorno" (nth 6 *tmd_acm_vals*)) (set_tile "lst_modo" (nth 7 *tmd_acm_vals*))
    (set_tile "lst_veio" (nth 8 *tmd_acm_vals*))
    (set_tile "f_largura" (rtos f_w 2 1)) (set_tile "f_altura" (rtos f_h 2 1))

    (defun get-dcl-data ()
      ;; Permite que o usuário mude a largura total na interface!
      (setq f_w (atof (get_tile "f_largura")))
      (setq f_h (atof (get_tile "f_altura")))
      (setq *tmd_acm_vals* (list (get_tile "b_largura") (get_tile "b_altura") (get_tile "b_dobra") (get_tile "b_fuga") 
                                 (get_tile "lst_just_h") (get_tile "lst_just_v") (get_tile "b_retorno") 
                                 (get_tile "lst_modo") (get_tile "lst_veio"))))

    (action_tile "btn_preview" "(get-dcl-data) (done_dialog 2)") 
    (action_tile "accept" "(get-dcl-data) (done_dialog 1)")      
    (action_tile "cancel" "(done_dialog 0)")                     
    (setq res (start_dialog)) (unload_dialog dcl_id)

    ;; LÓGICA DE ROTAÇÃO (Sentido do Veio)
    (setq b_w_real (atof (nth 0 *tmd_acm_vals*)) b_h_real (atof (nth 1 *tmd_acm_vals*))
          b_d (atof (nth 2 *tmd_acm_vals*)) b_f (atof (nth 3 *tmd_acm_vals*))
          just_h (nth 4 *tmd_acm_vals*) just_v (nth 5 *tmd_acm_vals*)
          b_r (atof (nth 6 *tmd_acm_vals*)) modo (nth 7 *tmd_acm_vals*) veio (nth 8 *tmd_acm_vals*))

    ;; Se Sentido do Veio for "Horizontal" (Indice 1), INVERTE largura e altura na hora de desenhar
    (if (= veio "1")
      (setq b_w b_h_real b_h b_w_real)
      (setq b_w b_w_real b_h b_h_real)
    )

    (cond ((= res 2) 
           (tmd-draw-acm-grid f_w f_h b_w b_h b_d b_f b_r just_h just_v modo nil)
           (getpoint "\n[VISTA PRÉVIA] Clique na tela ou pressione [ENTER] para voltar..."))
          ((= res 1) 
           (tmd-acm-set-registry)
           (if (and ent old_children) (foreach h old_children (if (setq old_ent (handent h)) (vl-cmdf "_.ERASE" old_ent ""))))
           (setq new_handles (tmd-draw-acm-grid f_w f_h b_w b_h b_d b_f b_r just_h just_v modo T))
           (if ent (progn (vlax-ldata-put ent "TMD_ACM_CONFIG" *tmd_acm_vals*) 
                          (vlax-ldata-put ent "TMD_ACM_PTS" (list pt_orig pt_x pt_y))
                          (vlax-ldata-put ent "TMD_ACM_CHILDREN" new_handles)))
           (setq dcl_loop nil))
          ((= res 0) 
           (if old_children (tmd-set-visible old_children T))
           (if (and *tmd_acm_preview_ss* (> (sslength *tmd_acm_preview_ss*) 0)) (vl-cmdf "_.ERASE" *tmd_acm_preview_ss* ""))
           (setq dcl_loop nil))))
           
  (vl-cmdf "_.UCS" "_World")
  (if old_osmode (setvar "OSMODE" old_osmode)) 
  (if old_3dosmode (setvar "3DOSMODE" old_3dosmode)) 
  (if old_ucsdetect (setvar "UCSDETECT" old_ucsdetect))
  (princ "\n[TM Digital] Comando Finalizado.") (princ)
)

(princ "\n[TM Digital] ACM V2.2 (Correções) Carregado.")
(princ)