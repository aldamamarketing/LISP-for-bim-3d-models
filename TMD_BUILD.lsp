;;; =====================================================================================
;;; TM DIGITAL - MOTOR DE COMPILACIÓN BIM (TMD_BUILD.lsp)
;;; =====================================================================================
;;; v5.3.0 - Arquitectura 2 Fases: Realidad Física Primero.
;;;   Fase 1 (sync-reality): Lee estado físico → Actualiza LData
;;;   Fase 2 (reconstruct): Toma LData como verdad → Reconstruye
;;;   Ref: TMD_BIM_Sync_Protocol.md v2.0
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
;;; 3A. FASE 1: SINCRONIZACIÓN DE REALIDAD FÍSICA → LDATA
;;; -------------------------------------------------------------------------------------
;;; DECISIÓN (V5): La geometría física del sólido es la verdad.
;;; =====================================================================================
(defun TMD:build-sync-reality (ent / params real_rot tipo)
  (if (and ent (entget ent) (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA"))
    (progn
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (if params
        (progn
          ;; 1. Rotación real (si existe la función)
          (if TMD:sync-extract-rotation
            (progn
              (setq real_rot (TMD:sync-extract-rotation ent ent))
              (if real_rot
                (progn
                  (setq params (if (assoc "ROTACAO" params)
                    (subst (cons "ROTACAO" real_rot) (assoc "ROTACAO" params) params)
                    (cons (cons "ROTACAO" real_rot) params)))
                  (vlax-ldata-put ent "TMD_ROTACAO" (rtos real_rot 2 1))
                )
              )
            )
          )
          (vlax-ldata-put ent "TMD_PARAMS" params)
        )
      )
    )
  )
)

;;; =====================================================================================
;;; 3B. FASE 2: RECONSTRUCCIÓN DESDE LDATA (SIN LECTURA FÍSICA DE WIRE)
;;; -------------------------------------------------------------------------------------
;;; DECISIÓN (V5): Borra el sólido viejo y crea uno nuevo según su propio LData.
;;; Re-calcula la longitud y posición basándose en su BoundingBox.
;;; =====================================================================================
(defun TMD:build-reconstruct (ent / params p_nome p_forma p_x p_y p_e p_labio p_material dist just rot solid_ent s_mid s_bbox s_diff len_s s_vec ptA ptB v_x v_y off_x off_y cuts h_m mode ev cutter wire_m)
  (if (and ent (entget ent) (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA"))
    (progn
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (if params
        (progn
          ;; --- 1. Calcular PT_A y PT_B dinámicamente desde el Sólido ---
          (if (not TMD:sync-get-centroid) (load "TMD_SYNC.lsp"))
          (setq s_mid (TMD:sync-get-centroid ent)
                s_bbox (TMD:sync-get-bbox ent)
                s_diff (mapcar '- (cadr s_bbox) (car s_bbox))
                len_s (apply 'max s_diff)
                s_vec (TMD:util-vector-unit (mapcar '(lambda (d) (if (= d len_s) d 0.0)) s_diff))
                ptA (mapcar '- s_mid (mapcar '(lambda (x) (* x (/ len_s 2.0))) s_vec))
                ptB (mapcar '+ s_mid (mapcar '(lambda (x) (* x (/ len_s 2.0))) s_vec)))
          
          (setq dist len_s)

          ;; Extraer offsets de justificación actuales para compensarlos y hallar el "Centro Real" (wire imaginario)
          (setq p_x (cdr (assoc "DIM_X" params)) p_y (cdr (assoc "DIM_Y" params)) just (cdr (assoc "JUSTIFICACAO" params)))
          (setq p_x (if (= (type p_x) 'STR) (atof p_x) p_x) p_y (if (= (type p_y) 'STR) (atof p_y) p_y))
          
          (if (and (< (abs (car s_vec)) 0.01) (< (abs (cadr s_vec)) 0.01)) (setq v_x '(1.0 0.0 0.0)) (setq v_x (TMD:util-vector-unit (TMD:util-vector-cross '(0.0 0.0 1.0) s_vec))))
          (setq v_y (TMD:util-vector-unit (TMD:util-vector-cross s_vec v_x)))
          
          (setq off_x (cond ((wcmatch just "*L") (/ p_x -2.0)) ((wcmatch just "*R") (/ p_x 2.0)) (t 0.0)))
          (setq off_y (cond ((wcmatch just "T*") (/ p_y 2.0)) ((wcmatch just "B*") (/ p_y -2.0)) (t 0.0)))
          
          ;; Desplazar ptA y ptB inversamente a la justificación para obtener el eje central de trazado
          (setq ptA (mapcar '- ptA (mapcar '(lambda (v) (* v off_x)) v_x)))
          (setq ptA (mapcar '- ptA (mapcar '(lambda (v) (* v off_y)) v_y)))
          (setq ptB (mapcar '+ ptA (mapcar '(lambda (v) (* v len_s)) s_vec)))

          ;; --- 2. Extraer parámetros de construcción ---
          (setq p_nome (vlax-ldata-get ent "TMD_NOME")
                p_forma (cdr (assoc "FORMA" params))
                p_e (cdr (assoc "ESPESSURA" params))
                p_labio (cdr (assoc "LABIO" params))
                p_material (cdr (assoc "MATERIAL" params))
                rot (cdr (assoc "ROTACAO" params)))
          
          (setq p_e (if (= (type p_e) 'STR) (atof p_e) p_e)
                p_labio (if (= (type p_labio) 'STR) (atof p_labio) p_labio)
                rot (if (= (type rot) 'STR) (atof rot) rot))

          ;; --- 3. Leer cortes guardados ---
          (setq cuts (vlax-ldata-get ent "TMD_CUTTERS"))

          ;; --- 4. Eliminar sólido anterior ---
          (entdel ent)

          ;; --- 5. Construir geometría (TMD_Vigas.lsp generará el nuevo ADN V5) ---
          (setq solid_ent (TMD:viga-build-geom nil ptA ptB just rot p_nome p_forma p_x p_y p_e p_labio p_material dist))

          ;; --- 6. Aplicar cortes (JOINTS) si existen ---
          (if (and solid_ent cuts)
            (progn
              (vlax-ldata-put solid_ent "TMD_CUTTERS" cuts)
              (foreach c cuts
                (setq h_m (car c) mode (nth 1 c) ev (nth 4 c))
                (setq wire_m (handent h_m))
                (if (and wire_m (entget wire_m))
                  (if (= mode "Flush")
                    (j2:do-flush solid_ent wire_m 0.0)
                    (j2:do-miter solid_ent solid_ent wire_m) ;; Miter simplificado, j2:do-miter extrae wire internamente, ajustarlo en JOINTS
                  )
                )
              )
            )
          )
          solid_ent
        )
      )
    )
  )
)

;;; =====================================================================================
;;; 3C. WRAPPER DE COMPATIBILIDAD
;;; -------------------------------------------------------------------------------------
;;; Mantiene la API para los 18+ callers existentes.
;;; Ejecuta Fase 1 (sync realidad) → Fase 2 (rebuild) secuencialmente.
;;; =====================================================================================
(defun TMD:build-single-wire (ent)
  (TMD:build-sync-reality ent)
  (TMD:build-reconstruct ent)
)

(princ "\n[TMD] Motor BUILD v5.3.0 (Realidad Física Primero) Cargado.") (princ)
