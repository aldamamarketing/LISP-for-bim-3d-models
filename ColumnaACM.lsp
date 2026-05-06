;;; =====================================================================================
;;; TM DIGITAL - SISTEMA DE COLUNAS ACM INTELIGENTES (V2.4 - Correção de Eixos)
;;; Módulo: Gerador de Gêmeos Digitais (Geometria 3D + Injeção de XData)
;;; =====================================================================================

(vl-load-com)

(defun c:ColumnaACM ( / dcl_id main_loop sub_loop res p0 reg_path
                        v_estilo v_alt_total v_ancho_base v_forma_base v_alt_base 
                        v_forma_fuste v_remet_fuste v_forma_capitel v_alt_capitel v_vuelo_capitel
                        v_mol_base_on v_mol_base_borde v_mol_base_ali v_mol_base_dir v_ent_base
                        v_mol_fuste_on v_mol_fuste_borde v_mol_fuste_ali v_mol_fuste_dir v_ent_fuste
                        v_mol_capitel_on v_mol_capitel_borde v_mol_capitel_ali v_mol_capitel_dir v_ent_capitel
                        num_alt_total num_ancho_base num_alt_base num_alt_capitel num_remet_fuste num_vuelo_capitel
                        num_alt_fuste num_ancho_fuste num_ancho_capitel p_fuste p_capitel
                        run_sub_base run_sub_fuste run_sub_capitel refresh_main draw-segment apply_molding
                        tag_volume tag_molding
                        save_main_state save_base_state save_fuste_state save_capitel_state
                        old_err old_cmdecho old_delobj old_osmode old_elev get-ent-from-reg)

  ;;; 0. BLINDAGEM CONTRA ERROS
  (setq old_err *error*)
  (defun *error* (msg)
    (if old_osmode (setvar "OSMODE" old_osmode))
    (if old_elev (setvar "ELEVATION" old_elev))
    (if old_cmdecho (setvar "CMDECHO" old_cmdecho))
    (if old_delobj (setvar "DELOBJ" old_delobj))
    (if dcl_id (unload_dialog dcl_id))
    (if (not (wcmatch (strcase msg) "*BREAK*,*CANCEL*,*EXIT*"))
      (princ (strcat "\n[TM Digital] Operação cancelada: " msg))
    )
    (setq *error* old_err)
    (princ)
  )

  (setq old_osmode (getvar "OSMODE")
        old_elev (getvar "ELEVATION")
        old_cmdecho (getvar "CMDECHO")
        old_delobj (getvar "DELOBJ"))

  ;;; 1. REGISTRO E DADOS DA SESSÃO
  (setq reg_path "HKEY_CURRENT_USER\\Software\\TMDigital\\ColunasACM")
  (defun get-reg (k d / v) (setq v (vl-registry-read reg_path k)) (if v v d))
  (defun set-reg (k v) (vl-registry-write reg_path k v))

  (if (not (tblsearch "APPID" "TMD_GEO")) (regapp "TMD_GEO"))

  (defun get-ent-from-reg (key / h ent)
    (setq h (get-reg key ""))
    (if (and h (/= h ""))
      (progn
        (setq ent (handent h))
        (if (and ent (entget ent)) ent nil)
      )
      nil
    )
  )

  ;;; 2. FUNÇÕES XDATA
  (defun tag_volume (ent module_name shape_idx width height style_idx / shape_str style_str xdata)
    (setq shape_str (cond ((= shape_idx "0") "CILINDRICA") ((= shape_idx "1") "CUADRADA") ((= shape_idx "2") "OCTAGONAL") (t "INDEFINIDA")))
    (setq style_str (cond ((= style_idx "0") "CORINTIO") ((= style_idx "1") "DORICO") ((= style_idx "2") "JONICO") ((= style_idx "3") "MODERNO_ACM") ((= style_idx "4") "SALOMONICO") (t "CUSTOM")))
    (setq xdata (list -3 (list "TMD_GEO" (cons 1000 module_name) (cons 1000 shape_str) (cons 1040 width) (cons 1040 height) (cons 1000 style_str))))
    (entmod (append (entget ent) (list xdata)))
  )

  (defun tag_molding (ent part_name shape_idx width height / perim xdata)
    (setq perim
      (cond
        ((= shape_idx "0") (* pi width))                                    
        ((= shape_idx "1") (* 4.0 width))                                   
        ((= shape_idx "2") (* 8.0 (* (/ width 2.0) 0.41421356)))            
        (t 0.0)
      )
    )
    (setq xdata (list -3 (list "TMD_GEO" (cons 1000 (strcat "MOLDURA_" part_name)) (cons 1000 "PERFIL_SWEEP") (cons 1040 width) (cons 1040 height) (cons 1040 perim))))
    (entmod (append (entget ent) (list xdata)))
  )

  ;;; 3. CARREGAMENTO DE MEMÓRIA
  (setq v_estilo (get-reg "estilo" "3") v_alt_total (get-reg "alt_total" "3000") v_ancho_base (get-reg "ancho_base" "375.0")
        v_forma_base (get-reg "forma_base" "1") v_alt_base (get-reg "alt_base" "300.0")
        v_forma_fuste (get-reg "forma_fuste" "1") v_remet_fuste (get-reg "remet_fuste" "20")
        v_forma_capitel (get-reg "forma_capitel" "1") v_alt_capitel (get-reg "alt_capitel" "300.0") v_vuelo_capitel (get-reg "vuelo_capitel" "20")
        
        v_mol_base_on (get-reg "mol_base_on" "0") v_mol_base_borde (get-reg "mol_base_borde" "0") v_mol_base_ali (get-reg "mol_base_ali" "0") v_mol_base_dir (get-reg "mol_base_dir" "0")
        v_mol_fuste_on (get-reg "mol_fuste_on" "0") v_mol_fuste_borde (get-reg "mol_fuste_borde" "0") v_mol_fuste_ali (get-reg "mol_fuste_ali" "0") v_mol_fuste_dir (get-reg "mol_fuste_dir" "0")
        v_mol_capitel_on (get-reg "mol_capitel_on" "0") v_mol_capitel_borde (get-reg "mol_capitel_borde" "0") v_mol_capitel_ali (get-reg "mol_capitel_ali" "0") v_mol_capitel_dir (get-reg "mol_capitel_dir" "0")
  )
  
  (setq v_ent_base (get-ent-from-reg "mol_base_handle")
        v_ent_fuste (get-ent-from-reg "mol_fuste_handle")
        v_ent_capitel (get-ent-from-reg "mol_capitel_handle")
  )

  ;;; 4. INTERFACE DCL
  (defun save_main_state ()
    (setq v_estilo (get_tile "estilo") v_alt_total (get_tile "alt_total") v_ancho_base (get_tile "ancho_base"))
  )
  (defun save_base_state ()
    (setq v_forma_base (get_tile "forma_base") v_alt_base (get_tile "alt_base") v_mol_base_on (get_tile "mol_base_on") 
          v_mol_base_borde (get_tile "mol_base_borde") v_mol_base_ali (get_tile "mol_base_ali") v_mol_base_dir (get_tile "mol_base_dir"))
  )
  (defun save_fuste_state ()
    (setq v_forma_fuste (get_tile "forma_fuste") v_remet_fuste (get_tile "remetimiento") v_mol_fuste_on (get_tile "mol_fuste_on") 
          v_mol_fuste_borde (get_tile "mol_fuste_borde") v_mol_fuste_ali (get_tile "mol_fuste_ali") v_mol_fuste_dir (get_tile "mol_fuste_dir"))
  )
  (defun save_capitel_state ()
    (setq v_forma_capitel (get_tile "forma_capitel") v_alt_capitel (get_tile "alt_capitel") v_vuelo_capitel (get_tile "vuelo") 
          v_mol_capitel_on (get_tile "mol_capitel_on") v_mol_capitel_borde (get_tile "mol_capitel_borde") v_mol_capitel_ali (get_tile "mol_capitel_ali") v_mol_capitel_dir (get_tile "mol_capitel_dir"))
  )

  (defun refresh_main ( / h a_b a_c )
    (setq h (atof v_alt_total) a_b (atof v_alt_base) a_c (atof v_alt_capitel))
    (set_tile "txt_base" (strcat "Altura Base: " v_alt_base " mm"))
    (set_tile "txt_capitel" (strcat "Altura Capitel: " v_alt_capitel " mm"))
    (set_tile "txt_fuste" (strcat "Fuste restante: " (rtos (- h a_b a_c) 2 1) " mm"))
  )

  (defun run_sub_base ( / sub_res )
    (setq sub_loop T)
    (while sub_loop
      (if (not (new_dialog "SubBase" dcl_id)) (exit))
      (set_tile "forma_base" v_forma_base) (set_tile "alt_base" v_alt_base)
      (set_tile "mol_base_on" v_mol_base_on) (set_tile "mol_base_borde" v_mol_base_borde) (set_tile "mol_base_ali" v_mol_base_ali) (set_tile "mol_base_dir" v_mol_base_dir)
      (if v_ent_base (set_tile "txt_mol_base" "¡Perfil Vinculado!"))
      (action_tile "sel_mol_base" "(save_base_state) (done_dialog 5)") 
      (action_tile "accept" "(save_base_state) (done_dialog 1)")
      (action_tile "cancel" "(done_dialog 0)")
      (setq sub_res (start_dialog))
      (cond ((= sub_res 5) (setq v_ent_base (car (entsel "\nSelecciona la polilínea para la BASE: ")))) ((= sub_res 1) (setq sub_loop nil)) ((= sub_res 0) (setq sub_loop nil)))
    )
  )

  (defun run_sub_fuste ( / sub_res )
    (setq sub_loop T)
    (while sub_loop
      (if (not (new_dialog "SubFuste" dcl_id)) (exit))
      (set_tile "forma_fuste" v_forma_fuste) (set_tile "remetimiento" v_remet_fuste)
      (set_tile "mol_fuste_on" v_mol_fuste_on) (set_tile "mol_fuste_borde" v_mol_fuste_borde) (set_tile "mol_fuste_ali" v_mol_fuste_ali) (set_tile "mol_fuste_dir" v_mol_fuste_dir)
      (if v_ent_fuste (set_tile "txt_mol_fuste" "¡Perfil Vinculado!"))
      (action_tile "sel_mol_fuste" "(save_fuste_state) (done_dialog 5)")
      (action_tile "accept" "(save_fuste_state) (done_dialog 1)")
      (action_tile "cancel" "(done_dialog 0)")
      (setq sub_res (start_dialog))
      (cond ((= sub_res 5) (setq v_ent_fuste (car (entsel "\nSelecciona la polilínea para el FUSTE: ")))) ((= sub_res 1) (setq sub_loop nil)) ((= sub_res 0) (setq sub_loop nil)))
    )
  )

  (defun run_sub_capitel ( / sub_res )
    (setq sub_loop T)
    (while sub_loop
      (if (not (new_dialog "SubCapitel" dcl_id)) (exit))
      (set_tile "forma_capitel" v_forma_capitel) (set_tile "alt_capitel" v_alt_capitel) (set_tile "vuelo" v_vuelo_capitel)
      (set_tile "mol_capitel_on" v_mol_capitel_on) (set_tile "mol_capitel_borde" v_mol_capitel_borde) (set_tile "mol_capitel_ali" v_mol_capitel_ali) (set_tile "mol_capitel_dir" v_mol_capitel_dir)
      (if v_ent_capitel (set_tile "txt_mol_capitel" "¡Perfil Vinculado!"))
      (action_tile "sel_mol_capitel" "(save_capitel_state) (done_dialog 5)")
      (action_tile "accept" "(save_capitel_state) (done_dialog 1)")
      (action_tile "cancel" "(done_dialog 0)")
      (setq sub_res (start_dialog))
      (cond ((= sub_res 5) (setq v_ent_capitel (car (entsel "\nSelecciona la polilínea para el CAPITEL: ")))) ((= sub_res 1) (setq sub_loop nil)) ((= sub_res 0) (setq sub_loop nil)))
    )
  )

  (setq dcl_id (load_dialog "ColumnaACM.dcl"))
  (if (< dcl_id 0) (progn (princ "\nError cargando DCL.") (exit)))

  (setq main_loop T)
  (while main_loop
    (if (not (new_dialog "ColumnaACM_Main" dcl_id)) (exit))
    (set_tile "estilo" v_estilo) (set_tile "alt_total" v_alt_total) (set_tile "ancho_base" v_ancho_base)
    (refresh_main)
    (action_tile "btn_base" "(save_main_state) (done_dialog 2)") 
    (action_tile "btn_fuste" "(save_main_state) (done_dialog 3)") 
    (action_tile "btn_capitel" "(save_main_state) (done_dialog 4)")
    (action_tile "accept" "(save_main_state) (done_dialog 1)")
    (action_tile "cancel" "(done_dialog 0)")
    (setq res (start_dialog))
    (cond ((= res 2) (run_sub_base)) ((= res 3) (run_sub_fuste)) ((= res 4) (run_sub_capitel)) ((= res 1) (setq main_loop nil)) ((= res 0) (setq main_loop nil result 0)))
  )
  (unload_dialog dcl_id)

  ;;; 5. GERADOR 3D E MOLDURAS
  (if (= res 1)
    (progn
      (set-reg "estilo" v_estilo) (set-reg "alt_total" v_alt_total) (set-reg "ancho_base" v_ancho_base)
      (set-reg "forma_base" v_forma_base) (set-reg "alt_base" v_alt_base)
      (set-reg "forma_fuste" v_forma_fuste) (set-reg "remet_fuste" v_remet_fuste)
      (set-reg "forma_capitel" v_forma_capitel) (set-reg "alt_capitel" v_alt_capitel) (set-reg "vuelo_capitel" v_vuelo_capitel)
      (set-reg "mol_base_on" v_mol_base_on) (set-reg "mol_base_borde" v_mol_base_borde) (set-reg "mol_base_ali" v_mol_base_ali) (set-reg "mol_base_dir" v_mol_base_dir)
      (set-reg "mol_fuste_on" v_mol_fuste_on) (set-reg "mol_fuste_borde" v_mol_fuste_borde) (set-reg "mol_fuste_ali" v_mol_fuste_ali) (set-reg "mol_fuste_dir" v_mol_fuste_dir)
      (set-reg "mol_capitel_on" v_mol_capitel_on) (set-reg "mol_capitel_borde" v_mol_capitel_borde) (set-reg "mol_capitel_ali" v_mol_capitel_ali) (set-reg "mol_capitel_dir" v_mol_capitel_dir)

      (if v_ent_base (set-reg "mol_base_handle" (cdr (assoc 5 (entget v_ent_base)))))
      (if v_ent_fuste (set-reg "mol_fuste_handle" (cdr (assoc 5 (entget v_ent_fuste)))))
      (if v_ent_capitel (set-reg "mol_capitel_handle" (cdr (assoc 5 (entget v_ent_capitel)))))

      (defun draw-segment ( pt shape width height / p1 p2 )
        (setvar "OSMODE" 0)
        (cond
          ((= shape "0") (vl-cmdf "_.CYLINDER" "_non" pt (/ width 2.0) height))
          ((= shape "1") 
           (setq p1 (list (- (car pt) (/ width 2.0)) (- (cadr pt) (/ width 2.0)) (caddr pt)))
           (setq p2 (list (+ (car pt) (/ width 2.0)) (+ (cadr pt) (/ width 2.0)) (+ (caddr pt) height)))
           (vl-cmdf "_.BOX" "_non" p1 "_non" p2)
          )
          ((= shape "2") 
           (setvar "ELEVATION" (caddr pt))
           (vl-cmdf "_.POLYGON" 8 "_non" (list (car pt) (cadr pt)) "_C" (/ width 2.0))
           (vl-cmdf "_.EXTRUDE" (entlast) "" height)
           (setvar "ELEVATION" old_elev)
          )
        )
        (setvar "OSMODE" old_osmode)
        (entlast)
      )

      ;;; ========================================================================
      ;;; FUNÇÃO CORRIGIDA: MOLDURAS (APPLY_MOLDING) - Com identificador de Peça
      ;;; ========================================================================
      (defun apply_molding (part_name pt width shape z_offset alignment direction entity /
                            sweep_prof minpt maxpt pmin pmax bx by base_pt path_z path_ent obj old_elev_local real_dir)
        (if (and entity (entget entity))
          (progn
            (setvar "OSMODE" 0)

            ;; 1. Cópia segura nativa LISP
            (vl-cmdf "_.COPY" entity "" "_non" '(0 0 0) "_non" '(0 0 0))
            (setq sweep_prof (entlast))

            ;; 2. Inversão Direcional EXCLUSIVA para o Capitel
            (setq real_dir direction)
            (if (= part_name "CAPITEL")
              (setq real_dir (if (= direction "0") "1" "0"))
            )

            ;; 3. Espelhamento usando a direção ajustada
            (if (= real_dir "1") 
              (progn
                (vl-cmdf "_.MIRROR" sweep_prof "" "_non" '(0 0 0) "_non" '(0 1 0) "_Y")
                (setq sweep_prof (entlast)) 
              )
            )

            ;; 4. BoundingBox
            (setq obj (vlax-ename->vla-object sweep_prof))
            (vla-GetBoundingBox obj 'minpt 'maxpt)
            (setq pmin (vlax-safearray->list minpt) 
                  pmax (vlax-safearray->list maxpt))

            ;; 5. Alinhamento de Ponto Base (Com Topo e Fundo Trocados)
            (setq bx (if (= real_dir "1") (car pmax) (car pmin)))
            
            ;; Correção: Agora 0 (Apoiado) pega o PMAX e 2 (Colgado/Topo) pega o PMIN
            (setq by (cond
                       ((= alignment "0") (cadr pmax))
                       ((= alignment "1") (/ (+ (cadr pmin) (cadr pmax)) 2.0))
                       ((= alignment "2") (cadr pmin))
                     ))
            (setq base_pt (list bx by 0.0))

            ;; 6. Caminho (Path)
            (setq path_z (+ (caddr pt) z_offset))
            (setq old_elev_local (getvar "ELEVATION"))
            (setvar "ELEVATION" path_z) 
            
            (cond
              ((= shape "0") (vl-cmdf "_.CIRCLE" "_non" (list (car pt) (cadr pt)) (/ width 2.0)))
              ((= shape "1") 
               (vl-cmdf "_.RECTANG" 
                 "_non" (list (- (car pt) (/ width 2.0)) (- (cadr pt) (/ width 2.0)))
                 "_non" (list (+ (car pt) (/ width 2.0)) (+ (cadr pt) (/ width 2.0)))
               )
              )
              ((= shape "2") (vl-cmdf "_.POLYGON" 8 "_non" (list (car pt) (cadr pt)) "_C" (/ width 2.0)))
            )
            (setq path_ent (entlast))
            (setvar "ELEVATION" old_elev_local)

            ;; 7. Varredura (Sweep)
            (vl-cmdf "_.SWEEP" sweep_prof "" "_B" "_non" base_pt path_ent)
            
            (entlast)
          )
          (princ (strcat "\n[TMD] Ignorando moldura do " part_name " (Perfil não encontrado)."))
        )
      )

      ;;; 6. LOOP DE CRIAÇÃO
      (princ "\n[DICA] Clique na tela para inserir as colunas. Aperte ENTER vazio ou ESC para sair.")
      
      (while (setq p0 (getpoint "\nSelecciona el punto de inserción para la Columna (ou ENTER para sair): "))
        (setvar "CMDECHO" 0)
        (setvar "DELOBJ" 1)

        (setq num_alt_total (atof v_alt_total) num_ancho_base (atof v_ancho_base) 
              num_alt_base (atof v_alt_base) num_alt_capitel (atof v_alt_capitel) 
              num_remet_fuste (atof v_remet_fuste) num_vuelo_capitel (atof v_vuelo_capitel))
        
        (setq num_alt_fuste (- num_alt_total num_alt_base num_alt_capitel))
        (setq num_ancho_fuste (- num_ancho_base (* num_remet_fuste 2)))
        (setq num_ancho_capitel (+ num_ancho_base (* num_vuelo_capitel 2)))

        (setq solid_base (draw-segment p0 v_forma_base num_ancho_base num_alt_base))
        (tag_volume solid_base "BASE" v_forma_base num_ancho_base num_alt_base v_estilo)

        (setq p_fuste (list (car p0) (cadr p0) (+ (caddr p0) num_alt_base)))
        (setq solid_fuste (draw-segment p_fuste v_forma_fuste num_ancho_fuste num_alt_fuste))
        (tag_volume solid_fuste "FUSTE" v_forma_fuste num_ancho_fuste num_alt_fuste v_estilo)

        (setq p_capitel (list (car p0) (cadr p0) (+ (caddr p0) num_alt_base num_alt_fuste)))
        (setq solid_capitel (draw-segment p_capitel v_forma_capitel num_ancho_capitel num_alt_capitel))
        (tag_volume solid_capitel "CAPITEL" v_forma_capitel num_ancho_capitel num_alt_capitel v_estilo)

        ;; Aplicação com a string do nome da peça ("BASE", "FUSTE", "CAPITEL")
        (if (= v_mol_base_on "1")
          (progn
            (setq solid_m_base (apply_molding "BASE" p0 num_ancho_base v_forma_base (if (= v_mol_base_borde "0") 0.0 num_alt_base) v_mol_base_ali v_mol_base_dir v_ent_base))
            (if solid_m_base (tag_molding solid_m_base "BASE" v_forma_base num_ancho_base num_alt_base))
          )
        )
        (if (= v_mol_fuste_on "1")
          (progn
            (setq solid_m_fuste (apply_molding "FUSTE" p_fuste num_ancho_fuste v_forma_fuste (if (= v_mol_fuste_borde "0") 0.0 num_alt_fuste) v_mol_fuste_ali v_mol_fuste_dir v_ent_fuste))
            (if solid_m_fuste (tag_molding solid_m_fuste "FUSTE" v_forma_fuste num_ancho_fuste num_alt_fuste))
          )
        )
        (if (= v_mol_capitel_on "1")
          (progn
            (setq solid_m_capitel (apply_molding "CAPITEL" p_capitel num_ancho_capitel v_forma_capitel (if (= v_mol_capitel_borde "0") 0.0 num_alt_capitel) v_mol_capitel_ali v_mol_capitel_dir v_ent_capitel))
            (if solid_m_capitel (tag_molding solid_m_capitel "CAPITEL" v_forma_capitel num_ancho_capitel num_alt_capitel))
          )
        )

        (setvar "DELOBJ" old_delobj)
        (setvar "CMDECHO" old_cmdecho)
        (princ "\n¡Gêmeo Digital gerado com sucesso! (XData TMD_GEO Injetado).")
      )
    )
    (princ "\nComando cancelado pelo usuário.")
  )

  (setvar "OSMODE" old_osmode)
  (setvar "ELEVATION" old_elev)
  (setvar "CMDECHO" old_cmdecho)
  (setvar "DELOBJ" old_delobj)
  (setq *error* old_err)
  (princ)
)

(princ "\nTM Digital ACM Loaded. Digite COLUMNAACM.")
(princ)