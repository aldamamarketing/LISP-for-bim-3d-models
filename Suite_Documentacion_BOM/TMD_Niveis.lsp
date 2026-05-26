;;; =====================================================================================
;;; TM DIGITAL - GESTOR DE NÍVEIS B.I.M (TMD_Niveis.lsp)
;;; =====================================================================================
;;; v5.2.1 - Protocolo de Sincronización Individual (Ignora Grupos via PICKSTYLE)
;;; =====================================================================================

(vl-load-com)

;;; =====================================================================================
;;; 1. GESTIÓN DE DICCIONARIO (LData)
;;; =====================================================================================

(defun TMD:niveis-sort (lst)
  (vl-sort lst '(lambda (a b) (< (cadr a) (cadr b))))
)

(defun TMD:niveis-get ( / lst)
  (setq lst (vlax-ldata-get "dict_TMDigital" "NIVEIS_LIST"))
  (if (not lst) (setq lst (list (list "PISO ZERO" 0.0))))
  (TMD:niveis-sort lst)
)

(defun TMD:niveis-set (lst)
  (vlax-ldata-put "dict_TMDigital" "NIVEIS_LIST" (TMD:niveis-sort lst))
)

(defun TMD:niveis-get-ativo ( / ati)
  (setq ati (vlax-ldata-get "dict_TMDigital" "NIVEL_ATIVO"))
  (if (not ati) "PISO ZERO" ati)
)

(defun TMD:niveis-set-ativo (ati)
  (vlax-ldata-put "dict_TMDigital" "NIVEL_ATIVO" ati)
)

;;; =====================================================================================
;;; 2. MOTOR DE SINCRONIZACIÓN (DIRECTOR DE ORQUESTA)
;;; =====================================================================================

(defun TMD:niveis-sync-logic (old_name new_name old_z new_z / ss i ent count rebuild_list old_pick)
  (princ (strcat "\n[BIM SYNC] Iniciando Protocolo de Sincronización: " old_name " -> " new_name))
  
  ;; Aislamiento de Grupos: Desactivamos PICKSTYLE para procesar elementos individualmente
  (setq old_pick (getvar "PICKSTYLE"))
  (setvar "PICKSTYLE" 0)
  
  (setq rebuild_list (list) count 0)
  
  ;; ESCANEO UNIVERSAL (Sin XData)
  (setq ss (ssget "_X" '((0 . "LINE,3DSOLID"))))
  
  (if ss
    (progn
      (princ "\n[BIM SYNC] Paso 1: Actualizando geometría física de elementos...")
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (if (TMD:niveis-update-geometry ent old_name new_name old_z new_z)
          (progn
            (setq rebuild_list (cons ent rebuild_list))
            (setq count (1+ count))
          )
        )
        (setq i (1+ i))
      )
      
      ;; --- PASO 2: COMPILACIÓN MASIVA (BUILD) ---
      (if (> (length rebuild_list) 0)
        (TMD:niveis-mass-rebuild rebuild_list count)
      )
    )
  )
  
  ;; Restauración de Grupos
  (setvar "PICKSTYLE" old_pick)
  (princ "\n[BIM SYNC] Sincronización finalizada.")
)

;;; --- Sub-Modulo: Actualización de Geometría y LData (Paso 1) ---
(defun TMD:niveis-update-geometry (ent old_name new_name old_z new_z / etype n_ini n_fim changed ptA ptB off_ini off_fim edata delta_z1 delta_z2)
  (setq etype (cdr (assoc 0 (entget ent))) changed nil)
  
  (setq n_ini (vlax-ldata-get ent "TMD_NIVEL_INI")
        n_fim (vlax-ldata-get ent "TMD_NIVEL_FIM"))
  
  (if (or (equal n_ini old_name) (equal n_fim old_name))
    (progn
      (cond
        ;; Caso LINE (Wire): El "alma" del elemento
        ((= etype "LINE")
          (setq off_ini (atof (vlax-ldata-get ent "TMD_AFASTAMENTO" "0.0"))
                off_fim (atof (vlax-ldata-get ent "TMD_AFASTAMENTO_TOPO" "0.0"))
                ptA (cdr (assoc 10 (entget ent)))
                ptB (cdr (assoc 11 (entget ent))))

          ;; Lógica de Smart Move: Detectar si es traslación o deformación
          (setq delta_z1 (if (equal n_ini old_name) (- new_z old_z) 0.0))
          (setq delta_z2 (if (equal n_fim old_name) (- new_z old_z) 0.0))

          (if (equal n_ini old_name)
            (progn
              (if (/= old_name new_name) (vlax-ldata-put ent "TMD_NIVEL_INI" new_name))
              (setq ptA (list (car ptA) (cadr ptA) (+ new_z off_ini)))
              (setq changed T)
            )
          )
          (if (equal n_fim old_name)
            (progn
              (if (/= old_name new_name) (vlax-ldata-put ent "TMD_NIVEL_FIM" new_name))
              (setq ptB (list (car ptB) (cadr ptB) (+ new_z off_fim)))
              (setq changed T)
            )
          )
          
          ;; Aplicar cambio físico (MOVE o STRETCH)
          (if (and changed (/= old_z new_z))
            (progn
              ;; Si Delta Z es igual en ambos extremos, podemos hacer un vla-move (más rápido)
              (if (equal delta_z1 delta_z2 0.001)
                (progn
                  (vla-move (vlax-ename->vla-object ent) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list 0 0 delta_z1)))
                  ;; Si tiene hijo sólido, moverlo también para evitar regeneración innecesaria
                  (setq solid_h (vlax-ldata-get ent "TMD_CHILD_SOLID"))
                  (if (and solid_h (setq s_ent (handent solid_h)) (entget s_ent))
                    (vla-move (vlax-ename->vla-object s_ent) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list 0 0 delta_z1)))
                  )
                  ;; Marcamos changed como nil para evitar que entre en el rebuild_list (ya está movido)
                  (setq changed nil) 
                )
                (progn
                  ;; Si los deltas son distintos, es deformación: Actualizar línea y reconstruir
                  (setq edata (entget ent))
                  (setq edata (subst (cons 10 ptA) (assoc 10 edata) edata))
                  (setq edata (subst (cons 11 ptB) (assoc 11 edata) edata))
                  (entmod edata)
                )
              )
            )
          )
        )

        ;; Caso 3DSOLID Independiente -> Traslación pura
        ((and (= etype "3DSOLID") (not (vlax-ldata-get ent "TMD_PARENT_WIRE")))
          (if (equal n_ini old_name)
            (progn
              (if (/= old_name new_name) (vlax-ldata-put ent "TMD_NIVEL_INI" new_name))
              (if (/= old_z new_z)
                (vla-move (vlax-ename->vla-object ent) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list 0 0 (- new_z old_z))))
              )
              (setq changed T)
            )
          )
        )
      )
    )
  )
  changed
)

;;; --- Sub-Modulo: Compilación Masiva (Paso 2) ---
(defun TMD:niveis-mass-rebuild (rebuild_list count)
  (princ (strcat "\n[BIM SYNC] Paso 2: Regenerando " (itoa count) " elementos deformados..."))
  (if (not TMD:build-single-wire) (load "TMD_BUILD.lsp"))
  (setq *TMD-AUTO-JOINT* "Sim") 
  (foreach w rebuild_list 
    (if (= (cdr (assoc 0 (entget w))) "LINE") (TMD:build-single-wire w))
  )
)

;;; =====================================================================================
;;; 3. INTERFAZ Y COMANDO
;;; =====================================================================================

(defun TMD:niveis-form (def_nome def_z / dcl_file handle dcl_id status nome z_val res)
  (setq dcl_file (vl-filename-mktemp "tmd_nform.dcl"))
  (setq handle (open dcl_file "w"))
  (write-line "tmd_nform : dialog { label = \"TMD - Dados do Nível\"; " handle)
  (write-line "  : edit_box { label=\"Nome do Nível:\"; key=\"n_nome\"; width = 30; }" handle)
  (write-line "  : edit_box { label=\"Altura Z (mm):\"; key=\"n_z\"; }" handle)
  (write-line "  ok_cancel; }" handle)
  (close handle)
  (setq dcl_id (load_dialog dcl_file))
  (if (not (new_dialog "tmd_nform" dcl_id)) (exit))
  (set_tile "n_nome" (if def_nome def_nome ""))
  (set_tile "n_z" (if def_z (rtos def_z 2 2) "0"))
  (action_tile "accept" "(setq nome (get_tile \"n_nome\") z_val (atof (get_tile \"n_z\"))) (done_dialog 1)")
  (action_tile "cancel" "(done_dialog 0)")
  (setq status (start_dialog))
  (unload_dialog dcl_id) (vl-file-delete dcl_file)
  (if (= status 1) (list (strcase nome) z_val) nil)
)

(defun c:TMD_NIVEIS ( / dcl_file handle dcl_id status loop levels ativo disp_list i sel_idx 
                        row is_ati temp_sel to_del new_obj old_obj sub_obj to_del_obj idx_below)
  (setq dcl_file (vl-filename-mktemp "tmd_niveis.dcl"))
  (setq handle (open dcl_file "w"))
  (write-line "tmd_nmain : dialog { label = \"TM Digital - Gestor de Níveis B.I.M\"; " handle)
  (write-line "  : list_box { label = \"Tabela de Níveis Ativos no Projeto:\"; key = \"lst_niveis\"; height = 12; width = 50; }" handle)
  (write-line "  : row {" handle)
  (write-line "    : button { label = \"[+] Novo\"; key = \"btn_add\"; }" handle)
  (write-line "    : button { label = \"[E] Editar\"; key = \"btn_edit\"; }" handle)
  (write-line "    : button { label = \"[-] Apagar\"; key = \"btn_del\"; }" handle)
  (write-line "  }" handle)
  (write-line "  : button { label = \"[√] Tornar Nível Ativo\"; key = \"btn_set\"; }" handle)
  (write-line "  ok_cancel; }" handle)
  (close handle)
  (setq levels (TMD:niveis-get) ativo (TMD:niveis-get-ativo) sel_idx "0" loop T)
  (while loop
    (setq dcl_id (load_dialog dcl_file))
    (if (not (new_dialog "tmd_nmain" dcl_id)) (exit))
    (setq disp_list nil i 0)
    (foreach lvl levels (setq is_ati (if (= (car lvl) ativo) "[ X ] " "[   ] ")) (setq row (strcat is_ati (car lvl) "   ----->   " (rtos (cadr lvl) 2 2) " mm")) (setq disp_list (append disp_list (list row))) (if (= (car lvl) ativo) (setq sel_idx (itoa i))) (setq i (1+ i)))
    (set_tile "lst_niveis" sel_idx) (start_list "lst_niveis") (mapcar 'add_list disp_list) (end_list)
    (action_tile "lst_niveis" "(setq sel_idx $value)") (action_tile "btn_add" "(done_dialog 2)") (action_tile "btn_edit" "(done_dialog 5)") (action_tile "btn_del" "(done_dialog 4)") (action_tile "btn_set" "(done_dialog 3)") (action_tile "accept" "(done_dialog 1)") (action_tile "cancel" "(done_dialog 0)")
    (setq status (start_dialog)) (unload_dialog dcl_id)
    (cond 
      ((= status 1) (setq loop nil))
      ((= status 2) (setq new_obj (TMD:niveis-form nil nil)) (if new_obj (progn (setq levels (TMD:niveis-sort (append levels (list new_obj)))) (TMD:niveis-set levels))))
      ((= status 5) (setq temp_sel (atoi sel_idx) old_obj (nth temp_sel levels) new_obj (TMD:niveis-form (car old_obj) (cadr old_obj))) (if (and new_obj (not (equal old_obj new_obj))) (progn (TMD:niveis-sync-logic (car old_obj) (car new_obj) (cadr old_obj) (cadr new_obj)) (setq levels (vl-remove old_obj levels) levels (TMD:niveis-sort (append levels (list new_obj)))) (TMD:niveis-set levels) (if (= ativo (car old_obj)) (setq ativo (car new_obj))) (TMD:niveis-set-ativo ativo))))
      ((= status 3) (setq temp_sel (atoi sel_idx) ativo (car (nth temp_sel levels))) (TMD:niveis-set-ativo ativo))
      ((= status 4) (setq temp_sel (atoi sel_idx) to_del_obj (nth temp_sel levels) to_del (car to_del_obj)) (if (= to_del "PISO ZERO") (alert "Proteção Estrutural: O PISO ZERO não puede ser apagado.") (progn (setq idx_below (max 0 (1- temp_sel)) sub_obj (nth idx_below levels)) (if (and sub_obj (/= (car sub_obj) to_del)) (TMD:niveis-sync-logic to_del (car sub_obj) (cadr to_del_obj) (cadr sub_obj))) (setq levels (vl-remove to_del_obj levels)) (TMD:niveis-set levels) (if (= ativo to_del) (setq ativo (car sub_obj))) (TMD:niveis-set-ativo ativo) (setq sel_idx (itoa idx_below)))))
      ((= status 0) (setq loop nil))
    )
  )
  (vl-file-delete dcl_file) (princ (strcat "\n[TM Digital] Nivel Atual: " ativo)) (princ)
)

(princ "\n[TMD] Gestor Niveis v5.2.1 (Individual via PICKSTYLE) Cargado.")
(princ)
