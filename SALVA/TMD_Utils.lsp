;;; =====================================================================================
;;; TM DIGITAL - UTILIDADES CENTRALES (TMD_Utils.lsp)
;;; Objetivo: Centralizar funciones matemáticas, gestión de Registro y LData (ADN BIM).
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; 1. GESTIÓN DE REGISTRO (MEMORIA DE SISTEMA)
;;; -------------------------------------------------------------------------------------

;; Guarda la configuración de la sesión actual en el Registro de Windows.
(defun TMD:bim-set-reg (key val / path)
  (setq path "HKEY_CURRENT_USER\\Software\\TMDigital\\AbaPerfil")
  (vl-registry-write path key val)
)

;; Lee un valor del registro (con fallback a default).
(defun TMD:bim-get-reg (key default / path res)
  (setq path "HKEY_CURRENT_USER\\Software\\TMDigital\\AbaPerfil")
  (setq res (vl-registry-read path key))
  (if res res default)
)

;;; -------------------------------------------------------------------------------------
;;; 2. GESTIÓN DE DATOS LDATA (ADN BIM - REVIT STYLE)
;;; -------------------------------------------------------------------------------------

;; Inyecta los datos paramétricos en el objeto (Lista de Asociación).
(defun TMD:bim-set-adn (ent-name params-assoc)
  (vlax-ldata-put ent-name "TMD_PARAMS" params-assoc)
)

;; Obtiene los datos paramétricos asociados al objeto.
(defun TMD:bim-get-adn (ent-name)
  (vlax-ldata-get ent-name "TMD_PARAMS")
)

(defun TMD:pt-on-segments (pt pts-list / i v1 v2 d1 d2 d3 res)
  (setq i 0 res nil)
  (if pts-list
    (while (and (not res) (< i (1- (length pts-list))))
      (setq v1 (nth i pts-list) v2 (nth (1+ i) pts-list))
      (setq d1 (distance pt v1) d2 (distance pt v2) d3 (distance v1 v2))
      (if (< (abs (- (+ d1 d2) d3)) 0.1) ; Point lies between v1 and v2
        (setq res t)
      )
      (setq i (1+ i))
    )
  )
  res
)

;; Extrae el ADN de una Aba específica basado en el clic (Soporta clics en Vinco o en Polilínea)
(defun TMD:bim-get-aba-adn (ent-name pt-click / tipo-ent adn aba-id aba-list temp-adn pt-click-ocs vla-obj pt-closest p1-2d p2-2d vtx-2d full-vtx)
  (if (entget ent-name)
    (progn
      (setq tipo-ent (cdr (assoc 0 (entget ent-name))))
      (setq adn nil aba-id nil)
      
      (if (= tipo-ent "LINE") ; Clic en el Vinco
        (if (setq aba-id (vlax-ldata-get ent-name "TMD_ABA_ID"))
          (setq adn (vlax-ldata-get (handent (vlax-ldata-get ent-name "TMD_PARENT")) aba-id)
                ent-name (handent (vlax-ldata-get ent-name "TMD_PARENT")))
        )
        (if (= tipo-ent "LWPOLYLINE") ; Clic en la Polilínea
          (progn
            (setq vla-obj (vlax-ename->vla-object ent-name))
            (setq pt-closest (vlax-curve-getClosestPointTo vla-obj pt-click))
            (setq pt-click-ocs (list (car (trans pt-closest 0 ent-name)) (cadr (trans pt-closest 0 ent-name)))) ; Convertir 2D OCS
            
            (setq aba-list (vlax-ldata-get ent-name "TMD_ABA_LIST"))
            (if aba-list
              (foreach id aba-list
                (setq temp-adn (vlax-ldata-get ent-name id))
                (if temp-adn
                  (progn
                    (setq vtx-2d (cdr (assoc "VTX_LIST" temp-adn)))
                    (setq p1-2d (list (car (trans (cdr (assoc "ORIG_P1" temp-adn)) 0 ent-name)) (cadr (trans (cdr (assoc "ORIG_P1" temp-adn)) 0 ent-name))))
                    (setq p2-2d (list (car (trans (cdr (assoc "ORIG_P2" temp-adn)) 0 ent-name)) (cadr (trans (cdr (assoc "ORIG_P2" temp-adn)) 0 ent-name))))
                    (setq full-vtx (append (list p1-2d) vtx-2d (list p2-2d)))
                    
                    ;; Chequeamos geométricamente si el clic ocurrió sobre el perfil original o cualquiera de los pliegues de esta Aba
                    (if (or (TMD:pt-on-segments pt-click-ocs full-vtx)
                            (TMD:pt-on-segments pt-click-ocs (list p1-2d p2-2d)))
                      (setq adn temp-adn aba-id id)
                    )
                  )
                )
              )
            )
          )
        )
      )
      (list adn aba-id ent-name)
    )
    (list nil nil nil)
  )
)

;;; -------------------------------------------------------------------------------------
;;; 3. UTILIDADES DEL MOTOR GEOMÉTRICO (MATH & CAD)
;;; -------------------------------------------------------------------------------------

;; Calcula el área de una polilínea para determinar la orientación (CW/CCW).
(defun TMD:util-poly-area (ent / pts area i j p1 p2)
  (setq pts nil area 0.0)
  (foreach item (entget ent) 
    (if (= (car item) 10) (setq pts (append pts (list (cdr item))))))
  (if pts
    (progn
      (setq j (1- (length pts)) i 0)
      (while (< i (length pts))
        (setq p1 (nth i pts) p2 (nth j pts))
        (setq area (+ area (- (* (car p2) (cadr p1)) (* (car p1) (cadr p2)))))
        (setq j i i (1+ i))
      )
    )
  )
  (/ area 2.0)
)

;; Retorna uma lista de VLA-Objects de todos os grupos que contêm a entidade.
(defun TMD:util-get-entity-groups (ent / vla-obj doc groups matches h)
  (setq vla-obj (if (= (type ent) 'ENAME) (vlax-ename->vla-object ent) ent))
  (setq h (vla-get-Handle vla-obj))
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq groups (vla-get-Groups doc))
  (setq matches (list))
  (vlax-for grp groups
    (vlax-for item grp
      (if (and (not (vlax-erased-p item))
               (= (vla-get-Handle item) h))
        (setq matches (cons grp matches))
      )
    )
  )
  (reverse matches)
)

;; Adiciona uma entidade a um grupo existente (vla-object).
(defun TMD:util-add-to-group (ent vla-group / vla-obj arr)
  (if (and ent vla-group)
    (progn
      (setq vla-obj (if (= (type ent) 'ENAME) (vlax-ename->vla-object ent) ent))
      (setq arr (vlax-make-safearray vlax-vbObject '(0 . 0)))
      (vlax-safearray-put-element arr 0 vla-obj)
      (vl-catch-all-apply 'vla-AppendItems (list vla-group arr))
      (princ (strcat "\n      [GRP] Adicionado ao grupo: " (vla-get-Name vla-group)))
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; 4. VECTORES Y ÁLGEBRA LINEAL (MOTOR 3D)
;;; -------------------------------------------------------------------------------------

;; Produto Escalar (Dot Product)
(defun TMD:util-vector-dot (v1 v2)
  (apply '+ (mapcar '* v1 v2))
)

;; Produto Vetorial (Cross Product)
(defun TMD:util-vector-cross (v1 v2)
  (list 
    (- (* (nth 1 v1) (nth 2 v2)) (* (nth 2 v1) (nth 1 v2)))
    (- (* (nth 2 v1) (nth 0 v2)) (* (nth 0 v1) (nth 2 v2)))
    (- (* (nth 0 v1) (nth 1 v2)) (* (nth 1 v1) (nth 0 v2)))
  )
)

;; Vetor Unitário (Normalizar)
(defun TMD:util-vector-unit (v / d)
  (setq d (distance '(0 0 0) v))
  (if (> d 0.0) (mapcar '(lambda (x) (/ x d)) v) v)
)

;; GERA MATRIZ DE ROTAÇÃO USANDO BASE ORTONORMAL (ALINHAMENTO X)
(defun TMD:util-get-rotation-matrix (v / x y z)
  (setq x (TMD:util-vector-unit v))
  (if (and (< (abs (car x)) 0.015625) (< (abs (cadr x)) 0.015625))
    (setq z (TMD:util-vector-unit (TMD:util-vector-cross '(0 1 0) x)))
    (setq z (TMD:util-vector-unit (TMD:util-vector-cross '(0 0 1) x)))
  )
  (setq y (TMD:util-vector-unit (TMD:util-vector-cross z x)))
  (vlax-make-variant 
    (vlax-safearray-fill 
      (vlax-make-safearray vlax-vbDouble '(0 . 3) '(0 . 3))
      (list 
        (list (car x) (cadr x) (caddr x) 0.0)
        (list (car y) (cadr y) (caddr y) 0.0)
        (list (car z) (cadr z) (caddr z) 0.0)
        (list 0.0     0.0      0.0       1.0)
      )
    )
  )
)

;; FUNÇÃO: Alinha um objeto para o eixo X do WCS baseando-se em dois pontos
(defun TMD:util-force-align-x (obj p1 p2 / mat)
  (vla-move obj (vlax-3d-point p1) (vlax-3d-point '(0 0 0)))
  (setq mat (TMD:util-get-rotation-matrix (mapcar '- p2 p1)))
  (vla-transformby obj mat)
)

;; CÁLCULO DE COMPRIMENTO REAL (ESTRUTURAL BIM - OPTIMIZADO)
(defun TMD:solid-get-centroid-3d (obj s_ent / c_val minp maxp pmin pmax)
  (setq c_val (vlax-get obj 'Centroid))
  (if (and c_val (or (= (type c_val) 'VARIANT) (= (type c_val) 'SAFEARRAY)))
    (progn
      (if (= (type c_val) 'VARIANT) (setq c_val (vlax-variant-value c_val)))
      (setq c_val (vlax-safearray->list c_val))
      (if (= (length c_val) 2)
        (list (car c_val) (cadr c_val) 0.0)
        c_val
      )
    )
    (progn
      (vla-getboundingbox obj 'minp 'maxp)
      (setq pmin (vlax-safearray->list minp) pmax (vlax-safearray->list maxp))
      (list (/ (+ (car pmin) (car pmax)) 2.0)
            (/ (+ (cadr pmin) (cadr pmax)) 2.0)
            (/ (+ (caddr pmin) (caddr pmax)) 2.0))
    )
  )
)

(defun TMD:solid-get-principal-axis (s_ent / obj centroid moments directions c_pt m_list d_list idx_min dir_z params minp maxp pmin pmax diff max_d)
  (setq obj (vlax-ename->vla-object s_ent))
  (setq c_pt (TMD:solid-get-centroid-3d obj s_ent))
  (setq dir_z nil)
  
  ;; A. Intentar leer de LData TMD_PARAMS o TMD_DIR (si ya existe)
  (setq params (vlax-ldata-get s_ent "TMD_PARAMS"))
  (if params
    (setq dir_z (cdr (assoc "DIR" params)))
  )
  (if (not dir_z)
    (setq dir_z (vlax-ldata-get s_ent "TMD_DIR"))
  )
  
  ;; B. Si no está en LData, intentar usar ActiveX PrincipalMoments
  (if (not dir_z)
    (progn
      (setq moments (vl-catch-all-apply 'vlax-get (list obj 'PrincipalMoments)))
      (setq directions (vl-catch-all-apply 'vlax-get (list obj 'PrincipalDirections)))
      (if (and moments 
               (not (vl-catch-all-error-p moments))
               directions
               (not (vl-catch-all-error-p directions)))
        (progn
          (setq m_list (vlax-safearray->list (vlax-variant-value moments)))
          (setq d_list (vlax-safearray->list (vlax-variant-value directions)))
          (setq idx_min 0)
          (if (< (nth 1 m_list) (nth idx_min m_list)) (setq idx_min 1))
          (if (< (nth 2 m_list) (nth idx_min m_list)) (setq idx_min 2))
          (setq dir_z (list (nth (* idx_min 3) d_list)
                            (nth (+ (* idx_min 3) 1) d_list)
                            (nth (+ (* idx_min 3) 2) d_list)))
        )
      )
    )
  )
  
  ;; C. Fallback absoluto usando Bounding Box WCS
  (if (not dir_z)
    (progn
      (vla-getboundingbox obj 'minp 'maxp)
      (setq pmin (vlax-safearray->list minp)
            pmax (vlax-safearray->list maxp)
            diff (mapcar '- pmax pmin)
            max_d (apply 'max diff))
      (cond
        ((= max_d (car diff)) (setq dir_z '(1.0 0.0 0.0)))
        ((= max_d (cadr diff)) (setq dir_z '(0.0 1.0 0.0)))
        (t (setq dir_z '(0.0 0.0 1.0)))
      )
    )
  )
  
  (setq dir_z (TMD:util-vector-unit dir_z))
  (list c_pt dir_z)
)

(defun TMD:solid-extract-axis-points (s_ent / obj centroid_data centroid dir_z copy minp maxp pmin pmax pt1 pt2 len)
  (vl-load-com)
  (setq obj (vlax-ename->vla-object s_ent))
  (setq centroid_data (TMD:solid-get-principal-axis s_ent))
  (setq centroid (car centroid_data)
        dir_z (cadr centroid_data))
  
  (setq copy (vla-copy obj))
  (TMD:util-force-align-x copy centroid (mapcar '+ centroid dir_z))
  (vla-getboundingbox copy 'minp 'maxp)
  (setq pmin (vlax-safearray->list minp)
        pmax (vlax-safearray->list maxp))
  
  (setq pt1 (mapcar '+ centroid (mapcar '(lambda (x) (* x (car pmin))) dir_z)))
  (setq pt2 (mapcar '+ centroid (mapcar '(lambda (x) (* x (car pmax))) dir_z)))
  (setq len (- (car pmax) (car pmin)))
  
  (vla-delete copy)
  (list pt1 pt2 len centroid dir_z)
)

(defun TMD:util-get-directional-len (s_ent w_ent / len res)
  (vl-load-com)
  (if (and s_ent (entget s_ent) (= (cdr (assoc 0 (entget s_ent))) "3DSOLID"))
    (progn
      (setq res (TMD:solid-extract-axis-points s_ent))
      (setq len (nth 2 res))
      (vlax-ldata-put s_ent "TMD_LEN_PHYS" len)
      (if (and w_ent (entget w_ent))
        (vlax-ldata-put w_ent "TMD_LEN_PHYS" len)
      )
      len
    )
    (if (and w_ent (entget w_ent))
      (progn
        (setq len (distance (cdr (assoc 10 (entget w_ent))) (cdr (assoc 11 (entget w_ent)))))
        (vlax-ldata-put w_ent "TMD_LEN_PHYS" len)
        len
      )
      0.0
    )
  )
)

;;; -------------------------------------------------------------------------------------
;;; 4. AUDITORIA E INTEGRIDADE GEOMÉTRICA
;;; -------------------------------------------------------------------------------------

;; Obtém a justificação REAL (física) baseada na posição da linha em relação ao sólido
(defun TMD:util-get-real-justification (w_ent s_ent / params p_x p_y w_p1 w_p2 v_z v_x v_y s_bbox s_min s_max s_cent vec_s off_x off_y jx jy)
  (setq params (vlax-ldata-get w_ent "TMD_PARAMS"))
  (if (and params (setq p_x (cdr (assoc "DIM_X" params))) (setq p_y (cdr (assoc "DIM_Y" params))))
    (progn
      (setq w_p1 (cdr (assoc 10 (entget w_ent)))
            w_p2 (cdr (assoc 11 (entget w_ent))))
      (setq v_z (TMD:util-vector-unit (mapcar '- w_p2 w_p1)))
      
      ;; Definir eixos locais do perfil (LCS)
      (if (and (< (abs (car v_z)) 0.01) (< (abs (cadr v_z)) 0.01)) 
        (setq v_x '(1.0 0.0 0.0)) 
        (setq v_x (TMD:util-vector-unit (TMD:util-vector-cross '(0.0 0.0 1.0) v_z)))
      )
      (setq v_y (TMD:util-vector-unit (TMD:util-vector-cross v_z v_x)))
      
      ;; Centro do sólido e projeção
      (vla-getboundingbox (vlax-ename->vla-object s_ent) 'minp 'maxp)
      (setq s_min (vlax-safearray->list minp) s_max (vlax-safearray->list maxp))
      (setq s_cent (list (/ (+ (car s_min) (car s_max)) 2.0) (/ (+ (cadr s_min) (cadr s_max)) 2.0) (/ (+ (caddr s_min) (caddr s_max)) 2.0)))
      
      (setq vec_s (mapcar '- s_cent w_p1)
            off_x (apply '+ (mapcar '* vec_s v_x))
            off_y (apply '+ (mapcar '* vec_s v_y)))
      
      ;; Mapeamento 1 de 9 posições
      (setq jx (cond ((< off_x (* p_x -0.25)) "R") ((> off_x (* p_x 0.25)) "L") (t "C")))
      (setq jy (cond ((< off_y (* p_y -0.25)) "T") ((> off_y (* p_y 0.25)) "B") (t "M")))
      (strcat jy jx)
    )
    "MC" ;; Fallback
  )
)

;; Auxiliares de Vetores (Garantia de existência)
(defun TMD:util-vector-unit (v / d) (setq d (distance '(0 0 0) v)) (if (> d 1e-8) (mapcar '(lambda (x) (/ x d)) v) v))
(defun TMD:util-vector-cross (a b) (list (- (* (cadr a) (caddr b)) (* (caddr a) (cadr b))) (- (* (caddr a) (car b)) (* (car a) (caddr b))) (- (* (car a) (cadr b)) (* (cadr a) (car b)))))

;; FALLBACK: Obtém a maior dimensão do BoundingBox (usado quando o wire é perdido)
(defun TMD:util-get-bbox-max-dim (ent / minp maxp p1 p2)
  (vla-getboundingbox (vlax-ename->vla-object ent) 'minp 'maxp)
  (setq p1 (vlax-safearray->list minp) p2 (vlax-safearray->list maxp))
  (max (abs (- (car p2) (car p1))) (abs (- (cadr p2) (cadr p1))) (abs (- (caddr p2) (caddr p1))))
)

;;; -------------------------------------------------------------------------------------
;;; 4. AUDITORIA E INTEGRIDADE
;;; -------------------------------------------------------------------------------------

(defun c:TMD_AUDIT ( / ss i ent all_groups h_index ungrouped duplicates p1 p2 nome key duplicate_list tmp)
  (princ "\n[TMD] Iniciando Auditoria de Integridade BIM...")
  (setq ss (ssget "_X" '((0 . "LINE,3DSOLID"))))
  (if (or (not ss) (= (sslength ss) 0)) (progn (princ "\n[OK] Nenhum objeto encontrado.") (exit)))
  
  ;; 1. Construir índice de grupos (Handles)
  (setq all_groups (vla-get-Groups (vla-get-ActiveDocument (vlax-get-acad-object))))
  (setq h_index (list))
  (vlax-for grp all_groups
    (vlax-for item grp
      (setq h_index (cons (vla-get-Handle item) h_index))
    )
  )
  
  (setq ungrouped (ssadd) duplicates (ssadd) duplicate_list (list))
  
  (repeat (setq i (sslength ss))
    (setq ent (ssname ss (setq i (1- i))))
    (if (vlax-ldata-get ent "TMD_CLASSE")
      (progn
        ;; Verificar se pertence a algum grupo
        (if (not (member (vla-get-Handle (vlax-ename->vla-object ent)) h_index))
          (ssadd ent ungrouped)
        )
        
        ;; Detector de Duplicatas (Geometria Colinear + Propriedades Idênticas)
        (if (= (cdr (assoc 0 (entget ent))) "LINE")
          (progn
            (setq p1 (cdr (assoc 10 (entget ent))) 
                  p2 (cdr (assoc 11 (entget ent))) 
                  nome (vlax-ldata-get ent "TMD_NOME")
                  just (vlax-ldata-get ent "TMD_JUSTIFICACAO")
                  rot  (vlax-ldata-get ent "TMD_ROTACAO")
            )
            ;; Normalizar pontos para comparação de eixo
            (if (or (> (car p1) (car p2)) (and (= (car p1) (car p2)) (> (cadr p1) (cadr p2))))
              (setq tmp p1 p1 p2 p2 tmp)
            )
            ;; A chave agora inclui Justificação e Rotação
            (setq key (strcat (vl-princ-to-string p1) (vl-princ-to-string p2) 
                             (if nome nome "") (if just just "") (if rot rot "")))
            
            (if (member key duplicate_list)
              (ssadd ent duplicates)
              (setq duplicate_list (cons key duplicate_list))
            )
            
            ;; TODO: Implementar detecção de sobreposição parcial (uma linha dentro da outra)
            ;; Para v1.5, focamos em eixos idênticos com propriedades idênticas.
          )
        )
      )
    )
  )
  
  (princ (strcat "\n[RESULTADO] " (itoa (sslength ungrouped)) " objetos sem grupo | " (itoa (sslength duplicates)) " duplicados."))
  
  (cond
    ((> (sslength duplicates) 0)
      (princ "\n[!] Duplicatas detectadas e selecionadas. Recomenda-se apagar.")
      (sssetfirst nil duplicates)
    )
    ((> (sslength ungrouped) 0)
      (princ "\n[!] Objetos sem grupo detectados e selecionados.")
      (sssetfirst nil ungrouped)
    )
    (t (princ "\n[OK] Auditoria concluída: Modelo íntegro."))
  )
  (princ)
)

;;; -------------------------------------------------------------------------------------
;;; 5. SISTEMA DE AYUDA CENTRALIZADO
;;; -------------------------------------------------------------------------------------

(defun TMD:util-help (cmd / msg)
  (setq msg (cond
    ((= cmd "TMD_TABLAS_MONTAGEM") (strcat "Tabela Mestra B.I.M (Fonte da Verdade).\n"
                                           "  - Coleta dados do modelo e gera a lista base.\n"
                                           "  - Se selecionar um Grupo inteiro, a tabela fica vinculada ao Grupo.\n"
                                           "  - Se selecionar parte do grupo, vincula aos objetos individuais.\n"
                                           "  - Salva metadados (LData) para permitir sincronização e derivar outras tabelas."))
    ((= cmd "TMD_TABLAS_DESPIECE") (strcat "Lista de Corte / Oficina.\n"
                                           "  - Requer uma Tabela de Montagem como referência.\n"
                                           "  - Calcula cortes em barras de 6m e informa % de desperdício.\n"
                                           "  - Agrupa por ângulos e perfis."))
    ((= cmd "TMD_TABLAS_COMPRA") "Resumo Consolidado: Soma comprimentos e pesos totais por tipo de perfil para orçamentação e compra.")
    ((= cmd "TMD_TABLAS_ATUALIZAR") (strcat "Sincronizador BIM.\n"
                                            "  - Selecione uma Tabela de Montagem para atualizar dados.\n"
                                            "  - Re-escaneia o modelo 3D (Grupos ou Objetos) e regenera os cálculos.\n"
                                            "  - Preserva TableStyles, camadas e cores da tabela original."))
    ((= cmd "TMD_ABAS") "Adiciona dobras (abas) em perfis. Define dimensões, chanfros e inyecta ADN BIM para fabricação. [Uso: Selecionar Viga -> Definir Lados]")
    ((= cmd "TMD_BUILD") "Compilador: Transforma linhas (wireframes) em sólidos 3D usando o catálogo de perfis. Atualiza geometria existente.")
    ((= cmd "TMD_CNC") "Prepara elementos para fabricação CNC. Gera planificações (DXF) e metadados técnicos de corte.")
    ((= cmd "TMD_CORE_CONVERTER") "Converte linhas ou objetos genéricos em elementos inteligentes TMD, permitindo que sejam reconhecidos pelo motor.")
    ((= cmd "TMD_PROPERTIES") "B.I.M Inspector: Interface visual completa para gerenciar ADN, justificação, rotação e juntas do elemento.")
    ((= cmd "TMD_LDATA_VIEWER") "Visualizador LData: Lista todas as chaves e valores armazenados no dicionário privado do objeto.")
    ((= cmd "TMD_FACE_CUT") "Corte por Face: Executa SLICE limpo usando a face de um mestre. Modos: Vertical (Z livre) ou Horizontal (XY fixo).")
    ((= cmd "TMD_JOINTS") "Gerencia juntas estruturais (Miter, Flush, Gap). Automatiza as supressões 3D entre vigas que se interceptam.")
    ((= cmd "TMD_MATCH") "Match Properties BIM: Copia todas as propriedades lógicas (ADN) de um objeto mestre para os destinos selecionados.")
    ((= cmd "TMD_NIVEIS") "Gestor de Níveis: Define e organiza as alturas (Z) de trabalho para inserção automática de elementos.")
    ((= cmd "TMD_SYNC") (strcat "Motor de Integridad BIM (v5.1).\n"
                                "  - Escanea el dibujo buscando clones y huérfanos.\n"
                                "  - Repara vínculos LData usando huellas digitales (Handles).\n"
                                "  - Útil tras operaciones de copiado o guardado como."))
    ((= cmd "TMD_SYNC_SPATIAL") (strcat "Sanador Espacial (Legacy).\n"
                                        "  - Re-vincula sólidos y wires basándose en su cercanía física.\n"
                                        "  - Fallback recomendado si la sincronización por huella digital no es suficiente."))
    ((= cmd "TMD_WIRES") "Gerenciador Analítico: Cria e edita o esqueleto (linhas) da estrutura, definindo perfil, rotação e justificação.")
    ((= cmd "TMD_WIRES_EDIT_ROT") "Gira as linhas estruturais selecionadas em 90 graus. (Uso via CUI/Menu Contextual)")
    ((= cmd "TMD_WIRES_EDIT_CATALOG") "Abre o gestor de catálogo para alterar o perfil das linhas selecionadas. (Uso via CUI)")
    ((= cmd "TMD_JOINTS_FLUSH") "Aplica recorte a topo (Flush) entre vigas que se interceptam.")
    ((= cmd "TMD_JOINTS_MITER") "Aplica recorte em meia-esquadria (Miter) entre vigas que se interceptam.")
    ((= cmd "TMD_JOINTS_CLEAR") "Remove as definições de recorte (joints) das vigas selecionadas.")
    ((= cmd "TMD_VIGAS") "Interface de inserção de perfis estruturais. Permite escolher do catálogo e desenhar vigas/colunas.")
    ((= cmd "TMD_GROUP") (strcat "Gestor de Grupos (Peças) para B.I.M.\n"
                                 "  - ENTER: Usa o nome sugerido (ex: Peça_A) e incrementa a letra.\n"
                                 "  - NOME_: Digitar um prefixo com '_' (ex: VIGA_) busca o próximo número/letra disponível no desenho.\n"
                                 "  - ADOÇÃO: Seleciona um objeto existente para copiar seu prefixo e seguir a sequência.\n"
                                 "  - CONFIG: Altera o prefixo padrão e o contador global.\n"
                                 "  - NOTA: O script agrupa automaticamente a linha analítica e seu sólido 3D correspondente."))
    ((= cmd "TMD_AUDIT") "Auditoria de Integridade: Localiza elementos BIM sem grupo e detecta duplicatas (objetos sobrepostos com mesmos dados).")
    (t "Comando TM Digital. Consulte o manual técnico para detalhes avançados.")
  ))
  (princ (strcat "\n\n  --- AJUDA: " cmd " ---"))
  (princ (strcat "\n  " msg))
  (princ "\n  --------------------------------------------------\n")
  (princ)
)

;;; =====================================================================================
(defun TMD:util-force-layer (layer_name color / layers_coll layer_obj)
  (setq layers_coll (vla-get-Layers (vla-get-ActiveDocument (vlax-get-acad-object))))
  (if (not (tblsearch "LAYER" layer_name))
    (vla-add layers_coll layer_name)
  )
  (setq layer_obj (vla-item layers_coll layer_name))
  (vla-put-color layer_obj color)
)

;;; -------------------------------------------------------------------------------------
;;; MOTOR DE APLICAÇÃO EM MASSA (RIBBON UI)
;;; -------------------------------------------------------------------------------------

(defun TMD:util-apply-just-ss (new_just / ss i ent params doc new_ss res_ent is_solid w_ent)
  (setq ss (ssget "_I" '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
  (if (not ss) (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>")))))
  (if ss
    (progn
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)
      (setq new_ss (ssadd))
      (setq i 0)
      (repeat (sslength ss)
        (setq ent (ssname ss i))
        (setq is_solid (= (cdr (assoc 0 (entget ent))) "3DSOLID"))
        (if is_solid
          (setq w_ent (handent (vlax-ldata-get ent "TMD_PARENT_WIRE")))
          (setq w_ent ent)
        )
        (if (and w_ent (setq params (vlax-ldata-get w_ent "TMD_PARAMS")))
          (progn
            (setq params (subst (cons "JUSTIFICACAO" new_just) (assoc "JUSTIFICACAO" params) params))
            (vlax-ldata-put w_ent "TMD_PARAMS" params)
            (vlax-ldata-put w_ent "TMD_MARK" nil)
            (vlax-ldata-put w_ent "TMD_LEN_PHYS" nil)
            (setq res_ent (if (and (findfile "TMD_BUILD.lsp") TMD:build-single-wire) (TMD:build-single-wire w_ent) nil))
            ;; Reconstruir seleção
            (if is_solid
              (if res_ent (ssadd res_ent new_ss))
              (ssadd w_ent new_ss)
            )
          )
        )
        (setq i (1+ i))
      )
      (vla-EndUndoMark doc)
      (if (> (sslength new_ss) 0) (sssetfirst nil new_ss))
      (princ (strcat "\n[✔] Justificação " new_just " aplicada."))
    )
  )
  (princ)
)

(defun TMD:util-apply-rot-step-ss (step / ss i ent params current_rot new_rot doc new_ss res_ent is_solid w_ent)
  (setq ss (ssget "_I" '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
  (if (not ss) (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>")))))
  (if ss
    (progn
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)
      (setq new_ss (ssadd))
      (setq i 0)
      (repeat (sslength ss)
        (setq ent (ssname ss i))
        (setq is_solid (= (cdr (assoc 0 (entget ent))) "3DSOLID"))
        (if is_solid
          (setq w_ent (handent (vlax-ldata-get ent "TMD_PARENT_WIRE")))
          (setq w_ent ent)
        )
        (if (and w_ent (setq params (vlax-ldata-get w_ent "TMD_PARAMS")))
          (progn
            (setq current_rot (cdr (assoc "ROTACAO" params)))
            (setq new_rot (+ current_rot step))
            (if (>= new_rot 360.0) (setq new_rot 0.0))
            (setq params (subst (cons "ROTACAO" new_rot) (assoc "ROTACAO" params) params))
            (vlax-ldata-put w_ent "TMD_PARAMS" params)
            (vlax-ldata-put w_ent "TMD_MARK" nil)
            (vlax-ldata-put w_ent "TMD_LEN_PHYS" nil)
            (setq res_ent (if (and (findfile "TMD_BUILD.lsp") TMD:build-single-wire) (TMD:build-single-wire w_ent) nil))
            ;; Reconstruir seleção
            (if is_solid
              (if res_ent (ssadd res_ent new_ss))
              (ssadd w_ent new_ss)
            )
          )
        )
        (setq i (1+ i))
      )
      (vla-EndUndoMark doc)
      (if (> (sslength new_ss) 0) (sssetfirst nil new_ss))
      (princ "\n[✔] Rotação aplicada.")
    )
  )
  (princ)
)

;;; -------------------------------------------------------------------------------------
;;; 5. SINCRONIZADOR Y SANADOR B.I.M (TMD_SYNC)
;;; -------------------------------------------------------------------------------------

;; FUNCIÓN: TMD:sync-model
;; PROPÓSITO: Motor de "Matchmaking" espacial. Busca reconstruir vínculos perdidos entre
;;            sólidos 3D y sus líneas analíticas (wires) basándose en proximidad geométrica.
;; QUIÉN LA LLAMA: Comando c:TMD_SYNC_SPATIAL (Legacy) y motores de auditoría.
;; NOTA: Útil cuando el usuario mueve o copia objetos sin usar herramientas TMD.
(defun TMD:sync-model (silent / ss_solids ss_wires i s_ent w_ent paired_solids paired_wires orphan_solids orphan_wires
                      s_parent_h s_parent_ent s_min s_max s_cent w_cent pt1 pt2 dist match_count o_sol o_wire matched_wire vla_sol centroid p_dirs)
  (vl-load-com)
  (if (not silent) (princ "\n[TMD] Iniciando Sincronización B.I.M..."))
  
  (setq ss_solids (ssget "_X" '((0 . "3DSOLID"))))
  (setq ss_wires (ssget "_X" '((0 . "LINE"))))
  
  (setq paired_solids (list) paired_wires (list) orphan_solids (list) orphan_wires (list))
  
  ;; 1. Censo y Verificación de Integridad
  (if ss_solids
    (progn
      (setq i 0)
      (while (< i (sslength ss_solids))
        (setq s_ent (ssname ss_solids i))
        (if (= (vlax-ldata-get s_ent "TMD_COMPILADO") "SIM")
          (progn
            (setq s_parent_h (vlax-ldata-get s_ent "TMD_PARENT_WIRE"))
            (setq s_parent_ent (if (and s_parent_h (= (type s_parent_h) 'STR)) (handent s_parent_h) nil))
            
            (setq is_paired nil)
            (if (and s_parent_ent (entget s_parent_ent) (= (cdr (assoc 0 (entget s_parent_ent))) "LINE"))
              (progn
                (setq pt1 (cdr (assoc 10 (entget s_parent_ent))) pt2 (cdr (assoc 11 (entget s_parent_ent))))
                (setq w_cent (list (/ (+ (car pt1) (car pt2)) 2.0) (/ (+ (cadr pt1) (cadr pt2)) 2.0) (/ (+ (caddr pt1) (caddr pt2)) 2.0)))
                
                (vla-getboundingbox (vlax-ename->vla-object s_ent) 's_min 's_max)
                (setq s_min (vlax-safearray->list s_min) s_max (vlax-safearray->list s_max))
                (setq s_cent (list (/ (+ (car s_min) (car s_max)) 2.0) (/ (+ (cadr s_min) (cadr s_max)) 2.0) (/ (+ (caddr s_min) (caddr s_max)) 2.0)))
                
                ;; Tolerancia espacial: si están cerca, asumimos que están "apareados".
                ;; Si el usuario copió ambos, el sólido copiado seguirá apuntando al wire original (muy lejos).
                (if (< (distance w_cent s_cent) 1500.0) (setq is_paired T))
              )
            )
            
            (if is_paired
              (progn
                (setq paired_solids (cons s_ent paired_solids))
                (setq paired_wires (cons s_parent_ent paired_wires))
              )
              (setq orphan_solids (cons s_ent orphan_solids))
            )
          )
        )
        (setq i (1+ i))
      )
    )
  )
  
  ;; Filtrar wires huérfanos
  (if ss_wires
    (progn
      (setq i 0)
      (while (< i (sslength ss_wires))
        (setq w_ent (ssname ss_wires i))
        (if (= (vlax-ldata-get w_ent "TMD_CLASSE") "ESTRUTURA_LINE")
          (if (not (member w_ent paired_wires)) (setq orphan_wires (cons w_ent orphan_wires)))
        )
        (setq i (1+ i))
      )
    )
  )
  
  (if (not silent) (princ (strcat "\n[SYNC] Íntegros: " (itoa (length paired_solids)) " pares. Huérfanos: " (itoa (length orphan_solids)) " Sólidos | " (itoa (length orphan_wires)) " Líneas.")))
  
  ;; 2. Matchmaking: El usuario copió TANTO la línea como el Sólido simultáneamente.
  (setq match_count 0)
  (foreach o_sol orphan_solids
    (vla-getboundingbox (vlax-ename->vla-object o_sol) 's_min 's_max)
    (setq s_min (vlax-safearray->list s_min) s_max (vlax-safearray->list s_max))
    (setq s_cent (list (/ (+ (car s_min) (car s_max)) 2.0) (/ (+ (cadr s_min) (cadr s_max)) 2.0) (/ (+ (caddr s_min) (caddr s_max)) 2.0)))
    
    (setq matched_wire nil)
    (foreach o_wire orphan_wires
      (if (not matched_wire)
        (progn
          (setq pt1 (cdr (assoc 10 (entget o_wire))) pt2 (cdr (assoc 11 (entget o_wire))))
          (setq w_cent (list (/ (+ (car pt1) (car pt2)) 2.0) (/ (+ (cadr pt1) (cadr pt2)) 2.0) (/ (+ (caddr pt1) (caddr pt2)) 2.0)))
          
          ;; Si la línea copiada está físicamente dentro del sólido copiado, ¡son pareja!
          (if (< (distance s_cent w_cent) 1500.0) (setq matched_wire o_wire))
        )
      )
    )
    
    (if matched_wire
      (progn
        ;; Reparación B.I.M
        (vlax-ldata-put o_sol "TMD_PARENT_WIRE" (cdr (assoc 5 (entget matched_wire))))
        (vlax-ldata-put matched_wire "TMD_CHILD_SOLID" (cdr (assoc 5 (entget o_sol))))
        (vlax-ldata-put matched_wire "TMD_MARK" nil) ;; Forzar re-numeración
        
        ;; Remover de las listas
        (setq orphan_wires (vl-remove matched_wire orphan_wires))
        (setq orphan_solids (vl-remove o_sol orphan_solids))
        (setq match_count (1+ match_count))
      )
    )
  )
  (if (> match_count 0) (if (not silent) (princ (strcat "\n[SYNC] " (itoa match_count) " pares copiados fueron re-vinculados exitosamente."))))
  
  ;; 3. Regeneración de Sólidos (El usuario copió/dibujó una línea pero no tiene sólido)
  (if (and (> (length orphan_wires) 0) TMD:build-single-wire)
    (progn
      (if (not silent) (princ (strcat "\n[SYNC] Compilando " (itoa (length orphan_wires)) " Líneas Analíticas huérfanas...")))
      (foreach o_wire orphan_wires
        (TMD:build-single-wire o_wire)
        (vlax-ldata-put o_wire "TMD_MARK" nil)
      )
    )
  )
  
  ;; 4. Regeneración Inversa (El usuario copió un Sólido puro sin su línea)
  (if (> (length orphan_solids) 0)
    (progn
      (if (not silent) (princ (strcat "\n[SYNC] Detectados " (itoa (length orphan_solids)) " Sólidos huérfanos. Requieren Tensor de Inercia para regenerar líneas.")))
      ;; TODO: Implementar matemáticas de Momentos Principales (vla-get-PrincipalMoments) para hallar eje longitudinal.
    )
  )
  
  (if (not silent) (princ "\n[TMD] Sincronización Finalizada."))
  (princ)
)

;; COMANDO: TMD_SYNC_SPATIAL (Legacy)
;; PROPÓSITO: Ejecución interactiva del motor de sincronización por proximidad.
;; QUIÉN LA LLAMA: Usuario (Línea de comandos).
;; NOTA: Renombrado de TMD_SYNC a TMD_SYNC_SPATIAL para evitar colisión con el nuevo motor de huella digital.
(defun c:TMD_SYNC_SPATIAL ()
  (TMD:sync-model nil)
  (princ)
)

(princ "\n[TM Digital] TMD_Utils.lsp cargado exitosamente.")
(princ)
