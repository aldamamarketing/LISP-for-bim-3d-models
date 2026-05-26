;;; =====================================================================================
;;; TM DIGITAL - MOTOR DE LISTA DE MATERIAIS / BOM (TMD_BOM.lsp)
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; UTILIDADES MATEMÁTICAS Y GEOMÉTRICAS
;;; -------------------------------------------------------------------------------------

(defun TMD:VectorDot (v1 v2)
  (+ (* (car v1) (car v2)) (* (cadr v1) (cadr v2)) (* (caddr v1) (caddr v2)))
)

(defun TMD:GetWireLength (ent / obj metrics len)
  (setq obj (vlax-ename->vla-object ent))
  (if (= (cdr (assoc 0 (entget ent))) "3DSOLID")
    (setq len (car (TMD:GetSolidMetrics obj)))
    (setq len (vlax-get-property obj 'Length)) ; Fallback seguro
  )
  (if (not len) (setq len 0.0))
  (fix (+ 0.5 len))
)

(defun TMD:GetWireName (ent)
  (let ((nome (vlax-ldata-get ent "TMD_NOME")))
    (if nome nome "DESCONHECIDO")
  )
)

;;; -------------------------------------------------------------------------------------
;;; MOTOR FISICO - SOLID METRICS (INERCIA)
;;; -------------------------------------------------------------------------------------

(defun TMD:GetSolidMetrics (solidObj / moments dirs centroid m1 m2 m3 min_m u v w dx dy dz matrix copyObj minPt maxPt len ptA ptB)
  (setq moments (vlax-safearray->list (vlax-variant-value (vla-get-PrincipalMoments solidObj))))
  (setq dirs (vlax-safearray->list (vlax-variant-value (vla-get-PrincipalDirections solidObj))))
  (setq centroid (vlax-safearray->list (vlax-variant-value (vla-get-Centroid solidObj))))
  
  (setq m1 (nth 0 moments) m2 (nth 1 moments) m3 (nth 2 moments))
  
  ;; Identificar momento de inercia minimo (Eje Longitudinal)
  (setq min_m (min m1 m2 m3))
  (cond
    ((= min_m m1) 
     (setq u (list (nth 0 dirs) (nth 1 dirs) (nth 2 dirs)))
     (setq v (list (nth 3 dirs) (nth 4 dirs) (nth 5 dirs)))
     (setq w (list (nth 6 dirs) (nth 7 dirs) (nth 8 dirs))))
    ((= min_m m2) 
     (setq u (list (nth 3 dirs) (nth 4 dirs) (nth 5 dirs)))
     (setq v (list (nth 0 dirs) (nth 1 dirs) (nth 2 dirs)))
     (setq w (list (nth 6 dirs) (nth 7 dirs) (nth 8 dirs))))
    (t 
     (setq u (list (nth 6 dirs) (nth 7 dirs) (nth 8 dirs)))
     (setq v (list (nth 0 dirs) (nth 1 dirs) (nth 2 dirs)))
     (setq w (list (nth 3 dirs) (nth 4 dirs) (nth 5 dirs))))
  )
  
  ;; Crear una copia del solido para alinearlo al WCS y obtener su OBB (Oriented Bounding Box) exacto
  (setq copyObj (vla-Copy solidObj))
  
  ;; Construir Matriz de Transformacion Inversa (Para rotar u->X, v->Y, w->Z y mover centroide a origen)
  (setq dx (- 0 (+ (* (car u) (car centroid)) (* (cadr u) (cadr centroid)) (* (caddr u) (caddr centroid)))))
  (setq dy (- 0 (+ (* (car v) (car centroid)) (* (cadr v) (cadr centroid)) (* (caddr v) (caddr centroid)))))
  (setq dz (- 0 (+ (* (car w) (car centroid)) (* (cadr w) (cadr centroid)) (* (caddr w) (caddr centroid)))))
  
  (setq matrix (vlax-tmatrix
                 (list
                   (list (car u) (cadr u) (caddr u) dx)
                   (list (car v) (cadr v) (caddr v) dy)
                   (list (car w) (cadr w) (caddr w) dz)
                   (list 0.0 0.0 0.0 1.0)
                 )
               ))
               
  (vla-TransformBy copyObj matrix)
  
  ;; Bounding box de la copia rotada (ahora alineada perfectamente a sus ejes de inercia)
  (vla-GetBoundingBox copyObj 'minPt 'maxPt)
  (setq minPt (vlax-safearray->list minPt))
  (setq maxPt (vlax-safearray->list maxPt))
  
  ;; La longitud exacta es el delta en el eje X (ya que u se alineo con X)
  (setq len (- (car maxPt) (car minPt)))
  (setq width (- (cadr maxPt) (cadr minPt)))
  (setq height (- (caddr maxPt) (caddr minPt)))
  
  ;; Limpiar copia
  (vla-Delete copyObj)
  
  ;; Calcular ptA y ptB desde el Centroide original usando el vector longitudinal (u)
  (setq ptA (list (- (car centroid) (* (car u) (/ len 2.0)))
                  (- (cadr centroid) (* (cadr u) (/ len 2.0)))
                  (- (caddr centroid) (* (caddr u) (/ len 2.0)))))
  (setq ptB (list (+ (car centroid) (* (car u) (/ len 2.0)))
                  (+ (cadr centroid) (* (cadr u) (/ len 2.0)))
                  (+ (caddr centroid) (* (caddr u) (/ len 2.0)))))
                  
  ;; Si la longitud es menor que el ancho o alto de la seccion, marcar excepcion
  (setq is_exception (if (or (< len width) (< len height)) T nil))
  (if is_exception
    (vlax-ldata-put solidObj "TMD_EXCEPTION" "SHORT_SOLID")
    (vlax-ldata-put solidObj "TMD_EXCEPTION" nil)
  )

  ;; Retorna: (Length Vector Centroid ptA ptB Width Height IsException)
  (list len u centroid ptA ptB width height is_exception)
)

(defun C:TMD_TEST_SOLID_METRICS ( / ent obj metrics len u centroid ptA ptB width height is_exception)
  (setq ent (car (entsel "\n[TMD] Selecione um 3DSOLID para teste de inercia: ")))
  (if (and ent (= (cdr (assoc 0 (entget ent))) "3DSOLID"))
    (progn
      (setq obj (vlax-ename->vla-object ent))
      (setq metrics (TMD:GetSolidMetrics obj))
      (setq len (nth 0 metrics)
            u (nth 1 metrics)
            centroid (nth 2 metrics)
            ptA (nth 3 metrics)
            ptB (nth 4 metrics)
            width (nth 5 metrics)
            height (nth 6 metrics)
            is_exception (nth 7 metrics))
            
      (princ "\n--- RESULTADO DA FISICA (INERCIA) ---")
      (princ (strcat "\nComprimento Exato: " (rtos len 2 2) " mm"))
      (princ (strcat "\nSecao Transversal (LxA): " (rtos width 2 2) " x " (rtos height 2 2) " mm"))
      (princ (strcat "\nVector Direcional: (" (rtos (car u) 2 2) ", " (rtos (cadr u) 2 2) ", " (rtos (caddr u) 2 2) ")"))
      
      (if is_exception
        (princ "\n[!] EXCECAO: O comprimento e menor que as dimensoes da secao. (Possivel placa ou toco)")
      )
      
      ;; Dibujar linea del eje longitudinal
      (vl-cmdf "_.LINE" "_non" ptA "_non" ptB "")
      (vl-cmdf "_.CHPROP" (entlast) "" "C" "1" "")
      
      ;; Dibujar punto en el centroide
      (setvar "PDMODE" 34) (setvar "PDSIZE" 50)
      (vl-cmdf "_.POINT" "_non" centroid)
      (vl-cmdf "_.CHPROP" (entlast) "" "C" "3" "")
      
      (princ "\n[OK] Eixo longitudinal desenhado em vermelho, Centroide em verde.")
    )
    (princ "\n[!] Entidade selecionada nao e um 3DSOLID.")
  )
  (princ)
)

;;; -------------------------------------------------------------------------------------
;;; ALGORITMO DE OPTIMIZACIÓN (1D BIN PACKING)
;;; -------------------------------------------------------------------------------------

(defun TMD:FormatBin (bin / cuts space_left str)
  (setq space_left (car bin))
  (setq cuts (cadr bin))
  (setq str "")
  (foreach c cuts
    (if (= str "")
      (setq str (strcat (itoa (fix (car c))) " (" (cdr c) ")"))
      (setq str (strcat str " + " (itoa (fix (car c))) " (" (cdr c) ")"))
    )
  )
  (strcat str "   ->   Sobra: " (itoa (fix space_left)) "mm")
)

(defun TMD:BinPacking (pieces / SAW_KERF BAR_LEN bins len pos placed new_bins space_left needed)
  (setq SAW_KERF 3.0) ;; Perdida por corte de sierra (mm)
  (setq BAR_LEN 6000.0) ;; Barra comercial (mm)
  (setq bins nil)
  
  (foreach piece pieces
    (setq len (car piece))
    (setq pos (cdr piece))
    (setq placed nil)
    
    (setq new_bins nil)
    (foreach bin bins
      (if (not placed)
        (progn
          (setq space_left (car bin))
          (setq needed (if (null (cadr bin)) len (+ len SAW_KERF)))
          (if (>= space_left needed)
            (progn
              (setq placed t)
              (setq new_bins (append new_bins (list (list (- space_left needed) (append (cadr bin) (list piece))))))
            )
            (setq new_bins (append new_bins (list bin)))
          )
        )
        (setq new_bins (append new_bins (list bin)))
      )
    )
    (if (not placed)
      (setq new_bins (append new_bins (list (list (- BAR_LEN len) (list piece)))))
    )
    (setq bins new_bins)
  )
  bins
)

;;; -------------------------------------------------------------------------------------
;;; 1. TMD_TABLAS_NUMERAR
;;; -------------------------------------------------------------------------------------
(defun C:TMD_TABLAS_NUMERAR ( / ss i ent etype wires nome comp pos key dict counter)
  (princ "\n[TMD] Selecione 3DSOLIDS para numerar [Grupo]: ")
  (setq ss (ssget '((0 . "3DSOLID"))))
  (if (not ss)
    (progn (princ "\n[AVISO] Nenhum solido selecionado.") (exit))
  )
  
  ;; Coletar unicos
  (setq i 0 dict nil wires nil)
  (while (< i (sslength ss))
    (setq ent (ssname ss i))
    (if (not (member ent wires))
      (setq wires (append wires (list ent)))
    )
    (setq i (1+ i))
  )
  
  (setq counter 1)
  (foreach ent wires
    (setq nome (TMD:GetWireName ent))
    (setq comp (TMD:GetWireLength ent))
    (setq key (strcat nome "_" (itoa comp)))
    
    (setq pos (cdr (assoc key dict)))
    (if (not pos)
      (progn
        (setq pos (strcat "m" (itoa counter)))
        (setq counter (1+ counter))
        (setq dict (append dict (list (cons key pos))))
      )
    )
    
    (vlax-ldata-put ent "TMD_POS" pos)
  )
  (princ (strcat "\n[OK] Numeracao concluida. " (itoa (1- counter)) " marcas geradas.\n"))
  (princ)
)

;;; -------------------------------------------------------------------------------------
;;; 2. TMD_TABLAS_MONTAGEM
;;; -------------------------------------------------------------------------------------
(defun C:TMD_TABLAS_MONTAGEM ( / ss i ent etype wires nome comp pos key dict itemData itemList pt ms table row pesoUnit headers)
  (princ "\n[TMD] Selecione 3DSOLIDS para a Tabela de Montagem: ")
  (setq ss (ssget '((0 . "3DSOLID"))))
  (if (not ss)
    (progn (princ "\n[AVISO] Nenhum solido selecionado.") (exit))
  )
  
  (setq i 0 dict nil wires nil)
  (while (< i (sslength ss))
    (setq ent (ssname ss i))
    (if (not (member ent wires))
      (setq wires (append wires (list ent)))
    )
    (setq i (1+ i))
  )
  
  (foreach ent wires
    (setq pos (vlax-ldata-get ent "TMD_POS"))
    (if (not pos) (setq pos "-"))
    (setq nome (TMD:GetWireName ent))
    (setq comp (TMD:GetWireLength ent))
    
    (setq key pos)
    (setq itemData (cdr (assoc key dict)))
    (if itemData
      (setq dict (subst (cons key (list (1+ (car itemData)) pos nome comp)) (assoc key dict) dict))
      (setq dict (append dict (list (cons key (list 1 pos nome comp)))))
    )
  )
  
  (setq itemList (mapcar 'cdr dict))
  (setq itemList (vl-sort itemList '(lambda (a b) (< (cadr a) (cadr b)))))
  
  (setq pt (getpoint "\nPonto de insercao: "))
  (if pt
    (progn
      (setq ms (vla-get-ModelSpace (vla-get-ActiveDocument (vlax-get-acad-object))))
      (setq table (vla-AddTable ms (vlax-3d-point pt) (+ (length itemList) 4) 6 15 60))
      
      (vla-put-HorzCellMargin table 2.0)
      (vla-put-VertCellMargin table 2.0)
      
      ;; Titulo
      (vla-SetText table 0 0 "TABELA DE MONTAGEM (ASSEMBLIES)")
      (vla-SetCellAlignment table 0 0 acMiddleCenter)
      
      ;; Cabeceras
      (setq headers '("QTD" "POS" "PERFIL" "COMP(mm)" "PESO UNIT\n(KG)" "PESO TOTAL\n(KG)"))
      (setq i 0)
      (while (< i 6)
        (vla-SetText table 1 i (nth i headers))
        (vla-SetCellAlignment table 1 i acMiddleCenter)
        (setq i (1+ i))
      )
      
      ;; Sub-Cabecera
      (vla-MergeCells table 2 2 0 5)
      (vla-SetText table 2 0 "ASSEMBLY: AVULSO")
      (vla-SetCellAlignment table 2 0 acMiddleCenter)
      
      ;; Filas de datos
      (setq row 3)
      (foreach item itemList
        (setq pesoUnit 0.0)
        (vla-SetText table row 0 (itoa (car item)))
        (vla-SetText table row 1 (cadr item))
        (vla-SetText table row 2 (caddr item))
        (vla-SetText table row 3 (itoa (cadddr item)))
        (vla-SetText table row 4 (rtos pesoUnit 2 2))
        (vla-SetText table row 5 (rtos (* (car item) pesoUnit) 2 2))
        
        (setq i 0)
        (while (< i 6)
          (vla-SetCellAlignment table row i acMiddleCenter)
          (setq i (1+ i))
        )
        (setq row (1+ row))
      )
      
      ;; Footer
      (vla-MergeCells table row row 0 5)
      (vla-SetText table row 0 "* Medida fisica do Solido (Corte Real). LData guardado.")
      (vla-SetCellAlignment table row 0 acMiddleLeft)
      
      ;; GUARDAR LDATA EN LA TABLA PARA EL DESPIECE
      (vlax-ldata-put table "TMD_BOM_DATA" dict)
      
      (princ "\n[OK] Tabela gerada e LData anexado.\n")
    )
  )
  (princ)
)

;;; -------------------------------------------------------------------------------------
;;; 3. TMD_TABLAS_DESPIECE (OPTIMIZACIÓN DE CORTE Y TRAZABILIDAD)
;;; -------------------------------------------------------------------------------------
(defun C:TMD_TABLAS_DESPIECE ( / ss i ent obj dict ldata key perfilData row pos comp qtd p_list allProfiles profile pieces bins grouped_bins str entry totalBarras pt ms table headers)
  (princ "\nSelecao Industrial de Despiece (Tabelas de Montagem): ")
  (setq ss (ssget '((0 . "ACAD_TABLE"))))
  (if (not ss)
    (progn (princ "\n[AVISO] Nenhuma tabela selecionada.") (exit))
  )
  
  ;; Agrupar datos por PERFIL
  ;; dict format: ( ("Metalon..." . ( (comp . pos) (comp . pos) ... ) ) ... )
  (setq i 0 dict nil)
  
  (while (< i (sslength ss))
    (setq ent (ssname ss i))
    (setq obj (vlax-ename->vla-object ent))
    
    ;; Leer LDATA de la tabla en vez de parsear texto
    (setq ldata (vlax-ldata-get obj "TMD_BOM_DATA"))
    (if ldata
      (foreach row ldata
        ;; row is (key (qtd pos perfil comp))
        (setq qtd (car (cadr row)))
        (setq pos (cadr (cadr row)))
        (setq perfil (caddr (cadr row)))
        (setq comp (cadddr (cadr row)))
        
        (setq p_list nil)
        ;; Expandir cantidad
        (repeat qtd (setq p_list (append p_list (list (cons comp pos)))))
        
        (setq perfilData (assoc perfil dict))
        (if perfilData
          (setq dict (subst (cons perfil (append (cdr perfilData) p_list)) perfilData dict))
          (setq dict (append dict (list (cons perfil p_list))))
        )
      )
    )
    (setq i (1+ i))
  )
  
  (if (not dict)
    (progn (princ "\n[ERRO] Nenhuma tabela contem LData valido de Montagem.") (exit))
  )
  
  ;; Procesar Bin Packing por perfil
  (setq allProfiles nil) ;; lista de (perfil totalBarras ( (qtd . stringBin) ... ))
  (foreach profile dict
    (setq perfil (car profile))
    (setq pieces (cdr profile))
    ;; Sort pieces descending by length
    (setq pieces (vl-sort pieces '(lambda (a b) (> (car a) (car b)))))
    
    (setq bins (TMD:BinPacking pieces))
    (setq totalBarras (length bins))
    
    (setq grouped_bins nil)
    (foreach bin bins
      (setq str (TMD:FormatBin bin))
      (setq entry (assoc str grouped_bins))
      (if entry
        (setq grouped_bins (subst (cons str (1+ (cdr entry))) entry grouped_bins))
        (setq grouped_bins (append grouped_bins (list (cons str 1))))
      )
    )
    (setq allProfiles (append allProfiles (list (list perfil totalBarras grouped_bins))))
  )
  
  ;; Calcular total de lineas para la tabla
  (setq numRows 2) ;; Title + Headers
  (foreach profile allProfiles
    (setq numRows (+ numRows 1 (length (caddr profile)))) ;; 1 for subheader + lines for bins
  )
  
  (setq pt (getpoint "\nPonto de insercao: "))
  (if pt
    (progn
      (setq ms (vla-get-ModelSpace (vla-get-ActiveDocument (vlax-get-acad-object))))
      (setq table (vla-AddTable ms (vlax-3d-point pt) numRows 2 15 150))
      
      (vla-put-HorzCellMargin table 2.0)
      (vla-put-VertCellMargin table 2.0)
      (vla-SetColumnWidth table 0 40.0)
      (vla-SetColumnWidth table 1 250.0)
      
      ;; Title
      (vla-MergeCells table 0 0 0 1)
      (vla-SetText table 0 0 "TABELA DE DESPIECE E GUIA DE CORTE (6m)")
      (vla-SetCellAlignment table 0 0 acMiddleCenter)
      
      ;; Headers
      (setq headers '("BARRAS (QTD)" "GUIA DE CORTES POR BARRA DE 6 METROS (KERF: 3mm)"))
      (vla-SetText table 1 0 (nth 0 headers))
      (vla-SetCellAlignment table 1 0 acMiddleCenter)
      (vla-SetText table 1 1 (nth 1 headers))
      (vla-SetCellAlignment table 1 1 acMiddleCenter)
      
      ;; Data
      (setq row 2)
      (foreach profile allProfiles
        (setq perfil (car profile))
        (setq totalBarras (cadr profile))
        
        ;; Subheader Perfil
        (vla-MergeCells table row row 0 1)
        (vla-SetText table row 0 (strcat "PERFIL: " perfil " | Total Barras Comerciais: " (itoa totalBarras)))
        (vla-SetCellAlignment table row 0 acMiddleLeft)
        ;; Cambiar color de fondo del subheader para resaltar
        (setq row (1+ row))
        
        ;; Bins
        (foreach binGroup (caddr profile)
          (setq qtdBarras (cdr binGroup))
          (setq binDesc (car binGroup))
          
          (vla-SetText table row 0 (strcat (itoa qtdBarras) "x Barras"))
          (vla-SetCellAlignment table row 0 acMiddleCenter)
          (vla-SetText table row 1 binDesc)
          (vla-SetCellAlignment table row 1 acMiddleLeft)
          
          (setq row (1+ row))
        )
      )
      
      (princ "\n[OK] Tabela de Despiece Otimizada Gerada.\n")
    )
  )
  (princ)
)

(princ "\n[TMD] TMD_BOM.lsp Carregado - Otimizador de Corte Ativo\n")
(princ)
