;;; =====================================================================================
;;; TM DIGITAL - MOTOR DE SINCRONIZACIÓN BIM (TMD_SYNC.lsp) - MODO VERBOSE COMPLETO
;;; v5.10 - Restauración de Funciones y Auditoría Lógico-Física
;;; =====================================================================================

(vl-load-com)

(setq *TMD-SYNC-LOCK* nil)

;;; -------------------------------------------------------------------------------------
;;; 1. UTILIDADES GEOMÉTRICAS Y DE CÁLCULO
;;; -------------------------------------------------------------------------------------

;; FUNCIÓN: TMD:sync-get-centroid
;; PROPÓSITO: Obtiene el centroide de una entidad.
(defun TMD:sync-get-centroid (ent / obj minp maxp pmin pmax etype p1 p2)
  (setq obj (vlax-ename->vla-object ent))
  (setq etype (cdr (assoc 0 (entget ent))))
  (cond
    ((= etype "LINE")
      (setq p1 (cdr (assoc 10 (entget ent))) p2 (cdr (assoc 11 (entget ent))))
      (list (/ (+ (car p1) (car p2)) 2.0) (/ (+ (cadr p1) (cadr p2)) 2.0) (/ (+ (caddr p1) (caddr p2)) 2.0))
    )
    ((= etype "3DSOLID")
      (vla-getboundingbox obj 'minp 'maxp)
      (setq pmin (vlax-safearray->list minp) pmax (vlax-safearray->list maxp))
      (list (/ (+ (car pmin) (car pmax)) 2.0) (/ (+ (cadr pmin) (cadr pmax)) 2.0) (/ (+ (caddr pmin) (caddr pmax)) 2.0))
    )
    (t nil)
  )
)

;; FUNCIÓN: TMD:sync-get-bbox
;; PROPÓSITO: Obtiene la caja de contorno (Bounding Box).
(defun TMD:sync-get-bbox (ent / obj minp maxp)
  (setq obj (vlax-ename->vla-object ent))
  (vla-getboundingbox obj 'minp 'maxp)
  (list (vlax-safearray->list minp) (vlax-safearray->list maxp))
)

;; FUNCIÓN: TMD:sync-get-vector
;; PROPÓSITO: Calcula el vector unitario de una línea.
(defun TMD:sync-get-vector (ent / p1 p2 d)
  (setq p1 (cdr (assoc 10 (entget ent))) p2 (cdr (assoc 11 (entget ent))) d (distance p1 p2))
  (if (> d 1e-6) (mapcar '(lambda (x) (/ x d)) (mapcar '- p2 p1)) '(0.0 0.0 0.0))
)

;;; -------------------------------------------------------------------------------------
;;; 2. MOTORES DE REPARACIÓN Y AUDITORÍA
;;; -------------------------------------------------------------------------------------

;; FUNCIÓN: TMD:sync-reconnect-joints
;; PROPÓSITO: Recalcula y reconecta las juntas (cutters) de una viga clonada.
;; QUIÉN LA LLAMA: c:TMD_SYNC tras una adopción exitosa.
(defun TMD:sync-reconnect-joints (ent / cutters new_cutters c h_master master_ent ptA ptB ss j found_ent found_h)
  (setq cutters (vlax-ldata-get ent "TMD_CUTTERS"))
  (if (and cutters (> (length cutters) 0))
    (progn
      (princ (strcat "\n    [DEBUG] Reparando " (itoa (length cutters)) " juntas para el wire..."))
      (setq new_cutters (list) ptA (cdr (assoc 10 (entget ent))) ptB (cdr (assoc 11 (entget ent))))
      (foreach c cutters
        (setq found_h nil)
        (foreach test_pt (list ptA ptB)
          (if (not found_h)
            (progn
              (setq ss (ssget "_C" (mapcar '- test_pt '(2 2 2)) (mapcar '+ test_pt '(2 2 2)) '((0 . "LINE"))))
              (if ss
                (progn
                  (setq j 0)
                  (while (< j (sslength ss))
                    (setq found_ent (ssname ss j))
                    (if (and (/= (vla-get-handle (vlax-ename->vla-object found_ent)) (vla-get-handle (vlax-ename->vla-object ent)))
                             (= (vlax-ldata-get found_ent "TMD_CLASSE") "ESTRUTURA_LINE"))
                      (setq found_h (vla-get-handle (vlax-ename->vla-object found_ent)))
                    )
                    (setq j (1+ j))
                  )
                )
              )
            )
          )
        )
        (if found_h (setq new_cutters (cons (cons found_h (cdr c)) new_cutters)))
      )
      (vlax-ldata-put ent "TMD_CUTTERS" (reverse new_cutters))
    )
  )
)

;; FUNCIÓN: TMD:sync-audit-alignment
;; PROPÓSITO: Corrige discrepancias de Justificación (causadas por MIRROR/ROTATE).
(defun TMD:sync-audit-alignment (w_ent s_ent / params p_x p_y w_p1 w_p2 s_bbox s_min s_max s_cent v_z v_x v_y vec_s off_x off_y new_jx new_jy new_just)
  (setq params (vlax-ldata-get w_ent "TMD_PARAMS"))
  (if (and params (setq p_x (cdr (assoc "DIM_X" params))) (setq p_y (cdr (assoc "DIM_Y" params))))
    (progn
      (setq w_p1 (cdr (assoc 10 (entget w_ent))) w_p2 (cdr (assoc 11 (entget w_ent))))
      (setq v_z (TMD:sync-get-vector w_ent))
      (if (and (< (abs (car v_z)) 0.01) (< (abs (cadr v_z)) 0.01)) (setq v_x '(1.0 0.0 0.0)) (setq v_x (TMD:util-vector-unit (TMD:util-vector-cross '(0.0 0.0 1.0) v_z))))
      (setq v_y (TMD:util-vector-unit (TMD:util-vector-cross v_z v_x)))
      (setq s_bbox (TMD:sync-get-bbox s_ent) s_min (car s_bbox) s_max (cadr s_bbox) s_cent (list (/ (+ (car s_min) (car s_max)) 2.0) (/ (+ (cadr s_min) (cadr s_max)) 2.0) (/ (+ (caddr s_min) (caddr s_max)) 2.0)))
      (setq vec_s (mapcar '- s_cent w_p1) off_x (apply '+ (mapcar '* vec_s v_x)) off_y (apply '+ (mapcar '* vec_s v_y)))
      (setq new_jx (cond ((< off_x (* p_x -0.2)) "R") ((> off_x (* p_x 0.2)) "L") (t "C")))
      (setq new_jy (cond ((< off_y (* p_y -0.2)) "T") ((> off_y (* p_y 0.2)) "B") (t "M")))
      (setq new_just (strcat new_jy new_jx))
      (if (/= new_just (cdr (assoc "JUSTIFICACAO" params)))
        (progn
          (princ (strcat "\n    [DEBUG] Corrección de Espejo: " (cdr (assoc "JUSTIFICACAO" params)) " -> " new_just))
          (setq params (subst (cons "JUSTIFICACAO" new_just) (assoc "JUSTIFICACAO" params) params))
          (vlax-ldata-put w_ent "TMD_PARAMS" params)
          (vlax-ldata-put s_ent "TMD_PARAMS" params)
          (vlax-ldata-put w_ent "TMD_JUSTIFICACAO" new_just)
        )
      )
    )
  )
)

;; FUNCIÓN: TMD:sync-extract-rotation
;; PROPÓSITO: Detecta la rotación real de un sólido respecto a su wire analizando su geometría.
;; RETORNO: Ángulo en grados (0, 90, 180, 270) o real.
(defun TMD:sync-extract-rotation (w_ent s_ent / p1 p2 v_z v_x v_y p_mid p_x p_y reg exp item len max_l best_v proj_x proj_y ang_rad ang_deg)
  (princ "\n    [DEBUG] Analisando rotação física...")
  (setq p1 (cdr (assoc 10 (entget w_ent))) p2 (cdr (assoc 11 (entget w_ent))))
  (setq v_z (TMD:sync-get-vector w_ent))
  
  ;; Definir LCS del Wire (Ejes locales)
  (if (and (< (abs (car v_z)) 0.01) (< (abs (cadr v_z)) 0.01)) 
    (setq v_x '(1.0 0.0 0.0)) 
    (setq v_x (TMD:util-vector-unit (TMD:util-vector-cross '(0.0 0.0 1.0) v_z)))
  )
  (setq v_y (TMD:util-vector-unit (TMD:util-vector-cross v_z v_x)))
  
  ;; Crear sección transversal en el punto medio para analizar la orientación real
  (setq p_mid (list (/ (+ (car p1) (car p2)) 2.0) (/ (+ (cadr p1) (cadr p2)) 2.0) (/ (+ (caddr p1) (caddr p2)) 2.0)))
  (setq p_x (mapcar '+ p_mid v_x) p_y (mapcar '+ p_mid v_y))
  
  (setq reg (vl-catch-all-apply 'vla-SectionSolid (list (vlax-ename->vla-object s_ent) (vlax-3d-point p_mid) (vlax-3d-point p_x) (vlax-3d-point p_y))))
  
  (if (and reg (not (vl-catch-all-error-p reg)))
    (progn
      (princ " (Seção OK)")
      (setq exp (vlax-invoke reg 'Explode) max_l 0.0 best_v v_x)
      (vla-delete reg)
      (foreach item exp
        (if (= (vla-get-ObjectName item) "AcDbLine")
          (progn
            (setq len (vla-get-Length item))
            (if (> len max_l)
              (progn (setq max_l len) (setq best_v (mapcar '- (vlax-get item 'EndPoint) (vlax-get item 'StartPoint))))
            )
          )
        )
        (vla-delete item)
      )
      
      (setq proj_x (apply '+ (mapcar '* best_v v_x)) proj_y (apply '+ (mapcar '* best_v v_y)))
      (setq ang_rad (atan proj_y proj_x) ang_deg (* (/ ang_rad pi) 180.0))
      
      (princ (strcat "\n    [DEBUG] Angulo Bruto: " (rtos ang_deg 2 2) "°"))
      
      ;; Normalizar a 0-180 (la orientación física de un perfil es simétrica cada 180)
      (while (< ang_deg 0) (setq ang_deg (+ ang_deg 180.0)))
      (setq ang_deg (rem ang_deg 180.0))
      
      ;; Snapping a ángulos estándar con tolerancia de 1 grado
      (cond
        ((< (abs ang_deg) 1.0) (setq ang_deg 0.0))
        ((< (abs (- ang_deg 90.0)) 1.0) (setq ang_deg 90.0))
      )
      
      (princ (strcat " -> Final: " (rtos ang_deg 2 2) "°"))
      ang_deg
    )
    (progn
      (princ "\n    [!] ERROR: Falha ao seccionar sólido.")
      (atof (vl-princ-to-string (cdr (assoc "ROTACAO" (vlax-ldata-get w_ent "TMD_PARAMS")))))
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; 3. COMANDO MAESTRO VERBOSE
;;; -------------------------------------------------------------------------------------

(defun c:TMD_SYNC ( / ss i ent obj curr_h self_h etype clon_wires clon_solids bbox pmin pmax ss_vol w_ent match_found count_pairs count_fenix j family_id v_s v_w dot dist best_w best_dist params s_cent old_p1 old_p2 old_mid vec new_p1 new_p2)
  (if *TMD-SYNC-LOCK* (progn (princ "\n[!] SYNC en curso.") (exit)))
  (setq *TMD-SYNC-LOCK* t)
  (princ "\n[VERBOSE] Sincronizador Maestro v5.10 iniciado...")

  (setq ss (ssget "X" '((0 . "LINE,3DSOLID"))))
  (if (not ss) (progn (setq *TMD-SYNC-LOCK* nil) (exit)))

  (setq clon_wires (list) clon_solids (list) i 0)
  (while (< i (sslength ss))
    (setq ent (ssname ss i))
    (if (vlax-ldata-get ent "TMD_CLASSE")
      (progn
        (setq curr_h (vla-get-handle (vlax-ename->vla-object ent)) self_h (vlax-ldata-get ent "TMD_SELF_HANDLE") etype (cdr (assoc 0 (entget ent))))
        (if (and self_h (/= curr_h self_h))
          (progn
            (princ (strcat "\n  [DEBUG] Clon: " etype " [" curr_h "] (ADN: " self_h ")"))
            (cond ((= etype "LINE") (setq clon_wires (cons ent clon_wires))) ((= etype "3DSOLID") (setq clon_solids (cons ent clon_solids))))
          )
        )
      )
    )
    (setq i (1+ i))
  )

  ;; FASE ADOPCIÓN
  (setq i 0)
  (while (< i (length clon_solids))
    (setq s_ent (nth i clon_solids) family_id (vlax-ldata-get s_ent "TMD_PARENT_WIRE") bbox (TMD:sync-get-bbox s_ent) ss_vol (ssget "_C" (mapcar '- (car bbox) '(10 10 10)) (mapcar '+ (cadr bbox) '(10 10 10)) '((0 . "LINE"))) match_found nil best_w nil best_dist 9999.0)
    (if ss_vol
      (progn
        (setq j 0 v_s (TMD:util-vector-unit (mapcar '- (cadr bbox) (car bbox))))
        (while (< j (sslength ss_vol))
          (setq w_ent (ssname ss_vol j))
          (if (and (member w_ent clon_wires) (= (vlax-ldata-get w_ent "TMD_SELF_HANDLE") family_id))
            (progn
              (setq v_w (TMD:sync-get-vector w_ent) dot (abs (apply '+ (mapcar '* v_s v_w))))
              (if (> dot 0.9) (progn (setq dist (distance (TMD:sync-get-centroid s_ent) (TMD:sync-get-centroid w_ent))) (if (< dist best_dist) (setq best_w w_ent best_dist dist))))
            )
          )
          (setq j (1+ j))
        )
        (if best_w
          (progn
            (princ (strcat "\n    [DEBUG] Adopción: Wire " (vla-get-handle (vlax-ename->vla-object best_w)) " -> Sólido " (vla-get-handle (vlax-ename->vla-object s_ent))))
            (vlax-ldata-put best_w "TMD_CHILD_SOLID" (vla-get-handle (vlax-ename->vla-object s_ent)))
            (vlax-ldata-put s_ent "TMD_PARENT_WIRE" (vla-get-handle (vlax-ename->vla-object best_w)))
            (TMD:sync-audit-alignment best_w s_ent)
            (TMD:sync-reconnect-joints best_w)
            (vlax-ldata-put best_w "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object best_w)))
            (vlax-ldata-put s_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object s_ent)))
            (setq clon_wires (vl-remove best_w clon_wires) clon_solids (vl-remove s_ent clon_solids) count_pairs (1+ count_pairs) match_found t i (1- i))
          )
        )
      )
    )
    (setq i (1+ i))
  )

  ;; FASE FÉNIX
  (foreach s_ent clon_solids
    (princ (strcat "\n  [DEBUG] Iniciando Fénix para Sólido: " (vla-get-handle (vlax-ename->vla-object s_ent))))
    (setq params (vlax-ldata-get s_ent "TMD_PARAMS"))
    (if (and params (setq old_p1 (cdr (assoc "PT_A" params))))
      (progn
        (setq bbox (TMD:sync-get-bbox s_ent) s_cent (list (/ (+ (car (car bbox)) (car (cadr bbox))) 2.0) (/ (+ (cadr (car bbox)) (cadr (cadr bbox))) 2.0) (/ (+ (caddr (car bbox)) (caddr (cadr bbox))) 2.0)))
        (setq old_p2 (cdr (assoc "PT_B" params)) old_mid (list (/ (+ (car old_p1) (car old_p2)) 2.0) (/ (+ (cadr old_p1) (cadr old_p2)) 2.0) (/ (+ (caddr old_p1) (caddr old_p2)) 2.0)))
        (setq vec (mapcar '- s_cent old_mid) new_p1 (mapcar '+ old_p1 vec) new_p2 (mapcar '+ old_p2 vec))
        (setq w_ent (entmakex (list '(0 . "LINE") (cons 10 new_p1) (cons 11 new_p2) (cons 8 (cdr (assoc 8 (entget s_ent)))))))
        (if w_ent
          (progn
            (vlax-ldata-put w_ent "TMD_CLASSE" "ESTRUTURA_LINE") (vlax-ldata-put w_ent "TMD_PARAMS" params)
            (vlax-ldata-put w_ent "TMD_CHILD_SOLID" (vla-get-handle (vlax-ename->vla-object s_ent)))
            (vlax-ldata-put s_ent "TMD_PARENT_WIRE" (vla-get-handle (vlax-ename->vla-object w_ent)))
            (vlax-ldata-put w_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object w_ent)))
            (vlax-ldata-put s_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object s_ent)))
            (setq count_fenix (1+ count_fenix))
          )
        )
      )
    )
  )

  (princ (strcat "\n[VERBOSE] SYNC v5.10 finalizado. (" (itoa count_pairs) " Adopciones | " (itoa count_fenix) " Fénix)"))
  (setq *TMD-SYNC-LOCK* nil)
  (princ)
)

(princ "\n[TMD] Motor SYNC v5.10 Cargado y Restaurado.")
(princ)
