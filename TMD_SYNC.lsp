;;; =====================================================================================
;;; TM DIGITAL - MOTOR DE SINCRONIZACIÓN BIM (TMD_SYNC.lsp) - v5.24
;;; v5.24 - Sincronización Geométrica + Saneamiento de Handles (DNA Update)
;;; =====================================================================================

(vl-load-com)

(setq *TMD-SYNC-LOCK* nil)

;;; [Utilidades de Vectores y Geometría - Idénticas a v5.23]
(defun TMD:util-vector-unit (v / d) (setq d (sqrt (apply '+ (mapcar '* v v)))) (if (> d 1e-8) (mapcar '(lambda (x) (/ x d)) v) '(0.0 0.0 0.0)))
(defun TMD:util-vector-cross (a b) (list (- (* (cadr a) (caddr b)) (* (caddr a) (cadr b))) (- (* (caddr a) (car b)) (* (car a) (caddr b))) (- (* (car a) (cadr b)) (* (cadr a) (car b)))))
(defun TMD:util-get-off-axis-dist (pt line_ent / p1 p2 v w t_param proj) (setq p1 (cdr (assoc 10 (entget line_ent))) p2 (cdr (assoc 11 (entget line_ent))) v (mapcar '- p2 p1) w (mapcar '- pt p1) t_param (/ (apply '+ (mapcar '* w v)) (max 1e-8 (apply '+ (mapcar '* v v)))) proj (mapcar '(lambda (v_coord p1_coord) (+ (* v_coord t_param) p1_coord)) v p1)) (distance pt proj))
(defun TMD:util-is-longitudinal-match (s_mid s_vec w_mid len_s / w_rel proj_dist) (setq w_rel (mapcar '- w_mid s_mid)) (setq proj_dist (abs (apply '+ (mapcar '* w_rel s_vec)))) (< proj_dist (+ (/ len_s 2.0) 100.0)))
(defun TMD:sync-get-centroid (ent / obj minp maxp pmin pmax etype p1 p2) (setq obj (vlax-ename->vla-object ent)) (setq etype (cdr (assoc 0 (entget ent)))) (cond ((= etype "LINE") (setq p1 (cdr (assoc 10 (entget ent))) p2 (cdr (assoc 11 (entget ent)))) (list (/ (+ (car p1) (car p2)) 2.0) (/ (+ (cadr p1) (cadr p2)) 2.0) (/ (+ (caddr p1) (caddr p2)) 2.0))) ((= etype "3DSOLID") (vla-getboundingbox obj 'minp 'maxp) (setq pmin (vlax-safearray->list minp) pmax (vlax-safearray->list maxp)) (list (/ (+ (car pmin) (car pmax)) 2.0) (/ (+ (cadr pmin) (cadr pmax)) 2.0) (/ (+ (caddr pmin) (caddr pmax)) 2.0))) (t nil)))
(defun TMD:sync-get-bbox (ent / obj minp maxp) (setq obj (vlax-ename->vla-object ent)) (vla-getboundingbox obj 'minp 'maxp) (list (vlax-safearray->list minp) (vlax-safearray->list maxp)))
(defun TMD:sync-get-vector (ent / p1 p2 d) (setq p1 (cdr (assoc 10 (entget ent))) p2 (cdr (assoc 11 (entget ent))) d (distance p1 p2)) (if (> d 1e-6) (mapcar '(lambda (x) (/ x d)) (mapcar '- p2 p1)) '(0.0 0.0 0.0)))

(defun TMD:util-get-real-justification (w_ent s_ent / params p_x p_y w_p1 v_z v_x v_y s_mid vec_s off_x off_y jx jy)
  (setq params (vlax-ldata-get w_ent "TMD_PARAMS"))
  (if (and params (setq p_x (cdr (assoc "DIM_X" params))) (setq p_y (cdr (assoc "DIM_Y" params))))
    (progn
      (setq w_p1 (cdr (assoc 10 (entget w_ent))))
      (setq v_z (TMD:sync-get-vector w_ent))
      (if (and (< (abs (car v_z)) 0.01) (< (abs (cadr v_z)) 0.01)) (setq v_x '(1.0 0.0 0.0)) (setq v_x (TMD:util-vector-unit (TMD:util-vector-cross '(0.0 0.0 1.0) v_z))))
      (setq v_y (TMD:util-vector-unit (TMD:util-vector-cross v_z v_x)))
      (setq s_mid (TMD:sync-get-centroid s_ent))
      (setq vec_s (mapcar '- s_mid w_p1) off_x (apply '+ (mapcar '* vec_s v_x)) off_y (apply '+ (mapcar '* vec_s v_y)))
      (setq jx (cond ((< off_x -2.0) "R") ((> off_x 2.0) "L") (t "C")))
      (setq jy (cond ((< off_y -2.0) "T") ((> off_y 2.0) "B") (t "M")))
      (strcat jy jx)
    )
    "MC"
  )
)

(defun TMD:sync-phoenix (s_ent / s_mid s_bbox s_diff len_s s_vec v_x v_y params p_x p_y just off_x off_y w_p1 w_p2 w_ent)
  (princ "\n    [FÉNIX] Regenerando identidad...")
  (setq s_mid (TMD:sync-get-centroid s_ent) s_bbox (TMD:sync-get-bbox s_ent) s_diff (mapcar '- (cadr s_bbox) (car s_bbox)) len_s (apply 'max s_diff) s_vec (TMD:util-vector-unit (mapcar '(lambda (d) (if (= d len_s) d 0.0)) s_diff)))
  (setq params (vlax-ldata-get s_ent "TMD_PARAMS"))
  (if (not params) (setq params '(( "DIM_X" . 50.0) ("DIM_Y" . 25.0) ("JUSTIFICACAO" . "MC"))))
  (setq p_x (cdr (assoc "DIM_X" params)) p_y (cdr (assoc "DIM_Y" params)) just (cdr (assoc "JUSTIFICACAO" params)))
  (if (and (< (abs (car s_vec)) 0.01) (< (abs (cadr s_vec)) 0.01)) (setq v_x '(1.0 0.0 0.0)) (setq v_x (TMD:util-vector-unit (TMD:util-vector-cross '(0.0 0.0 1.0) s_vec))))
  (setq v_y (TMD:util-vector-unit (TMD:util-vector-cross s_vec v_x)))
  (setq off_x (cond ((wcmatch just "*L") (/ p_x -2.0)) ((wcmatch just "*R") (/ p_x 2.0)) (t 0.0)))
  (setq off_y (cond ((wcmatch just "T*") (/ p_y 2.0)) ((wcmatch just "B*") (/ p_y -2.0)) (t 0.0)))
  (setq w_p1 (mapcar '+ s_mid (mapcar '(lambda (v) (* v (/ len_s -2.0))) s_vec)) w_p1 (mapcar '- w_p1 (mapcar '(lambda (v) (* v off_x)) v_x)) w_p1 (mapcar '- w_p1 (mapcar '(lambda (v) (* v off_y)) v_y)))
  (setq w_p2 (mapcar '+ w_p1 (mapcar '(lambda (v) (* v len_s)) s_vec)))
  (setq w_ent (entmakex (list '(0 . "LINE") '(8 . "TMD_WIRES") (cons 10 w_p1) (cons 11 w_p2))))
  (if w_ent
    (progn
      (vlax-ldata-put w_ent "TMD_CLASSE" "ESTRUTURA_LINE")
      (vlax-ldata-put w_ent "TMD_PARAMS" params)
      (vlax-ldata-put w_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object w_ent)))
      (vlax-ldata-put s_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object s_ent))) ;; Sanear sólido también
      (vlax-ldata-put s_ent "TMD_PARENT_WIRE" (vlax-ldata-get w_ent "TMD_SELF_HANDLE"))
      (vlax-ldata-put w_ent "TMD_CHILD_SOLID" (vlax-ldata-get s_ent "TMD_SELF_HANDLE"))
      (princ " [OK]")
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; 4. COMANDO TMD_SYNC (v5.24) - CON ACTUALIZACIÓN DE ADN
;;; -------------------------------------------------------------------------------------

(defun c:TMD_SYNC ( / ss i ent curr_h etype all_elements wire_data_list solids_list count_pairs count_fenix s_ent s_mid s_bbox s_diff len_s s_vec dims_trans max_sec_dim safe_radius family_id best_w best_dist w_data w_ent w_mid w_vec dot off_axis dist new_just params s_h w_h)
  (if *TMD-SYNC-LOCK* (progn (princ "\n[!] Motor ocupado.") (exit)))
  (setq *TMD-SYNC-LOCK* t)
  (princ "\n[TM Digital] Saneando ADN BIM v5.24...")
  
  (setq ss (ssget "X" '((0 . "LINE,3DSOLID"))))
  (if (not ss) (progn (princ "\n[!] Dibujo vacío.") (setq *TMD-SYNC-LOCK* nil) (exit)))

  (setq wire_data_list (list) solids_list (list) i 0)
  (while (< i (sslength ss))
    (setq ent (ssname ss i))
    (if (vlax-ldata-get ent "TMD_CLASSE")
      (progn
        (setq etype (cdr (assoc 0 (entget ent))))
        (if (= etype "LINE") 
          (setq wire_data_list (cons (list ent (TMD:sync-get-centroid ent) (TMD:sync-get-vector ent)) wire_data_list))
          (setq solids_list (cons ent solids_list))
        )
      )
    )
    (setq i (1+ i))
  )

  (setq count_pairs 0 count_fenix 0)

  (foreach s_ent solids_list
    (setq s_mid (TMD:sync-get-centroid s_ent)
          s_bbox (TMD:sync-get-bbox s_ent)
          s_diff (mapcar '- (cadr s_bbox) (car s_bbox))
          len_s (apply 'max s_diff)
          s_vec (TMD:util-vector-unit (mapcar '(lambda (d) (if (= d len_s) d 0.0)) s_diff))
          dims_trans (vl-remove len_s s_diff)
          max_sec_dim (apply 'max dims_trans)
          safe_radius (+ (/ max_sec_dim 2.0) 10.0)
          family_id (vlax-ldata-get s_ent "TMD_PARENT_WIRE")
          best_w nil best_dist 999999.0)

    (foreach w_data wire_data_list
      (setq w_ent (car w_data) w_mid (cadr w_data) w_vec (caddr w_data))
      (setq dot (abs (apply '+ (mapcar '* s_vec w_vec))))
      (if (and (> dot 0.98) (TMD:util-is-longitudinal-match s_mid s_vec w_mid len_s))
        (progn
          (setq off_axis (TMD:util-get-off-axis-dist s_mid w_ent))
          (if (< off_axis safe_radius)
            (progn
              (setq dist (distance s_mid w_mid))
              ;; Prioridad a la familia original si existe el ADN
              (if (= (vlax-ldata-get w_ent "TMD_SELF_HANDLE") family_id) (setq dist (- dist 10000.0)))
              (if (< dist best_dist) (setq best_w w_ent best_dist dist))
            )
          )
        )
      )
    )

    (if best_w
      (progn
        ;; --- CRÍTICO: SANEAR HANDLES (Actualizar ADN al presente) ---
        (setq s_h (vla-get-handle (vlax-ename->vla-object s_ent))
              w_h (vla-get-handle (vlax-ename->vla-object best_w)))
        
        (vlax-ldata-put s_ent "TMD_SELF_HANDLE" s_h)
        (vlax-ldata-put best_w "TMD_SELF_HANDLE" w_h)
        (vlax-ldata-put s_ent "TMD_PARENT_WIRE" w_h)
        (vlax-ldata-put best_w "TMD_CHILD_SOLID" s_h)
        
        ;; Actualizar Justificación y Params
        (setq new_just (TMD:util-get-real-justification best_w s_ent))
        (setq params (vlax-ldata-get best_w "TMD_PARAMS"))
        (if params
          (progn
            (setq params (subst (cons "JUSTIFICACAO" new_just) (assoc "JUSTIFICACAO" params) params))
            (vlax-ldata-put best_w "TMD_PARAMS" params)
            (vlax-ldata-put s_ent "TMD_PARAMS" params)
          )
        )
        (setq count_pairs (1+ count_pairs))
      )
      (progn
        (TMD:sync-phoenix s_ent)
        (setq count_fenix (1+ count_fenix))
      )
    )
  )

  (princ (strcat "\n[OK] Saneamiento completo: " (itoa count_pairs) " Identidades actualizadas | " (itoa count_fenix) " Regeneradas."))
  (setq *TMD-SYNC-LOCK* nil)
  (princ)
)

(princ "\n[TMD] Motor SYNC v5.24 - Saneador de ADN Activo.")
(princ)
