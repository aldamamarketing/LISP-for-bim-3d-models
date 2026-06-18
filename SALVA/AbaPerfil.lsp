;;; ==========================================================================
;;; MÓDULO: ALDAMA ACM TOOLS - PERFIS AVANÇADOS (PRODUÇÃO FINAL)
;;; Comando: ABA_PERFIL
;;; Função: Modifica LWPOLYLINE in-place com cálculo de intersecção exato.
;;; ==========================================================================

(vl-load-com)

(defun c:ABA_PERFIL ( / tipo-input tipo d1 d2 d3 d4 ent ent-name pt-click ent-dados tipo-ent pt1 pt2 vla-obj pt-closest param seg-idx pt-lado ang-linha ang-perp ang-horiz ang-2A p1-1 p1-2 p1-3 p1-4 p2-1 p2-2 p2-3 p2-4 pts-insert new-dados vtx-count num-new-vtx novas-linhas vla-painel dict i achou arr j v2-b1 v4-b1 v2-b2 v4-b2)
  
  ;; 1. ESCOLHA DO PERFIL
  (setq tipo nil)
  (while (not tipo)
    (setq tipo-input (getstring "\nQual perfil? Digite [ L ] Simples / [ U ] Cassete / [ P ] Especial: "))
    (setq tipo-input (strcase tipo-input))
    (if (vl-position tipo-input '("L" "U" "P"))
      (setq tipo tipo-input)
      (princ "\n--> ERRO: Digite apenas L, U ou P e aperte Enter.")
    )
  )

  ;; 2. COLETA DE MEDIDAS
  (cond
    ((= tipo "L")
     (setq d1 (getreal "\nProfundidade da aba (Lomo) <30>: ")) (if (not d1) (setq d1 30.0))
    )
    ((= tipo "U")
     (setq d1 (getreal "\nProfundidade (Lomo) <30>: "))     (if (not d1) (setq d1 30.0))
     (setq d2 (getreal "\nRetorno paralelo (Aba 2) <20>: ")) (if (not d2) (setq d2 20.0))
    )
    ((= tipo "P")
     (setq d1 (getreal "\nDobra 1 (Lomo 90g) <30>: "))      (if (not d1) (setq d1 30.0))
     (setq d2 (getreal "\nDobra 2 (Paralelo 180g) <20>: ")) (if (not d2) (setq d2 20.0))
     (setq d3 (getreal "\nDobra 3 (Volta 90g) <15>: "))     (if (not d3) (setq d3 15.0))
     (setq d4 (getreal "\nDobra 4 (Encaixe 180g) <15>: "))  (if (not d4) (setq d4 15.0))
    )
  )

  ;; 3. LOOP DE APLICAÇÃO (Suporta Polilinhas Fechadas)
  (while (setq ent (entsel "\nSelecione a aresta do painel (ou Enter para sair): "))
    (setq ent-name (car ent))
    (setq pt-click (cadr ent)) 
    (setq ent-dados (entget ent-name))
    (setq tipo-ent (cdr (assoc 0 ent-dados)))
    
    (if (= tipo-ent "LWPOLYLINE")
      (progn
        ;; -- IDENTIFICAÇÃO DO SEGMENTO (VLAX-CURVE) --
        (setq vla-obj (vlax-ename->vla-object ent-name))
        (setq pt-closest (vlax-curve-getClosestPointTo vla-obj pt-click))
        (setq param (vlax-curve-getParamAtPoint vla-obj pt-closest))
        (setq seg-idx (fix param)) 
        (setq pt1 (vlax-curve-getPointAtParam vla-obj seg-idx)) 
        (setq pt2 (vlax-curve-getPointAtParam vla-obj (+ seg-idx 1))) 

        (setq pt-lado (getpoint "\nClique no lado de FORA do painel (direção da aba): "))
        
        (if pt-lado
          (progn
            ;; -- GEOMETRIA BASE E ÂNGULOS --
            (setq ang-linha (angle pt1 pt2))
            (setq ang-perp (+ ang-linha (/ pi 2)))
            (if (> (distance pt-lado (polar pt1 ang-perp 10)) (distance pt-lado (polar pt1 (- ang-linha (/ pi 2)) 10)))
              (setq ang-perp (- ang-linha (/ pi 2)))
            )

            (if (and (> ang-perp (/ pi 2)) (< ang-perp (* 1.5 pi)))
              (setq ang-horiz pi) ; Esquerda (180 graus)
              (setq ang-horiz 0.0) ; Direita (0 graus)
            )
            
            ;; O ângulo de reflexão para o retorno 180 graus
            (setq ang-2A (- (* 2.0 ang-linha) ang-horiz))

            ;; Função Auxiliar para espessura perpendicular (Motor de Intersecção)
            (defun get-v-base (pt dist) (polar pt ang-perp dist))

            ;; -- CÁLCULO DOS PONTOS: LADO INICIAL (pt1) --
            (setq p1-1 (polar pt1 ang-perp d1))

            (if (or (= tipo "U") (= tipo "P"))
              (progn
                (setq v2-b1 (get-v-base pt1 (+ d1 d2)))
                (setq p1-2 (inters p1-1 (polar p1-1 ang-2A 10) v2-b1 (polar v2-b1 ang-linha 10) nil))
              )
            )

            (if (= tipo "P")
              (progn
                (setq p1-3 (polar p1-2 ang-perp d3))
                (setq v4-b1 (get-v-base pt1 (+ d1 d2 d3 d4)))
                (setq p1-4 (inters p1-3 (polar p1-3 ang-horiz 10) v4-b1 (polar v4-b1 ang-linha 10) nil))
              )
            )

            ;; -- CÁLCULO DOS PONTOS: LADO FINAL (pt2) --
            (setq p2-1 (polar pt2 ang-perp d1))

            (if (or (= tipo "U") (= tipo "P"))
              (progn
                (setq v2-b2 (get-v-base pt2 (+ d1 d2)))
                (setq p2-2 (inters p2-1 (polar p2-1 ang-2A 10) v2-b2 (polar v2-b2 ang-linha 10) nil))
              )
            )

            (if (= tipo "P")
              (progn
                (setq p2-3 (polar p2-2 ang-perp d3))
                (setq v4-b2 (get-v-base pt2 (+ d1 d2 d3 d4)))
                (setq p2-4 (inters p2-3 (polar p2-3 ang-horiz 10) v4-b2 (polar v4-b2 ang-linha 10) nil))
              )
            )

            ;; -- SEQUÊNCIA DE INJEÇÃO NA POLILINHA --
            (setq pts-insert nil)
            (cond
              ((= tipo "L") (setq pts-insert (list p1-1 p2-1)))
              ((= tipo "U") (setq pts-insert (list p1-1 p1-2 p2-2 p2-1)))
              ((= tipo "P") (setq pts-insert (list p1-1 p1-2 p1-3 p1-4 p2-4 p2-3 p2-2 p2-1)))
            )

            ;; -- MUTAÇÃO DA ESTRUTURA DE DADOS (IN-PLACE) --
            (setq new-dados nil vtx-count 0 num-new-vtx (length pts-insert))

            (foreach item ent-dados
              (if (= (car item) 90)
                (setq new-dados (append new-dados (list (cons 90 (+ (cdr item) num-new-vtx)))))
                (progn
                  (setq new-dados (append new-dados (list item)))
                  (if (= (car item) 10)
                    (progn
                      (if (= vtx-count seg-idx)
                        (foreach pt pts-insert
                          (setq new-dados (append new-dados
                             (list
                               (cons 10 (list (car pt) (cadr pt)))
                               '(40 . 0.0) '(41 . 0.0) '(42 . 0.0)
                             )
                          ))
                        )
                      )
                      (setq vtx-count (1+ vtx-count))
                    )
                  )
                )
              )
            )
            (entmod new-dados)
            (entupd ent-name)

            ;; -- DESENHO DAS LINHAS DE VINCO --
            (setq novas-linhas nil)
            (if (not (tblsearch "LAYER" "ACM_VINCO"))
              (command "_.LAYER" "N" "ACM_VINCO" "C" "6" "ACM_VINCO" "")
            )

            (defun desenhar-vinco (pA pB / ent-vinco)
              (entmake (list '(0 . "LINE") '(8 . "ACM_VINCO") (cons 10 pA) (cons 11 pB) '(62 . 6)))
              (setq novas-linhas (append novas-linhas (list (entlast))))
            )

            (desenhar-vinco pt1 pt2) ; Vinco Base
            (if (or (= tipo "U") (= tipo "P")) (desenhar-vinco p1-1 p2-1))
            (if (= tipo "P")
              (progn (desenhar-vinco p1-2 p2-2) (desenhar-vinco p1-3 p2-3))
            )

            ;; -- ATUALIZAÇÃO DO GRUPO (SE EXISTIR) --
            (setq vla-painel (vlax-ename->vla-object ent-name))
            (vlax-for dict (vla-get-Groups (vla-get-ActiveDocument (vlax-get-acad-object)))
               (setq i 0 achou nil)
               (while (and (not achou) (< i (vla-get-Count dict)))
                  (if (eq (vla-Item dict i) vla-painel)
                      (progn
                         (setq arr (vlax-make-safearray vlax-vbObject (cons 0 (1- (length novas-linhas)))))
                         (setq j 0)
                         (foreach ent novas-linhas
                           (vlax-safearray-put-element arr j (vlax-ename->vla-object ent))
                           (setq j (1+ j))
                         )
                         (vla-AppendItems dict arr)
                         (setq achou t)
                      )
                  )
                  (setq i (1+ i))
               )
            )

            (princ "\nAba calculada por intersecção e integrada com sucesso!")
          )
        )
      )
      (princ "\nERRO: O painel selecionado deve ser uma LWPOLYLINE.")
    )
  )
  (princ "\nComando ABA_PERFIL finalizado.")
  (princ)
)