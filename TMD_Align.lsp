;;; =====================================================================================
;;; TM DIGITAL - MOTOR DE ALINEACIÓN INDUSTRIAL (TMD_Align.lsp)
;;; =====================================================================================
;;; v4.5 - Bucle Modal e Inteligencia de Maestro (Lazo vs Append)
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; 1. UTILIDADES GEOMÉTRICAS (SOPORTE DE GRUPOS)
;;; -------------------------------------------------------------------------------------

(defun TMD:align-get-data (ent / obj minpt maxpt p1 p2 midw midh grp items-bbox)
  (setq obj (if (= (type ent) 'ENAME) (vlax-ename->vla-object ent) ent))
  (if (and (= (logand (getvar "PICKSTYLE") 1) 1)
           (setq grp (TMD:align-get-owner-group ent)))
    (progn
      (setq items-bbox (TMD:align-get-group-bbox grp))
      (setq p1 (car items-bbox) p2 (cadr items-bbox))
    )
    (progn
      (vla-getboundingbox obj 'minpt 'maxpt)
      (setq p1 (vlax-safearray->list minpt) p2 (vlax-safearray->list maxpt))
    )
  )
  (setq midw (/ (+ (car p1) (car p2)) 2.0)
        midh (/ (+ (cadr p1) (cadr p2)) 2.0))
  (list p1 p2 (list midw midh 0.0) (- (car p2) (car p1)) (- (cadr p2) (cadr p1)))
)

(defun TMD:align-get-owner-group (ent / obj doc groups found h)
  (setq obj (if (= (type ent) 'ENAME) (vlax-ename->vla-object ent) ent))
  (setq h (vla-get-Handle obj) doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq groups (vla-get-Groups doc) found nil)
  (if (> (vla-get-Count groups) 0)
    (vlax-for grp groups
      (if (not found)
        (vl-catch-all-apply '(lambda () (vlax-for item grp (if (and (not found) (= (vla-get-Handle item) h)) (setq found grp)))))
      )
    )
  )
  found
)

(defun TMD:align-get-group-bbox (grp / minpt maxpt g-min g-max first p1 p2)
  (setq g-min nil g-max nil first t)
  (vlax-for obj grp
    (if (not (vlax-erased-p obj))
      (progn
        (vla-getboundingbox obj 'minpt 'maxpt)
        (setq p1 (vlax-safearray->list minpt) p2 (vlax-safearray->list maxpt))
        (if first (setq g-min p1 g-max p2 first nil)
          (setq g-min (mapcar 'min g-min p1) g-max (mapcar 'max g-max p2)))
      )
    )
  )
  (list g-min g-max)
)

;;; -------------------------------------------------------------------------------------
;;; 2. INTELIGENCIA DE REFERENCIA (MAESTRO VS LAZO)
;;; -------------------------------------------------------------------------------------

(defun TMD:align-get-reference (ent_list mode last_count / total-min total-max first data bmin bmax master-ent master-data m-p1 m-p2)
  (setq total-min nil total-max nil first t)
  (foreach ent ent_list
    (setq data (TMD:align-get-data ent))
    (setq bmin (car data) bmax (cadr data))
    (if first
      (setq total-min bmin total-max bmax first nil)
      (setq total-min (mapcar 'min total-min bmin) total-max (mapcar 'max total-max bmax))
    )
  )
  
  ;; Lógica Industrial: 
  ;; Si el último paso de selección tuvo más de 1 objeto (ventana/lasso), NO hay maestro.
  ;; Si tuvo exactamente 1 objeto, ese es el MAESTRO.
  (if (and last_count (= last_count 1) (> (length ent_list) 1))
    (setq master-data (TMD:align-get-data (last ent_list)))
    (setq master-data nil)
  )
  
  (if (or (not master-data) (member mode '("DIST_H" "DIST_V")))
    ;; MODO LAZO: Referencia al borde de la selección total
    (list total-min total-max (list (/ (+ (car total-min) (car total-max)) 2.0) (/ (+ (cadr total-min) (cadr total-max)) 2.0) 0.0))
    ;; MODO APPEND: Referencia al Maestro
    master-data
  )
)

;;; -------------------------------------------------------------------------------------
;;; 3. MOTOR DE MOVIMIENTO (NORMALIZADO PARA GRUPOS)
;;; -------------------------------------------------------------------------------------

(defun TMD:align-normalize (ent_list / normalized moved_handles grp h)
  (setq normalized (list) moved_handles (list))
  (foreach ent ent_list
    (setq h (cdr (assoc 5 (entget ent))))
    (if (not (member h moved_handles))
      (progn
        (if (and (= (logand (getvar "PICKSTYLE") 1) 1) (setq grp (TMD:align-get-owner-group ent)))
          (progn (setq normalized (cons (list "GROUP" grp) normalized))
                 (vlax-for item grp (setq moved_handles (cons (vla-get-Handle item) moved_handles))))
          (progn (setq normalized (cons (list "ENTITY" ent) normalized))
                 (setq moved_handles (cons h moved_handles))))
      )
    )
  )
  normalized
)

(defun TMD:align-execute-ss (ss mode last_count / ent_list ref_data target_p1 target_p2 target_center effective_list unit u_type target data p1 p2 center dx dy)
  (setq i 0 ent_list nil)
  (repeat (sslength ss) (setq ent_list (append ent_list (list (ssname ss i)))) (setq i (1+ i)))
  
  (if (member mode '("DIST_H" "DIST_V"))
    (TMD:distribute-execute ent_list mode)
    (progn
      (setq ref_data (TMD:align-get-reference ent_list mode last_count))
      (setq target_p1 (car ref_data) target_p2 (cadr ref_data) target_center (caddr ref_data))
      (setq effective_list (TMD:align-normalize ent_list))
      (foreach unit effective_list
        (setq u_type (car unit) target (cadr unit))
        (setq data (if (= u_type "GROUP") (TMD:align-get-data (vlax-for x target (setq res x))) (TMD:align-get-data target)))
        (setq p1 (car data) p2 (cadr data) center (caddr data) dx 0.0 dy 0.0)
        (cond
          ((= mode "L") (setq dx (- (car target_p1) (car p1))))
          ((= mode "R") (setq dx (- (car target_p2) (car p2))))
          ((= mode "T") (setq dy (- (cadr target_p2) (cadr p2))))
          ((= mode "B") (setq dy (- (cadr target_p1) (cadr p1))))
          ((= mode "C") (setq dx (- (car target_center) (car center))))
          ((= mode "E") (setq dy (- (cadr target_center) (cadr center))))
        )
        (if (or (/= dx 0.0) (/= dy 0.0))
          (if (= u_type "GROUP")
            (vlax-for item target (vla-move item (vlax-3d-point '(0 0 0)) (vlax-3d-point (list dx dy 0.0))))
            (vla-move (vlax-ename->vla-object target) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list dx dy 0.0))))
        )
      )
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; 4. BUCLE MODAL E INTERFAZ
;;; -------------------------------------------------------------------------------------

(defun TMD:align-modal-loop (ss last_count / loop gr code val key doc)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)) loop t)
  (princ "\n--- MODO ALIGN [L, R, T, B, C, E] | ENTER para finalizar ---")
  (sssetfirst nil ss)
  (while loop
    (setq gr (grread T 15 0) code (car gr) val (cadr gr))
    (cond
      ((= code 2) ;; Teclado
        (setq key (strcase (chr val)))
        (cond
          ((member key '("L" "R" "T" "B" "C" "E"))
           (vla-StartUndoMark doc) (TMD:align-execute-ss ss key last_count) (vla-EndUndoMark doc) (sssetfirst nil ss))
          ((member val '(13 32)) (setq loop nil)) ;; ENTER/SPACE sale
          ((= val 27) (setq loop nil)) ;; ESC sale
        )
      )
      ((or (= code 3) (= code 25)) (setq loop nil)) ;; Click sale
    )
  )
)

(defun c:TMD_ALIGN ( / ss_final sel_set last_sel_count loop)
  (setq ss_final (ssadd) last_sel_count 0)
  ;; Primeiro tenta seleção implícita (Pickfirst)
  (if (setq ss_impl (ssget "_I"))
    (setq ss_final ss_impl last_sel_count 0) ;; Se já estava selecionado, modo LAZO por padrão
    (progn
      (setq loop t)
      (princ "\n[ALIGN] Selecione objetos (Ventana ou Clics). ENTER para finalizar seleção: ")
      (while loop
        (if (setq sel_set (ssget))
          (progn
            (setq last_sel_count (sslength sel_set))
            (repeat (setq i (sslength sel_set))
              (ssadd (ssname sel_set (setq i (1- i))) ss_final)
            )
            (princ (strcat "\nTotal: " (itoa (sslength ss_final)) ". Selecione mais ou ENTER para alinhar: "))
          )
          (setq loop nil)
        )
      )
    )
  )
  
  (if (> (sslength ss_final) 0)
    (TMD:align-modal-loop ss_final last_sel_count)
  )
  (princ "\n[TMD] Alineación finalizada.") (princ)
)

;; Comandos Directos para el Ribbon
(defun TMD:al-direct (mode / ss)
  (setq ss (ssget "_I"))
  (if (not ss) (setq ss (ssget)))
  (if ss
    (progn
      (vla-StartUndoMark (vla-get-ActiveDocument (vlax-get-acad-object)))
      (TMD:align-execute-ss ss mode 0) ;; Ribbon siempre usa Modo LAZO (last_count=0)
      (vla-EndUndoMark (vla-get-ActiveDocument (vlax-get-acad-object)))
      (TMD:align-modal-loop ss 0)
    )
  )
  (princ)
)

(defun c:TMD_AL_L () (TMD:al-direct "L"))
(defun c:TMD_AL_R () (TMD:al-direct "R"))
(defun c:TMD_AL_T () (TMD:al-direct "T"))
(defun c:TMD_AL_B () (TMD:al-direct "B"))
(defun c:TMD_AL_C () (TMD:al-direct "C"))
(defun c:TMD_AL_E () (TMD:al-direct "E"))
(defun c:TMD_DIST_H () (TMD:al-direct "DIST_H"))
(defun c:TMD_DIST_V () (TMD:al-direct "DIST_V"))

;;; -------------------------------------------------------------------------------------
;;; 5. DISTRIBUCIÓN
;;; -------------------------------------------------------------------------------------

(defun TMD:distribute-execute (ent_list mode / sorted data_list p1 p2 count total_dist step i target_coord current_coord dx dy ent vla-obj)
  (if (< (length ent_list) 3) (progn (princ "\n[!] Selecione pelo menos 3 objetos.") (exit)))
  (setq data_list (mapcar '(lambda (e) (cons e (TMD:align-get-data e))) ent_list))
  (if (= mode "DIST_H")
    (setq sorted (vl-sort data_list '(lambda (a b) (< (car (nth 2 (cdr a))) (car (nth 2 (cdr b)))))))
    (setq sorted (vl-sort data_list '(lambda (a b) (< (cadr (nth 2 (cdr a))) (cadr (nth 2 (cdr b)))))))
  )
  (setq count (length sorted) p1 (nth 2 (cdr (car sorted))) p2 (nth 2 (cdr (last sorted))))
  (setq total_dist (if (= mode "DIST_H") (- (car p2) (car p1)) (- (cadr p2) (cadr p1))) step (/ total_dist (1- count)) i 1)
  (while (< i (1- count))
    (setq ent (car (nth i sorted)) vla-obj (vlax-ename->vla-object ent)
          current_coord (if (= mode "DIST_H") (car (nth 2 (cdr (nth i sorted)))) (cadr (nth 2 (cdr (nth i sorted)))))
          target_coord (if (= mode "DIST_H") (+ (car p1) (* i step)) (+ (cadr p1) (* i step)))
          val (- target_coord current_coord))
    (if (= mode "DIST_H") (setq dx val dy 0.0) (setq dx 0.0 dy val))
    (vla-move vla-obj (vlax-3d-point '(0 0 0)) (vlax-3d-point (list dx dy 0.0))) (setq i (1+ i))
  )
)

(princ "\n[TMD] Motor de Alinhamento Industrial v4.5 Cargado.")
(princ)
