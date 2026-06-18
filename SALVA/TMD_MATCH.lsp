;;; =====================================================================================
;;; TM DIGITAL - TRANSFERÊNCIA PARAMÉTRICA B.I.M (TMD_MATCH.lsp)
;;; =====================================================================================
;;;
;;; Equivalente ao "Match Properties" do AutoCAD, mas para o ADN B.I.M (L-Data).
;;;
;;; O QUE TRANSFERE (da linha FONTE para as linhas DESTINO):
;;;   - TMD_TIPO         → Tipo estrutural (COLUNA / VIGA / CONTRAVENTAMENTO)
;;;   - TMD_NOME         → Nome do perfil (ex: "Metalon 20x20x1.5")
;;;   - TMD_PARAMS       → Perfil completo: FORMA, DIM_X, DIM_Y, ESPESSURA,
;;;                        JUSTIFICACAO, ROTACAO
;;;   - Capa (Layer)     → A camada da linha fonte é aplicada ao destino
;;;
;;; O QUE NÃO TRANSFERE (preservado do destino):
;;;   - PT_A, PT_B       → Geometria própria do destino
;;;   - DISTANCIA        → Comprimento próprio do destino
;;;   - NIVEL_INI/FIM    → Níveis determinados pela posição do destino
;;;   - TMD_JOINT_DATA   → Dados de juntas são específicos do destino
;;;   - TMD_CUT_LENGTH   → Comprimento de corte próprio do destino
;;;
;;; COMPORTAMENTO APÓS TRANSFERÊNCIA:
;;;   - O sólido 3D filho é apagado (outdated) para forçar a regeneração via TMD_BUILD.
;;;   - A linha fica marcada com ADN correto, pronta para compilação.
;;;
;;; TODO (FUTURO): Transferência com Consciência de Tipo (Type-Aware Match)
;;;   - Problema: ao aplicar parâmetros de uma VIGA a uma linha inclinada
;;;     (CONTRAVENTAMENTO), o TMD_TIPO e o Layer são substituídos incorretamente.
;;;     O tipo e a capa são determinados pela geometria da linha destino, não da fonte.
;;;   - Solução proposta:
;;;     1. Calcular TMD:wire-evaluate-vector (ptA, ptB) da linha DESTINO.
;;;     2. Se o tipo calculado for diferente do tipo da fonte → preservar TMD_TIPO
;;;        e Layer do destino (ou recalcular o layer correto pela geometria).
;;;     3. Transferir apenas: NOME, FORMA, DIM_X, DIM_Y, ESPESSURA, JUST, ROT.
;;;   - Prioridade: baixa. Não impede o uso atual — o TMD_BUILD já recalcula
;;;     o tipo pela geometria, mas o layer e o TMD_TIPO no L-Data ficarão errados
;;;     até a próxima compilação se a linha destino tiver geometria diferente.
;;;
;;; COMANDO: TMD_MATCH
;;; =====================================================================================

(vl-load-com)

;;; =====================================================================================
;;; 1. RESOLUÇÃO DE ENTIDADES
;;; =====================================================================================

(defun TMD:match-get-wire (ent / e_data etype pts elev wire_list i p1 p2 ptA ptB ph)
  (setq e_data (entget ent))
  (setq etype (cdr (assoc 0 e_data)))
  (cond
    ((= etype "LINE") (list ent))
    ((= etype "LWPOLYLINE")
     ;; Converter cada segmento da polilinha em uma linha independente
     (setq pts (vl-remove-if-not '(lambda (x) (= (car x) 10)) e_data))
     (setq elev (cdr (assoc 38 e_data))) (if (not elev) (setq elev 0.0))
     (setq wire_list nil i 0)
     (if (>= (length pts) 2)
       (progn
         (while (< i (1- (length pts)))
           (setq p1 (cdr (nth i pts)) p2 (cdr (nth (1+ i) pts)))
           (setq ptA (list (car p1) (cadr p1) elev)
                 ptB (list (car p2) (cadr p2) elev))
           
           (if (> (distance ptA ptB) 0.001)
             (progn
               (entmake (list '(0 . "LINE") (cons 10 ptA) (cons 11 ptB) (assoc 8 e_data)))
               (setq wire_list (cons (entlast) wire_list))
             )
           )
           (setq i (1+ i))
         )
         (entdel ent) ;; Apagar polilinha original após converter segmentos
         (princ (strcat "\n    [!] Polilinha convertida em " (itoa (length wire_list)) " segmentos."))
         (reverse wire_list)
       )
       nil
     )
    )
    ((= etype "3DSOLID")
     (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE"))
     (if (and ph (= (type ph) 'STR)) (list (handent ph)) nil))
    (t nil)
  )
)

;;; =====================================================================================
;;; 2. LEITURA DO ADN FONTE
;;; =====================================================================================

(defun TMD:match-read-source (wire_ent / params layer)
  ;; Lê todos os dados transferíveis da linha fonte
  (setq params  (vlax-ldata-get wire_ent "TMD_PARAMS"))
  (setq layer   (cdr (assoc 8 (entget wire_ent))))

  (if (not params)
    (progn
      (alert "A linha FONTE não possui dados B.I.M (TMD_PARAMS).\nAplique TMD_WIRES primeiro.")
      nil
    )
    (progn
      (list
        (cons "TIPO"       (vlax-ldata-get wire_ent "TMD_TIPO"))
        (cons "NOME"       (vlax-ldata-get wire_ent "TMD_NOME"))
        (cons "FORMA"      (cdr (assoc "FORMA"       params)))
        (cons "DIM_X"      (cdr (assoc "DIM_X"       params)))
        (cons "DIM_Y"      (cdr (assoc "DIM_Y"       params)))
        (cons "ESPESSURA"  (cdr (assoc "ESPESSURA"   params)))
        (cons "JUST"       (cdr (assoc "JUSTIFICACAO" params)))
        (cons "ROT"        (cdr (assoc "ROTACAO"      params)))
        (cons "LAYER"      layer)
        (cons "CUTTERS"    (vlax-ldata-get wire_ent "TMD_CUTTERS"))
      )
    )
  )
)

;;; =====================================================================================
;;; 3. APLICAÇÃO DO ADN AO DESTINO
;;; =====================================================================================

(defun TMD:match-apply-to (wire_ent src_data / e_data ptA ptB dist new_params solid_h solid_ent)
  (setq e_data (entget wire_ent))
  (setq ptA (cdr (assoc 10 e_data)) ptB (cdr (assoc 11 e_data)))

  (if (or (not ptA) (not ptB)) (progn (princ "\n[!] Geometria inválida no destino.") nil)
    (progn
      (setq dist (distance ptA ptB))
      
      (setq new_params
        (list
          (cons "FORMA"        (cdr (assoc "FORMA"     src_data)))
          (cons "DIM_X"        (cdr (assoc "DIM_X"     src_data)))
          (cons "DIM_Y"        (cdr (assoc "DIM_Y"     src_data)))
          (cons "ESPESSURA"    (cdr (assoc "ESPESSURA" src_data)))
          (cons "JUSTIFICACAO" (cdr (assoc "JUST"      src_data)))
          (cons "ROTACAO"      (cdr (assoc "ROT"       src_data)))
          ;; Garante geometria válida no destino
          (cons "PT_A"         ptA)
          (cons "PT_B"         ptB)
          (cons "DISTANCIA"    dist)
        )
      )

      ;; Atualiza o ADN B.I.M
      (vlax-ldata-put wire_ent "TMD_TIPO"   (cdr (assoc "TIPO" src_data)))
      (vlax-ldata-put wire_ent "TMD_NOME"   (cdr (assoc "NOME" src_data)))
      (vlax-ldata-put wire_ent "TMD_CLASSE" "ESTRUTURA_LINE")
      (vlax-ldata-put wire_ent "TMD_PARAMS" new_params)
      
      ;; Copia Cortes (Cutters) se existirem na fonte
      (if (assoc "CUTTERS" src_data)
        (vlax-ldata-put wire_ent "TMD_CUTTERS" (cdr (assoc "CUTTERS" src_data)))
      )

      ;; Aplica a camada da linha fonte (Sincronização visual)
      (setq e_data (subst (cons 8 (cdr (assoc "LAYER" src_data)))
                          (assoc 8 e_data)
                          e_data))
      (entmod e_data)

      ;; Remove o sólido filho desatualizado
      (setq solid_h (vlax-ldata-get wire_ent "TMD_CHILD_SOLID"))
      (if (and solid_h (= (type solid_h) 'STR))
        (progn
          (setq solid_ent (handent solid_h))
          (if (and solid_ent (entget solid_ent)) (entdel solid_ent))
          (vlax-ldata-put wire_ent "TMD_CHILD_SOLID" nil)
        )
      )
      
      ;; Reconstrói o sólido imediatamente se o motor estiver carregado
      (if TMD:build-single-wire (TMD:build-single-wire wire_ent))

      T
    )
  )
)

;;; =====================================================================================
;;; 4. COMANDO PRINCIPAL: TMD_MATCH
;;; =====================================================================================

(defun c:TMD_MATCH ( / doc sel_src wires_src wire_src src_adn count ss_dest i ent_dest wires_dest)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)

  (princ "\n[TMD] MATCH PARAMÉTRICO - Seleccione viga FONTE (Referência)")
  (setq sel_src (entsel "\nSelecione viga FONTE: "))

  (if sel_src
    (progn
      ;; Resolver viga fonte
      (setq wires_src (TMD:match-get-wire (car sel_src)))
      (if (and wires_src (setq wire_src (car wires_src)))
        (progn
          (setq src_adn (TMD:match-read-source wire_src))
          (if src_adn
            (progn
              (redraw wire_src 3) ;; Destacar fonte
              (princ (strcat "\n    [ADN] Perfil: " (cdr (assoc "NOME" src_adn)) " | Tipo: " (cdr (assoc "TIPO" src_adn))))
              
              (setq count 0)
              (princ "\nAgora selecione as vigas DESTINO (Window/Crossing/Single) [ESC para finalizar]:")
              
              ;; Loop de seleção de destinos
              (while (setq ss_dest (ssget '((-4 . "<OR") (0 . "LINE") (0 . "LWPOLYLINE") (0 . "3DSOLID") (-4 . "OR>"))))
                (setq i 0)
                (while (< i (sslength ss_dest))
                  (setq ent_dest (ssname ss_dest i))
                  (setq wires_dest (TMD:match-get-wire ent_dest))
                  (if wires_dest
                    (foreach w wires_dest
                      (if (/= w wire_src)
                        (if (TMD:match-apply-to w src_adn)
                          (setq count (1+ count))
                        )
                      )
                    )
                  )
                  (setq i (1+ i))
                )
                (princ (strcat "\n    [✔] " (itoa count) " vigas atualizadas até agora. Continue selecionando ou [ENTER/ESC] para sair."))
              )
              (redraw wire_src 4) ;; Tirar destaque
            )
          )
        )
        (princ "\n[!] Entidade não possui ADN B.I.M.")
      )
    )
    (princ "\n[!] Seleção cancelada.")
  )

  (princ (strcat "\n[✔] Finalizado: " (itoa count) " elementos sincronizados."))
  (vla-EndUndoMark doc)
  (princ)
)

(princ "\n[TMD] Match Paramétrico Carregado. Comando: TMD_MATCH")
(princ)
