;;; =====================================================================================
;;; TM DIGITAL - B.I.M INSPECTOR & PINCEL (V5.0)
;;; =====================================================================================
;;; Autor: TMD Motor BIM (Auto-Sanado y Paleta Tri-Estado)
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; COMANDO PRINCIPAL
;;; -------------------------------------------------------------------------------------
(defun c:TMD_PROPERTIES ( / sel mode)
  (princ "\n[DEBUG 1] Iniciando Comando TMD_PROPERTIES")
  (setq sel (cadr (ssgetfirst))) ;; Pickfirst
  (if (not sel) (setq sel (ssget "_I"))) ;; Fallback a seleccion normal
  
  (if (not sel)
    (setq mode 0) ; Modo 0: Pincel (Creación)
    (if (= (sslength sel) 1)
      (setq mode 1) ; Modo 1: Inspector (Edición Unica)
      (setq mode 2) ; Modo 2: Multi-Edición (Filtro)
    )
  )
  
  (princ (strcat "\n[DEBUG 2] Modo detectado: " (itoa mode)))
  
  ;; Auto-Corrección: Si hay selección, calcula el offset real en Z respecto al Nivel.
  (if (> mode 0) 
    (progn
      (princ "\n[DEBUG 3] Ejecutando TMD:prop-auto-correct-z")
      (TMD:prop-auto-correct-z sel)
    )
  )
  
  (princ "\n[DEBUG 4] Iniciando DCL Manager")
  (TMD:prop-dialog-manager sel mode)
  (princ "\n[DEBUG FIN] Comando terminado limpiamente.")
  (princ)
)

;;; -------------------------------------------------------------------------------------
;;; AUTO-CORRECCIÓN: La Realidad Física Manda
;;; -------------------------------------------------------------------------------------
(defun TMD:prop-auto-correct-z (sel / i ent obj_type w_ent p1 p2 n_ini n_fim l_ini l_fim af_ini af_fim)
  (setq i 0)
  (while (< i (sslength sel))
    (setq ent (ssname sel i))
    (setq obj_type (cdr (assoc 0 (entget ent))))
    (setq w_ent nil)
    (if (= obj_type "3DSOLID")
      (if (= (vlax-ldata-get ent "TMD_COMPILADO") "SIM")
        (setq w_ent (handent (vlax-ldata-get ent "TMD_PARENT_WIRE")))
      )
      (if (= obj_type "LINE") (setq w_ent ent))
    )
    
    (if (and w_ent (entget w_ent))
      (progn
        (setq p1 (cdr (assoc 10 (entget w_ent))))
        (setq p2 (cdr (assoc 11 (entget w_ent))))
        (setq n_ini (vlax-ldata-get w_ent "TMD_NIVEL_INI"))
        (setq n_fim (vlax-ldata-get w_ent "TMD_NIVEL_FIM"))
        
        ;; Buscar la Z del nivel en el diccionario (si existe)
        (setq l_ini (TMD:prop-get-level-z n_ini))
        (setq l_fim (TMD:prop-get-level-z n_fim))
        
        ;; Calcular Afastamento Real y guardar silenciosamente (Auto-Sanado)
        (if l_ini 
          (progn
            (setq af_ini (- (caddr p1) l_ini))
            (vlax-ldata-put w_ent "TMD_AFASTAMENTO" (rtos af_ini 2 2))
          )
        )
        (if l_fim 
          (progn
            (setq af_fim (- (caddr p2) l_fim))
            (vlax-ldata-put w_ent "TMD_AFASTAMENTO_TOPO" (rtos af_fim 2 2))
          )
        )
      )
    )
    (setq i (1+ i))
  )
)

(defun TMD:prop-get-level-z (lvl_name / levels res)
  (if (or (not lvl_name) (= lvl_name "-"))
    nil
    (progn
      (setq levels (if TMD:niveis-get (TMD:niveis-get) nil))
      (setq res nil)
      (if levels
        (foreach l levels (if (= (car l) lvl_name) (setq res (cadr l))))
      )
      res
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; GESTOR DCL MAESTRO
;;; -------------------------------------------------------------------------------------
(defun TMD:prop-dialog-manager (sel mode / dcl_file handle dcl_id status levels lvl_names just_list perf_list
                                           v_tipo v_perfil v_just v_rot v_nini v_afini v_nfim v_affim v_link
                                           lst_tipos
                                           idx_tipo idx_nini idx_nfim idx_just idx_perfil
                                           res_tipo res_nini res_nfim res_just res_afini res_affim res_rot res_link res_perfil)
                                           
  (princ "\n[DEBUG DCL-1] Generando Listas Maestras")
  (setq levels (if TMD:niveis-get (TMD:niveis-get) nil))
  (setq lvl_names (list "-"))
  (if levels (foreach l levels (setq lvl_names (append lvl_names (list (car l))))))
  (setq just_list (list "TL" "TC" "TR" "ML" "MC" "MR" "BL" "BC" "BR"))
  (setq perf_list (list "PADRÃO" "W150x13" "W200x15" "W250x18" "Metalon 40x20x1.5" "TUBE-100x100"))
  
  (princ "\n[DEBUG DCL-2] Pre-Fetch de LData")
  ;; 1. EXTRACCIÓN DE DATOS (PRE-FETCH)
  (if (= mode 0)
    (progn
      ;; Modo Pincel: Cargar desde el Diccionario Global
      (setq lst_tipos (list "VIGA" "COLUNA" "CONTRAVENTAMENTO"))
      (setq v_tipo (TMD:to-str (TMD:prop-get-pincel "TIPO" "VIGA")))
      (setq v_perfil (TMD:to-str (TMD:prop-get-pincel "PERFIL" "PADRÃO")))
      (setq v_just (TMD:to-str (TMD:prop-get-pincel "JUST" "MC")))
      (setq v_rot (TMD:to-str (TMD:prop-get-pincel "ROT" "0.0")))
      (setq v_nini (TMD:to-str (TMD:prop-get-pincel "N_INI" "-")))
      (setq v_afini (TMD:to-str (TMD:prop-get-pincel "AF_INI" "0.00")))
      (setq v_nfim (TMD:to-str (TMD:prop-get-pincel "N_FIM" "-")))
      (setq v_affim (TMD:to-str (TMD:prop-get-pincel "AF_FIM" "0.00")))
      (setq v_link (TMD:to-str (TMD:prop-get-pincel "LINK" "1")))
    )
    (progn
      ;; Modo 1 o 2: Extraer del objeto físico seleccionado
      (if (= mode 1)
        (setq lst_tipos (list (TMD:prop-get-common sel "TMD_TIPO" "VIGA")))
        (setq lst_tipos (list "TODOS" "VIGA" "COLUNA" "CONTRAVENTAMENTO"))
      )
      (setq v_tipo (TMD:to-str (if (= mode 1) (nth 0 lst_tipos) "TODOS")))
      (setq v_perfil (TMD:to-str (TMD:prop-get-common sel "TMD_PERFIL_ID" "PADRÃO")))
      (setq v_just (TMD:to-str (TMD:prop-get-common sel "TMD_JUSTIFICACAO" "MC")))
      (setq v_rot (TMD:to-str (TMD:prop-get-common sel "TMD_ROTACAO" "0.0")))
      (setq v_nini (TMD:to-str (TMD:prop-get-common sel "TMD_NIVEL_INI" "-")))
      (setq v_afini (TMD:to-str (TMD:prop-get-common sel "TMD_AFASTAMENTO" "0.00")))
      (setq v_nfim (TMD:to-str (TMD:prop-get-common sel "TMD_NIVEL_FIM" "-")))
      (setq v_affim (TMD:to-str (TMD:prop-get-common sel "TMD_AFASTAMENTO_TOPO" "0.00")))
      
      ;; Autodetectar el checkbox "Link"
      (if (= v_afini v_affim) (setq v_link "1") (setq v_link "0"))
      (if (and (= v_nini "*Varios*") (= v_nfim "*Varios*")) (setq v_link "0"))
    )
  )
  
  ;; Asegurar que el perfil actual exista en la lista para no crashear
  (if (and v_perfil (/= v_perfil "") (not (member v_perfil perf_list)))
     (setq perf_list (append perf_list (list v_perfil)))
  )

  (princ "\n[DEBUG DCL-3] Escribiendo archivo .DCL temporal")
  ;; 2. CREACIÓN DINÁMICA DEL DCL
  (setq dcl_file (vl-filename-mktemp "tmd_prop.dcl"))
  (setq handle (open dcl_file "w"))
  (write-line "tmd_prop_v5 : dialog { label = \"TM Digital - B.I.M Inspector (v5.0)\"; " handle)
  (write-line "  : popup_list { label = \"Filtro / Tipo:\"; key = \"cbo_tipo\"; }" handle)
  (write-line "  : boxed_column { label = \"Níveis (Z)\";" handle)
  (write-line "    : popup_list { label = \"Nível Topo:\"; key = \"cbo_niv_topo\"; }" handle)
  (write-line "    : edit_box { label = \"Afastamento Topo (mm):\"; key = \"eb_af_topo\"; width=15;}" handle)
  (write-line "    : toggle { label = \"Vincular Base (Vigas planas)\"; key = \"chk_link\"; }" handle)
  (write-line "    : popup_list { label = \"Nível Base:\"; key = \"cbo_niv_base\"; }" handle)
  (write-line "    : edit_box { label = \"Afastamento Base (mm):\"; key = \"eb_af_base\"; width=15;}" handle)
  (write-line "  }" handle)
  (write-line "  : boxed_column { label = \"Propriedades Físicas\";" handle)
  (write-line "    : popup_list { label = \"Perfil:\"; key = \"cbo_perfil\"; }" handle)
  (write-line "    : popup_list { label = \"Justificação:\"; key = \"cbo_just\"; }" handle)
  (write-line "    : row { " handle)
  (write-line "      : edit_box { label = \"Rotação (°):\"; key = \"eb_rot\"; width=15;}" handle)
  (write-line "      : button { label = \"Rotacionar +90°\"; key = \"btn_rot90\"; }" handle)
  (write-line "    }" handle)
  (write-line "  }" handle)
  (if (= mode 0)
    (write-line "  : row { : button { label=\"Configurar Pincel / Dibujar\"; key=\"accept\"; is_default=true; } cancel_button; }" handle)
    (write-line "  : row { : button { label=\"Aplicar Cambios\"; key=\"accept\"; is_default=true; } cancel_button; }" handle)
  )
  (write-line "}" handle)
  (close handle)

  (princ "\n[DEBUG DCL-4] Cargando Dialog")
  ;; 3. CARGA DE DCL
  (setq dcl_id (load_dialog dcl_file))
  (if (not (new_dialog "tmd_prop_v5" dcl_id)) (progn (princ "\n[ERROR DCL] No se pudo crear dialog.") (exit)))

  (princ "\n[DEBUG DCL-5] Poblando campos")
  ;; 4. POBLAR DATOS
  (start_list "cbo_tipo") (mapcar 'add_list lst_tipos) (end_list)
  (start_list "cbo_niv_base") (mapcar 'add_list lvl_names) (end_list)
  (start_list "cbo_niv_topo") (mapcar 'add_list lvl_names) (end_list)
  (start_list "cbo_just") (mapcar 'add_list just_list) (end_list)
  (start_list "cbo_perfil") (mapcar 'add_list perf_list) (end_list)

  (TMD:prop-set-list-index "cbo_tipo" lst_tipos v_tipo)
  (TMD:prop-set-list-index "cbo_niv_base" lvl_names v_nini)
  (TMD:prop-set-list-index "cbo_niv_topo" lvl_names v_nfim)
  (TMD:prop-set-list-index "cbo_just" just_list v_just)
  (TMD:prop-set-list-index "cbo_perfil" perf_list v_perfil)
  
  (set_tile "eb_af_base" v_afini)
  (set_tile "eb_af_topo" v_affim)
  (set_tile "eb_rot" v_rot)
  (set_tile "chk_link" v_link)
  
  (if (= mode 1) (mode_tile "cbo_tipo" 1)) ;; Bloquear Tipo si es solo un objeto

  ;; Acciones y Callbacks
  (action_tile "chk_link" "(TMD:prop-ui-link-toggle $value)")
  (action_tile "btn_rot90" "(TMD:prop-ui-rot-add)")
  
  ;; [NOTA DEBUG] AutoLISP requiere que múltiples expresiones en action_tile estén envueltas en (progn ...)
  (action_tile "accept" "(progn 
    (princ \"\\n[DEBUG EVENT] Boton Aceptar presionado.\")
    (setq idx_tipo (get_tile \"cbo_tipo\"))
    (setq idx_nini (get_tile \"cbo_niv_base\"))
    (setq idx_nfim (get_tile \"cbo_niv_topo\"))
    (setq idx_just (get_tile \"cbo_just\"))
    (setq idx_perfil (get_tile \"cbo_perfil\"))
    (setq res_afini (get_tile \"eb_af_base\"))
    (setq res_affim (get_tile \"eb_af_topo\"))
    (setq res_rot (get_tile \"eb_rot\"))
    (setq res_link (get_tile \"chk_link\"))
    (done_dialog 1)
  )")
  (action_tile "cancel" "(princ \"\\n[DEBUG EVENT] Boton Cancelar presionado.\") (done_dialog 0)")
  
  ;; Forzar estado inicial de la UI
  (TMD:prop-ui-link-toggle v_link)

  (princ "\n[DEBUG DCL-6] Esperando interaccion del usuario...")
  ;; 5. INICIAR DCL
  (setq status (start_dialog))
  (unload_dialog dcl_id)
  (vl-file-delete dcl_file)

  (princ (strcat "\n[DEBUG DCL-7] Dialogo cerrado. Status: " (itoa status)))

  ;; 6. APLICAR CAMBIOS
  (if (= status 1)
    (progn
      (princ "\n[DEBUG APPLY-1] Resolviendo indices DCL a Strings reales")
      ;; Resolucion en entorno seguro (Variables locales garantizadas)
      (setq res_tipo (if idx_tipo (nth (atoi idx_tipo) lst_tipos) "VIGA"))
      (setq res_nini (if idx_nini (nth (atoi idx_nini) lvl_names) "-"))
      (setq res_nfim (if idx_nfim (nth (atoi idx_nfim) lvl_names) "-"))
      (setq res_just (if idx_just (nth (atoi idx_just) just_list) "MC"))
      (setq res_perfil (if idx_perfil (nth (atoi idx_perfil) perf_list) "PADRÃO"))
      
      (if (not res_afini) (setq res_afini "0"))
      (if (not res_affim) (setq res_affim "0"))
      (if (not res_rot) (setq res_rot "0"))
      (if (not res_link) (setq res_link "1"))
      
      (princ (strcat "\n[DEBUG APPLY-2] Datos finales: " res_tipo " | " res_perfil " | Base: " res_nini " | Topo: " res_nfim))

      (if (= mode 0)
        (progn
          (princ "\n[DEBUG APPLY-3A] Guardando LData del Modo Pincel")
          ;; MODO PINCEL: Guardar configuración en Diccionario
          (vlax-ldata-put "dict_TMDigital" "PINCEL_TIPO" res_tipo)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_PERFIL" res_perfil)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_JUST" res_just)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_ROT" res_rot)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_N_INI" res_nini)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_AF_INI" res_afini)
          (vlax-ldata-put "dict_TMDigital" "PINCEL_LINK" res_link)
          (if (= res_link "1")
             (progn (vlax-ldata-put "dict_TMDigital" "PINCEL_N_FIM" res_nini) (vlax-ldata-put "dict_TMDigital" "PINCEL_AF_FIM" res_afini))
             (progn (vlax-ldata-put "dict_TMDigital" "PINCEL_N_FIM" res_nfim) (vlax-ldata-put "dict_TMDigital" "PINCEL_AF_FIM" res_affim))
          )
          
          (princ (strcat "\n[TMD] Pincel configurado para: " res_tipo ". Ejecutando Comando de Inserción..."))
          ;; Redirigir de forma asíncrona a TMD_WIRES para evitar Stack Overflow en ciclos infinitos
          (vla-sendcommand (vla-get-activedocument (vlax-get-acad-object)) "TMD_WIRES ")
        )
        (progn
          (princ "\n[DEBUG APPLY-3B] Modificando modelo fisico")
          ;; MODO INSPECTOR/MULTI: Modificar el modelo
          (TMD:prop-apply-changes sel res_tipo res_perfil res_just res_rot res_nini res_afini res_nfim res_affim res_link)
        )
      )
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; APLICADOR AL MODELO
;;; -------------------------------------------------------------------------------------
(defun TMD:prop-apply-changes (sel f_tipo perfil just rot nini afini nfim affim link / i ent obj_type w_ent t_tipo)
  (setq i 0)
  (while (< i (sslength sel))
    (setq ent (ssname sel i))
    (setq obj_type (cdr (assoc 0 (entget ent))))
    (setq w_ent nil)
    (if (= obj_type "3DSOLID")
      (if (= (vlax-ldata-get ent "TMD_COMPILADO") "SIM")
        (setq w_ent (handent (vlax-ldata-get ent "TMD_PARENT_WIRE")))
      )
      (if (= obj_type "LINE") (setq w_ent ent))
    )
    
    (if (and w_ent (entget w_ent))
      (progn
        (setq t_tipo (vlax-ldata-get w_ent "TMD_TIPO"))
        ;; FILTRO INTELIGENTE: Aplica solo si es TODOS o coincide el tipo
        (if (or (= f_tipo "TODOS") (= f_tipo t_tipo))
          (progn
            (setq needs_rebuild nil)
            
            ;; Omitir campos que dicen "*Varios*" y proteger contra nil. Detectar si requieren Rebuild.
            (if (and perfil (not (vl-string-search "*Varios*" perfil))) 
              (if (/= perfil (vlax-ldata-get w_ent "TMD_PERFIL_ID"))
                (progn (vlax-ldata-put w_ent "TMD_PERFIL_ID" perfil) (setq needs_rebuild T))))
                
            (if (and just (not (vl-string-search "*Varios*" just)))   
              (if (/= just (vlax-ldata-get w_ent "TMD_JUSTIFICACAO"))
                (progn (vlax-ldata-put w_ent "TMD_JUSTIFICACAO" just) (setq needs_rebuild T))))
                
            (if (and rot (not (vl-string-search "*Varios*" rot)))    
              (if (/= rot (vlax-ldata-get w_ent "TMD_ROTACAO"))
                (progn (vlax-ldata-put w_ent "TMD_ROTACAO" rot) (setq needs_rebuild T))))
                
            (if (and nini (not (vl-string-search "*Varios*" nini)))   (vlax-ldata-put w_ent "TMD_NIVEL_INI" nini))
            (if (and afini (not (vl-string-search "*Varios*" afini)))  (vlax-ldata-put w_ent "TMD_AFASTAMENTO" afini))
            
            (if (= link "1")
              (progn 
                ;; Linked! Topo = Base
                (if (and nini (not (vl-string-search "*Varios*" nini)))  (vlax-ldata-put w_ent "TMD_NIVEL_FIM" nini))
                (if (and afini (not (vl-string-search "*Varios*" afini))) (vlax-ldata-put w_ent "TMD_AFASTAMENTO_TOPO" afini))
              )
              (progn
                ;; Topo Independiente
                (if (and nfim (not (vl-string-search "*Varios*" nfim)))  (vlax-ldata-put w_ent "TMD_NIVEL_FIM" nfim))
                (if (and affim (not (vl-string-search "*Varios*" affim))) (vlax-ldata-put w_ent "TMD_AFASTAMENTO_TOPO" affim))
              )
            )
            
            ;; Modificar Físicamente la Z de la Línea
            (setq old_p1 (cdr (assoc 10 (entget w_ent))))
            (setq old_p2 (cdr (assoc 11 (entget w_ent))))
            (setq p1 old_p1 p2 old_p2)
            
            (setq curr_nini (vlax-ldata-get w_ent "TMD_NIVEL_INI"))
            (setq curr_afini (vlax-ldata-get w_ent "TMD_AFASTAMENTO"))
            (setq l_z1 (TMD:prop-get-level-z curr_nini))
            (if l_z1 (setq p1 (list (car p1) (cadr p1) (+ l_z1 (atof curr_afini)))))
            
            (setq curr_nfim (vlax-ldata-get w_ent "TMD_NIVEL_FIM"))
            (setq curr_affim (vlax-ldata-get w_ent "TMD_AFASTAMENTO_TOPO"))
            (setq l_z2 (TMD:prop-get-level-z curr_nfim))
            (if l_z2 (setq p2 (list (car p2) (cadr p2) (+ l_z2 (atof curr_affim)))))
            
            (setq delta_z1 (- (caddr p1) (caddr old_p1)))
            (setq delta_z2 (- (caddr p2) (caddr old_p2)))
            
            ;; Si los Z cambian de forma diferente (se inclina) o si X/Y cambiaron, fuerza rebuild.
            (if (> (abs (- delta_z1 delta_z2)) 0.001) (setq needs_rebuild T))
            
            (if needs_rebuild
              (progn
                ;; A. RECONSTRUCCIÓN COMPLETA (Cambió perfil, justificación, rotación o inclinación)
                (setq e_data (entget w_ent))
                (setq e_data (subst (cons 10 p1) (assoc 10 e_data) e_data))
                (setq e_data (subst (cons 11 p2) (assoc 11 e_data) e_data))
                (entmod e_data)
                (entupd w_ent)
                
                (setq p_dict (vlax-ldata-get w_ent "TMD_PARAMS"))
                (if p_dict
                  (progn
                    (if (and just (not (vl-string-search "*Varios*" just))) 
                      (setq p_dict (subst (cons "JUSTIFICACAO" just) (assoc "JUSTIFICACAO" p_dict) p_dict)))
                    (if (and rot (not (vl-string-search "*Varios*" rot))) 
                      (setq p_dict (subst (cons "ROTACAO" (atof rot)) (assoc "ROTACAO" p_dict) p_dict)))
                    (setq p_dict (subst (cons "PT_A" p1) (assoc "PT_A" p_dict) p_dict))
                    (setq p_dict (subst (cons "PT_B" p2) (assoc "PT_B" p_dict) p_dict))
                    (vlax-ldata-put w_ent "TMD_PARAMS" p_dict)
                  )
                )
                (if TMD:build-single-wire (TMD:build-single-wire w_ent))
              )
              (progn
                ;; B. TRASLACIÓN PURA (Smart Move) - Solo cambió la Z de forma paralela
                (if (> (abs delta_z1) 0.001)
                  (progn
                    (setq v_obj (vlax-ename->vla-object w_ent))
                    (vla-Move v_obj (vlax-3d-point '(0 0 0)) (vlax-3d-point (list 0 0 delta_z1)))
                    
                    ;; Mover el sólido físico sin reconstruirlo (Conserva cortes y juntas)
                    (setq solid_h (vlax-ldata-get w_ent "TMD_CHILD_SOLID"))
                    (if solid_h 
                      (if (setq s_ent (handent solid_h))
                        (if (entget s_ent)
                          (vla-Move (vlax-ename->vla-object s_ent) (vlax-3d-point '(0 0 0)) (vlax-3d-point (list 0 0 delta_z1)))
                        )
                      )
                    )
                    
                    ;; Actualizar ADN silenciosamente
                    (setq p_dict (vlax-ldata-get w_ent "TMD_PARAMS"))
                    (if p_dict
                      (progn
                        (setq p_dict (subst (cons "PT_A" p1) (assoc "PT_A" p_dict) p_dict))
                        (setq p_dict (subst (cons "PT_B" p2) (assoc "PT_B" p_dict) p_dict))
                        (vlax-ldata-put w_ent "TMD_PARAMS" p_dict)
                        ;; También actualizar el ADN dentro del sólido si existe
                        (if (and s_ent (entget s_ent))
                          (vlax-ldata-put s_ent "TMD_PARAMS" p_dict)
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
    )
    (setq i (1+ i))
  )
  (princ "\n[TMD] Cambios aplicados correctamente.")
)

;;; -------------------------------------------------------------------------------------
;;; HELPER UTILS
;;; -------------------------------------------------------------------------------------

(defun TMD:to-str (val)
  (cond
    ((not val) "")
    ((= (type val) 'STR) val)
    ((= (type val) 'REAL) (rtos val 2 2))
    ((= (type val) 'INT) (itoa val))
    (T "")
  )
)

(defun TMD:prop-get-common (sel prop_key default_val / i w_ent val first_val is_mixed ent obj_type)
  (setq i 0 is_mixed nil first_val nil)
  (while (< i (sslength sel))
    (setq ent (ssname sel i))
    (setq obj_type (cdr (assoc 0 (entget ent))))
    (setq w_ent nil)
    (if (= obj_type "3DSOLID")
      (if (= (vlax-ldata-get ent "TMD_COMPILADO") "SIM")
        (setq w_ent (handent (vlax-ldata-get ent "TMD_PARENT_WIRE")))
      )
      (if (= obj_type "LINE") (setq w_ent ent))
    )
    
    (if (and w_ent (entget w_ent))
      (progn
        (setq val (vlax-ldata-get w_ent prop_key))
        (if (not val) (setq val default_val))
        (if (= i 0)
          (setq first_val val)
          (if (not (equal val first_val)) (setq is_mixed T))
        )
      )
    )
    (setq i (1+ i))
  )
  (if is_mixed "*Varios*" (if first_val first_val default_val))
)

(defun TMD:prop-get-pincel (key default / v)
  (setq v (vlax-ldata-get "dict_TMDigital" (strcat "PINCEL_" key)))
  (if v v default)
)

(defun TMD:prop-set-list-index (tile lst val / idx i)
  (setq idx "0" i 0)
  (if (not (vl-string-search "*Varios*" val))
    (foreach item lst
      (if (= item val) (setq idx (itoa i)))
      (setq i (1+ i))
    )
  )
  (set_tile tile idx)
)

(defun TMD:prop-ui-link-toggle (val)
  (if (= val "1")
    (progn
      (mode_tile "cbo_niv_topo" 1)
      (mode_tile "eb_af_topo" 1)
    )
    (progn
      (mode_tile "cbo_niv_topo" 0)
      (mode_tile "eb_af_topo" 0)
    )
  )
)

(defun TMD:prop-ui-rot-add (/ cur_rot new_rot cur_idx_just cur_just new_just lst)
  (setq cur_rot (atof (get_tile "eb_rot")))
  (setq new_rot (+ cur_rot 90.0))
  (if (>= new_rot 360.0) (setq new_rot (- new_rot 360.0)))
  (set_tile "eb_rot" (rtos new_rot 2 0))
  
  (setq lst '("TL" "TC" "TR" "ML" "MC" "MR" "BL" "BC" "BR"))
  (setq cur_idx_just (atoi (get_tile "cbo_just")))
  (setq cur_just (nth cur_idx_just lst))
  
  ;; Reutilizar motor central de Wires para evitar redundancia
  (if (not TMD:wire-get-smart-just) (load "TMD_Wires.lsp"))
  (if TMD:wire-get-smart-just
    (setq new_just (TMD:wire-get-smart-just cur_just))
    (setq new_just cur_just)
  )
  (TMD:prop-set-list-index "cbo_just" lst new_just)
)

(princ "\n[TM Digital] TMD_Properties.lsp (V5.0) Cargado exitosamente.")
(princ)
