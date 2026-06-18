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
(defun c:TMD_BUILD ( / ss i ent etype solid_list wire_list count w_ent)
  (princ "\n[BUILD] Iniciando compilación universal...")
  (setq ss (cadr (ssgetfirst)))
  (if (not ss) (setq ss (ssget '((0 . "LINE,3DSOLID")))))
  (if (not ss) (progn (princ "\n[!] Nenhuma entidade selecionada.") (exit)))

  (setq wire_list (list) solid_list (list) i 0 count 0)
  (while (< i (sslength ss))
    (setq ent (ssname ss i) etype (cdr (assoc 0 (entget ent))))
    (cond
      ((= etype "LINE") 
       (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE") 
         (setq wire_list (cons ent wire_list))
       )
      )
      ((= etype "3DSOLID") 
       (if (vlax-ldata-get ent "TMD_NOME") 
         (setq solid_list (cons ent solid_list))
       )
      )
    )
    (setq i (1+ i))
  )

  (if (or (> (length wire_list) 0) (> (length solid_list) 0))
    (progn
      (setq *TMD-AUTO-JOINT* "Sim")
      (foreach s solid_list 
        (TMD:build-single-wire s) 
        (setq count (1+ count))
      )
      (foreach w wire_list 
        (TMD:build-single-wire w) 
        (setq count (1+ count))
      )
      (princ (strcat "\n[BUILD] Finalizado: " (itoa count) " elementos."))
    )
    (princ "\n[!] Nenhum elemento BIM válido encontrado.")
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
;;; DECISIÓN: La geometría física SIEMPRE tiene prioridad sobre LData.
;;;   LData es un espejo de la realidad, nunca al revés.
;;;   - Lee rotación del sólido existente via análisis de sección transversal
;;;   - Re-evalúa TIPO (VIGA/COLUNA/CONTRAV.) según orientación del wire
;;;   - Actualiza PT_A/PT_B con la posición actual del wire
;;;   Ref: TMD_BIM_Sync_Protocol.md
;;; =====================================================================================
(defun TMD:build-sync-reality (ent / params old_solid_h old_solid real_rot e_data ptA ptB tipo)
  (if (and ent (entget ent) (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE"))
    (progn
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (if params
        (progn
          ;; --- 1. Sincronizar ROTACIÓN del sólido físico ---
          (setq old_solid_h (vlax-ldata-get ent "TMD_CHILD_SOLID"))
          (if (and old_solid_h (setq old_solid (handent old_solid_h)) (entget old_solid))
            (if TMD:sync-extract-rotation
              (progn
                (setq real_rot (TMD:sync-extract-rotation ent old_solid))
                (if real_rot
                  (progn
                    (princ (strcat "\n    [V] Sincronização de Pose: " (rtos real_rot 2 1) "°"))
                    (setq params (if (assoc "ROTACAO" params)
                      (subst (cons "ROTACAO" real_rot) (assoc "ROTACAO" params) params)
                      (cons (cons "ROTACAO" real_rot) params)))
                    (vlax-ldata-put ent "TMD_ROTACAO" (rtos real_rot 2 1))
                  )
                )
              )
            )
          )

          ;; --- 2. Sincronizar PT_A, PT_B con posición actual del wire ---
          (setq e_data (entget ent)
                ptA (cdr (assoc 10 e_data))
                ptB (cdr (assoc 11 e_data)))
          (setq params (if (assoc "PT_A" params)
            (subst (cons "PT_A" ptA) (assoc "PT_A" params) params)
            (cons (cons "PT_A" ptA) params)))
          (setq params (if (assoc "PT_B" params)
            (subst (cons "PT_B" ptB) (assoc "PT_B" params) params)
            (cons (cons "PT_B" ptB) params)))

          ;; --- 3. Re-evaluar TIPO según vector del wire ---
          (if TMD:wire-evaluate-vector
            (progn
              (setq tipo (TMD:wire-evaluate-vector ptA ptB))
              (vlax-ldata-put ent "TMD_TIPO" tipo)
            )
          )

          ;; --- 4. Persistir TMD_PARAMS sincronizado ---
          (vlax-ldata-put ent "TMD_PARAMS" params)
        )
      )
    )
  )
)

;;; =====================================================================================
;;; 3B. FASE 2: RECONSTRUCCIÓN DESDE LDATA (SIN LECTURA FÍSICA)
;;; -------------------------------------------------------------------------------------
;;; DECISIÓN: Esta función NUNCA lee la geometría del sólido existente.
;;;   Confía en TMD_PARAMS (ya sincronizado por Fase 1 o editado por el usuario).
;;;   Borra el sólido viejo y crea uno nuevo según los datos almacenados.
;;; =====================================================================================
(defun TMD:joints-apply-all (solid_v cuts / h_m mode gap ev em wire_m solid_m w_v_temp res_m res_v wire_v)
  (vl-load-com)
  (if (not j2:do-flush) (load "TMD_JOINTS.lsp" nil))
  (if (and j2:do-flush cuts)
    (progn
      (foreach c cuts
        (setq h_m (car c)
              mode (cadr c)
              gap (caddr c)
              ev (nth 4 c)
              em (nth 5 c))
        
        ;; Encontrar el sólido maestro a partir de su handle
        (setq solid_m (handent h_m))
        (if (and solid_m (entget solid_m))
          (progn
            (cond
              ((= mode "Flush")
               ;; Generar un wire virtual temporal para el sólido maestro
               (setq res_m (TMD:solid-extract-axis-points solid_m))
               (if res_m
                 (progn
                   (setq old_lay (getvar "CLAYER")) (setvar "CLAYER" "0")
                   (vl-cmdf "_.LINE" "_non" (car res_m) "_non" (cadr res_m) "")
                   (setq wire_m (entlast)) (setvar "CLAYER" old_lay)
                   (j2:do-flush solid_v wire_m gap)
                   (entdel wire_m)
                 )
               )
              )
              ((= mode "Miter")
               ;; Generar wires virtuales temporales para víctima y maestro
               (setq res_v (TMD:solid-extract-axis-points solid_v))
               (setq res_m (TMD:solid-extract-axis-points solid_m))
               (if (and res_v res_m)
                 (progn
                   (setq old_lay (getvar "CLAYER")) (setvar "CLAYER" "0")
                   (vl-cmdf "_.LINE" "_non" (car res_v) "_non" (cadr res_v) "")
                   (setq wire_v (entlast))
                   (vl-cmdf "_.LINE" "_non" (car res_m) "_non" (cadr res_m) "")
                   (setq wire_m (entlast)) (setvar "CLAYER" old_lay)
                   (j2:do-miter solid_v wire_v wire_m)
                   (entdel wire_v)
                   (entdel wire_m)
                 )
               )
              )
            )
          )
        )
      )
    )
  )
)

(defun TMD:build-reconstruct (ent / params p_nome ptA ptB p_forma p_x p_y p_e dist just rot
                                    lay solid_lay solid_ent old_solid_h old_solid e_data cutters)
  (if (and ent (entget ent) (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE"))
    (progn
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (if params
        (progn
          ;; --- 1. Eliminar sólido anterior ---
          (setq old_solid_h (vlax-ldata-get ent "TMD_CHILD_SOLID"))
          (if (and old_solid_h (setq old_solid (handent old_solid_h)) (entget old_solid))
            (entdel old_solid)
          )

          ;; --- 2. Extraer parámetros de construcción ---
          (setq p_nome (vlax-ldata-get ent "TMD_NOME") e_data (entget ent)
                ptA (cdr (assoc 10 e_data)) ptB (cdr (assoc 11 e_data)) dist (distance ptA ptB)
                p_forma (cdr (assoc "FORMA" params)) p_x (cdr (assoc "DIM_X" params))
                p_y (cdr (assoc "DIM_Y" params)) p_e (cdr (assoc "ESPESSURA" params))
                just (cdr (assoc "JUSTIFICACAO" params)) rot (cdr (assoc "ROTACAO" params)))

          ;; --- 3. Determinar capa correcta ---
          (setq lay (cdr (assoc 8 e_data)))
          (setq solid_lay (if (vl-string-search "WIRE-" lay) (vl-string-subst "06-" "WIRE-" lay) lay))
          (if (not (tblsearch "LAYER" solid_lay)) (vl-cmdf "_.-LAYER" "_M" solid_lay ""))

          ;; --- 4. Construir geometría ---
          (setq solid_ent (TMD:viga-build-geom nil ptA ptB just rot p_nome p_forma p_x p_y p_e 0.0 "ACO" dist))

          ;; --- 5. Inyectar metadatos BIM ---
          (if solid_ent
            (progn
              (vlax-ldata-put solid_ent "TMD_PARAMS" params)
              (vlax-ldata-put solid_ent "TMD_NOME" p_nome)
              (vlax-ldata-put solid_ent "TMD_TIPO" (vlax-ldata-get ent "TMD_TIPO"))
              (vlax-ldata-put solid_ent "TMD_CLASSE" "ESTRUTURA")
              (vlax-ldata-put solid_ent "TMD_COMPILADO" "SIM")
              
              (vlax-ldata-put solid_ent "TMD_NIVEL_INI" (vlax-ldata-get ent "TMD_NIVEL_INI"))
              (vlax-ldata-put solid_ent "TMD_NIVEL_FIM" (vlax-ldata-get ent "TMD_NIVEL_FIM"))
              (vlax-ldata-put solid_ent "TMD_AFASTAMENTO" (vlax-ldata-get ent "TMD_AFASTAMENTO"))
              (vlax-ldata-put solid_ent "TMD_AFASTAMENTO_TOPO" (vlax-ldata-get ent "TMD_AFASTAMENTO_TOPO"))

              (vlax-ldata-put solid_ent "TMD_PARENT_WIRE" (vla-get-handle (vlax-ename->vla-object ent)))
              (vlax-ldata-put ent "TMD_CHILD_SOLID" (vla-get-handle (vlax-ename->vla-object solid_ent)))
              (vlax-ldata-put ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object ent)))
              (vlax-ldata-put solid_ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object solid_ent)))
              
              ;; Recuperar y aplicar juntas almacenadas en el wire
              (setq cutters (vlax-ldata-get ent "TMD_CUTTERS"))
              (if cutters
                (progn
                  (vlax-ldata-put solid_ent "TMD_CUTTERS" cutters)
                  (TMD:joints-apply-all solid_ent cutters)
                )
              )
            )
          )
        )
      )
    )
  )
)

(defun TMD:build-reconstruct-solid (s_ent / params p_nome p_tipo p_forma p_x p_y p_e just rot
                                            ptA ptB dist res new_solid lay e_data cutters)
  (if (and s_ent (entget s_ent) (= (cdr (assoc 0 (entget s_ent))) "3DSOLID"))
    (progn
      ;; 1. Extraer parámetros y metadatos del sólido actual
      (setq params (vlax-ldata-get s_ent "TMD_PARAMS"))
      (setq p_nome (vlax-ldata-get s_ent "TMD_NOME"))
      (setq p_tipo (vlax-ldata-get s_ent "TMD_TIPO"))
      (setq cutters (vlax-ldata-get s_ent "TMD_CUTTERS"))
      
      ;; 2. Extraer extremos físicos actuales "al vuelo" directamente de la masa física
      (setq res (TMD:solid-extract-axis-points s_ent))
      (setq ptA (car res)
            ptB (cadr res)
            dist (nth 2 res))
      
      ;; 3. Determinar capa
      (setq e_data (entget s_ent))
      (setq lay (cdr (assoc 8 e_data)))
      (if (not (tblsearch "LAYER" lay)) (vl-cmdf "_.-LAYER" "_M" lay ""))
      
      (if (not params)
        (progn
          (setq p_forma "RECT_VAZIO" p_x 100.0 p_y 100.0 p_e 3.0 just "MC" rot 0.0)
          (setq params (list (cons "FORMA" p_forma) (cons "DIM_X" p_x) (cons "DIM_Y" p_y) (cons "ESPESSURA" p_e) (cons "LABIO" 0.0) (cons "MATERIAL" "ACO") (cons "DISTANCIA" dist) (cons "JUSTIFICACAO" just) (cons "ROTACAO" rot) (cons "PT_A" ptA) (cons "PT_B" ptB)))
        )
        (progn
          (setq p_forma (cdr (assoc "FORMA" params))
                p_x (cdr (assoc "DIM_X" params))
                p_y (cdr (assoc "DIM_Y" params))
                p_e (cdr (assoc "ESPESSURA" params))
                just (cdr (assoc "JUSTIFICACAO" params))
                rot (cdr (assoc "ROTACAO" params)))
          ;; Actualizar extremos y distancia física recalculada en params
          (setq params (subst (cons "PT_A" ptA) (assoc "PT_A" params) params))
          (setq params (subst (cons "PT_B" ptB) (assoc "PT_B" params) params))
          (setq params (subst (cons "DISTANCIA" dist) (assoc "DISTANCIA" params) params))
        )
      )
      
      ;; 4. Construir nueva geometría pura
      (setq new_solid (TMD:viga-build-geom nil ptA ptB just rot p_nome p_forma p_x p_y p_e 0.0 "ACO" dist))
      
      ;; 5. Inyectar metadatos y aplicar juntas
      (if new_solid
        (progn
          (vlax-ldata-put new_solid "TMD_PARAMS" params)
          (vlax-ldata-put new_solid "TMD_NOME" p_nome)
          (vlax-ldata-put new_solid "TMD_TIPO" p_tipo)
          (vlax-ldata-put new_solid "TMD_CLASSE" "ESTRUTURA")
          (vlax-ldata-put new_solid "TMD_COMPILADO" "SIM")
          (vlax-ldata-put new_solid "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object new_solid)))
          
          (vlax-ldata-put new_solid "TMD_NIVEL_INI" (vlax-ldata-get s_ent "TMD_NIVEL_INI"))
          (vlax-ldata-put new_solid "TMD_NIVEL_FIM" (vlax-ldata-get s_ent "TMD_NIVEL_FIM"))
          (vlax-ldata-put new_solid "TMD_AFASTAMENTO" (vlax-ldata-get s_ent "TMD_AFASTAMENTO"))
          (vlax-ldata-put new_solid "TMD_AFASTAMENTO_TOPO" (vlax-ldata-get s_ent "TMD_AFASTAMENTO_TOPO"))
          
          (if cutters
            (progn
              (vlax-ldata-put new_solid "TMD_CUTTERS" cutters)
              (TMD:joints-apply-all new_solid cutters)
            )
          )
          
          (vl-cmdf "_.CHPROP" new_solid "" "_LA" lay "")
          (entdel s_ent)
          new_solid
        )
        nil
      )
    )
  )
)

;;; =====================================================================================
;;; 3C. WRAPPER DE COMPATIBILIDAD UNIFICADO (SOLID Y WIRE)
;;; -------------------------------------------------------------------------------------
;;; Mantiene la API existente y delega de forma inteligente según el tipo de objeto.
;;; =====================================================================================
(defun TMD:build-single-wire (ent)
  (if (and ent (entget ent))
    (cond
      ((= (cdr (assoc 0 (entget ent))) "3DSOLID")
       (TMD:build-reconstruct-solid ent)
      )
      ((= (cdr (assoc 0 (entget ent))) "LINE")
       (TMD:build-sync-reality ent)
       (TMD:build-reconstruct ent)
      )
    )
  )
)

(princ "\n[TMD] Motor BUILD v6.0.0 (Solid-Centric Autónomo) Cargado.") (princ)
