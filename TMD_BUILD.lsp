;;; =====================================================================================
;;; TM DIGITAL - COMPILADOR ESTRUCTURAL B.I.M (TMD_BUILD.lsp)
;;; Objetivo: Convertir el Esqueleto Analítico (Wires) en un Modelo Físico Fabricable 3D.
;;; =====================================================================================
;;;
;;; TODO (FUTURO - BUG): Sólidos Duplicados na Mesma Linha
;;;   - Sintoma: O TMD_BUILD ocasionalmente gera 2 sólidos 3D sobre o mesmo wire,
;;;     às vezes sobrepostos no exato mesmo lugar, outras vezes com rotações diferentes.
;;;   - Causa suspeita (a investigar):
;;;     1. O motor de purga (TMD:build-purge-old) identifica sólidos a apagar pelo
;;;        L-Data "TMD_COMPILADO" = "SIM". Se esse valor não foi gravado corretamente
;;;        numa sessão anterior (ex: falha no entmod ou vlax-ldata-put), o sólido antigo
;;;        sobrevive à purga e o novo é criado em cima.
;;;     2. A função TMD:build-single-wire não verifica se já existe um TMD_CHILD_SOLID
;;;        válido antes de criar um novo. Se o link Wire→Solid estiver desatualizado mas
;;;        o sólido físico ainda existir, cria-se um duplicado.
;;;     3. O TMD_MATCH ou TMD_JOINTS pode apagar o CHILD_SOLID do L-Data sem apagar
;;;        o sólido físico da base de dados do DWG (entdel falhou silenciosamente).
;;;   - Investigação sugerida:
;;;     1. Antes de criar o sólido em TMD:build-single-wire, verificar se existe um
;;;        sólido físico com TMD_PARENT_WIRE = handle do wire atual (busca reversa).
;;;     2. Se existir → apagar antes de criar o novo.
;;;     3. Reforçar o entdel no motor de purga com verificação de entget após a deleção.
;;;   - Prioridade: média. Afeta a visualização e a medição de comprimentos em TMD_JOINTS.
;;;
(vl-load-com)

;; Carregar Dependências
(if (not j2:make-cutter) (load "TMD_JOINTS.lsp"))

;;; =====================================================================================
;;; 1. MOTOR DE PURGA E LIMPEZA DE ÓRFÃOS
;;; =====================================================================================

;; Remove todos os sólidos compilados do desenho (Full Reset).
(defun TMD:build-purge-all ( / ss i ent)
  (setq ss (ssget "_X" '((0 . "3DSOLID"))))
  (if ss
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (if (= (vlax-ldata-get ent "TMD_COMPILADO") "SIM")
          (if (entget ent) (entdel ent))
        )
        (setq i (1+ i))
      )
    )
  )
)

;; Remove sólidos que apontam para wires que não existem mais.
(defun TMD:build-clean-orphans ( / ss i ent ph w_ent)
  (setq ss (ssget "_X" '((0 . "3DSOLID"))))
  (if ss
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (if (= (vlax-ldata-get ent "TMD_COMPILADO") "SIM")
          (progn
            (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE"))
            (setq w_ent (if (and ph (= (type ph) 'STR)) (handent ph) nil))
            (if (or (not w_ent) (not (entget w_ent)))
              (progn
                (princ (strcat "\n    [LIMPEZA] Apagando sólido órfão: " (cdr (assoc 5 (entget ent)))))
                (entdel ent)
              )
            )
          )
        )
        (setq i (1+ i))
      )
    )
  )
)

;;; =====================================================================================
;;; 2. NÚCLEO COMPILADOR INDIVIDUAL (LOCAL)
;;; =====================================================================================
(defun TMD:build-single-wire (ent / params p_nome ptA ptB p_forma p_x p_y p_e dist just rot lay solid_lay solid_ent old_lay 
                                    old_solid_h old_solid grp)
  (if (and ent (entget ent) (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE"))
    (progn
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (if params
        (progn
          ;; 1. LIMPEZA PREVENTIVA (Delete-before-Create)
          ;; Busca se já existe um sólido vinculado a este wire e apaga-o.
          (setq old_solid_h (vlax-ldata-get ent "TMD_CHILD_SOLID"))
          (if (and old_solid_h (= (type old_solid_h) 'STR))
            (progn
              (setq old_solid (handent old_solid_h))
              (if (and old_solid (entget old_solid)) (entdel old_solid))
            )
          )
          
          ;; 2. EXTRAÇÃO DE DADOS
          (setq p_nome (vlax-ldata-get ent "TMD_NOME"))
          (setq e_data (entget ent))
          (setq ptA (cdr (assoc 10 e_data)))
          (setq ptB (cdr (assoc 11 e_data)))
          (setq dist (distance ptA ptB))
          
          (setq p_forma (cdr (assoc "FORMA" params)))
          (setq p_x (cdr (assoc "DIM_X" params)))
          (setq p_y (cdr (assoc "DIM_Y" params)))
          (setq p_e (cdr (assoc "ESPESSURA" params)))
          
          ;; Suporte para legado e novos campos B.I.M
          (setq p_labio (cdr (assoc "LABIO" params)))
          (if (not p_labio) (setq p_labio 0.0))
          (setq p_material (cdr (assoc "MATERIAL" params)))
          (if (not p_material) (setq p_material "ACO_CARBONO"))
          
          (setq just (cdr (assoc "JUSTIFICACAO" params)))
          (setq rot (cdr (assoc "ROTACAO" params)))
          
          ;; 3. GESTÃO DE LAYERS
          (setq lay (cdr (assoc 8 (entget ent))))
          (if (vl-string-search "WIRE-" lay)
            (setq solid_lay (vl-string-subst "06-" "WIRE-" lay))
            (setq solid_lay lay)
          )
          (if (not (tblsearch "LAYER" solid_lay))
            (vl-cmdf "_.-LAYER" "_M" solid_lay "")
          )
          
          (setq old_lay (getvar "CLAYER"))
          (setvar "CLAYER" solid_lay)
          
          ;; 4. GERAÇÃO GEOMÉTRICA
          (setq solid_ent (TMD:viga-build-geom nil ptA ptB just rot p_nome p_forma p_x p_y p_e p_labio p_material dist))
          
          (if solid_ent
            (progn
              ;; 5. INJEÇÃO DE METADADOS
              (vlax-ldata-put solid_ent "TMD_COMPILADO" "SIM")
              (vlax-ldata-put solid_ent "TMD_PARAMS" (vlax-ldata-get ent "TMD_PARAMS"))
              (vlax-ldata-put solid_ent "TMD_NOME" (vlax-ldata-get ent "TMD_NOME"))
              (vlax-ldata-put solid_ent "TMD_CLASSE" (vlax-ldata-get ent "TMD_CLASSE"))
              (vlax-ldata-put solid_ent "TMD_NIVEL_INI" (vlax-ldata-get ent "TMD_NIVEL_INI"))
              (vlax-ldata-put solid_ent "TMD_NIVEL_FIM" (vlax-ldata-get ent "TMD_NIVEL_FIM"))
              ;; 5b. CÁLCULO DE LONGITUD FÍSICA OPTIMIZADO (User Optimization)
              (setq cuts (vlax-ldata-get ent "TMD_CUTTERS"))
              (if (and cuts (listp cuts) (> (length cuts) 0) TMD:util-get-directional-len-FORCE)
                (vlax-ldata-put ent "TMD_LEN_PHYS" (TMD:util-get-directional-len-FORCE solid_ent ent))
                (vlax-ldata-put ent "TMD_LEN_PHYS" dist) ;; Si no hay juntas, es igual al wire
              )
              (vlax-ldata-put solid_ent "TMD_PARENT_WIRE" (cdr (assoc 5 (entget ent))))
              (vlax-ldata-put ent "TMD_CHILD_SOLID" (cdr (assoc 5 (entget solid_ent))))
              (vlax-ldata-put ent "TMD_MARK" nil) ;; Limpar marca ao regenerar solido
              
              ;; 6. PROPAGAÇÃO DE GRUPOS (Reativado)
              (if (and TMD:util-get-entity-groups TMD:util-add-to-group)
                (progn
                  (setq grps (TMD:util-get-entity-groups ent))
                  (if grps (foreach g grps (TMD:util-add-to-group solid_ent g)))
                )
              )
              (princ (strcat "\n    [✔] Gerado: " p_nome))
              
              ;; 7. APLICAÇÃO AUTOMÁTICA DE JUNTAS (Opcional)
              (if (and *TMD-AUTO-JOINT* (= *TMD-AUTO-JOINT* "Sim"))
                (progn
                  (setq cuts (vlax-ldata-get ent "TMD_CUTTERS"))
                  (if (and cuts (listp cuts))
                    (progn
                      (princ (strcat " (Aplicando " (itoa (length cuts)) " juntas...)"))
                      (foreach cut cuts
                        (setq h_master (car cut)
                              tipo     (nth 1 cut)
                              gap      (nth 2 cut)
                              w_master (handent h_master))
                        (if (and w_master (entget w_master))
                          (cond
                            ((= tipo "Flush") (j2:do-flush solid_ent w_master gap))
                            ((= tipo "Miter") (j2:do-miter solid_ent ent w_master))
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
          
          (setvar "CLAYER" old_lay)
          solid_ent
        )
      )
    )
  )
)

;;; =====================================================================================
;;; 3. BARRIDO COMANDAL INTERATIVO (c:TMD_BUILD)
;;; =====================================================================================
(defun c:TMD_BUILD ( / ss i ent count old_cmdecho path_vigas ph w_ent wire_list mode kw)
  
  (setq old_cmdecho (getvar "CMDECHO")) 
  (setvar "CMDECHO" 0)
  
  ;; 1. Chequeo de dependencias
  (if (not TMD:viga-build-geom) 
    (progn
      (setq path_vigas (findfile "TMD_Vigas.lsp"))
      (if (not path_vigas) (setq path_vigas (strcat (getvar "DWGPREFIX") "TMD_Vigas.lsp")))
      (if (findfile path_vigas)
        (load path_vigas)
        (progn (alert "ERRO FATAL: Falta el motor geométrico TMD_Vigas.lsp.") (exit))
      )
    )
  )
  
  (princ "\n[ TM DIGITAL ] ==============================")
  (princ "\n[TMD] Compilação B.I.M Seletiva")
  
  ;; 2. CONFIGURAÇÃO PADRÃO E SELEÇÃO DIRETA (FLUXO TURBO)
  (setq *TMD-AUTO-JOINT* "Sim") 
  (setq ss nil)
  
  (while (not ss)
    (princ (strcat "\n[BUILD] Modo: Juntas=" *TMD-AUTO-JOINT* " | [S]em juntas | [H]elp | Selecione Wires ou Sólidos: "))
    (initget "Sem Help")
    (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
    
    (if (not ss)
      (progn
        (setq kw (getvar "LASTPROMPT"))
        (cond
          ((vl-string-search "Sem" kw)
           (setq *TMD-AUTO-JOINT* "Não")
           (princ "\n[!] Modo alterado para: SEM JUNTAS."))
          ((vl-string-search "Help" kw)
           (TMD:util-help "TMD_BUILD"))
          (t (setq ss "EXIT")) ;; ESC ou ENTER vazio
        )
      )
    )
  )

  (if (= ss "EXIT") (progn (princ "\n[⚠] Cancelado.") (setvar "CMDECHO" old_cmdecho) (exit)))
  
  (setq wire_list (list))
  (if (and ss (not (= ss "EXIT")))
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq etype (cdr (assoc 0 (entget ent))))
        (setq w_ent nil)
        (cond
          ((= etype "LINE")
           (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE")
             (setq w_ent ent)
           )
          )
          ((= etype "3DSOLID")
           (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE"))
           (if (and ph (= (type ph) 'STR))
             (setq w_ent (handent ph))
           )
          )
        )
        (if (and w_ent (not (member w_ent wire_list)))
          (setq wire_list (cons w_ent wire_list))
        )
        (setq i (1+ i))
      )
      (setq mode "SELETIVO")
    )
  )
  
  (if (> (length wire_list) 0)
    (progn
      (princ (strcat "\n[TMD] Iniciando processamento de " (itoa (length wire_list)) " elementos..."))
      
      ;; 2. Limpeza de órfãos se for modo Global
      (if (= mode "GLOBAL") (TMD:build-clean-orphans))
      
      ;; 3. Compilação
      (setq count 0)
      (foreach w_ent wire_list
        (if (TMD:build-single-wire w_ent)
          (setq count (1+ count))
        )
      )
      (princ (strcat "\n[✔] CONCLUÍDO: " (itoa count) " Sólidos Gerados/Atualizados."))
    )
    (princ "\n[⚠] Nenhum wire TMD válido encontrado na seleção.")
  )
  
  (setvar "CMDECHO" old_cmdecho)
  (princ "\n=============================================\n")
  (princ)
)

(princ "\n[TMD] Motor de Compilação Generativa Cargado. Comando: TMD_BUILD")
(princ)
