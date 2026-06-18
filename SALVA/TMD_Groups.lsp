;;; =====================================================================================
;;; TM DIGITAL - GESTOR DE GRUPOS B.I.M (TMD_Groups.lsp)
;;; Objetivo: Criar grupos (Peças) de forma rápida com nomenclatura auto-incrementável.
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; 1. AUXILIARES DE NOMENCLATURA E PESQUISA
;;; -------------------------------------------------------------------------------------

;; Retorna uma lista com os nomes de todos os grupos no desenho
(defun TMD:group-list-all (/ groups result)
  (setq groups (vla-get-Groups (vla-get-ActiveDocument (vlax-get-acad-object))))
  (setq result nil)
  (vlax-for g groups (setq result (cons (vla-get-Name g) result)))
  result
)

;; Incrementa letras (A -> B, Z -> AA)
(defun TMD:group-increment-letter (current / len last_char)
  (setq len (strlen current))
  (setq last_char (substr current len 1))
  (if (= last_char "Z")
    (if (= len 1) "AA" (strcat (TMD:group-increment-letter (substr current 1 (1- len))) "A"))
    (strcat (substr current 1 (1- len)) (chr (1+ (ascii last_char))))
  )
)

;; Incrementa números (01 -> 02, 9 -> 10) mantendo o padding
(defun TMD:group-increment-number (current / val new_val len new_str)
  (setq val (atoi current))
  (setq new_val (1+ val))
  (setq len (strlen current))
  (setq new_str (itoa new_val))
  (while (< (strlen new_str) len) (setq new_str (strcat "0" new_str)))
  new_str
)

;; Encontra o próximo nome disponível para um prefixo baseado no que já existe no desenho
(defun TMD:group-find-next-available (prefix / all matching max_suffix suffix is_num)
  (setq all (TMD:group-list-all))
  (setq matching (vl-remove-if-not '(lambda (x) (= (vl-string-search (strcase prefix) (strcase x)) 0)) all))
  
  (if (not matching)
    (strcat prefix "01") ;; Padrão inicial se não encontrar nada
    (progn
      (setq max_suffix nil)
      (foreach name matching
        (setq suffix (substr name (1+ (strlen prefix))))
        (if (or (not max_suffix) (vl-string-search max_suffix suffix) (> (strlen suffix) 0))
          (setq max_suffix (if (and max_suffix (> (strcase suffix) (strcase max_suffix))) suffix (if max_suffix max_suffix suffix)))
        )
      )
      ;; Determinar se o sufixo é numérico ou letra
      (if (and max_suffix (/= max_suffix "") (numberp (read max_suffix)))
        (strcat prefix (TMD:group-increment-number max_suffix))
        (strcat prefix (TMD:group-increment-letter (if (or (not max_suffix) (= max_suffix "")) "A" (strcase max_suffix))))
      )
    )
  )
)

;; Obtém as configurações persistentes
(defun TMD:group-get-settings (/ prefix letter)
  (setq prefix (TMD:bim-get-reg "GROUP_PREFIX" "Peça_"))
  (setq letter (TMD:bim-get-reg "GROUP_COUNTER" "A"))
  (list prefix letter)
)

(defun TMD:group-set-settings (prefix letter)
  (TMD:bim-set-reg "GROUP_PREFIX" prefix)
  (TMD:bim-set-reg "GROUP_COUNTER" letter)
)

;;; -------------------------------------------------------------------------------------
;;; 1.5 LIMPEZA E SOBERANIA DE GRUPOS
;;; -------------------------------------------------------------------------------------

;; Remove um objeto de grupos anônimos (*A1, etc) se ele já pertencer a outro grupo (Soberania BIM).
(defun TMD:group-cleanup-sovereignty (ent / vla_obj grps named_grps auto_grps arr has_bim)
  (setq has_bim (or (vlax-ldata-get ent "TMD_PARAMS") (vlax-ldata-get ent "TMD_CLASSE")))
  
  (if has_bim
    (progn
      (setq vla_obj (if (= (type ent) 'ENAME) (vlax-ename->vla-object ent) ent))
      (setq grps (TMD:util-get-entity-groups ent))
      
      ;; Separar: Nomeados vs Anônimos (AutoCAD usa * para anônimos)
      (setq named_grps (vl-remove-if '(lambda (g) (wcmatch (vla-get-Name g) "`**")) grps))
      (setq auto_grps  (vl-remove-if-not '(lambda (g) (wcmatch (vla-get-Name g) "`**")) grps))
      
      ;; REGRAS:
      ;; 1. Se pertence a um grupo nomeado e a um anônimo -> Sai do anônimo.
      ;; 2. Se pertence a dois anônimos -> Mantém (AutoCAD gerencia), a menos que queiramos limpar.
      (if (and named_grps auto_grps)
        (progn
          (setq arr (vlax-make-safearray vlax-vbObject '(0 . 0)))
          (vlax-safearray-put-element arr 0 vla_obj)
          (foreach g auto_grps
            (vl-catch-all-apply 'vla-RemoveItems (list g arr))
          )
          (princ (strcat "\n      [GRP] Objeto BIM removido de " (itoa (length auto_grps)) " grupos automáticos."))
          T
        )
      )
    )
  )
)


;; Purga global de grupos anônimos vazios
(defun c:TMD_GROUP_PURGE ( / groups count)
  (setq groups (vla-get-Groups (vla-get-ActiveDocument (vlax-get-acad-object))))
  (setq count 0)
  (vlax-for g groups
    (if (and (wcmatch (vla-get-Name g) "`**") (= (vla-get-Count g) 0))
      (progn (vla-Delete g) (setq count (1+ count)))
    )
  )
  (princ (strcat "\n[✔] Limpeza concluída: " (itoa count) " grupos anônimos vazios removidos."))
  (princ)
)

;; Saneamento Global: Aplica soberania a todos os objetos BIM do desenho
(defun c:TMD_GROUP_CLEANUP_ALL ( / ss i ent count_obj)
  (princ "\n[TMD] Iniciando Saneamento Global de Grupos...")
  (setq ss (ssget "_X" '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
  
  (setq count_obj 0)
  (if ss
    (progn
      (setq i 0)
      (repeat (sslength ss)
        (setq ent (ssname ss i))
        (if (TMD:group-cleanup-sovereignty ent)
          (setq count_obj (1+ count_obj))
        )
        (setq i (1+ i))
      )
    )
  )
  
  ;; Chamar a purga para remover o que sobrou
  (c:TMD_GROUP_PURGE)
  
  (princ (strcat "\n[OK] Saneamento concluído!"))
  (princ (strcat "\n     - " (itoa count_obj) " objetos BIM saneados."))
  (princ)
)



;;; -------------------------------------------------------------------------------------
;;; 2. NÚCLEO DE AGRUPAMENTO
;;; -------------------------------------------------------------------------------------

(defun TMD:group-collect-bim-entities (ss / i ent etype res ph w_ent s_h s_ent)
  (setq res (list))
  (if ss
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq etype (cdr (assoc 0 (entget ent))))
        (setq w_ent nil s_ent nil)
        (cond
          ((= etype "LINE")
            (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE")
              (progn
                (setq w_ent ent)
                (setq s_h (vlax-ldata-get ent "TMD_CHILD_SOLID"))
                (if (and s_h (setq s_ent (handent s_h)) (entget s_ent)) (setq s_ent s_ent) (setq s_ent nil))
              )
            )
          )
          ((= etype "3DSOLID")
            (if (= (vlax-ldata-get ent "TMD_COMPILADO") "SIM")
              (progn
                (setq s_ent ent)
                (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE"))
                (if (and ph (setq w_ent (handent ph)) (entget w_ent)) (setq w_ent w_ent) (setq w_ent nil))
              )
            )
          )
        )
        (if (and w_ent (not (member w_ent res))) (setq res (cons w_ent res)))
        (if (and s_ent (not (member s_ent res))) (setq res (cons s_ent res)))
        (setq i (1+ i))
      )
    )
  )
  res
)

;;; -------------------------------------------------------------------------------------
;;; 3. COMANDO PRINCIPAL: TMD_GROUP
;;; -------------------------------------------------------------------------------------

(defun TMD:group-config-ui (prefix letter / new_prefix new_letter)
  (setq new_prefix (getstring T (strcat "\nNovo Prefixo (atual: " prefix "): ")))
  (if (and new_prefix (/= new_prefix "")) (setq prefix new_prefix))
  (setq new_letter (getstring (strcat "\nLetra/Código inicial (atual: " letter "): ")))
  (if (and new_letter (/= new_letter "")) (setq letter (strcase new_letter)))
  (TMD:group-set-settings prefix letter)
  (list prefix letter)
)

(defun c:TMD_GROUP ( / settings prefix letter current_name implied_ss ss ent_list count loop opt opt_up 
                       sel_adopt adopt_ent adopt_groups adopt_name pos vla_groups vla_group vla_objs i conf needs_conf)
  (if (not TMD:bim-set-reg) (load "TMD_Utils.lsp"))
  
  (setq settings (TMD:group-get-settings))
  (setq prefix (car settings) letter (cadr settings))
  (setq current_name (strcat prefix letter))
  
  (princ "\n\n[ TM DIGITAL ] ==============================")
  (princ (strcat "\n[TMD] Nome automático atual: " current_name))
  
  ;; 1. Obter Seleção (Loop que permite Config/Help antes de selecionar)
  (setq implied_ss (ssget "_I"))
  (if (not implied_ss)
    (progn
      (setq ss nil)
      (while (not ss)
        (princ (strcat "\n[TMD] Peça: " current_name ". Selecione os elementos ou [Config/Help]: "))
        (initget "Config Help")
        (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
        
        (cond
          ((= ss "Config")
            (setq settings (TMD:group-config-ui prefix letter))
            (setq prefix (car settings) letter (cadr settings) current_name (strcat prefix letter))
            (princ (strcat "\n[TMD] Novo padrão: " current_name))
            (setq ss nil)
          )
          ((= ss "Help")
            (TMD:util-help "TMD_GROUP")
            (setq ss nil)
          )
          ((not ss) 
            (if (= (getvar "ERRNO") 52) 
              (progn (princ "\n[⚠] Cancelado.") (exit)) 
              (progn (princ "\n[!] Seleção inválida. Tente novamente.") (setq ss nil))
            )
          )
        )
      )
      (setq ent_list (TMD:group-collect-bim-entities ss))
    )
    (setq ent_list (TMD:group-collect-bim-entities implied_ss))
  )

  (setq count (length ent_list))
  (if (= count 0) (progn (princ "\n[⚠] Nenhum elemento BIM identificado.") (exit)))
  
  ;; 2. Prompt de Nomenclatura (Loop que permite falhas e re-tentativas)
  (setq loop T)
  (setq needs_conf nil) ;; Controle de confirmação extra
  
  (while loop
    (initget "Adoção Config Help")
    (if implied_ss
      (setq opt (getstring T (strcat "\n[TMD] " (itoa count) " itens. Nome: '" current_name "'? [Adoção/Config/Help/Enter]: ")))
      (setq opt (getstring T (strcat "\nNome da Peça [Adoção/Config/Help] <" current_name ">: ")))
    )
    
    (setq opt_up (strcase opt))
    (setq should_increment nil)

    (cond
      ;; AJUDA
      ((or (= opt_up "HELP") (= opt_up "H"))
        (TMD:util-help "TMD_GROUP")
      )
      ;; ADOÇÃO
      ((or (= opt_up "ADOÇÃO") (= opt_up "A"))
        (setq sel_adopt (entsel "\nSelecione um objeto para adotar o nome do grupo: "))
        (if (and sel_adopt (setq adopt_groups (TMD:util-get-entity-groups (car sel_adopt))))
          (progn
            (setq adopt_name (vla-get-Name (car adopt_groups)))
            (princ (strcat "\n[TMD] Grupo base detectado: " adopt_name))
            (setq pos (vl-string-search "_" adopt_name))
            (if pos (setq prefix (substr adopt_name 1 (1+ pos))) (setq prefix adopt_name))
            (setq current_name (TMD:group-find-next-available prefix))
            (setq should_increment T loop nil needs_conf T)
          )
          (princ "\n[⚠] Objeto inválido ou sem grupo. Tente novamente.")
        )
      )
      ;; CONFIG
      ((or (= opt_up "CONFIG") (= opt_up "C"))
        (setq settings (TMD:group-config-ui prefix letter))
        (setq prefix (car settings) letter (cadr settings) current_name (strcat prefix letter))
        (setq should_increment T needs_conf T)
      )
      ;; INTELIGENTE (_)
      ((and (> (strlen opt) 0) (= (substr opt (strlen opt)) "_"))
        (setq current_name (TMD:group-find-next-available opt))
        (setq should_increment T loop nil needs_conf T)
      )
      ;; MANUAL
      ((and opt (/= opt ""))
        (setq current_name opt)
        (setq should_increment nil loop nil needs_conf nil)
      )
      ;; ENTER
      (t 
        (setq should_increment T loop nil needs_conf nil)
      )
    )
  )

  ;; 3. CONFIRMAÇÃO (Apenas se houver incerteza no nome calculado)
  (if needs_conf
    (progn
      (princ (strcat "\n[TMD] NOME CALCULADO: " current_name " (" (itoa count) " elementos)"))
      (initget "Sim Não")
      (setq conf (getkword "\nConfirmar esta proposta? [Sim/Não] <Sim>: "))
      (if (and conf (= conf "Não")) (progn (princ "\n[⚠] Operação cancelada.") (exit)))
    )
  )

  ;; 4. EXECUÇÃO
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq vla_groups (vla-get-Groups doc))
  (setq vla_group (vl-catch-all-apply 'vla-Item (list vla_groups current_name)))
  (if (vl-catch-all-error-p vla_group)
    (setq vla_group (vla-Add vla_groups current_name))
    (princ (strcat "\n[!] Atualizando grupo existente: " current_name))
  )
  
  (setq vla_objs (vlax-make-safearray vlax-vbObject (cons 0 (1- (length ent_list)))))
  (setq i 0)
  (foreach ent ent_list (vlax-safearray-put-element vla_objs i (vlax-ename->vla-object ent)) (setq i (1+ i)))
  (vl-catch-all-apply 'vla-AppendItems (list vla_group vla_objs))
  
  (princ (strcat "\n[OK] CONCLUÍDO: " current_name))
  
  ;; Salvar incremento se necessário
  (if should_increment
    (progn
      (setq pos (vl-string-search "_" current_name))
      (if pos (setq letter (substr current_name (+ 2 pos))) (setq letter (TMD:group-increment-letter letter)))
      (if (and letter (/= letter "") (numberp (read letter)))
        (setq letter (TMD:group-increment-number letter))
        (setq letter (TMD:group-increment-letter letter))
      )
      (TMD:group-set-settings prefix letter)
      (princ (strcat " | Próximo Automático: " prefix letter))
    )
  )
  (princ "\n=============================================\n")
  (princ)
)

;;; -------------------------------------------------------------------------------------
;;; 4. MOTOR DE SELEÇÃO POR GRUPO (PARA OUTROS COMANDOS)
;;; -------------------------------------------------------------------------------------

;; Função central para ser usada em TMD_BUILD, TMD_TABLAS, etc.
;; Retorna um Selection Set (SS) com os elementos dos grupos selecionados.
(defun TMD:group-select-engine ( / opt ss_res all_groups g_name pattern vla_grp vla_obj sel_obj grps count)
  (setq ss_res (ssadd))
  (initget 128 "Nome")
  (setq opt (entsel "\n[GRUPO] Selecione um objeto do grupo ou [Nome/Padrão]: "))
  
  (cond
    ;; 1. Cancelamento
    ((not opt) nil)
    
    ;; 2. Seleção por Nome/Padrão (Wildcards)
    ((or (= opt "Nome") (= (type opt) 'STR))
      (if (or (= opt "Nome") (= opt ""))
        (setq pattern (getstring T "\nDigite o Nome ou Padrão (ex: Estrutura_*, Peça_A): "))
        (setq pattern opt)
      )
      (if (and pattern (/= pattern ""))
        (progn
          (setq all_groups (vla-get-Groups (vla-get-ActiveDocument (vlax-get-acad-object))))
          (vlax-for vla_grp all_groups
            (setq g_name (vla-get-Name vla_grp))
            (if (wcmatch (strcase g_name) (strcase pattern))
              (vlax-for vla_obj vla_grp
                (if (and (not (vlax-erased-p vla_obj)) (vlax-read-enabled-p vla_obj))
                  (ssadd (vlax-vla-object->ename vla_obj) ss_res)
                )
              )
            )
          )
        )
      )
    )
    
    ;; 3. Seleção por Clique em Membro
    ((= (type opt) 'LIST)
      (setq sel_obj (car opt))
      (setq grps (TMD:util-get-entity-groups sel_obj))
      ;; Filtrar apenas grupos nomeados (prioridade TMD)
      (setq grps (vl-remove-if '(lambda (g) (wcmatch (vla-get-Name g) "`**")) grps))
      
      (if grps
        (progn
          (setq vla_grp (car grps)) ;; Pega o primeiro grupo nomeado
          (princ (strcat "\n[GRUPO] Selecionado: " (vla-get-Name vla_grp)))
          (vlax-for vla_obj vla_grp
            (if (and (not (vlax-erased-p vla_obj)) (vlax-read-enabled-p vla_obj))
              (ssadd (vlax-vla-object->ename vla_obj) ss_res)
            )
          )
        )
        (princ "\n[⚠] O objeto não pertence a nenhum grupo TMD nomeado.")
      )
    )
  )
  
  ;; Sanear objetos selecionados antes de retornar
  (if (> (sslength ss_res) 0)
    (progn
      (setq i 0)
      (repeat (sslength ss_res)
        (TMD:group-cleanup-sovereignty (ssname ss_res i))
        (setq i (1+ i))
      )
      ss_res
    )
    nil
  )
)

(princ "\n[TMD] Grupo Avançado Carregado. Comando: TMD_GROUP")
(princ)
