;;; TM DIGITAL - JUNTAS (TMD_JOINTS.lsp)
;;; =====================================================================================
;;; LÓGICA DE PROCESAMENTO (Protocolo TM Digital v4.0):
;;; 
;;; 1. TMD_JOINTS_AUTO: 
;;;    - Reset total do ADN (TMD_CUTTERS) da viga selecionada.
;;;    - Escaneamento 3D (Raio 2mm) no extremo A.
;;;    - Identificação de vizinhos (Vigas master) e aplicação de hierarquia Master/Slave.
;;;    - Repetição do processo para o extremo B.
;;; 
;;; 2. MODO MANUAL (FLUSH/MITER):
;;;    - Antes de aplicar, executa um "Sync" físico.
;;;    - Verifica se os handles já gravados no ADN ainda existem fisicamente no local.
;;;    - Se uma viga mestre sumiu ou foi movida para longe (>2mm), o ADN é limpo.
;;; 
;;; 3. TRAZABILIDADE: A marca de posição (TMD_MARK) é limpa em qualquer alteração.
;;; =====================================================================================
(vl-load-com)

;; Carregar Dependências
(if (not TMD:util-vector-unit) (load "TMD_Utils.lsp"))
(if (not TMD:viga-build-envelope) (load "TMD_Vigas.lsp"))

(setq *J2-MODO* "F")
(setq *J2-GAP*  0.0)

;;; =====================================================================================
;;; 1. UTILIDADES
;;; =====================================================================================
(defun unit (v) (TMD:util-vector-unit v))
(defun vector-cross (v1 v2) (TMD:util-vector-cross v1 v2))

(defun j2:get-wire (ent / t0)
  (if (and ent (entget ent))
    (progn
      (setq t0 (cdr (assoc 0 (entget ent))))
      (cond
        ((= t0 "LINE") (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE") ent nil))
        ((= t0 "3DSOLID")
         (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA") ent nil))
        (t nil)
      )
    )
  )
)

(defun j2:get-solid (wire)
  wire ;; En V5, el "wire" (elemento lógico) es el sólido en sí mismo
)

(defun j2:get-ends (ent / s_mid s_bbox s_diff len_s s_vec)
  (if (not TMD:sync-get-centroid) (load "TMD_SYNC.lsp"))
  (setq s_mid (TMD:sync-get-centroid ent)
        s_bbox (TMD:sync-get-bbox ent)
        s_diff (mapcar '- (cadr s_bbox) (car s_bbox))
        len_s (apply 'max s_diff)
        s_vec (TMD:util-vector-unit (mapcar '(lambda (d) (if (= d len_s) d 0.0)) s_diff)))
  (list (mapcar '- s_mid (mapcar '(lambda (x) (* x (/ len_s 2.0))) s_vec))
        (mapcar '+ s_mid (mapcar '(lambda (x) (* x (/ len_s 2.0))) s_vec)))
)

(defun j2:near-end-geom (wire_a wire_b / obj_b ends_a pa_a pb_a p_near_a p_near_b da db)
  ;; Usar o motor geométrico do AutoCAD para achar a projeção mais próxima
  (setq obj_b (vlax-ename->vla-object wire_b)
        ends_a (j2:get-ends wire_a)
        pa_a  (car ends_a)
        pb_a  (cadr ends_a))
  
  ;; Achar a distância de cada extremo da viga A até qualquer ponto da viga B
  (setq p_near_a (vlax-curve-getClosestPointTo obj_b pa_a)
        p_near_b (vlax-curve-getClosestPointTo obj_b pb_a))
  
  (setq da (distance pa_a p_near_a)
        db (distance pb_a p_near_b))
  
  ;; O extremo que estiver mais perto da viga mestre (em qualquer ponto dela) ganha a junta
  (if (< da db) "A" "B")
)

;; Valida se uma junta ainda é fisicamente possível (Proximidade)
(defun j2:validate-and-clean (wire_ent / cuts new_cuts ends pa pb h_m tipo gap data ev em w_m obj_m p_target p_near d1)
  (setq cuts (vlax-ldata-get wire_ent "TMD_CUTTERS"))
  (if (and cuts (listp cuts))
    (progn
      (setq ends (j2:get-ends wire_ent)
            pa (car ends)
            pb (cadr ends)
            new_cuts nil)
      (foreach c cuts
        (setq h_m (car c) ev (nth 4 c) w_m (handent h_m))
        ;; Regra 1: Deve existir no desenho
        (if (and w_m (entget w_m))
          (progn
            (setq obj_m (vlax-ename->vla-object w_m))
            ;; Regra 2: Deve estar perto do CORPO da viga mestre (Tolerância 2mm para movimento)
            (setq p_target (if (equal ev "A") pa pb))
            
            ;; Acha a projeção do extremo da nossa viga no corpo da viga mestre
            (setq p_near (vlax-curve-getClosestPointTo obj_m p_target))
            (setq d1 (distance p_target p_near))
            
            ;; Se estiver a 2mm ou menos, a junta sobrevive
            (if (<= d1 2.0)
              (setq new_cuts (cons c new_cuts))
            )
          )
        )
      )
      (vlax-ldata-put wire_ent "TMD_CUTTERS" new_cuts)
      new_cuts
    )
    nil
  )
)

;;; =====================================================================================
;;; 2. GERAÇÃO DE GHOST USANDO MOTOR CENTRALIZADO
;;; =====================================================================================

(defun j2:make-cutter (wire_ent gap / adn ends pa pb p_x p_y just rot dist p_forma ghost)
  (setq adn (vlax-ldata-get wire_ent "TMD_PARAMS"))
  
  (setq ends (j2:get-ends wire_ent)
        pa (car ends)
        pb (cadr ends))
  
  (setq p_x   (cdr (assoc "DIM_X" adn))
        p_y   (cdr (assoc "DIM_Y" adn))
        just  (cdr (assoc "JUSTIFICACAO" adn))
        rot   (cdr (assoc "ROTACAO" adn))
        p_forma (cdr (assoc "FORMA" adn))
        dist  (distance pa pb))

  (setq p_x (if (= (type p_x) 'STR) (atof p_x) p_x)
        p_y (if (= (type p_y) 'STR) (atof p_y) p_y)
        rot (if (= (type rot) 'STR) (atof rot) rot))

  ;; CHAMADA AO MOTOR CENTRALIZADO DE TMD_VIGAS.LSP
  (if (and TMD:viga-build-envelope)
    (progn
      (setq old_lay (getvar "CLAYER"))
      (setvar "CLAYER" "0") ;; Criar fantasma na capa 0
      
      ;; Se gap for 0 ou nil, passamos 0.0001 para forçar o motor a aplicar margem de segurança (m_sect)
      (setq ghost (TMD:viga-build-envelope pa pb just rot p_x p_y p_forma dist (if (or (not gap) (<= gap 0.0)) 0.0001 gap)))
      
      (setvar "CLAYER" old_lay)
      ghost
    )
    (progn (princ "\n[ERRO] Motor TMD:viga-build-envelope não encontrado!") nil)
  )
)

;;; =====================================================================================
;;; 3. OPERAÇÃO DE CORTE (FLUSH E MITER)
;;; =====================================================================================

(defun j2:do-flush (solid_v wire_m gap / cutter)
  (setq cutter (j2:make-cutter wire_m gap))
  (if (and cutter (entget cutter))
    (progn
      (vl-cmdf "_.SUBTRACT" solid_v "" cutter "")
      ;; Forçar deleção caso o SUBTRACT não o tenha consumido (ex: falha de interseção)
      (if (and cutter (entget cutter)) (entdel cutter))
    )
  )
)

(defun j2:do-miter (solid_v wire_v wire_m / ends_v ends_m pa_v pb_v pa_m pb_m p_int v_v v_m v_bis v_perp p2 p3 p_keep)
  (setq ends_v (j2:get-ends wire_v)
        ends_m (j2:get-ends wire_m)
        pa_v (car ends_v)
        pb_v (cadr ends_v)
        pa_m (car ends_m)
        pb_m (cadr ends_m))
  
  (princ (strcat "\n  [DEBUG-M] Wire V: " (vl-princ-to-string pa_v) " -> " (vl-princ-to-string pb_v)))
  (princ (strcat "\n  [DEBUG-M] Wire M: " (vl-princ-to-string pa_m) " -> " (vl-princ-to-string pb_m)))

  ;; Ponto de interseção (vértice comum)
  (setq p_int (inters pa_v pb_v pa_m pb_m nil))
  (if (not p_int) 
    (progn
      (setq p_int (if (< (distance pa_v pa_m) 1.0) pa_v 
                  (if (< (distance pa_v pb_m) 1.0) pa_v 
                  (if (< (distance pb_v pa_m) 1.0) pb_v pb_v))))
      (princ "\n  [DEBUG-M] Interseção geométrica falhou, usando proximidade.")
    )
  )
  (princ (strcat "\n  [DEBUG-M] Ponto Interseção: " (vl-princ-to-string p_int)))

  ;; Vetores unitários saindo do vértice
  (setq p_keep (if (> (distance p_int pa_v) (distance p_int pb_v)) pa_v pb_v))
  (setq v_v (TMD:util-vector-unit (mapcar '- p_keep p_int))
        v_m (TMD:util-vector-unit (mapcar '- (if (> (distance p_int pa_m) (distance p_int pb_m)) pa_m pb_m) p_int)))
  
  ;; Bisectriz e Vetor Perpendicular
  (setq v_bis (TMD:util-vector-unit (mapcar '+ v_v v_m)))
  (setq v_perp (TMD:util-vector-unit (TMD:util-vector-cross v_v v_m)))
  (if (< (distance '(0 0 0) v_perp) 0.001) (setq v_perp '(0 0 1)))
  
  ;; Pontos do plano de corte (p_int, p2, p3)
  (setq p2 (mapcar '+ p_int v_bis)
        p3 (mapcar '+ p_int v_perp))

  (princ (strcat "\n  [DEBUG-M] Plano SLICE: P1=" (vl-princ-to-string p_int) " P2=" (vl-princ-to-string p2) " P3=" (vl-princ-to-string p3)))
  (princ (strcat "\n  [DEBUG-M] Ponto a manter: " (vl-princ-to-string p_keep)))

  ;; Aplicar SLICE (Usando p_keep como lado a manter)
  (vl-cmdf "_.SLICE" solid_v "" "_3points" "_non" p_int "_non" p2 "_non" p3 "_non" p_keep)
)

;;; =====================================================================================
;;; 3.5 AUTO-RESOLVER NODOS (INVOCADO DESDE WIRES)
;;; =====================================================================================

(defun j2:auto-resolve-nodes (wire_ent / ends pa pb process-node default_mode cache ss_all i ent_g)
  (setq default_mode (if *TMD_JOINT_DEFAULT* *TMD_JOINT_DEFAULT* "Flush"))
  (setq ends (j2:get-ends wire_ent)
        pa (car ends)
        pb (cadr ends))
  
  ;; RESET TOTAL DO ADN antes de re-calcular (Lógica do Usuário)
  (vlax-ldata-put wire_ent "TMD_CUTTERS" nil)

  ;; SISTEMA DE CACHÉ: Usar global se existir, senão cria local temporário (Zoom-Independent)
  (if *TMD-BEAM-CACHE*
    (setq cache *TMD-BEAM-CACHE*)
    (progn
      (setq ss_all (ssget "X" '((0 . "LINE"))) cache nil)
      (if ss_all
        (progn
          (setq i 0)
          (while (< i (sslength ss_all))
            (setq ent_g (ssname ss_all i))
            (if (= (vlax-ldata-get ent_g "TMD_CLASSE") "ESTRUTURA_LINE")
              (setq cache (cons ent_g cache))
            )
            (setq i (1+ i))
          )
        )
      )
    )
  )

  (defun process-node (pt / ent neighbor_list w_master w_slave tipo1 tipo2 area1 area2 len1 len2 h_m cuts ev em p_int params1 params2 ends1 ends2 dies1 dies2 w1 w2 neighbor obj p_near)
    ;; 1. Capturar vizinhos cruzando dados contra o Caché em RAM (0 lag, 0 View-Dependency)
    (setq neighbor_list nil)
    (if cache
      (foreach ent cache
        ;; Blindagem: Ignorar a si mesmo (pelo handle)
        (if (not (equal (cdr (assoc 5 (entget ent))) (cdr (assoc 5 (entget wire_ent)))))
          (progn
            (setq obj (vlax-ename->vla-object ent))
            (setq p_near (vlax-curve-getClosestPointTo obj pt))
            ;; Se a viga passar a menos de 2mm do nodo, é uma colisão
            (if (and p_near (<= (distance pt p_near) 2.0))
              (setq neighbor_list (cons ent neighbor_list))
            )
          )
        )
      )
    )
        
    ;; 2. Resolver a viga atual contra cada vizinho encontrado
    (if neighbor_list
      (foreach neighbor neighbor_list
        (setq w1 wire_ent w2 neighbor)
        (setq params1 (vlax-ldata-get w1 "TMD_PARAMS")
              params2 (vlax-ldata-get w2 "TMD_PARAMS"))
        
        (if (and params1 params2)
          (progn
            (setq area1 (* (cdr (assoc "DIM_X" params1)) (cdr (assoc "DIM_Y" params1)))
                  area2 (* (cdr (assoc "DIM_X" params2)) (cdr (assoc "DIM_Y" params2)))
                  tipo1 (vlax-ldata-get w1 "TMD_TIPO")
                  tipo2 (vlax-ldata-get w2 "TMD_TIPO")
                  len1  (cdr (assoc "DISTANCIA" params1))
                  len2  (cdr (assoc "DISTANCIA" params2)))
             
             ;; Hierarquia de Decisão (Quem é Master?)
            (setq w_master nil w_slave nil)
              
              ;; Regra 0: Contraventamento é sempre Slave
              (cond
                ((and (= tipo1 "CONTRAVENTAMENTO") (/= tipo2 "CONTRAVENTAMENTO")) (setq w_master w2 w_slave w1))
                ((and (= tipo2 "CONTRAVENTAMENTO") (/= tipo1 "CONTRAVENTAMENTO")) (setq w_master w1 w_slave w2))
                
                ;; Regra 1: Coluna > Viga
                ((and (= tipo1 "COLUNA") (/= tipo2 "COLUNA")) (setq w_master w1 w_slave w2))
                ((and (= tipo2 "COLUNA") (/= tipo1 "COLUNA")) (setq w_master w2 w_slave w1))
                
                ;; Regra 2: Área maior ganha
                ((> area1 area2) (setq w_master w1 w_slave w2))
                ((< area1 area2) (setq w_master w2 w_slave w1))
                
                ;; Regra 3: Se empatar, a viga que CONTINUA ganha da que MORRE no nodo
                (t 
                   (setq p_int (inters (car (j2:get-ends w1)) (cadr (j2:get-ends w1))
                                       (car (j2:get-ends w2)) (cadr (j2:get-ends w2)) nil))
                   (if (not p_int) (setq p_int pt))
                   
                   (setq ends1 (list (distance p_int (car (j2:get-ends w1))) (distance p_int (cadr (j2:get-ends w1)))))
                   (setq ends2 (list (distance p_int (car (j2:get-ends w2))) (distance p_int (cadr (j2:get-ends w2)))))
                   
                   (setq dies1 (if (vl-some '(lambda (d) (< d 2.0)) ends1) T nil))
                   (setq dies2 (if (vl-some '(lambda (d) (< d 2.0)) ends2) T nil))
                   
                   (if (and dies1 (not dies2)) (setq w_master w2 w_slave w1)
                   (if (and dies2 (not dies1)) (setq w_master w1 w_slave w2)
                   (if (> len1 len2) (setq w_master w1 w_slave w2) (setq w_master w2 w_slave w1))))
                )
              )

            ;; Aplicar o corte apenas se a viga atual for a Slave
            (if (eq w_slave wire_ent)
              (progn
                (setq h_m (cdr (assoc 5 (entget w_master))))
                (setq ev (j2:near-end-geom w_slave w_master)
                      em (j2:near-end-geom w_master w_slave))
                
                (setq cuts (vlax-ldata-get w_slave "TMD_CUTTERS"))
                (setq cuts (vl-remove-if '(lambda (x) (and (listp x) (equal (car x) h_m) (equal (nth 4 x) ev))) (if (listp cuts) cuts nil)))
                (vlax-ldata-put w_slave "TMD_CUTTERS" (cons (list h_m default_mode 0.0 nil ev em) cuts))
                (vlax-ldata-put w_slave "TMD_MARK" nil) ;; Limpar marca ao aplicar junta
                (vlax-ldata-put w_slave "TMD_LEN_PHYS" nil) ;; Invalida cache de medida
                
                (if (and TMD:build-reconstruct (not *TMD-SILENT-REBUILD*)) (TMD:build-reconstruct w_slave))
              )
              ;; Se o Mestre for a viga atual e o modo for Miter, aplicamos ao outro também
              (if (and (eq w_master wire_ent) (= default_mode "Miter"))
                (progn
                  (setq h_m (cdr (assoc 5 (entget w_master))))
                  (setq ev (j2:near-end-geom w_slave w_master)
                        em (j2:near-end-geom w_master w_slave))
                  (setq cuts (vlax-ldata-get w_slave "TMD_CUTTERS"))
                  (setq cuts (vl-remove-if '(lambda (x) (and (listp x) (equal (car x) h_m) (equal (nth 4 x) ev))) (if (listp cuts) cuts nil)))
                  (vlax-ldata-put w_slave "TMD_CUTTERS" (cons (list h_m "Miter" 0.0 nil ev em) cuts))
                  (if (and TMD:build-reconstruct (not *TMD-SILENT-REBUILD*)) (TMD:build-reconstruct w_slave))
                )
              )
            )
          )
        )
      )
    )
  )
  
  (process-node pa)
  (process-node pb)
)


;;; =====================================================================================
;;; 4. COMANDOS DE JUNTAS
;;; =====================================================================================

(defun c:TMD_JOINTS_FLUSH ( / sel_v sel_m wire_v wire_m solid_v ev em h_m cuts)
  (princ "\n[TMD] MODO FLUSH (Centralized Logic) - ESC para sair")
  (while
    (progn (initget "Help") (setq sel_v (entsel "\nSelecione Vítima (viga a ser cortada) [Help]: ")) (if (= sel_v "Help") (TMD:util-help "TMD_JOINTS_FLUSH")) (if (= (type sel_v) 'STR) (setq sel_v (entsel "\nSelecione Vítima: "))) sel_v)
    (setq wire_v (j2:get-wire (car sel_v)))
    (if wire_v
      (progn
        (j2:validate-and-clean wire_v)
        (setq solid_v (j2:get-solid wire_v))
        (redraw (car sel_v) 3)
        (setq sel_m (entsel "\nSelecione Mestre (viga que irá cortar): "))
        (if sel_m
          (progn
            (setq wire_m (j2:get-wire (car sel_m)))
            (if (and wire_m (/= wire_v wire_m))
              (progn
                (setq ev (j2:near-end-geom wire_v wire_m))
                (setq em (j2:near-end-geom wire_m wire_v))
                
                (setq h_m (cdr (assoc 5 (entget wire_m))))
                (setq cuts (vlax-ldata-get wire_v "TMD_CUTTERS"))
                (if (not (listp cuts)) (setq cuts nil))
                (setq cuts (vl-remove-if '(lambda (x) (and (listp x) (equal (car x) h_m) (equal (nth 4 x) ev))) cuts))
                (vlax-ldata-put wire_v "TMD_CUTTERS" (cons (list h_m "Flush" *J2-GAP* nil ev em) cuts))
                (vlax-ldata-put wire_v "TMD_MARK" nil) ;; Limpar marca
                (vlax-ldata-put wire_v "TMD_LEN_PHYS" nil) ;; Invalida cache
                
                (if solid_v (j2:do-flush solid_v wire_m *J2-GAP*))
                (princ (strcat "\n  [✔] Flush aplicado no extremo " ev))
              )
            )
          )
        )
        (redraw (car sel_v) 4)
      )
    )
  )
  (princ)
)

(defun c:TMD_JOINTS_MITER ( / sel_v sel_m wire_v wire_m solid_v solid_m ev em h_m cuts)
  (princ "\n[TMD] MODO MITER (Inglete) - ESC para sair")
  (while
    (progn (initget "Help") (setq sel_v (entsel "\nSelecione Viga A [Help]: ")) (if (= sel_v "Help") (TMD:util-help "TMD_JOINTS_MITER")) (if (= (type sel_v) 'STR) (setq sel_v (entsel "\nSelecione Viga A: "))) sel_v)
    (setq wire_v (j2:get-wire (car sel_v)))
    (if wire_v
      (progn
        (j2:validate-and-clean wire_v)
        (setq solid_v (j2:get-solid wire_v))
        (redraw (car sel_v) 3)
        (setq sel_m (entsel "\nSelecione Viga B: "))
        (if sel_m
          (progn
            (setq wire_m (j2:get-wire (car sel_m)))
            (if (and wire_m (/= wire_v wire_m))
              (progn
                (j2:validate-and-clean wire_m)
                (setq solid_m (j2:get-solid wire_m))
                (setq ev (j2:near-end-geom wire_v wire_m))
                (setq em (j2:near-end-geom wire_m wire_v))
                
                ;; Aplicar Miter em ambas (Corte mútuo)
                (if (and solid_v solid_m)
                  (progn
                    (j2:do-miter solid_v wire_v wire_m)
                    (j2:do-miter solid_m wire_m wire_v)
                    
                    ;; Gravar LData em ambas
                    (setq h_v (cdr (assoc 5 (entget wire_v)))
                          h_m (cdr (assoc 5 (entget wire_m))))
                    
                    ;; Remover cortes prévios entre estas duas vigas nos mesmos extremos para evitar duplicidade
                    (setq cuts_v (vlax-ldata-get wire_v "TMD_CUTTERS"))
                    (if (not (listp cuts_v)) (setq cuts_v nil))
                    (setq cuts_v (vl-remove-if '(lambda (x) (and (listp x) (equal (car x) h_m) (equal (nth 4 x) ev))) cuts_v))
                    (vlax-ldata-put wire_v "TMD_CUTTERS" (cons (list h_m "Miter" 0.0 nil ev em) cuts_v))
                    
                    (setq cuts_m (vlax-ldata-get wire_m "TMD_CUTTERS"))
                    (if (not (listp cuts_m)) (setq cuts_m nil))
                    (setq cuts_m (vl-remove-if '(lambda (x) (and (listp x) (equal (car x) h_v) (equal (nth 4 x) em))) cuts_m))
                    (vlax-ldata-put wire_m "TMD_CUTTERS" (cons (list h_v "Miter" 0.0 nil em ev) cuts_m))
                    (vlax-ldata-put wire_v "TMD_MARK" nil)
                    (vlax-ldata-put wire_m "TMD_MARK" nil)
                    (vlax-ldata-put wire_v "TMD_LEN_PHYS" nil)
                    (vlax-ldata-put wire_m "TMD_LEN_PHYS" nil)

                    (princ "\n  [✔] Miter aplicado e gravado entre A e B.")
                  )
                  (princ "\n[!] Falta um dos sólidos 3D.")

                )
              )
            )
          )
        )
        (redraw (car sel_v) 4)
      )
    )
  )
  (princ)
)

(defun c:TMD_JOINTS_CROSSING ( / sel_m wire_m h_m sel_v wire_v solid_v ev em cuts)
  (princ "\n[TMD] MODO CROSSING (Uno a Muchos) - Seleccione Maestro primero")
  (setq sel_m (entsel "\nSelecione viga MESTRE (a que corta): "))
  (if sel_m
    (progn
      (setq wire_m (j2:get-wire (car sel_m)))
      (if wire_m
        (progn
          (setq h_m (cdr (assoc 5 (entget wire_m))))
          (redraw (car sel_m) 3)
          (princ "\nAgora selecione as vigas VÍTIMAS uma a uma (ESC para sair):")
          (while (setq sel_v (entsel "\nSelecione viga VÍTIMA: "))
            (setq wire_v (j2:get-wire (car sel_v)))
            (if (and wire_v (/= wire_v wire_m))
              (progn
                (j2:validate-and-clean wire_v) ;; Limpar fantasmas primeiro
                (setq ev (j2:near-end-geom wire_v wire_m))
                (setq em (j2:near-end-geom wire_m wire_v))
                
                (setq cuts (vlax-ldata-get wire_v "TMD_CUTTERS"))
                (if (not (listp cuts)) (setq cuts nil))
                (setq cuts (vl-remove-if '(lambda (x) (and (listp x) (equal (car x) h_m) (equal (nth 4 x) ev))) cuts))
                (vlax-ldata-put wire_v "TMD_CUTTERS" (cons (list h_m "Flush" *J2-GAP* nil ev em) cuts))
                
                (if TMD:build-single-wire (TMD:build-single-wire wire_v))
                (princ (strcat "\n  [✔] Flush aplicado em " (cdr (assoc 5 (entget wire_v)))))
              )
            )
          )
          (redraw (car sel_m) 4)
        )
      )
    )
  )
  (princ)
)

(defun c:TMD_JOINTS_AUTO ( / ss i ent wire_list count w ss_all ent_g)

  (princ "\n[TMD] Resolvendo Juntas Automaticamente (Modo Seletivo)")
  (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
  (if ss
    (progn
      ;; 1. Construir Caché Global (Otimização de Performance 0-Lag)
      (setq *TMD-BEAM-CACHE* nil)
      (setq ss_all (ssget "X" '((0 . "3DSOLID"))))
      (if ss_all
        (progn
          (setq i 0)
          (while (< i (sslength ss_all))
            (setq ent_g (ssname ss_all i))
            (if (= (vlax-ldata-get ent_g "TMD_CLASSE") "ESTRUTURA")
              (setq *TMD-BEAM-CACHE* (cons ent_g *TMD-BEAM-CACHE*))
            )
            (setq i (1+ i))
          )
        )
      )
      
      ;; 2. Extrair vigas únicas da seleção
      (setq i 0 count 0 wire_list nil)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq w (j2:get-wire ent))
        (if (and w (not (member w wire_list)))
          (setq wire_list (cons w wire_list))
        )
        (setq i (1+ i))
      )
      
      ;; 3. Processar lotes usando memória RAM
      (if wire_list
        (progn
          (setq *TMD-SILENT-REBUILD* T) ;; Silencia reconstruções internas individuais
          (foreach w wire_list
            (j2:auto-resolve-nodes w)
            (setq count (1+ count))
          )
          (setq *TMD-SILENT-REBUILD* nil) ;; Reativa
          
          ;; Reconstrução em lote final para eficiência
          (if TMD:build-single-wire
            (foreach w wire_list (TMD:build-single-wire w))
          )
          (princ (strcat "\n[✔] " (itoa count) " Elementos processados e juntas aplicadas."))
        )
      )
      
      ;; 4. Limpar Caché Global para liberar RAM
      (setq *TMD-BEAM-CACHE* nil)
    )
    (princ "\n[⚠] Nada selecionado.")
  )
  (princ)
)

(defun c:TMD_JOINTS_CLEAR ( / ss i ent w count)
  (princ "\n[TMD] Limpando dados de juntas (Seletivo)")
  (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
  (if ss
    (progn
      (setq i 0 count 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq w (j2:get-wire ent))
        (if w
          (progn
            (vlax-ldata-put w "TMD_CUTTERS" nil)
            (vlax-ldata-put w "TMD_MARK" nil) ;; Limpar marca ao remover juntas
            (vlax-ldata-put w "TMD_LEN_PHYS" nil) ;; Limpar cache de medida
            (setq count (1+ count))
          )
        )
        (setq i (1+ i))
      )
      (princ (strcat "\n[✔] Dados de juntas removidos de " (itoa count) " elementos."))
    )
    (princ "\n[⚠] Nada selecionado.")
  )
  (princ)
)

(defun c:TMD_JOINTS_INSPECT ( / sel ent wire cuts h_m mode ev pt)
  (princ "\n[TMD] Inspetor de Juntas B.I.M")
  (setq sel (entsel "\nSelecione a viga para inspecionar: "))
  (if sel
    (progn
      (setq ent (car sel) wire (j2:get-wire ent))
      (if wire
        (progn
          (setq cuts (vlax-ldata-get wire "TMD_CUTTERS"))
          (princ (strcat "\n--- RELATÓRIO DE JUNTAS (Handle: " (cdr (assoc 5 (entget wire))) ") ---"))
          (if (and cuts (listp cuts))
            (progn
              (princ (strcat "\nTotal de Juntas: " (itoa (length cuts))))
              (foreach c cuts
                (setq h_m (car c) mode (nth 1 c) ev (nth 4 c))
                (princ (strcat "\n -> Cortado por: " h_m " | Modo: " mode " | Extremo: " ev))
                ;; Desenhar indicação visual temporária
                (setq pt (if (equal ev "A") (car (j2:get-ends wire)) (cadr (j2:get-ends wire))))
                (entmake (list '(0 . "CIRCLE") (cons 10 pt) '(40 . 10.0) '(62 . 2) (cons 8 "0")))
                (entmake (list '(0 . "TEXT") (cons 10 (mapcar '+ pt '(5 5 0))) (cons 40 5.0) (cons 1 (strcat "JOINT: " h_m)) '(62 . 2) (cons 8 "0")))
              )
              (princ "\n[!] Círculos verdes indican los nodos de las juntas (temporales).")
            )
            (princ "\nNenhuma junta encontrada no ADN desta viga.")
          )
        )
      )
    )
  )
  (princ)
)

(defun c:TMD_JOINTS_HELP () (TMD:util-help "TMD_JOINTS"))

;;; =====================================================================================
;;; 5. COMANDO MAESTRO (DISPATCHER)
;;; =====================================================================================

(defun c:TMD_JOINTS ( / opt)
  (initget "Flush Miter Xrossing Auto Clear Inspect Help")
  (setq opt (getkword "\n[TMD JOINTS] Modo [Flush/Miter/Xrossing/Auto/Clear/Inspect/Help] <Flush>: "))
  (if (not opt) (setq opt "Flush"))
  (cond
    ((= opt "Help")    (c:TMD_JOINTS_HELP) (c:TMD_JOINTS))
    ((= opt "Inspect") (c:TMD_JOINTS_INSPECT))
    ((= opt "Miter")    (c:TMD_JOINTS_MITER))
    ((= opt "Xrossing") (c:TMD_JOINTS_CROSSING))
    ((= opt "Auto")     (c:TMD_JOINTS_AUTO))
    ((= opt "Clear")    (c:TMD_JOINTS_CLEAR))
    (t                  (c:TMD_JOINTS_FLUSH))
  )
  (princ)
)

(princ "\n[TMD] Juntas Carregado. Comando principal: TMD_JOINTS")
(princ)
