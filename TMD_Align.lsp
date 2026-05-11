;;; =====================================================================================
;;; TM DIGITAL - MOTOR DE ALINEACIÓN INDUSTRIAL (TMD_Align.lsp)
;;; =====================================================================================
;;; v5.0 - Alineación 3D (XY+Z), Distribución Centro/Gap/Fija
;;;   Alineación: L R T B C E (XY) + U D Z (profundidad)
;;;   Distribución centro-a-centro: DIST_H DIST_V DIST_Z
;;;   Distribución por gaps (borde-a-borde): GAPH GAPV GAPZ
;;;   Distribución distancia fija: FIXH FIXV FIXZ
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; 1. UTILIDADES GEOMÉTRICAS (SOPORTE DE GRUPOS + 3D)
;;; -------------------------------------------------------------------------------------

(defun TMD:align-get-data (ent / obj minpt maxpt p1 p2 midw midh midz grp items-bbox)
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
        midh (/ (+ (cadr p1) (cadr p2)) 2.0)
        midz (/ (+ (caddr p1) (caddr p2)) 2.0))
  ;; Returns: (0:p1_min 1:p2_max 2:center 3:width 4:height 5:depth)
  (list p1 p2 (list midw midh midz)
        (- (car p2) (car p1)) (- (cadr p2) (cadr p1)) (- (caddr p2) (caddr p1)))
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

(defun TMD:align-get-reference (ent_list mode last_count / total-min total-max first data bmin bmax master-data)
  (setq total-min nil total-max nil first t)
  (foreach ent ent_list
    (setq data (TMD:align-get-data ent) bmin (car data) bmax (cadr data))
    (if first
      (setq total-min bmin total-max bmax first nil)
      (setq total-min (mapcar 'min total-min bmin) total-max (mapcar 'max total-max bmax))
    )
  )
  (if (and last_count (= last_count 1) (> (length ent_list) 1))
    (setq master-data (TMD:align-get-data (last ent_list)))
    (setq master-data nil)
  )
  (if (not master-data)
    (list total-min total-max
          (list (/ (+ (car total-min) (car total-max)) 2.0)
                (/ (+ (cadr total-min) (cadr total-max)) 2.0)
                (/ (+ (caddr total-min) (caddr total-max)) 2.0)))
    master-data
  )
)

;;; -------------------------------------------------------------------------------------
;;; 3. MOTOR DE MOVIMIENTO (3D CON SOPORTE DE GRUPOS)
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

(defun TMD:align-execute-ss (ss mode last_count / i ent_list)
  (setq i 0 ent_list nil)
  (repeat (sslength ss) (setq ent_list (append ent_list (list (ssname ss i)))) (setq i (1+ i)))
  (cond
    ((member mode '("DIST_H" "DIST_V" "DIST_Z")) (TMD:distribute-execute ent_list mode))
    ((member mode '("GAPH" "GAPV" "GAPZ"))       (TMD:distribute-gap-execute ent_list mode))
    (T (TMD:align-move ent_list mode last_count))
  )
)

(defun TMD:align-move (ent_list mode last_count / ref_data target_p1 target_p2 target_center
                                                   effective_list unit u_type target data
                                                   p1 p2 center dx dy dz res)
  (setq ref_data (TMD:align-get-reference ent_list mode last_count))
  (setq target_p1 (car ref_data) target_p2 (cadr ref_data) target_center (caddr ref_data))
  (setq effective_list (TMD:align-normalize ent_list))
  (foreach unit effective_list
    (setq u_type (car unit) target (cadr unit))
    (setq data (if (= u_type "GROUP")
      (TMD:align-get-data (vlax-for x target (setq res x)))
      (TMD:align-get-data target)))
    (setq p1 (car data) p2 (cadr data) center (caddr data) dx 0.0 dy 0.0 dz 0.0)
    (cond
      ;; XY alignment
      ((= mode "L") (setq dx (- (car target_p1) (car p1))))
      ((= mode "R") (setq dx (- (car target_p2) (car p2))))
      ((= mode "T") (setq dy (- (cadr target_p2) (cadr p2))))
      ((= mode "B") (setq dy (- (cadr target_p1) (cadr p1))))
      ((= mode "C") (setq dx (- (car target_center) (car center))))
      ((= mode "E") (setq dy (- (cadr target_center) (cadr center))))
      ;; Z alignment
      ((= mode "U") (setq dz (- (caddr target_p2) (caddr p2))))
      ((= mode "D") (setq dz (- (caddr target_p1) (caddr p1))))
      ((= mode "Z") (setq dz (- (caddr target_center) (caddr center))))
    )
    (if (or (/= dx 0.0) (/= dy 0.0) (/= dz 0.0))
      (if (= u_type "GROUP")
        (vlax-for item target (vla-move item (vlax-3d-point '(0 0 0)) (vlax-3d-point (list dx dy dz))))
        (vla-move (vlax-ename->vla-object target) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list dx dy dz))))
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; 4. DISTRIBUCIÓN CENTRO-A-CENTRO
;;; -------------------------------------------------------------------------------------

(defun TMD:distribute-execute (ent_list mode / sorted data_list axis_idx count p1 p2
                                               total_dist step i ent current_coord target_coord val dx dy dz)
  (if (< (length ent_list) 3) (progn (princ "\n[!] Selecione pelo menos 3 objetos.") (exit)))
  (setq data_list (mapcar '(lambda (e) (cons e (TMD:align-get-data e))) ent_list))
  (cond
    ((= mode "DIST_H") (setq axis_idx 0))
    ((= mode "DIST_V") (setq axis_idx 1))
    ((= mode "DIST_Z") (setq axis_idx 2))
  )
  ;; Sort by center on axis
  (setq sorted (vl-sort data_list
    '(lambda (a b) (< (nth axis_idx (nth 2 (cdr a))) (nth axis_idx (nth 2 (cdr b)))))))
  (setq count (length sorted)
        p1 (nth 2 (cdr (car sorted)))
        p2 (nth 2 (cdr (last sorted)))
        total_dist (- (nth axis_idx p2) (nth axis_idx p1))
        step (/ total_dist (float (1- count)))
        i 1)
  (while (< i (1- count))
    (setq ent (car (nth i sorted))
          current_coord (nth axis_idx (nth 2 (cdr (nth i sorted))))
          target_coord (+ (nth axis_idx p1) (* i step))
          val (- target_coord current_coord)
          dx 0.0 dy 0.0 dz 0.0)
    (cond ((= axis_idx 0) (setq dx val)) ((= axis_idx 1) (setq dy val)) ((= axis_idx 2) (setq dz val)))
    (vla-move (vlax-ename->vla-object ent) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list dx dy dz)))
    (setq i (1+ i))
  )
)

;;; -------------------------------------------------------------------------------------
;;; 5. DISTRIBUCIÓN POR GAPS (BORDE-A-BORDE)
;;; -------------------------------------------------------------------------------------
;;; Distribuye con espacio IGUAL entre los bordes de los objetos.
;;; Primer y último objeto permanecen fijos.

(defun TMD:distribute-gap-execute (ent_list mode / sorted data_list axis_idx dim_idx
                                              first_data last_data total_span sum_dims gap
                                              current_pos i ent data current_min target_min
                                              delta dx dy dz)
  (if (< (length ent_list) 3) (progn (princ "\n[!] Selecione pelo menos 3 objetos.") (exit)))
  (setq data_list (mapcar '(lambda (e) (cons e (TMD:align-get-data e))) ent_list))
  (cond
    ((= mode "GAPH") (setq axis_idx 0 dim_idx 3))
    ((= mode "GAPV") (setq axis_idx 1 dim_idx 4))
    ((= mode "GAPZ") (setq axis_idx 2 dim_idx 5))
  )
  ;; Sort by min point on axis
  (setq sorted (vl-sort data_list
    '(lambda (a b) (< (nth axis_idx (car (cdr a))) (nth axis_idx (car (cdr b)))))))
  (setq first_data (cdr (car sorted))
        last_data (cdr (last sorted)))
  ;; total_span = last.max - first.min
  (setq total_span (- (nth axis_idx (cadr last_data)) (nth axis_idx (car first_data))))
  ;; Sum all object dimensions
  (setq sum_dims 0.0)
  (foreach item sorted (setq sum_dims (+ sum_dims (nth dim_idx (cdr item)))))
  ;; Gap between edges
  (setq gap (/ (- total_span sum_dims) (float (1- (length sorted)))))
  ;; Position intermediates: current_pos = first object max edge
  (setq current_pos (nth axis_idx (cadr first_data)) i 1)
  (while (< i (1- (length sorted)))
    (setq ent (car (nth i sorted))
          data (cdr (nth i sorted))
          current_min (nth axis_idx (car data))
          target_min (+ current_pos gap)
          delta (- target_min current_min)
          dx 0.0 dy 0.0 dz 0.0)
    (cond ((= axis_idx 0) (setq dx delta)) ((= axis_idx 1) (setq dy delta)) ((= axis_idx 2) (setq dz delta)))
    (vla-move (vlax-ename->vla-object ent) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list dx dy dz)))
    (setq current_pos (+ target_min (nth dim_idx data)))
    (setq i (1+ i))
  )
)

;;; -------------------------------------------------------------------------------------
;;; 6. DISTRIBUCIÓN DISTANCIA FIJA (CADA X)
;;; -------------------------------------------------------------------------------------
;;; Distribuye objetos a una distancia fija entre centros.
;;; El primer objeto permanece fijo.

(defun TMD:distribute-fixed-execute (ent_list mode dist / sorted data_list axis_idx
                                                         current_pos i ent data
                                                         target_pos current_center delta dx dy dz)
  (if (< (length ent_list) 2) (progn (princ "\n[!] Selecione pelo menos 2 objetos.") (exit)))
  (setq data_list (mapcar '(lambda (e) (cons e (TMD:align-get-data e))) ent_list))
  (cond
    ((= mode "FIXH") (setq axis_idx 0))
    ((= mode "FIXV") (setq axis_idx 1))
    ((= mode "FIXZ") (setq axis_idx 2))
  )
  (setq sorted (vl-sort data_list
    '(lambda (a b) (< (nth axis_idx (nth 2 (cdr a))) (nth axis_idx (nth 2 (cdr b)))))))
  ;; First object center = anchor
  (setq current_pos (nth axis_idx (nth 2 (cdr (car sorted)))) i 1)
  (while (< i (length sorted))
    (setq ent (car (nth i sorted))
          data (cdr (nth i sorted))
          target_pos (+ current_pos dist)
          current_center (nth axis_idx (nth 2 data))
          delta (- target_pos current_center)
          dx 0.0 dy 0.0 dz 0.0)
    (cond ((= axis_idx 0) (setq dx delta)) ((= axis_idx 1) (setq dy delta)) ((= axis_idx 2) (setq dz delta)))
    (vla-move (vlax-ename->vla-object ent) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list dx dy dz)))
    (setq current_pos target_pos i (1+ i))
  )
)

;;; -------------------------------------------------------------------------------------
;;; 7. BUCLE MODAL E INTERFAZ
;;; -------------------------------------------------------------------------------------

(defun TMD:align-modal-loop (ss last_count / loop gr code val key doc sub d ent_list i)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)) loop t)
  (princ "\n--- ALIGN [L/R/C] Horiz | [T/B/E] Vert | [U/D/Z] Prof. ---")
  (princ "\n--- DIST  [H] Even-H | [V] Even-V | [W] Even-Z ---")
  (princ "\n--- [G] Gap | [F] Fijo | Ctrl+Z Undo | ENTER finalizar ---")
  (sssetfirst nil ss)
  (while loop
    (setq gr (grread T 15 0) code (car gr) val (cadr gr))
    (cond
      ((= code 2)
        (cond
          ;; Ctrl+Z = Undo (ASCII 26, distinto de U=85)
          ((= val 26)
            (vl-cmdf "_.U")
            (princ "\n  [UNDO] Desfeito. Pressione nova tecla...")
            (sssetfirst nil ss))

          ;; Regular keys
          (T
            (setq key (strcase (chr val)))
            (cond
              ;; Alignment modes (instant)
              ((member key '("L" "R" "T" "B" "C" "E" "U" "D" "Z"))
               (vla-StartUndoMark doc) (TMD:align-execute-ss ss key last_count) (vla-EndUndoMark doc) (sssetfirst nil ss))

              ;; Center-to-center distribution
              ((= key "H") (vla-StartUndoMark doc) (TMD:align-execute-ss ss "DIST_H" last_count) (vla-EndUndoMark doc) (sssetfirst nil ss))
              ((= key "V") (vla-StartUndoMark doc) (TMD:align-execute-ss ss "DIST_V" last_count) (vla-EndUndoMark doc) (sssetfirst nil ss))
              ((= key "W") (vla-StartUndoMark doc) (TMD:align-execute-ss ss "DIST_Z" last_count) (vla-EndUndoMark doc) (sssetfirst nil ss))

              ;; Gap distribution (sub-menu)
              ((= key "G")
                (initget "H V Z")
                (setq sub (getkword "\n[GAP] Eixo? [H/V/Z]: "))
                (if sub
                  (progn (vla-StartUndoMark doc)
                         (TMD:align-execute-ss ss (strcat "GAP" sub) last_count)
                         (vla-EndUndoMark doc) (sssetfirst nil ss)))
                (princ "\n--- ALIGN ativo. Pressione tecla ou ENTER ---"))

              ;; Fixed distance (sub-menu + input)
              ((= key "F")
                (setq d (getdist "\n[FIXO] Distância entre centros: "))
                (if d
                  (progn
                    (initget "H V Z")
                    (setq sub (getkword "\n[FIXO] Eixo? [H/V/Z]: "))
                    (if sub
                      (progn
                        (vla-StartUndoMark doc)
                        (setq ent_list nil i 0)
                        (repeat (sslength ss) (setq ent_list (append ent_list (list (ssname ss i)))) (setq i (1+ i)))
                        (TMD:distribute-fixed-execute ent_list (strcat "FIX" sub) d)
                        (vla-EndUndoMark doc) (sssetfirst nil ss)))))
                (princ "\n--- ALIGN ativo. Pressione tecla ou ENTER ---"))

              ;; Exit
              ((member val '(13 32)) (setq loop nil))
              ((= val 27) (setq loop nil))
            )
          )
        )
      )
      ((or (= code 3) (= code 25)) (setq loop nil))
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; 8. COMANDO PRINCIPAL (FLUJO COMPLETO POR LÍNEA DE COMANDOS)
;;; -------------------------------------------------------------------------------------

(defun c:TMD_ALIGN ( / ss_final sel_set last_sel_count loop ss_impl i opt sub d ent_list doc)
  (setq ss_final (ssadd) last_sel_count 0)
  (if (setq ss_impl (ssget "_I"))
    (setq ss_final ss_impl last_sel_count 0)
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
    (progn
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)) loop t)
      (sssetfirst nil ss_final)
      (while loop
        (initget "Alinhar Distribuir Gap Fixo Undo Rápido Sair")
        (setq opt (getkword "\n[Alinhar/Distribuir/Gap/Fixo/Undo/Rápido/Sair] <Rápido>: "))
        (if (not opt) (setq opt "Rápido"))
        (cond
          ;; --- ALINHAR: 9 direcciones ---
          ((= opt "Alinhar")
            (initget "L R T B C E U D Z")
            (setq sub (getkword "\n  [L]eft [R]ight [T]op [B]ottom [C]enter-H c[E]nter-V [U]p [D]own [Z]-center: "))
            (if sub
              (progn (vla-StartUndoMark doc)
                     (TMD:align-execute-ss ss_final sub last_sel_count)
                     (vla-EndUndoMark doc) (sssetfirst nil ss_final))))

          ;; --- DISTRIBUIR: centro-a-centro ---
          ((= opt "Distribuir")
            (initget "H V Z")
            (setq sub (getkword "\n  Eixo [H]orizontal / [V]ertical / [Z]: "))
            (if sub
              (progn (vla-StartUndoMark doc)
                     (TMD:align-execute-ss ss_final (strcat "DIST_" sub) 0)
                     (vla-EndUndoMark doc) (sssetfirst nil ss_final))))

          ;; --- GAP: borde-a-borde ---
          ((= opt "Gap")
            (initget "H V Z")
            (setq sub (getkword "\n  Eixo [H]orizontal / [V]ertical / [Z]: "))
            (if sub
              (progn (vla-StartUndoMark doc)
                     (TMD:align-execute-ss ss_final (strcat "GAP" sub) 0)
                     (vla-EndUndoMark doc) (sssetfirst nil ss_final))))

          ;; --- FIXO: distancia fija ---
          ((= opt "Fixo")
            (setq d (getdist "\n  Distância entre centros: "))
            (if d
              (progn
                (initget "H V Z")
                (setq sub (getkword "\n  Eixo [H]orizontal / [V]ertical / [Z]: "))
                (if sub
                  (progn
                    (vla-StartUndoMark doc)
                    (setq ent_list nil i 0)
                    (repeat (sslength ss_final) (setq ent_list (append ent_list (list (ssname ss_final i)))) (setq i (1+ i)))
                    (TMD:distribute-fixed-execute ent_list (strcat "FIX" sub) d)
                    (vla-EndUndoMark doc) (sssetfirst nil ss_final))))))

          ;; --- UNDO: deshacer último paso ---
          ((= opt "Undo")
            (vl-cmdf "_.U")
            (princ "\n  [UNDO] Desfeito.")
            (sssetfirst nil ss_final))

          ;; --- RÁPIDO: modal grread (tecla única, sin ENTER) ---
          ((= opt "Rápido")
            (TMD:align-modal-loop ss_final last_sel_count)
            (setq loop nil))

          ;; --- SAIR ---
          ((= opt "Sair") (setq loop nil))
        )
      )
    )
  )
  (princ "\n[TMD] Alineación finalizada.") (princ)
)

;;; -------------------------------------------------------------------------------------
;;; 9. MICRO-FUNCIONES PARA RIBBON
;;; -------------------------------------------------------------------------------------

;; Helper: Alineación directa (One-shot, mantiene selección)
(defun TMD:al-direct (mode / ss doc)
  (setq ss (ssget "_I"))
  (if (not ss) (setq ss (ssget)))
  (if ss
    (progn
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)
      (TMD:align-execute-ss ss mode 0)
      (vla-EndUndoMark doc)
      (sssetfirst nil ss)
    )
  )
  (princ)
)

;; Helper: Distribución directa (One-shot, mantiene selección)
(defun TMD:dist-direct (mode / ss doc)
  (setq ss (ssget "_I"))
  (if (not ss) (setq ss (ssget)))
  (if ss
    (progn
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)
      (TMD:align-execute-ss ss mode 0)
      (vla-EndUndoMark doc)
      (sssetfirst nil ss)
    )
  )
  (princ)
)

;; Helper: Distancia fija directa (One-shot, mantiene selección)
(defun TMD:fix-direct (mode / ss d ent_list i doc)
  (setq ss (ssget "_I"))
  (if (not ss) (setq ss (ssget)))
  (if (and ss (>= (sslength ss) 2))
    (progn
      (setq d (getdist "\nDistância entre centros: "))
      (if d
        (progn
          (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
          (vla-StartUndoMark doc)
          (setq ent_list nil i 0)
          (repeat (sslength ss) (setq ent_list (append ent_list (list (ssname ss i)))) (setq i (1+ i)))
          (TMD:distribute-fixed-execute ent_list mode d)
          (vla-EndUndoMark doc)
          (sssetfirst nil ss)
        )
      )
    )
  )
  (princ)
)

;; --- ALINEACIÓN XY (existentes) ---
(defun c:TMD_AL_L () (TMD:al-direct "L"))
(defun c:TMD_AL_R () (TMD:al-direct "R"))
(defun c:TMD_AL_T () (TMD:al-direct "T"))
(defun c:TMD_AL_B () (TMD:al-direct "B"))
(defun c:TMD_AL_C () (TMD:al-direct "C"))
(defun c:TMD_AL_E () (TMD:al-direct "E"))

;; --- ALINEACIÓN Z (nuevos) ---
(defun c:TMD_AL_U () (TMD:al-direct "U"))
(defun c:TMD_AL_D () (TMD:al-direct "D"))
(defun c:TMD_AL_Z () (TMD:al-direct "Z"))

;; --- DISTRIBUCIÓN CENTRO-A-CENTRO (existentes + Z) ---
(defun c:TMD_DIST_H () (TMD:dist-direct "DIST_H"))
(defun c:TMD_DIST_V () (TMD:dist-direct "DIST_V"))
(defun c:TMD_DIST_Z () (TMD:dist-direct "DIST_Z"))

;; --- DISTRIBUCIÓN POR GAPS / BORDE-A-BORDE (nuevos) ---
(defun c:TMD_GAP_H () (TMD:dist-direct "GAPH"))
(defun c:TMD_GAP_V () (TMD:dist-direct "GAPV"))
(defun c:TMD_GAP_Z () (TMD:dist-direct "GAPZ"))

;; --- DISTRIBUCIÓN DISTANCIA FIJA (nuevos) ---
(defun c:TMD_FIX_H () (TMD:fix-direct "FIXH"))
(defun c:TMD_FIX_V () (TMD:fix-direct "FIXV"))
(defun c:TMD_FIX_Z () (TMD:fix-direct "FIXZ"))

(princ "\n[TMD] Motor de Alinhamento Industrial v5.0 (3D + Gap + Fijo) Cargado.")
(princ)
