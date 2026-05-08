;;; =====================================================================================
;;; TM DIGITAL - MODELADOR ANALÍTICO ESPACIAL (TMD_Wires.lsp)
;;; Objetivo: Trazado interactivo de Gemelo Digital B.I.M
;;; Comando: TMD_WIRES
;;; =====================================================================================

(vl-load-com)

;;; =====================================================================================
;;; 0. UTILIDADES DE SELECCIÓN
;;; =====================================================================================

(defun TMD:wire-get-implied-wires ( / ss i ent etype wires ph w_ent e_data pts elev j p1 p2 ptA ptB new_line)
  (setq wires nil)
  ;; Primeiro tenta seleção implícita (já selecionado)
  (setq ss (ssget "_I" '((-4 . "<OR") (0 . "LINE") (0 . "LWPOLYLINE") (0 . "3DSOLID") (-4 . "OR>"))))
  ;; Se não houver, pede seleção explícita
  (if (not ss)
    (progn
      (princ "\n[TMD] Selecione as vigas/wires para aplicar: ")
      (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "LWPOLYLINE") (0 . "3DSOLID") (-4 . "OR>"))))
    )
  )
  (if ss
    (progn
      (setq i 0)
      (repeat (sslength ss)
        (setq ent (ssname ss i) e_data (entget ent) etype (cdr (assoc 0 e_data)) w_ent nil)
        (cond
          ((= etype "LINE") 
           (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE") 
             (setq w_ent ent)
             (progn
               ;; [SMART MATCH] Linha pura: converte agora
               (vlax-ldata-put ent "TMD_CLASSE" "ESTRUTURA_LINE")
               (setq ptA (cdr (assoc 10 e_data)) ptB (cdr (assoc 11 e_data)))
               (vlax-ldata-put ent "TMD_TIPO" (TMD:wire-evaluate-vector ptA ptB))
               (setq w_ent ent)
             )
           )
          )
          ((= etype "LWPOLYLINE")
           ;; [SMART MATCH] Explode polyline em linhas
           (setq pts (vl-remove-if-not '(lambda (x) (= (car x) 10)) e_data))
           (setq elev (cdr (assoc 38 e_data))) (if (not elev) (setq elev 0.0))
           (setq j 0)
           (if (>= (length pts) 2)
             (progn
               (while (< j (1- (length pts)))
                 (setq p1 (cdr (nth j pts)) p2 (cdr (nth (1+ j) pts)))
                 (setq ptA (list (car p1) (cadr p1) elev) ptB (list (car p2) (cadr p2) elev))
                 (if (> (distance ptA ptB) 0.001)
                   (progn
                     (entmake (list '(0 . "LINE") (cons 10 ptA) (cons 11 ptB) (assoc 8 e_data)))
                     (setq new_line (entlast))
                     (vlax-ldata-put new_line "TMD_CLASSE" "ESTRUTURA_LINE")
                     (vlax-ldata-put new_line "TMD_TIPO" (TMD:wire-evaluate-vector ptA ptB))
                     (setq wires (append wires (list new_line)))
                   )
                 )
                 (setq j (1+ j))
               )
               (entdel ent) ;; Apaga a polilinha original
             )
           )
          )
          ((= etype "3DSOLID") 
           (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE")) 
           (if (and ph (= (type ph) 'STR)) (setq w_ent (handent ph)))
          )
        )
        (if (and w_ent (not (member w_ent wires))) (setq wires (append wires (list w_ent))))
        (setq i (1+ i))
      )
    )
  )
  wires
)

;;; =====================================================================================
;;; 1. NÚCLEO MATEMÁTICO B.I.M
;;; =====================================================================================

(defun TMD:wire-evaluate-vector (ptA ptB / dx dy dz h_dist)
  (setq dx (abs (- (car ptB) (car ptA))))
  (setq dy (abs (- (cadr ptB) (cadr ptA))))
  (setq dz (abs (- (caddr ptB) (caddr ptA))))
  
  (setq h_dist (+ dx dy))
  
  (cond
    ((and (< h_dist 0.1) (> dz 0.1)) "COLUNA")
    ((and (> h_dist 0.1) (< dz 0.1)) "VIGA")
    (t "CONTRAVENTAMENTO")
  )
)

(defun TMD:wire-get-nearest-level (z_val / levels closest_name min_diff diff)
  (setq closest_name "NÃO DEFINIDO")
  (if TMD:niveis-get
    (progn
      (setq levels (TMD:niveis-get) min_diff 99999.0 closest_name nil)
      (foreach lvl levels
        (setq diff (abs (- z_val (cadr lvl))))
        (if (<= diff 5.0)
          (setq closest_name (car lvl) min_diff diff)
        )
      )
    )
  )
  closest_name
)

;;; =====================================================================================
;;; 2. INYECCIÓN B.I.M (Data Builder)
;;; =====================================================================================

(defun TMD:wire-apply-data (ent_name ptA ptB custom_just custom_rot / v_type cfg layer color zA zB nivA nivB p_nome p_forma p_x p_y p_e dist just rot perfil_item ptA_temp ent_data req_jy req_jx)
  
  (setq v_type (TMD:wire-evaluate-vector ptA ptB))
  
  ;; Normalização Vertical Geográfica (De Baixo para Cima)
  (if (= v_type "COLUNA")
    (if (> (caddr ptA) (caddr ptB))
      (progn
        (setq ptA_temp ptA ptA ptB ptB ptA_temp)
        (setq ent_data (entget ent_name))
        (setq ent_data (subst (cons 10 ptA) (assoc 10 ent_data) ent_data))
        (setq ent_data (subst (cons 11 ptB) (assoc 11 ent_data) ent_data))
        (entmod ent_data)
      )
    )
  )

  (cond
    ((= v_type "COLUNA") 
     (setq cfg (if *TMD_DEF_COLUNA* *TMD_DEF_COLUNA* (list (list "PADRAO" "TUBE" 100.0 100.0 2.0) "MC" "0.0")))
     (setq layer "TMD-WIRE-COLUNA" color 5))     
    ((= v_type "VIGA") 
     (setq cfg (if *TMD_DEF_VIGA* *TMD_DEF_VIGA* (list (list "PADRAO" "TUBE" 100.0 100.0 2.0) "MC" "0.0")))
     (setq layer "TMD-WIRE-VIGA" color 3))         
    ((= v_type "CONTRAVENTAMENTO") 
     (setq cfg (if *TMD_DEF_DIAGONAL* *TMD_DEF_DIAGONAL* (list (list "PADRAO" "TUBE" 100.0 100.0 2.0) "MC" "0.0")))
     (setq layer "TMD-WIRE-DIAGONAL" color 6))
  )
  
  (TMD:util-force-layer layer color)
  (setq obj (vlax-ename->vla-object ent_name))
  (vla-put-Layer obj layer)
  (vla-put-Color obj 256) ;; ByLayer
  
  (setq zA (caddr ptA) zB (caddr ptB))
  (setq nivA (TMD:wire-get-nearest-level zA))
  (setq nivB (TMD:wire-get-nearest-level zB))
  
  (setq perfil_item (nth 0 cfg))
  (setq just (if custom_just custom_just (nth 1 cfg)))
  (setq rot (if custom_rot custom_rot (atof (vl-princ-to-string (nth 2 cfg)))))
  
  (setq p_nome (nth 0 perfil_item) p_forma (nth 1 perfil_item) p_x (atof (vl-princ-to-string (nth 2 perfil_item))) p_y (atof (vl-princ-to-string (nth 3 perfil_item))) p_e (atof (vl-princ-to-string (nth 4 perfil_item))))
  
  (setq dist (distance ptA ptB))
  
  (vlax-ldata-put ent_name "TMD_CLASSE" "ESTRUTURA_LINE")
  (vlax-ldata-put ent_name "TMD_TIPO" v_type)
  (vlax-ldata-put ent_name "TMD_NOME" p_nome)
  (vlax-ldata-put ent_name "TMD_NIVEL_INI" nivA)
  (vlax-ldata-put ent_name "TMD_NIVEL_FIM" nivB)
  (vlax-ldata-put ent_name "TMD_MARK" nil) ;; Limpar marca em novas injeções
  
  (if TMD:bim-set-adn
    (TMD:bim-set-adn ent_name 
      (list (cons "FORMA" p_forma) (cons "DIM_X" p_x) (cons "DIM_Y" p_y) 
            (cons "ESPESSURA" p_e) (cons "DISTANCIA" dist) 
            (cons "JUSTIFICACAO" just) (cons "ROTACAO" rot) 
            (cons "PT_A" ptA) (cons "PT_B" ptB))
    )
  )
)

;;; =====================================================================================
;;; 3. GESTOR DE FEEDBACK VISUAL (GRVECS)
;;; =====================================================================================

(defun TMD:wire-draw-phantom (ptA ptB jy jx rot / v_type p_x p_y cx cy p1 p2 p3 p4 rad p1_w p2_w p3_w p4_w p1_wb p2_wb p3_wb p4_wb v_z v_x v_y d u seg steps i ref_line vecs)
  ;; Simular caixa no entorno de ptA orientada para ptB
  (setq v_type (TMD:wire-evaluate-vector ptA ptB))
  (cond
    ((= v_type "COLUNA") (setq cfg (if *TMD_DEF_COLUNA* *TMD_DEF_COLUNA* (list (list "PADRAO" "TUBE" 100.0 100.0 2.0) "MC" "0.0"))))
    ((= v_type "VIGA") (setq cfg (if *TMD_DEF_VIGA* *TMD_DEF_VIGA* (list (list "PADRAO" "TUBE" 100.0 100.0 2.0) "MC" "0.0"))))
    (t (setq cfg (if *TMD_DEF_DIAGONAL* *TMD_DEF_DIAGONAL* (list (list "PADRAO" "TUBE" 100.0 100.0 2.0) "MC" "0.0"))))
  )
  (setq perfil_item (nth 0 cfg))
  (setq p_x (atof (vl-princ-to-string (nth 2 perfil_item))) p_y (atof (vl-princ-to-string (nth 3 perfil_item))))
  
  ;; Justificação Offset
  (setq cx 0.0 cy 0.0)
  (if (= jx "L") (setq cx (/ p_x 2.0)))
  (if (= jx "R") (setq cx (- (/ p_x 2.0))))
  (if (= jy "T") (setq cy (- (/ p_y 2.0))))
  (if (= jy "B") (setq cy (/ p_y 2.0)))
  
  ;; Caixa Base XY
  (setq p1 (list (- cx (/ p_x 2.0)) (- cy (/ p_y 2.0)) 0.0))
  (setq p2 (list (+ cx (/ p_x 2.0)) (- cy (/ p_y 2.0)) 0.0))
  (setq p3 (list (+ cx (/ p_x 2.0)) (+ cy (/ p_y 2.0)) 0.0))
  (setq p4 (list (- cx (/ p_x 2.0)) (+ cy (/ p_y 2.0)) 0.0))
  
  ;; Rotacionar 2D
  (setq rad (* rot (/ pi 180.0)))
  (defun rot2d (p) (list (- (* (car p) (cos rad)) (* (cadr p) (sin rad))) (+ (* (car p) (sin rad)) (* (cadr p) (cos rad))) 0.0))
  (setq p1 (rot2d p1) p2 (rot2d p2) p3 (rot2d p3) p4 (rot2d p4))
  
  ;; Sistema de Coordenadas 3D
  (if (< (distance ptA ptB) 1.0) (setq ptB (list (+ (car ptA) 0.1) (+ (cadr ptA) 0.1) (+ (caddr ptA) 1.0))))
  (setq v_z (TMD:util-vector-unit (mapcar '- ptB ptA)))
  
  (if (and (< (abs (car v_z)) 0.001) (< (abs (cadr v_z)) 0.001))
    (setq v_x '(1.0 0.0 0.0))
    (setq v_x (TMD:util-vector-unit (TMD:util-vector-cross '(0.0 0.0 1.0) v_z)))
  )
  (setq v_y (TMD:util-vector-unit (TMD:util-vector-cross v_z v_x)))
  
  ;; Transformar para Mundo (WCS) no Ponto A
  (defun wcs3d (p)
    (list (+ (car ptA) (* (car p) (car v_x)) (* (cadr p) (car v_y)) (* (caddr p) (car v_z)))
          (+ (cadr ptA) (* (car p) (cadr v_x)) (* (cadr p) (cadr v_y)) (* (caddr p) (caddr v_z)))
          (+ (caddr ptA) (* (car p) (caddr v_x)) (* (cadr p) (caddr v_y)) (* (caddr p) (caddr v_z))))
  )
  
  (setq p1_w (wcs3d p1) p2_w (wcs3d p2) p3_w (wcs3d p3) p4_w (wcs3d p4))
  
  ;; O mesmo para um ponto em B
  (defun wcs3dB (p)
    (list (+ (car ptB) (* (car p) (car v_x)) (* (cadr p) (car v_y)) (* (caddr p) (car v_z)))
          (+ (cadr ptB) (* (car p) (cadr v_x)) (* (cadr p) (cadr v_y)) (* (caddr p) (cadr v_z)))
          (+ (caddr ptB) (* (car p) (caddr v_x)) (* (cadr p) (caddr v_y)) (* (caddr p) (caddr v_z))))
  )
  
  (setq p1_wb (wcs3dB p1) p2_wb (wcs3dB p2) p3_wb (wcs3dB p3) p4_wb (wcs3dB p4))
  
  ;; Criar linha de referência tracejada central se houver offset
  (setq ref_line nil)
  (if (or (/= jx "C") (/= jy "M") (/= rot 0.0))
    (progn
      (setq d (distance ptA ptB) u (TMD:util-vector-unit (mapcar '- ptB ptA)) seg 50.0)
      (setq steps (fix (/ d seg)) i 0)
      (while (< i steps)
        (if (= (rem i 2) 0)
          (setq ref_line (append ref_line (list 1 
                                                (mapcar '+ ptA (mapcar '(lambda (x) (* x (* i seg))) u))
                                                (mapcar '+ ptA (mapcar '(lambda (x) (* x (* (+ i 1) seg))) u)))))
        )
        (setq i (1+ i))
      )
      ;; Se a distância for muito curta para o tracejado, colocar linha sólida
      (if (= steps 0) (setq ref_line (list 1 ptA ptB)))
    )
  )
  
  (setq vecs (list 1 p1_w p2_w 1 p2_w p3_w 1 p3_w p4_w 1 p4_w p1_w
                   1 p1_wb p2_wb 1 p2_wb p3_wb 1 p3_wb p4_wb 1 p4_wb p1_wb
                   2 p1_w p1_wb 2 p2_w p2_wb 2 p3_w p3_wb 2 p4_w p4_wb))
  (if ref_line (setq vecs (append vecs ref_line)))
  
  ;; Limpar e desenhar vetores
  (redraw)
  (apply 'grvecs (list vecs))
)

;;; =====================================================================================
;;; 4. BUCLE DETERMINISTA B.I.M (Estilo Revit)
;;; =====================================================================================

(defun TMD:wire-interactive-draw (is_standalone / old_osmode pt_in ptA ptB old_lay p_tipo p_perfil p_nini p_afini p_nfim p_affim l_z1 l_z2 just rot loop_drawing ent_name e_data last_ent history_pts jy jx p_dict s niv_a niv_b)
  (setq old_osmode (getvar "OSMODE"))
  (vl-cmdf "_.UCS" "_World")
  
  ;; 1. Leer Configuración Global (Pincel)
  (setq p_tipo (vlax-ldata-get "dict_TMDigital" "PINCEL_TIPO"))
  (if (or (not p_tipo) is_standalone) (setq p_tipo "VIGA"))
  
  (setq p_perfil (vlax-ldata-get "dict_TMDigital" "PINCEL_PERFIL"))
  (setq just (vlax-ldata-get "dict_TMDigital" "PINCEL_JUST"))
  (if (or (not just) (= just "")) (setq just "MC"))
  (setq rot (atof (if (vlax-ldata-get "dict_TMDigital" "PINCEL_ROT") (vlax-ldata-get "dict_TMDigital" "PINCEL_ROT") "0.0")))
  
  (if is_standalone
    (setq p_nini nil p_nfim nil p_afini 0.0 p_affim 0.0)
    (progn
      (setq p_nini (vlax-ldata-get "dict_TMDigital" "PINCEL_N_INI"))
      (setq p_afini (atof (if (vlax-ldata-get "dict_TMDigital" "PINCEL_AF_INI") (vlax-ldata-get "dict_TMDigital" "PINCEL_AF_INI") "0.0")))
      (setq p_nfim (vlax-ldata-get "dict_TMDigital" "PINCEL_N_FIM"))
      (setq p_affim (atof (if (vlax-ldata-get "dict_TMDigital" "PINCEL_AF_FIM") (vlax-ldata-get "dict_TMDigital" "PINCEL_AF_FIM") "0.0")))
    )
  )
  
  (if (not TMD:prop-get-level-z) (load "TMD_Properties.lsp"))
  (setq l_z1 (if p_nini (TMD:prop-get-level-z p_nini) nil))
  (setq l_z2 (if p_nfim (TMD:prop-get-level-z p_nfim) nil))
  
  (if is_standalone
    (princ "\n[TMD] MODO LIBRE (3D Snap) | [R, T, E] p/ Ajustes")
    (princ (strcat "\n[TMD] MODO: " p_tipo " | Nivel Base: " (if p_nini p_nini "-") " | Nivel Topo: " (if p_nfim p_nfim "-")))
  )
  
  (setq loop_drawing T ptA nil last_ent nil history_pts nil)
  
  ;; Función interna de dibujo para reutilizar
  (defun TMD:wire-do-draw ()
    (if (setq ly (tblobjname "LAYER" "TMD-3D-MODEL")) (vla-put-LayerOn (vlax-ename->vla-object ly) :vlax-false))
    (setq old_lay (getvar "CLAYER")) (setvar "CLAYER" "0")
    (vl-cmdf "_.LINE" "_non" ptA "_non" ptB "")
    (setq ent_name (entlast)) (setvar "CLAYER" old_lay)
    (if (setq ly (tblobjname "LAYER" "TMD-3D-MODEL")) (vla-put-LayerOn (vlax-ename->vla-object ly) :vlax-true))
    
    (vlax-ldata-put ent_name "TMD_CLASSE" "ESTRUTURA_LINE")
    (vlax-ldata-put ent_name "TMD_TIPO" p_tipo)
    (vlax-ldata-put ent_name "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object ent_name)))
    
    ;; [BIM LÓGICO] Calcular niveles y desfases por posición real Z
    (setq niv_a (TMD:wire-get-nearest-level (caddr ptA)))
    (setq niv_b (TMD:wire-get-nearest-level (caddr ptB)))
    
    (setq lz_a (if (/= niv_a "NÃO DEFINIDO") (TMD:prop-get-level-z niv_a) nil))
    (setq lz_b (if (/= niv_b "NÃO DEFINIDO") (TMD:prop-get-level-z niv_b) nil))
    
    (setq off_a (if lz_a (- (caddr ptA) lz_a) (caddr ptA)))
    (setq off_b (if lz_b (- (caddr ptB) lz_b) (caddr ptB)))
    
    (vlax-ldata-put ent_name "TMD_NIVEL_INI" niv_a)
    (vlax-ldata-put ent_name "TMD_AFASTAMENTO" (rtos off_a 2 2))
    
    (vlax-ldata-put ent_name "TMD_NIVEL_FIM" niv_b)
    (vlax-ldata-put ent_name "TMD_AFASTAMENTO_TOPO" (rtos off_b 2 2))
    
    (vlax-ldata-put ent_name "TMD_JUSTIFICACAO" just)
    (vlax-ldata-put ent_name "TMD_ROTACAO" (rtos rot 2 2))
    
    (TMD:wire-apply-data ent_name ptA ptB just rot)
    (if (and p_perfil (/= p_perfil "PADRÃO")) (vlax-ldata-put ent_name "TMD_NOME" p_perfil))
    
    (if TMD:build-single-wire (TMD:build-single-wire ent_name))
    (if j2:auto-resolve-nodes (j2:auto-resolve-nodes ent_name))
    (setq last_ent ent_name)
    (princ (strcat "\n[BIM] " niv_a " (" (rtos off_a 2 0) ") -> " niv_b " (" (rtos off_b 2 0) ")"))
  )

  (while loop_drawing
    (initget "Top Edge Rotacao Undo")
    (if (not ptA)
      (if (= p_tipo "COLUNA")
        (setq pt_in (getpoint "\n[TMD] Clique na POSIÇÃO da Coluna [ENTER p/ Propriedades]: "))
        (setq pt_in (getpoint "\n[TMD] Ponto INICIAL da Viga [ENTER p/ Propriedades]: "))
      )
      (if (= p_tipo "COLUNA")
        (setq pt_in (getpoint "\n[TMD] Próxima Coluna ou [Top/Edge/Rot/Undo/ENTER]: "))
        (setq pt_in (getpoint ptA "\n[TMD] Próximo Ponto ou [Top/Edge/Rot/Undo/ENTER]: "))
      )
    )
    
    (cond
      ;; 1. ENTER PRESIONADO -> Salir del Bucle
      ((not pt_in) (setq loop_drawing nil))
      
      ;; 2. TECLADO (Post-Click Ajustes)
      ((= (type pt_in) 'STR)
        (if (and last_ent (entget last_ent))
          (progn
            (cond
              ((= pt_in "Top")
                (setq jy (substr just 1 1))
                (setq jy (if (= jy "T") "M" (if (= jy "M") "B" "T")))
                (setq just (strcat jy (substr just 2 1)))
              )
              ((= pt_in "Edge")
                (setq jx (substr just 2 1))
                (setq jx (if (= jx "L") "C" (if (= jx "C") "R" "L")))
                (setq just (strcat (substr just 1 1) jx))
              )
              ((= pt_in "Rotacao")
                (setq rot (+ rot 90.0)) (if (>= rot 360.0) (setq rot 0.0))
                (setq just (TMD:wire-get-smart-just just))
              )
              ((= pt_in "Undo")
                ;; Primero buscar y borrar el sólido hijo (si existe)
                (if (and last_ent (entget last_ent))
                  (progn
                    (setq s (vlax-ldata-get last_ent "TMD_CHILD_SOLID"))
                    (if (and s (= (type s) 'STR))
                      (progn
                        (setq s_ent (handent s))
                        (if (and s_ent (entget s_ent)) (entdel s_ent))
                      )
                    )
                    ;; Luego borrar el wire
                    (entdel last_ent)
                  )
                )
                (setq last_ent nil)
                (if (/= p_tipo "COLUNA")
                  (progn
                    (if history_pts (setq ptA (car history_pts) history_pts (cdr history_pts)))
                  )
                  (setq ptA nil)
                )
                (princ "\n[TMD] Último segmento e sólido removidos.")
              )
            )
            ;; Reconstruir con el ajuste en caliente
            (if (and last_ent (/= pt_in "Undo"))
              (progn
                (vlax-ldata-put last_ent "TMD_JUSTIFICACAO" just)
                (vlax-ldata-put last_ent "TMD_ROTACAO" (rtos rot 2 2))
                (setq p_dict (vlax-ldata-get last_ent "TMD_PARAMS"))
                (if p_dict
                  (progn
                    (setq p_dict (subst (cons "JUSTIFICACAO" just) (assoc "JUSTIFICACAO" p_dict) p_dict))
                    (setq p_dict (subst (cons "ROTACAO" rot) (assoc "ROTACAO" p_dict) p_dict))
                    (vlax-ldata-put last_ent "TMD_PARAMS" p_dict)
                  )
                )
                (if TMD:build-single-wire (TMD:build-single-wire last_ent))
                (princ (strcat "\n[TMD] Atualizado -> Just: " just " | Rot: " (rtos rot 2 0) "°"))
              )
            )
          )
          (princ "\n[!] Nenhum elemento anterior para editar.")
        )
      )
      
      ;; 3. CLIC EN PANTALLA (Coordenadas)
      ((= (type pt_in) 'LIST)
        (if (not ptA)
          (progn
            ;; PRIMER CLIC Vacio
            (setq ptA pt_in)
            (if l_z1 (setq ptA (list (car ptA) (cadr ptA) (+ l_z1 p_afini))))
            
            (if (= p_tipo "COLUNA")
              (progn
                (setq ptB (list (car ptA) (cadr ptA) 0.0))
                (if l_z2 (setq ptB (list (car ptB) (cadr ptB) (+ l_z2 p_affim))) (setq ptB (list (car ptB) (cadr ptB) (+ (caddr ptA) 3000.0))))
                (TMD:wire-do-draw)
                (setq ptA pt_in) ;; Fake persistence to allow Top/Edge loop, but isolated visually.
              )
              (progn
                ;; Guardar historia y esperar el siguiente clic
                (setq history_pts (cons ptA history_pts))
              )
            )
          )
          (progn
            ;; SEGUNDO CLIC o Continuación
            (if (= p_tipo "COLUNA")
              (progn
                (setq ptA pt_in)
                (if l_z1 (setq ptA (list (car ptA) (cadr ptA) (+ l_z1 p_afini))))
                (setq ptB (list (car ptA) (cadr ptA) 0.0))
                (if l_z2 (setq ptB (list (car ptB) (cadr ptB) (+ l_z2 p_affim))) (setq ptB (list (car ptB) (cadr ptB) (+ (caddr ptA) 3000.0))))
                (TMD:wire-do-draw)
                (setq ptA pt_in)
              )
              (progn
                ;; Dibujar viga y continuar la polilínea
                (setq ptB pt_in)
                (if l_z2 (setq ptB (list (car ptB) (cadr ptB) (+ l_z2 p_affim))))
                
                ;; [FIX] Evitar Vigas Verticales solo en modo anclado a niveles. 
                ;; En Modo Libre (is_standalone) permitimos que la geometría mande.
                (if (and (not is_standalone) (< (distance (list (car ptA) (cadr ptA) 0.0) (list (car ptB) (cadr ptB) 0.0)) 0.001))
                  (princ "\n[!] No modo anclado, as vigas não podem ser perfeitamente verticais.")
                  (progn
                    (TMD:wire-do-draw)
                    (setq history_pts (cons ptA history_pts))
                    (setq ptA ptB) ;; El fin es el nuevo inicio
                  )
                )
              )
            )
          )
        )
      )
    )
  )
  
  (setvar "OSMODE" old_osmode)
  (if (not is_standalone)
    (progn
      (princ "\n[TM Digital] Retornando ao Inspector...")
      (vla-sendcommand (vla-get-activedocument (vlax-get-acad-object)) "TMD_PROPERTIES ")
    )
    (princ "\n[TM Digital] Comando Finalizado.")
  )
)

(defun c:TMD_WIRES_PINCEL ()
  (TMD:wire-interactive-draw nil)
  (princ)
)

(defun c:TMD_WIRES ()
  ;; Garantir dependências básicas
  (if (not TMD:util-help) (load "TMD_Utils.lsp" "\nErro: TMD_Utils.lsp não encontrado."))
  (if (not TMD:bim-get-reg) (progn (alert "ERRO CRÍTICO: TMD_Utils.lsp não carregou corretamente!") (exit)))
  
  (if (not TMD:viga-build-envelope) (load "TMD_Vigas.lsp" "\nErro ao carregar vigas."))
  (if (not j2:auto-resolve-nodes) (load "TMD_JOINTS.lsp" "\nErro ao carregar juntas."))
  (if (not TMD:build-single-wire) (load "TMD_BUILD.lsp" "\nErro ao carregar construtor."))
  
  (TMD:wire-interactive-draw T)
  (princ)
)

;;; =====================================================================================
;;; 5. COMANDOS DE EDICIÓN CONTEXTUAL (CLICK DERECHO - CUI)
;;; =====================================================================================


;; Helper: Calculates the next justification to preserve the centroid during a 90° CCW rotation
(defun TMD:wire-get-smart-just (just / jy jx)
  (cond
    ;; Corners cycle CCW: TL -> TR -> BR -> BL -> TL
    ((= just "TL") "TR")
    ((= just "TR") "BR")
    ((= just "BR") "BL")
    ((= just "BL") "TL")
    ;; Midpoints cycle CCW: TC -> MR -> BC -> ML -> TC
    ((= just "TC") "MR")
    ((= just "MR") "BC")
    ((= just "BC") "ML")
    ((= just "ML") "TC")
    ;; Center stays Center
        ((= just "MC") "MC")
    (t just)
  )
)

(defun c:TMD_WIRES_EDIT_ROT (/ ss wires loop gr code val ent params rot just ptA ptB running_all i etype w_ent ph jy jx doc)
  (if (not TMD:util-vector-unit) (load "TMD_Utils.lsp"))
  (if (not TMD:build-single-wire) (load "TMD_BUILD.lsp"))

  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq running_all t)
  (while running_all
    (setq wires (TMD:wire-get-implied-wires))
    (if (not wires)
      (progn
        (princ "\n[TMD_ROT] Selecione as vigas [ENTER para novo / ESC para sair]: ")
        (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
        (if ss
          (progn
            (setq i 0)
            (while (< i (sslength ss))
              (setq ent (ssname ss i))
              (setq etype (cdr (assoc 0 (entget ent))))
              (setq w_ent nil)
              (cond
                ((= etype "LINE") (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE") (setq w_ent ent)))
                ((= etype "3DSOLID") (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE")) (if (and ph (= (type ph) 'STR)) (setq w_ent (handent ph)))))
              (if (and w_ent (not (member w_ent wires))) (setq wires (append wires (list w_ent))))
              (setq i (1+ i))))
        )
      )
    )

    (if wires
      (progn
        (vla-StartUndoMark doc)
        (princ (strcat "\n[TMD_ROT] " (itoa (length wires)) " elementos. [R] Rotar | [T/E] Justificar | [ENTER] Novo | [ESC] Sair"))
        (setq loop T)
        (while loop
          (setq gr (grread T 15 0) code (car gr) val (cadr gr))
          (cond
            ((= code 2)
              (cond
                ((or (= val 114) (= val 82)) ;; R
                  (foreach ent wires
                    (if (setq params (vlax-ldata-get ent "TMD_PARAMS"))
                      (progn
                        (setq rot (+ (cdr (assoc "ROTACAO" params)) 90.0)) (if (>= rot 360.0) (setq rot 0.0))
                        (setq just (TMD:wire-get-smart-just (cdr (assoc "JUSTIFICACAO" params))))
                        (setq params (subst (cons "ROTACAO" rot) (assoc "ROTACAO" params) params))
                        (setq params (subst (cons "JUSTIFICACAO" just) (assoc "JUSTIFICACAO" params) params))
                        (vlax-ldata-put ent "TMD_PARAMS" params)
                        (vlax-ldata-put ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object ent)))
                        (if TMD:build-single-wire (TMD:build-single-wire ent))))))
                ((or (= val 116) (= val 84)) ;; T
                  (foreach ent wires
                    (if (setq params (vlax-ldata-get ent "TMD_PARAMS"))
                      (progn
                        (setq just (cdr (assoc "JUSTIFICACAO" params)))
                        (setq jy (substr just 1 1) jx (substr just 2 1))
                        (setq jy (cond ((= jy "T") "M") ((= jy "M") "B") (t "T")))
                        (setq params (subst (cons "JUSTIFICACAO" (strcat jy jx)) (assoc "JUSTIFICACAO" params) params))
                        (vlax-ldata-put ent "TMD_PARAMS" params)
                        (vlax-ldata-put ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object ent)))
                        (if TMD:build-single-wire (TMD:build-single-wire ent))))))
                ((or (= val 101) (= val 69)) ;; E
                  (foreach ent wires
                    (if (setq params (vlax-ldata-get ent "TMD_PARAMS"))
                      (progn
                        (setq just (cdr (assoc "JUSTIFICACAO" params)))
                        (setq jy (substr just 1 1) jx (substr just 2 1))
                        (setq jx (cond ((= jx "L") "C") ((= jx "C") "R") (t "L")))
                        (setq params (subst (cons "JUSTIFICACAO" (strcat jy jx)) (assoc "JUSTIFICACAO" params) params))
                        (vlax-ldata-put ent "TMD_PARAMS" params)
                        (vlax-ldata-put ent "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object ent)))
                        (if TMD:build-single-wire (TMD:build-single-wire ent))))))
                ((member val '(13 32)) (setq loop nil running_all nil)) ;; ENTER/SPACE volta para o Inspector
                ((= val 27) (setq loop nil running_all nil))            ;; ESC sai de tudo
              )
            )
            ((member code '(3 25)) (setq loop nil)) ;; Clique também volta
          )
          (foreach ent wires
            (setq params (vlax-ldata-get ent "TMD_PARAMS"))
            (setq ptA (cdr (assoc 10 (entget ent))) ptB (cdr (assoc 11 (entget ent))))
            (setq rot (cdr (assoc "ROTACAO" params)) just (cdr (assoc "JUSTIFICACAO" params)))
            (TMD:wire-draw-phantom ptA ptB (substr just 1 1) (substr just 2 1) rot)
          )
        )
        (vla-EndUndoMark doc)
        (redraw)
        (sssetfirst nil nil) ;; Limpar seleção visual antes de novo loop
      )
      (setq running_all nil)
    )
  )
  (princ "\n[TMD] Edição de rotação finalizada.") (princ)
)

(defun c:TMD_WIRES_EDIT_CATALOG ()
  (princ "\n[!] Función redirigida al gestor de catálogo global. Use TMD_VIGAS.")
  (c:TMD_VIGAS)
  (princ)
)

(defun TMD:wire-apply-catalog (cat_item / wires ent params child_h child_ent ptA ptB doc)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)
  (setq wires (TMD:wire-get-implied-wires))
  (if wires
    (progn
      (foreach ent wires
        (setq ptA (cdr (assoc 10 (entget ent))) ptB (cdr (assoc 11 (entget ent))))
        (setq params (vlax-ldata-get ent "TMD_PARAMS"))
        
        (setq p_nome (nth 0 cat_item)
              p_forma (nth 1 cat_item)
              p_x (atof (vl-princ-to-string (nth 2 cat_item)))
              p_y (atof (vl-princ-to-string (nth 3 cat_item)))
              p_e (atof (vl-princ-to-string (nth 4 cat_item)))
              p_labio (atof (vl-princ-to-string (nth 5 cat_item)))
              p_material (nth 6 cat_item))
              
        (vlax-ldata-put ent "TMD_NOME" p_nome)
        
        ;; Reconstrói os parâmetros, injetando LABIO e MATERIAL, e herdando os demais se existirem
        (setq params (list (cons "FORMA" p_forma) 
                           (cons "DIM_X" p_x) 
                           (cons "DIM_Y" p_y) 
                           (cons "ESPESSURA" p_e) 
                           (cons "LABIO" p_labio)
                           (cons "MATERIAL" p_material)
                           (cons "DISTANCIA" (distance ptA ptB))
                           (cons "JUSTIFICACAO" (if params (cdr (assoc "JUSTIFICACAO" params)) "MC"))
                           (cons "ROTACAO" (if params (cdr (assoc "ROTACAO" params)) 0.0))
                           (cons "PT_A" ptA)
                           (cons "PT_B" ptB)))
                           
        (vlax-ldata-put ent "TMD_PARAMS" params)
        (vlax-ldata-put ent "TMD_MARK" nil) ;; Limpar marca ao trocar perfil
        
        ;; Rebuild if it has a solid
        (setq child_h (vlax-ldata-get ent "TMD_CHILD_SOLID"))
        (if child_h (if (setq child_ent (handent child_h)) (entdel child_ent)))
        (if TMD:build-single-wire (TMD:build-single-wire ent))
      )
      (princ (strcat "\n[✔] " (itoa (length wires)) " Elementos Atualizados com o novo perfil: " (nth 0 cat_item)))
    )
    (princ "\n[!] Operação cancelada ou nenhuma linha analítica selecionada.")
  )
  (vla-EndUndoMark doc)
  (princ)
)

(princ "\n[TMD] Módulo Interactivo TMD_Wires Cargado. Comando: TMD_WIRES")
(princ)
