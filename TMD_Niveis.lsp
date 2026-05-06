;;; =====================================================================================
;;; TM DIGITAL - GESTOR DE NÍVEIS B.I.M (TMD_Niveis.lsp)
;;; Sustituye al primitivo comando textual de TMD_Core.
;;; =====================================================================================

(vl-load-com)

;;; =====================================================================================
;;; 1. LÓGICA DE DATOS B.I.M EN DICCIONARIO
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
;;; 2. SUB-MENÚ AÑADIR NUEVO
;;; =====================================================================================

(defun TMD:niveis-add ( / dcl_file handle dcl_id status nome z_val res)
  (setq dcl_file (vl-filename-mktemp "tmd_nadd.dcl"))
  (setq handle (open dcl_file "w"))
  (write-line "tmd_nadd : dialog { label = \"TMD - Novo Nível Estrutural\"; " handle)
  (write-line "  : edit_box { label=\"Nome do Nível:\"; key=\"n_nome\"; width = 30; }" handle)
  (write-line "  : edit_box { label=\"Altura Z (mm):\"; key=\"n_z\"; }" handle)
  (write-line "  ok_cancel; }" handle)
  (close handle)
  
  (setq dcl_id (load_dialog dcl_file))
  (if (not (new_dialog "tmd_nadd" dcl_id)) (exit))
  
  (set_tile "n_nome" "Ex: MEZANINO")
  (set_tile "n_z" "3000")
  
  (action_tile "accept" 
    "(setq nome (get_tile \"n_nome\") z_val (atof (get_tile \"n_z\"))) (done_dialog 1)"
  )
  (action_tile "cancel" "(done_dialog 0)")

  (setq status (start_dialog))
  (unload_dialog dcl_id)
  (vl-file-delete dcl_file)
  
  (if (= status 1) (list (strcase nome) z_val) nil)
)

;;; =====================================================================================
;;; 3. VENTANA PRINCIPAL DE GESTIÓN
;;; =====================================================================================

(defun c:TMD_NIVEIS ( / dcl_file handle dcl_id status loop levels ativo disp_list i sel_idx 
                        row is_ati temp_sel to_del new_obj)
  
  (setq dcl_file (vl-filename-mktemp "tmd_niveis.dcl"))
  (princ "\n[TMD] Abrindo Gestor de Níveis... Digite H para ajuda se necessário.")
  (initget "Help")
  (setq opt (getkword "\n[TMD] Pressione ENTER para abrir o gestor ou H para ajuda: "))
  (if (= opt "Help") (TMD:util-help "TMD_NIVEIS"))
  (setq handle (open dcl_file "w"))
  (write-line "tmd_nmain : dialog { label = \"TM Digital - Gestor de Níveis B.I.M\"; " handle)
  (write-line "  : list_box { label = \"Tabela de Níveis Ativos no Projeto:\"; key = \"lst_niveis\"; height = 12; width = 50; }" handle)
  (write-line "  : row {" handle)
  (write-line "    : button { label = \"[+] Novo\"; key = \"btn_add\"; }" handle)
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
    (foreach lvl levels
      (setq is_ati (if (= (car lvl) ativo) "[ X ] " "[   ] "))
      (setq row (strcat is_ati (car lvl) "   ----->   " (rtos (cadr lvl) 2 2) " mm"))
      (setq disp_list (append disp_list (list row)))
      (if (= (car lvl) ativo) (setq sel_idx (itoa i)))
      (setq i (1+ i))
    )
    
    (set_tile "lst_niveis" sel_idx)
    (start_list "lst_niveis") (mapcar 'add_list disp_list) (end_list)
    
    (action_tile "lst_niveis" "(setq sel_idx $value)")
    (action_tile "btn_add" "(done_dialog 2)")
    (action_tile "btn_del" "(done_dialog 4)")
    (action_tile "btn_set" "(done_dialog 3)")
    (action_tile "accept" "(done_dialog 1)")
    (action_tile "cancel" "(done_dialog 0)")

    (setq status (start_dialog))
    (unload_dialog dcl_id)
    
    (cond 
      ((= status 1) ; OK -> Cierra y Guarda
        (setq loop nil)
      )
      ((= status 2) ; ADD
        (setq new_obj (TMD:niveis-add))
        (if new_obj 
          (progn
            (setq levels (TMD:niveis-sort (append levels (list new_obj))))
            (TMD:niveis-set levels)
          )
        )
      )
      ((= status 3) ; SET ACTIVE
        (setq temp_sel (atoi sel_idx))
        (setq ativo (car (nth temp_sel levels)))
        (TMD:niveis-set-ativo ativo)
      )
      ((= status 4) ; DEL
        (setq temp_sel (atoi sel_idx))
        (setq to_del (car (nth temp_sel levels)))
        (if (= to_del "PISO ZERO")
          (alert "Proteção Estrutural: O PISO ZERO não pode ser apagado do projeto.")
          (progn
            (setq levels (vl-remove (nth temp_sel levels) levels))
            (TMD:niveis-set levels)
            (if (= ativo to_del) (setq ativo "PISO ZERO"))
            (TMD:niveis-set-ativo ativo)
            (setq sel_idx "0")
          )
        )
      )
      ((= status 0) (setq loop nil)) ; Cancel
    )
  )
  
  (vl-file-delete dcl_file)
  (princ (strcat "\n[TM Digital] Nível Atual do Projeto: " ativo))
  (princ)
)

(princ "\n[TMD] Módulo TMD_Niveis BIM Cargado. Comando: TMD_NIVEIS")
(princ)
