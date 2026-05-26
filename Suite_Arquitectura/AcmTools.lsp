;;; ==========================================================================
;;; ALDAMA ACM TOOLS - 
;;; Desenvolvido para AutoCAD 2021
;;; Comandos: ABA_CRIAR | ABA_MODIFICAR | ABA_CANTO
;;; ==========================================================================

(vl-load-com)

;; Variável global para o sistema "lembrar" a última aba configurada
(if (not *ultima-aba*) (setq *ultima-aba* 50.0))

;;; ==========================================================================
;;; 1. COMANDO: ABA_CRIAR
;;; Função: Gera aba planificada e linha de vinco magenta.
;;; ==========================================================================
(defun c:ABA_CRIAR ( / old-osmode ent ent-name pt-click poly-obj param p1 p2 dx1 dy1 dx2 dy2 cross-z base-ang n-ang p3 p4 sa3 sa4 user-aba pt-lado)
  (setq user-aba (getreal (strcat "\n[Criar Aba] Digite a altura <" (rtos *ultima-aba* 2 2) ">: ")))
  (if user-aba (setq *ultima-aba* user-aba))

  (setq ent (entsel "\nSelecione a aresta da polilinha: "))
  (if (not ent) (progn (princ "\nCancelado.") (exit)))
  
  (setq ent-name (car ent) pt-click (cadr ent) poly-obj (vlax-ename->vla-object ent-name))
  (if (/= (vla-get-ObjectName poly-obj) "AcDbPolyline") (progn (princ "\nErro: Selecione uma polilinha.") (exit)))

  (setq pt-lado (getpoint "\nClique no lado EXTERNO da aba: "))
  (if (not pt-lado) (exit))

  (setq old-osmode (getvar "OSMODE"))
  (setvar "OSMODE" 0)

  (setq param (fix (vlax-curve-getparamatpoint poly-obj (vlax-curve-getclosestpointto poly-obj pt-click))))
  (setq p1 (vlax-curve-getPointAtParam poly-obj param))
  (setq p2 (vlax-curve-getPointAtParam poly-obj (+ param 1)))

  (setq dx1 (- (car p2) (car p1)) dy1 (- (cadr p2) (cadr p1)))
  (setq dx2 (- (car pt-lado) (car p1)) dy2 (- (cadr pt-lado) (cadr p1)))
  (setq cross-z (- (* dx1 dy2) (* dy1 dx2)) base-ang (angle p1 p2))

  (if (> cross-z 0) (setq n-ang (+ base-ang (/ pi 2.0))) (setq n-ang (- base-ang (/ pi 2.0))))

  (setq p3 (polar p1 n-ang *ultima-aba*) p4 (polar p2 n-ang *ultima-aba*))

  (setq sa4 (vlax-make-safearray vlax-vbDouble '(0 . 1)))
  (vlax-safearray-put-element sa4 0 (car p4)) (vlax-safearray-put-element sa4 1 (cadr p4))
  (vla-AddVertex poly-obj (1+ param) sa4)

  (setq sa3 (vlax-make-safearray vlax-vbDouble '(0 . 1)))
  (vlax-safearray-put-element sa3 0 (car p3)) (vlax-safearray-put-element sa3 1 (cadr p3))
  (vla-AddVertex poly-obj (1+ param) sa3)

  (if (not (tblsearch "LAYER" "ACM_VINCO")) (command "._-LAYER" "_M" "ACM_VINCO" "_C" "6" "" ""))
  (setvar "CLAYER" "ACM_VINCO")
  (command "._LINE" p1 p2 "")
  
  (setvar "CLAYER" "0") (setvar "OSMODE" old-osmode)
  (princ "\nAba Criada!") (princ)
)

;;; ==========================================================================
;;; 2. COMANDO: ABA_MODIFICAR
;;; Função: Altera o tamanho de uma aba existente baseada na linha de vinco.
;;; ==========================================================================
(defun c:ABA_MODIFICAR ( / user-aba ent-poly pt-click-poly poly-obj param pe1 pe2 ent-vinco vinco-obj pv1 pv2 base1 base2 dir-ang1 dir-ang2 new-pe1 new-pe2 sa1 sa2)
  (setq user-aba (getreal (strcat "\n[Modificar Aba] Digite o NOVO tamanho total <" (rtos *ultima-aba* 2 2) ">: ")))
  (if user-aba (setq *ultima-aba* user-aba))

  ;; Pega a aresta externa (Polilinha)
  (setq ent-poly (entsel "\nSelecione a aresta EXTERNA da aba a ser modificada: "))
  (if (not ent-poly) (progn (princ "\nCancelado.") (exit)))
  (setq poly-obj (vlax-ename->vla-object (car ent-poly)))
  (setq param (fix (vlax-curve-getparamatpoint poly-obj (vlax-curve-getclosestpointto poly-obj (cadr ent-poly)))))
  (setq pe1 (vlax-curve-getPointAtParam poly-obj param))
  (setq pe2 (vlax-curve-getPointAtParam poly-obj (+ param 1)))

  ;; Pega a linha base (Vinco)
  (setq ent-vinco (entsel "\nSelecione a linha de VINCO (Base magenta) correspondente: "))
  (if (not ent-vinco) (progn (princ "\nCancelado.") (exit)))
  (setq vinco-obj (vlax-ename->vla-object (car ent-vinco)))
  (if (/= (vla-get-ObjectName vinco-obj) "AcDbLine") (progn (princ "\nErro: A base deve ser uma linha (vinco).") (exit)))
  (setq pv1 (vlax-curve-getStartPoint vinco-obj) pv2 (vlax-curve-getEndPoint vinco-obj))

  ;; Função auxiliar interna: projeta ponto na linha infinita para achar a base exata 90 graus
  (defun proj-pt (pt l1 l2 / ang p-ang p-temp)
    (setq ang (angle l1 l2) p-ang (+ ang (/ pi 2.0)) p-temp (polar pt p-ang 100.0))
    (inters l1 l2 pt p-temp nil)
  )

  ;; Calcula as bases e projeta a nova distância rigorosamente perpendicular
  (setq base1 (proj-pt pe1 pv1 pv2))
  (setq base2 (proj-pt pe2 pv1 pv2))
  
  (setq dir-ang1 (angle base1 pe1))
  (setq dir-ang2 (angle base2 pe2))

  (setq new-pe1 (polar base1 dir-ang1 *ultima-aba*))
  (setq new-pe2 (polar base2 dir-ang2 *ultima-aba*))

  ;; Atualiza a polilinha
  (setq sa1 (vlax-make-safearray vlax-vbDouble '(0 . 1)))
  (vlax-safearray-put-element sa1 0 (car new-pe1)) (vlax-safearray-put-element sa1 1 (cadr new-pe1))
  (vla-put-Coordinate poly-obj param sa1)

  (setq sa2 (vlax-make-safearray vlax-vbDouble '(0 . 1)))
  (vlax-safearray-put-element sa2 0 (car new-pe2)) (vlax-safearray-put-element sa2 1 (cadr new-pe2))
  (vla-put-Coordinate poly-obj (+ param 1) sa2)

  (vla-Update poly-obj)
  (princ "\nAba Modificada com precisão!") (princ)
)

;;; ==========================================================================
;;; 3. COMANDO: ABA_CANTO
;;; Função: Usa Fillet 0 para limpar e fechar cantos de abas que se cruzam.
;;; ==========================================================================
(defun c:ABA_CANTO (/ old-rad)
  (setq old-rad (getvar "FILLETRAD"))
  (setvar "FILLETRAD" 0.0)
  (princ "\n[Limpar Canto] Selecione as DUAS arestas da quina para fechar o canto (Alívio): ")
  (command "._FILLET" pause pause)
  (setvar "FILLETRAD" old-rad)
  (princ "\nCanto finalizado!") (princ)
)

(princ "\n=== SUÍTE ALDAMA ACM CARREGADA ===")
(princ "\nComandos disponíveis: ABA_CRIAR | ABA_MODIFICAR | ABA_CANTO")
(princ)