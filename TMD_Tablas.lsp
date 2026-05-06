;;; =====================================================================================
;;; TM DIGITAL - MOTOR DE TABLAS B.I.M v4.0 (PERSISTENT & FRAGILE MARKING)
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; 1. UTILITARIOS
;;; -------------------------------------------------------------------------------------

(defun TMD:tablas-load-catalog ( / path fh line fields catalog)
  (setq catalog nil path (findfile "catalogo_metal.csv"))
  (if (not path) (setq path (strcat (getvar "DWGPREFIX") "catalogo_metal.csv")))
  (if (not (findfile path)) (progn (princ "\n[TABLAS] Catalogo nao encontrado!") (exit)))
  (setq fh (open path "r")) (read-line fh)
  (while (setq line (read-line fh))
    (setq fields (TMD:tablas-split-csv line))
    (if (>= (length fields) 6)
      (setq catalog (cons (list (car fields) (nth 1 fields) (atof (nth 2 fields)) (atof (nth 3 fields)) (atof (nth 4 fields)) (atof (nth 5 fields))) catalog))))
  (close fh) catalog)

(defun TMD:tablas-split-csv (line / res start i ch token)
  (setq res nil start 0 i 0)
  (while (<= i (strlen line))
    (setq ch (if (< i (strlen line)) (substr line (1+ i) 1) ","))
    (if (= ch ",") (progn (setq token (substr line (1+ start) (- i start))) (setq res (append res (list token))) (setq start (1+ i))))
    (setq i (1+ i)))
  res)

(defun TMD:tablas-get-solid-len (s_ent / parent)
  (setq parent (vlax-ldata-get s_ent "TMD_PARENT_WIRE"))
  (if (and parent (setq parent (handent parent)) (entget parent))
    (TMD:util-get-directional-len s_ent parent)
    (TMD:util-get-bbox-max-dim s_ent) ; Fallback se não houver wire
  ))

(defun TMD:tablas-resolve-wire (ent / etype ph)
  (setq etype (cdr (assoc 0 (entget ent))))
  (cond ((= etype "LINE") (if (vlax-ldata-get ent "TMD_TIPO") ent nil))
        ((= etype "3DSOLID") (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE")) (if (and ph (setq ph (handent ph))) ph nil))
        (t nil)))

;;; -------------------------------------------------------------------------------------
;;; 2. MOTOR DE ANALISE (READ-ONLY MARKING)
;;; -------------------------------------------------------------------------------------

(defun TMD:tablas-analyze-selection (ss / doc groups i ent g_list h_list grp grp_name handled all_in)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))
        groups (vla-get-Groups doc) g_list nil h_list nil)
  (vlax-for grp groups
    (setq grp_name (vla-get-Name grp) all_in T)
    (vlax-for item grp (if (not (ssmemb (vlax-vla-object->ename item) ss)) (setq all_in nil)))
    (if all_in (setq g_list (cons grp_name g_list)))
  )
  (repeat (setq i (sslength ss))
    (setq ent (ssname ss (setq i (1- i))) handled nil)
    (foreach gn g_list
      (setq grp (vla-Item groups gn))
      (vlax-for item grp (if (= (vla-get-Handle item) (vla-get-Handle (vlax-ename->vla-object ent))) (setq handled T)))
    )
    (if (not handled) (setq h_list (cons (vla-get-Handle (vlax-ename->vla-object ent)) h_list)))
  )
  (list (cons "GROUPS" g_list) (cons "HANDLES" h_list)))

(defun TMD:tablas-collect-data (source_map catalog / doc groups res gn hl grp ent processed_handles)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))
        groups (vla-get-Groups doc) res nil processed_handles nil)
  (defun collect-item (ent g_name / w_ent w_handle nome s_h s_ent len peso_unit entry is_wire mark)
    (if (and (setq w_ent (TMD:tablas-resolve-wire ent))
             (not (member (setq w_handle (cdr (assoc 5 (entget w_ent)))) processed_handles)))
      (progn
        (setq processed_handles (cons w_handle processed_handles))
        (setq nome (vlax-ldata-get w_ent "TMD_NOME")
              s_h (vlax-ldata-get w_ent "TMD_CHILD_SOLID")
              s_ent (if s_h (handent s_h) nil))
        (if (and s_ent (entget s_ent))
          (setq len (TMD:tablas-get-solid-len s_ent) is_wire nil)
          (setq len (distance (cdr (assoc 10 (entget w_ent))) (cdr (assoc 11 (entget w_ent)))) is_wire T))
        (setq peso_unit (if (setq entry (assoc nome catalog)) (nth 5 entry) 0.0))
        ;; LER MARCA PERSISTENTE (Ou vazio se nao numerado)
        (setq mark (vlax-ldata-get w_ent "TMD_MARK"))
        (if (not mark) (setq mark ""))
        (setq res (cons (list g_name nome len peso_unit is_wire mark) res))
      )
    )
  )
  (foreach gn (cdr (assoc "GROUPS" source_map))
    (if (not (vl-catch-all-error-p (setq grp (vl-catch-all-apply 'vla-Item (list groups gn)))))
      (vlax-for item grp (collect-item (vlax-vla-object->ename item) gn))))
  (foreach hl (cdr (assoc "HANDLES" source_map))
    (if (setq ent (handent hl)) (collect-item ent "AVULSO")))
  res)

(defun TMD:tablas-group-and-aggregate (raw_data / grps g_name ex items n l w isw found mark)
  (setq grps nil)
  (foreach d raw_data
    (setq g_name (car d) ex (assoc g_name grps))
    (if ex 
      (setq grps (subst (cons g_name (cons (cdr d) (cdr ex))) ex grps))
      (setq grps (cons (list g_name (cdr d)) grps)))
  )
  (mapcar '(lambda (g)
    (setq items nil)
    (foreach d (cdr g)
      (setq n (car d) l (cadr d) w (caddr d) isw (cadddr d) mark (nth 4 d) found nil)
      (foreach it items (if (and (= (car it) n) (< (abs (- (cadr it) l)) 1.5)) (setq found it)))
      (if found 
        (setq items (subst (list n l w isw (1+ (nth 4 found)) mark) found items))
        (setq items (cons (list n l w isw 1 mark) items))))
    (cons (car g) (vl-sort items '(lambda (a b) (> (cadr a) (cadr b)))))
  ) grps))

;;; -------------------------------------------------------------------------------------
;;; 2.5 MOTOR DE OPTIMIZACION (NESTING 1D)
;;; -------------------------------------------------------------------------------------

(defun TMD:tablas-run-nesting (lengths stock_len / bars current_bar_space sorted_lengths placed)
  (setq sorted_lengths (vl-sort lengths '>))
  (setq bars nil) ;; Cada barra será una lista de espacios ocupados
  
  (foreach len sorted_lengths
    (setq placed nil)
    ;; Tentar encaixar em barras existentes
    (setq i 0)
    (while (and (not placed) (< i (length bars)))
      (setq bar_rem (nth i bars))
      (if (>= bar_rem len)
        (progn
          (setq bars (subst (- bar_rem len) bar_rem bars))
          (setq placed T)
        )
      )
      (setq i (1+ i))
    )
    ;; Se nao coube, abre nova barra
    (if (not placed)
      (setq bars (cons (- stock_len len) bars)))
  )
  bars ;; Retorna lista com o espaço SOBRANTE de cada barra
)

;;; -------------------------------------------------------------------------------------
;;; 3. LOGICA DE PREENCHIMENTO
;;; -------------------------------------------------------------------------------------

(defun TMD:tablas-fill-table (table grouped_data / row it q l w isw tot_unit tot_kg mark)
  (setq row 2)
  (foreach g grouped_data
    (vl-catch-all-apply 'vla-MergeCells (list table row row 0 5))
    (vla-setText table row 0 (strcat "ASSEMBLY: " (car g)))
    (vla-setCellAlignment table row 0 5)
    (setq row (1+ row))
    (foreach it (cdr g)
      (setq q (nth 4 it) l (nth 1 it) w (nth 2 it) isw (nth 3 it) mark (nth 5 it)
            tot_unit (* (/ l 1000.0) w)
            tot_kg (* q tot_unit))
      (vla-setText table row 0 (itoa q))
      (vla-setText table row 1 mark)
      (vla-setText table row 2 (car it))
      (vla-setText table row 3 (strcat (rtos l 2 0) (if isw "*" "") (if (> l 6000.0) "!" "")))
      (vla-setText table row 4 (rtos tot_unit 2 2))
      (vla-setText table row 5 (rtos tot_kg 2 2))
      (setq row (1+ row))
    )
    (if (< row (vla-get-Rows table)) (setq row (1+ row)))
  )
)

;;; -------------------------------------------------------------------------------------
;;; 4. COMANDOS DE TABELAS
;;; -------------------------------------------------------------------------------------

(defun c:TMD_TABLAS_NUMERAR ( / ss doc i ent w_ent nome s_h s_ent len list_items unique key mark idx)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))) (vla-StartUndoMark doc)
  (princ "\n[TMD] Selecione elementos para numerar [Grupo]: ")
  (initget "Grupo")
  (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
  (if (= ss "Grupo") (setq ss (TMD:group-select-engine)))

  (if (not ss) (progn (vla-EndUndoMark doc) (exit)))
  
  (setq list_items nil)
  (repeat (setq i (sslength ss))
    (setq ent (ssname ss (setq i (1- i))))
    (if (setq w_ent (TMD:tablas-resolve-wire ent))
      (progn
        (setq nome (vlax-ldata-get w_ent "TMD_NOME")
              s_h (vlax-ldata-get w_ent "TMD_CHILD_SOLID")
              s_ent (if s_h (handent s_h) nil))
        (if (and s_ent (entget s_ent))
          (setq len (TMD:tablas-get-solid-len s_ent))
          (setq len (distance (cdr (assoc 10 (entget w_ent))) (cdr (assoc 11 (entget w_ent))))))
        (setq list_items (cons (list w_ent nome len) list_items))
      )
    )
  )
  
  ;; Agrupar geometrias unicas para definir marcas
  (setq unique nil)
  (foreach it list_items
    (setq key (strcat (nth 1 it) (rtos (nth 2 it) 2 2)))
    (if (not (assoc key unique))
      (setq unique (cons (list key (nth 2 it)) unique))))
  
  ;; Ordenar por comprimento DESCENDENTE (Longas = m1, m2...)
  (setq unique (vl-sort unique '(lambda (a b) (> (cadr a) (cadr b)))))
  
  ;; Aplicar marcas aos objetos
  (setq idx 1)
  (foreach u unique
    (setq mark (strcat "m" (itoa idx)))
    (foreach it list_items
      (if (= (strcat (nth 1 it) (rtos (nth 2 it) 2 2)) (car u))
        (vlax-ldata-put (car it) "TMD_MARK" mark)))
    (setq idx (1+ idx)))
  
  (vla-EndUndoMark doc)
  (princ (strcat "\n[OK] Numeracao concluida. " (itoa (length unique)) " marcas geradas.")) (princ))

(defun c:TMD_TABLAS_MONTAGEM ( / doc ss cat source_data raw_data grps pt rows table i headers space)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))) (vla-StartUndoMark doc)
  (princ "\n[TMD] Selecione elementos para a Tabela [Grupo]: ")
  (initget "Grupo")
  (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
  (if (= ss "Grupo") (setq ss (TMD:group-select-engine)))

  (if (not ss) (progn (vla-EndUndoMark doc) (exit)))
  (setq cat (TMD:tablas-load-catalog)
        source_data (TMD:tablas-analyze-selection ss)
        raw_data (TMD:tablas-collect-data source_data cat)
        grps (TMD:tablas-group-and-aggregate raw_data))
  (setq rows 3) (foreach g grps (setq rows (+ rows (length (cdr g)) 2)))
  (setq pt (getpoint "\nPonto de insercao: ")) (if (not pt) (progn (vla-EndUndoMark doc) (exit)))
  (setq space (if (= (getvar "CVPORT") 1) (vla-get-PaperSpace doc) (vla-get-ModelSpace doc)))
  (setq table (vla-AddTable space (vlax-3d-point pt) (fix rows) 6 8.0 40.0))
  (vla-setText table 0 0 "TABELA DE MONTAGEM (ASSEMBLIES)")
  (setq headers '("QTD" "POS" "PERFIL" "COMP(mm)" "PESO UNIT (KG)" "PESO TOTAL (KG)"))
  (setq i 0) (foreach h headers (vla-setText table 1 i h) (setq i (1+ i)))
  (TMD:tablas-fill-table table grps)
  (setq i (1- (vla-get-Rows table))) (vla-MergeCells table i i 0 5)
  (vla-setText table i 0 "* Medida baseada no wire (Sólido não compilado)")
  (vla-setCellAlignment table i 0 4)
  (vlax-ldata-put table "TMD_TAB_SOURCE" source_data)
  (vlax-ldata-put table "TMD_TAB_DATA" grps)
  (vlax-ldata-put table "TMD_TAB_TYPE" "MONTAGEM")
  (vla-EndUndoMark doc) (princ "\n[OK] Tabela gerada.") (princ))

(defun c:TMD_TABLAS_ATUALIZAR ( / doc ent table type smap cat raw grps summary n l w q isw mark ex processed_handles profiles bar_results total_bars kg_neto kg_compra waste_total rh th ts i j lr ss_temp h_list g_list usage tab_data tab_type)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))) (vla-StartUndoMark doc)
  (setq ent (car (entsel "\nSelecione a Tabela para atualizar: ")))
  (if (or (not ent) (/= (cdr (assoc 0 (entget ent))) "ACAD_TABLE")) (progn (vla-EndUndoMark doc) (exit)))
  (setq table (vlax-ename->vla-object ent))
  (setq type (vlax-ldata-get ent "TMD_TAB_TYPE") smap (vlax-ldata-get ent "TMD_TAB_SOURCE"))
  (if (not type) (progn (princ "\n[!] Tabela nao possui dados BIM.") (vla-EndUndoMark doc) (exit)))

  (setq cat (TMD:tablas-load-catalog))
  (setq raw_data nil)

  (cond
    ;; ATUALIZAR MONTAGEM (Direto do Modelo)
    ((= type "MONTAGEM")
     (setq raw_data (TMD:tablas-collect-data smap cat))
     (setq grps (TMD:tablas-group-and-aggregate raw_data))
     (setq tab_data grps)
    )

    ;; ATUALIZAR DESPIECE (A partir das Tabelas de Montagem)
    ((= type "DESPIECE")
     (setq summary nil)
     (foreach h smap
       (if (and (setq t_ent (handent h)) (setq g_data (vlax-ldata-get t_ent "TMD_TAB_DATA")))
         (foreach g g_data
           (foreach it (cdr g)
             (setq n (nth 0 it) l (nth 1 it) w (nth 2 it) isw (nth 3 it) q (nth 4 it) mark (nth 5 it) g_name (car g))
             (setq ex (vl-some '(lambda (x) (if (= (nth 0 x) mark) x nil)) summary))
             (if ex
               (progn 
                 (setq usage (last ex))
                 (if (not (assoc g_name usage)) (setq usage (cons (cons g_name q) usage))
                   (setq usage (subst (cons g_name (+ (cdr (assoc g_name usage)) q)) (assoc g_name usage) usage)))
                 (setq summary (subst (list mark n l w isw (+ (nth 5 ex) q) usage) ex summary)))
               (setq summary (cons (list mark n l w isw q (list (cons g_name q))) summary)))))))
     (setq tab_data summary)
    )

    ;; ATUALIZAR COMPRA (A partir de Vigas ou Tabelas)
    ((= type "COMPRA")
     (foreach h smap
       (if (setq t_ent (handent h))
         (cond
           ((= (cdr (assoc 0 (entget t_ent))) "ACAD_TABLE")
            (setq tab_type (vlax-ldata-get t_ent "TMD_TAB_TYPE"))
            (if (setq t_data (vlax-ldata-get t_ent "TMD_TAB_DATA"))
              (cond
                ((= tab_type "MONTAGEM")
                 (foreach g t_data (foreach it (cdr g) (setq raw_data (cons (list "TABLE" (nth 0 it) (nth 1 it) (nth 2 it) (nth 3 it) (nth 5 it)) raw_data)))))
                ((= tab_type "DESPIECE")
                 (foreach it t_data (repeat (nth 5 it) (setq raw_data (cons (list "TABLE" (nth 1 it) (nth 2 it) (nth 3 it) (nth 4 it) (nth 0 it)) raw_data)))))
              )))
           (t ;; É viga/solid
            (setq source_data (TMD:tablas-analyze-selection (ssadd t_ent (ssadd))))
            (setq raw_data (append (TMD:tablas-collect-data source_data cat) raw_data))))))
     
     ;; Agrupar para Nesting
     (setq profiles nil)
     (foreach d raw_data
       (setq n (nth 1 d) l (nth 2 d) w (nth 3 d))
       (setq ex (assoc n profiles))
       (if ex (setq profiles (subst (list n w (cons l (caddr ex))) ex profiles))
         (setq profiles (cons (list n w (list l)) profiles))))
     (setq tab_data profiles)
    )
  )

  ;; LOGICA DE RECONSTRUÇÃO DA TABELA (Visual)
  (setq rh (vl-catch-all-apply 'vla-getRowHeight (list table 2))) (if (vl-catch-all-error-p rh) (setq rh 8.0))
  (setq th (vl-catch-all-apply 'vla-getTextHeight (list table 2 0))) (if (vl-catch-all-error-p th) (setq th 2.5))
  (setq ts (vl-catch-all-apply 'vla-getTextStyle (list table 2 0))) (if (vl-catch-all-error-p ts) (setq ts "Standard"))
  
  (while (> (vla-get-Rows table) 2) (vla-DeleteRows table 2 1))
  
  (cond
    ((= type "MONTAGEM")
     (setq rows 1) (foreach g tab_data (setq rows (+ rows (length (cdr g)) 2)))
     (vla-InsertRows table 2 rh (fix rows))
     (TMD:tablas-fill-table table tab_data)
     (setq lr (1- (vla-get-Rows table))) (vla-MergeCells table lr lr 0 5)
     (vla-setText table lr 0 "* Medida baseada no wire (Sólido não compilado)")
    )
    ((= type "DESPIECE")
     (vla-InsertRows table 2 rh (length tab_data))
     (setq row 2) (foreach s (vl-sort tab_data '(lambda (a b) (< (car a) (car b))))
       (vla-setText table row 0 (nth 0 s)) (vla-setText table row 1 (nth 1 s))
       (vla-setText table row 2 (strcat (rtos (nth 2 s) 2 0) (if (nth 4 s) "*" "")))
       (vla-setText table row 3 (itoa (nth 5 s)))
       (setq usage "") (foreach u (last s) (setq usage (strcat usage (car u) "(" (itoa (cdr u)) "), ")))
       (vla-setText table row 4 (substr usage 1 (- (strlen usage) 2)))
       (setq row (1+ row)))
    )
    ((= type "COMPRA")
     (vla-InsertRows table 2 rh (length tab_data))
     (setq row 2) (foreach p tab_data
       (setq n (car p) w (cadr p) lengths (caddr p))
       (setq bar_results (TMD:tablas-run-nesting lengths 6000.0))
       (setq total_bars (length bar_results) kg_neto 0.0) 
       (foreach l lengths (setq kg_neto (+ kg_neto (* (/ l 1000.0) w))))
       (setq kg_compra (* total_bars 6.0 w) waste_total (- kg_compra kg_neto))
       (vla-setText table row 0 n) (vla-setText table row 1 (itoa total_bars))
       (vla-setText table row 2 (rtos kg_compra 2 2)) (vla-setText table row 3 (rtos kg_neto 2 2))
       (vla-setText table row 4 (rtos waste_total 2 2))
       (if (> kg_compra 0.0) (vla-setText table row 5 (strcat (rtos (* (/ kg_neto kg_compra) 100.0) 2 1) "%")) (vla-setText table row 5 "0%"))
       (setq row (1+ row)))
    )
  )

  ;; Aplicar estilos as novas linhas
  (setq i 2) (repeat (- (vla-get-Rows table) 2)
    (setq j 0) (repeat (vla-get-Columns table) (vla-setTextHeight table i j th) (vla-setTextStyle table i j ts) (setq j (1+ j)))
    (setq i (1+ i)))

  (vlax-ldata-put ent "TMD_TAB_DATA" tab_data)
  (vla-EndUndoMark doc) (princ (strcat "\n[OK] Tabela de " type " atualizada.")) (princ))

(defun c:TMD_TABLAS_DESPIECE ( / doc ss i ent grps summary n l w q isw mark ex pt table row space assemblies g_name usage)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))) (vla-StartUndoMark doc)
  (princ "\nSelecao Industrial de Despiece (Tabelas de Montagem): ")
  (setq ss (ssget '((0 . "ACAD_TABLE"))))
  (if (not ss) (progn (vla-EndUndoMark doc) (exit)))
  
  (setq source_handles nil i 0)
  (repeat (sslength ss) (setq source_handles (cons (vla-get-Handle (vlax-ename->vla-object (ssname ss i))) source_handles)) (setq i (1+ i)))
  
  (setq summary nil)
  (repeat (setq i (sslength ss))
    (setq ent (ssname ss (setq i (1- i))))
    (if (setq grps (vlax-ldata-get ent "TMD_TAB_DATA"))
      (foreach g grps
        (setq g_name (car g))
        (foreach it (cdr g)
          (setq n (nth 0 it) l (nth 1 it) w (nth 2 it) isw (nth 3 it) q (nth 4 it) mark (nth 5 it))
          (setq ex (vl-some '(lambda (x) (if (= (nth 0 x) mark) x nil)) summary))
          (if ex
            (progn 
              (setq usage (last ex))
              (if (not (assoc g_name usage)) (setq usage (cons (cons g_name q) usage))
                (setq usage (subst (cons g_name (+ (cdr (assoc g_name usage)) q)) (assoc g_name usage) usage)))
              (setq summary (subst (list mark n l w isw (+ (nth 5 ex) q) usage) ex summary)))
            (setq summary (cons (list mark n l w isw q (list (cons g_name q))) summary)))))))
  (if (not summary) (progn (vla-EndUndoMark doc) (exit)))
  (setq pt (getpoint "\nPonto de insercao: ")) (if (not pt) (progn (vla-EndUndoMark doc) (exit)))
  (setq space (if (= (getvar "CVPORT") 1) (vla-get-PaperSpace doc) (vla-get-ModelSpace doc)))
  (setq table (vla-AddTable space (vlax-3d-point pt) (+ (length summary) 2) 5 8.0 40.0))
  (vla-setText table 0 0 "TABELA DE DESPIECE (TRAZABILIDADE)")
  (setq i 0) (foreach h '("POS" "PERFIL" "COMP" "QTD" "ASSEMBLIES (USO)") (vla-setText table 1 i h) (setq i (1+ i)))
  (setq row 2) (foreach s (vl-sort summary '(lambda (a b) (< (car a) (car b))))
    (vla-setText table row 0 (nth 0 s))
    (vla-setText table row 1 (nth 1 s))
    (vla-setText table row 2 (strcat (rtos (nth 2 s) 2 0) (if (nth 4 s) "*" "")))
    (vla-setText table row 3 (itoa (nth 5 s)))
    (setq usage "") (foreach u (last s) (setq usage (strcat usage (car u) "(" (itoa (cdr u)) "), ")))
    (vla-setText table row 4 (substr usage 1 (- (strlen usage) 2)))
    (setq row (1+ row)))
  (vlax-ldata-put table "TMD_TAB_DATA" summary)
  (vlax-ldata-put table "TMD_TAB_TYPE" "DESPIECE")
  (vla-EndUndoMark doc) (princ "\n[OK] Tabela de Despiece Gerada."))

(defun c:TMD_TABLAS_COMPRA ( / doc ss i ent cat source_data raw_data profiles n l w q ex pt table row space headers lm kg_neto kg_compra total_bars bar_results waste_total tab_data tab_type source_handles)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))) (vla-StartUndoMark doc)
  (princ "\n[TMD] Selecao para Compra (Vigas ou Tabelas): ")
  (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (0 . "ACAD_TABLE") (-4 . "OR>"))))
  (if (not ss) (progn (vla-EndUndoMark doc) (exit)))
  
  (setq source_handles nil i 0)
  (repeat (sslength ss) (setq source_handles (cons (vla-get-Handle (vlax-ename->vla-object (ssname ss i))) source_handles)) (setq i (1+ i)))

  (setq cat (TMD:tablas-load-catalog) raw_data nil)
  
  ;; Processar Seleção (Mistura de objetos e tabelas)
  (repeat (setq i (sslength ss))
    (setq ent (ssname ss (setq i (1- i))))
    (cond 
      ((= (cdr (assoc 0 (entget ent))) "ACAD_TABLE")
       (setq tab_type (vlax-ldata-get ent "TMD_TAB_TYPE"))
       (if (setq tab_data (vlax-ldata-get ent "TMD_TAB_DATA"))
         (cond
           ;; Caso seja MONTAGEM (Agrupado por Grupos)
           ((= tab_type "MONTAGEM")
            (foreach g tab_data 
              (foreach it (cdr g) 
                (setq raw_data (cons (list "TABLE" (nth 0 it) (nth 1 it) (nth 2 it) (nth 3 it) (nth 5 it)) raw_data)))))
           ;; Caso seja DESPIECE (Lista plana de Marcas)
           ((= tab_type "DESPIECE")
            (foreach it tab_data
              ;; item = (mark nome len weight isw qty usage)
              ;; normalizar para raw_data = (dummy nome len weight isw mark)
              ;; Nota: Repetimos el item tantas veces como diga su QTY (nth 5 it)
              (repeat (nth 5 it)
                (setq raw_data (cons (list "TABLE" (nth 1 it) (nth 2 it) (nth 3 it) (nth 4 it) (nth 0 it)) raw_data)))))
         )))
      (t 
       (setq source_data (TMD:tablas-analyze-selection (ssadd ent (ssadd))))
       (setq raw_data (append (TMD:tablas-collect-data source_data cat) raw_data))))
  )
  
  (if (not raw_data) (progn (princ "\n[!] Nenhum dado BIM encontrado.") (vla-EndUndoMark doc) (exit)))

  ;; Agrupar lista de comprimentos por Perfil
  (setq profiles nil)
  (foreach d raw_data
    (setq n (nth 1 d) l (nth 2 d) w (nth 3 d))
    (setq ex (assoc n profiles))
    (if ex
      (setq profiles (subst (list n w (cons l (caddr ex))) ex profiles))
      (setq profiles (cons (list n w (list l)) profiles)))
  )
  
  (setq pt (getpoint "\nPonto de insercao da Tabela de Compra: "))
  (if (not pt) (progn (vla-EndUndoMark doc) (exit)))
  
  (setq space (if (= (getvar "CVPORT") 1) (vla-get-PaperSpace doc) (vla-get-ModelSpace doc)))
  (setq table (vla-AddTable space (vlax-3d-point pt) (+ (length profiles) 2) 6 8.0 45.0))
  
  (vla-setText table 0 0 "TABELA DE COMPRA OTIMIZADA (NESTING 6m)")
  (setq headers '("PERFIL" "BARRAS (6m)" "PESO COMPRA (KG)" "PESO PROJ (KG)" "DESPERDICIO (KG)" "EFICIENCIA"))
  (setq i 0) (foreach h headers (vla-setText table 1 i h) (setq i (1+ i)))
  
  (setq row 2)
  (foreach p profiles
    (setq n (car p) w (cadr p) lengths (caddr p))
    (setq bar_results (TMD:tablas-run-nesting lengths 6000.0))
    (setq total_bars (length bar_results))
    (setq kg_neto 0.0) (foreach l lengths (setq kg_neto (+ kg_neto (* (/ l 1000.0) w))))
    (setq kg_compra (* total_bars 6.0 w))
    (setq waste_total (- kg_compra kg_neto))
    
    (vla-setText table row 0 n)
    (vla-setText table row 1 (itoa total_bars))
    (vla-setText table row 2 (rtos kg_compra 2 2))
    (vla-setText table row 3 (rtos kg_neto 2 2))
    (vla-setText table row 4 (rtos waste_total 2 2))
    (if (> kg_compra 0.0)
      (vla-setText table row 5 (strcat (rtos (* (/ kg_neto kg_compra) 100.0) 2 1) "%"))
      (vla-setText table row 5 "0%")
    )
    (setq row (1+ row))
  )
  (vlax-ldata-put table "TMD_TAB_SOURCE" source_handles)
  (vlax-ldata-put table "TMD_TAB_TYPE" "COMPRA")
  (vla-EndUndoMark doc) (princ "\n[OK] Tabela de Compra Concluida."))

(defun c:TMD_TABLAS_HELP ()
  (princ "\n=======================================================")
  (princ "\n      TM DIGITAL - MOTOR DE TABELAS BIM v4.0")
  (princ "\n=======================================================")
  (princ "\n [0] TMD_TABLAS_NUMERAR : ATRIBUI POSICOES (m1, m2...)")
  (princ "\n     - Ordena por comprimento (Maior = m1).")
  (princ "\n     - Escreve dados nos objetos (Persistente).")
  (princ "\n [1] TMD_TABLAS_MONTAGEM : Gera tabela de montagem.")
  (princ "\n [2] TMD_TABLAS_ATUALIZAR: Sincroniza dados da tabela.")
  (princ "\n [3] TMD_TABLAS_DESPIECE : Gera lista de CORTES (Batch).")
  (princ "\n [4] TMD_TABLAS_COMPRA   : Resumo de COMPRA OTIMIZADA (Nesting).")
  (princ "\n=======================================================")
  (princ "\n * Nota: Modificar vigas ou joints limpa a marca POS.")
  (princ "\n=======================================================")
  (princ))

(princ "\n[TMD] Motor v4.0 pronto. Digite TMD_TABLAS_HELP para ajuda.") (princ)
