;;; =====================================================================================
;;; TM DIGITAL - INSPECÇÃO FORENSE BIM UNIFICADA (TMD_Forensic.lsp) - v3.0
;;; v3.0 - Inspector Total: Geometria + LData + Diagnóstico de Vínculos
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; 1. UTILIDADES DE APOYO (ADN Y VECTORES)
;;; -------------------------------------------------------------------------------------

(defun TMD:forensic-vector-unit (v / d) (setq d (sqrt (apply '+ (mapcar '* v v)))) (if (> d 1e-8) (mapcar '(lambda (x) (/ x d)) v) '(0.0 0.0 0.0)))
(defun TMD:forensic-vector-cross (a b) (list (- (* (cadr a) (caddr b)) (* (caddr a) (cadr b))) (- (* (caddr a) (car b)) (* (car a) (caddr b))) (- (* (car a) (cadr b)) (* (cadr a) (car b)))))

(defun TMD:forensic-get-centroid (ent / obj minp maxp pmin pmax etype p1 p2)
  (setq obj (vlax-ename->vla-object ent))
  (setq etype (cdr (assoc 0 (entget ent))))
  (cond
    ((= etype "LINE") (setq p1 (cdr (assoc 10 (entget ent))) p2 (cdr (assoc 11 (entget ent)))) (list (/ (+ (car p1) (car p2)) 2.0) (/ (+ (cadr p1) (cadr p2)) 2.0) (/ (+ (caddr p1) (caddr p2)) 2.0)))
    ((= etype "3DSOLID") (vla-getboundingbox obj 'minp 'maxp) (setq pmin (vlax-safearray->list minp) pmax (vlax-safearray->list maxp)) (list (/ (+ (car pmin) (car pmax)) 2.0) (/ (+ (cadr pmin) (cadr pmax)) 2.0) (/ (+ (caddr pmin) (caddr pmax)) 2.0)))
    (t nil)
  )
)

;;; -------------------------------------------------------------------------------------
;;; 2. COMANDO PRINCIPAL: TMD_FORENSIC (UNIFICADO)
;;; -------------------------------------------------------------------------------------

(defun c:TMD_FORENSIC ( / ent1 ent2 label1 label2 h1 h2 dna1 partner_h partner_ent p1 p2 len1 len2 v1 v2 dot dist dims_x dims_y just report_status params)
  (princ "\n[FORENSIC v3.0] Selecione o elemento para inspeção (WIRE ou SÓLIDO): ")
  (setq ent1 (car (entsel)))
  (if (not ent1) (progn (princ "\n[!] Nenhuma seleção.") (exit)))

  (setq h1 (vla-get-handle (vlax-ename->vla-object ent1))
        etype1 (cdr (assoc 0 (entget ent1)))
        dna1 (vlax-ldata-get ent1 "TMD_SELF_HANDLE")
        params (vlax-ldata-get ent1 "TMD_PARAMS"))

  (princ "\n\n==================================================")
  (princ "\n         INSPETOR UNIFICADO BIM v3.0              ")
  (princ "\n==================================================")
  
  ;; --- IDENTIDADE DO ELEMENTO SELECIONADO ---
  (princ (strcat "\nELEMENTO SELECIONADO: " etype1 " (Handle: " h1 ")"))
  (if dna1 (princ (strcat "\nDNA (BIM ID): " dna1)) (princ "\n[!] ADN não encontrado (Elemento sem LData)"))
  (if params 
      (princ (strcat "\nPERFIL: " (vl-princ-to-string (vlax-ldata-get ent1 "TMD_NOME")) 
                     "\nDIMENSÕES: " (rtos (cdr (assoc "DIM_X" params)) 2 2) " x " (rtos (cdr (assoc "DIM_Y" params)) 2 2)))
  )
  
  ;; --- BUSCA DE PAREJA (VÍNCULO) ---
  (setq partner_h (if (= etype1 "LINE") (vlax-ldata-get ent1 "TMD_CHILD_SOLID") (vlax-ldata-get ent1 "TMD_PARENT_WIRE")))
  
  (princ "\n\n--- RASTREAMENTO DE VÍNCULO ---")
  (if (not partner_h)
    (princ "\n[ORFO] Não existe vínculo registrado no LData.")
    (progn
      (princ (strcat "\nVÍNCULO REGISTRADO: " partner_h))
      (setq partner_ent (handent partner_h))
      (if (not partner_ent)
        (princ "\n[ERRO] Vínculo QUEBRADO! O handle original não existe no desenho.")
        (progn
          (setq etype2 (cdr (assoc 0 (entget partner_ent))))
          (princ (strcat "\n[OK] Pareja encontrada: " etype2 " (Handle: " partner_h ")"))
          
          ;; --- ANÁLISE GEOMÉTRICA ENTRE PARCEIROS ---
          (princ "\n\n--- ANÁLISE DE REALIDADE FÍSICA ---")
          (setq mid1 (TMD:forensic-get-centroid ent1)
                mid2 (TMD:forensic-get-centroid partner_ent))
          
          ;; Vetores
          (if (= etype1 "LINE") (setq w_ent ent1 s_ent partner_ent) (setq w_ent partner_ent s_ent ent1))
          
          (setq p1 (cdr (assoc 10 (entget w_ent)))
                p2 (cdr (assoc 11 (entget w_ent)))
                v1 (TMD:forensic-vector-unit (mapcar '- p2 p1))
                len1 (distance p1 p2))
          
          (setq s_obj (vlax-ename->vla-object s_ent))
          (vla-getboundingbox s_obj 'minp 'maxp)
          (setq s_pmin (vlax-safearray->list minp) s_pmax (vlax-safearray->list maxp)
                s_diff (mapcar '- s_pmax s_pmin)
                len2 (apply 'max s_diff)
                v2 (TMD:forensic-vector-unit (mapcar '(lambda (d) (if (= d len2) d 0.0)) s_diff)))

          ;; Comparación
          (setq dot (abs (apply '+ (mapcar '* v1 v2))))
          (setq dist (distance mid1 mid2))
          
          (princ (strcat "\nPARALELISMO: " (rtos (* (acos (min 1.0 dot)) (/ 180.0 pi)) 2 4) "°"))
          (princ (strcat "\nCOMPRIMENTO (Diferença): " (rtos (abs (- len1 len2)) 2 4) " mm"))
          (princ (strcat "\nDESVIO TRANSVERSAL (Centros): " (rtos dist 2 2) " mm"))
          
          ;; --- VERDICTO ---
          (princ "\n\nVERDICTO: ")
          (if (and (> dot 0.99) (< (abs (- len1 len2)) 1.0))
            (if (< dist 50.0)
              (princ "[OK] VÍNCULO ÍNTEGRO E GEOMETRIZADO.")
              (princ "[AVISO] Vinculados, mas com offset grande (verificar justificação).")
            )
            (princ "[CRÍTICO] Inconsistência física detectada entre o LData e o 3D.")
          )
        )
      )
    )
  )
  (princ "\n==================================================\n")
  (princ)
)

(princ "\n[TMD] Forensic v3.0 Unificado: Diagnóstico Total de BIM.")
(princ)
