;;; =====================================================================================
;;; TM DIGITAL - ALDAMA ACM TOOLS (PRODUÇÃO B.I.M)
;;; Comando: ABA_PARAM
;;; Função: Motor Vetorial Automático, DCL Contínuo, Injeção Dual e Geometria Exata.
;;; Atualização: Integração do motor geométrico de interseção (AbaPerfil) mantendo B.I.M.
;;; =====================================================================================

(vl-load-com)

;;; --- 1. MEMÓRIA DO SISTEMA (REGISTRO) ---
(defun tmd:salvar-registro (tipo d1 d2 d3 d4 corte)
  (setq path "HKEY_CURRENT_USER\\Software\\TMDigital\\AbaPerfil")
  (vl-registry-write path "Tipo" tipo)
  (vl-registry-write path "D1" (rtos d1 2 2))
  (vl-registry-write path "D2" (rtos d2 2 2))
  (vl-registry-write path "D3" (rtos d3 2 2))
  (vl-registry-write path "D4" (rtos d4 2 2))
  (vl-registry-write path "Corte" corte)
)

(defun tmd:ler-registro ( / path)
  (setq path "HKEY_CURRENT_USER\\Software\\TMDigital\\AbaPerfil")
  (list 
    (cond ((vl-registry-read path "Tipo")) ("L"))
    (atof (cond ((vl-registry-read path "D1")) ("30.0")))
    (atof (cond ((vl-registry-read path "D2")) ("20.0")))
    (atof (cond ((vl-registry-read path "D3")) ("15.0")))
    (atof (cond ((vl-registry-read path "D4")) ("15.0")))
    (cond ((vl-registry-read path "Corte")) ("0"))
  )
)

;;; --- LÓGICA DE DETECÇÃO DE ÁREA (AUTOMATIZAÇÃO DE DIREÇÃO OUTSIDE) ---
(defun tmd:poly-area (ent / pts area i j p1 p2)
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

;;; --- 2. INTERFACE DCL DINÂMICA ---
(defun tmd:dcl-continuo (tipo-ini d1-ini d2-ini d3-ini d4-ini corte-ini / dcl_id dcl_file file_handle res status)
  (setq dcl_file (vl-filename-mktemp "tmd_aba.dcl"))
  (setq file_handle (open dcl_file "w"))
  (write-line "tmd_aba : dialog { label = \"TM DIGITAL - Motor de Abas (BIM)\"; " file_handle)
  (write-line "  : column { " file_handle)
  (write-line "    : row { " file_handle)
  (write-line "      : popup_list { label = \"Perfil:\"; key = \"tipo\"; list = \"L (Simples)\\nU (Cassete)\\nP (Especial)\"; width = 20; }" file_handle)
  (write-line "      : popup_list { label = \"Corte Lateral:\"; key = \"corte\"; list = \"Automático (BIM)\\nReto (90°)\"; width = 20; }" file_handle)
  (write-line "    }" file_handle)
  (write-line "    : boxed_column { label = \"Dimensões dos Vincos (mm)\"; " file_handle)
  (write-line "      : edit_box { label = \"D1 (Profundidade):\"; key = \"d1\"; }" file_handle)
  (write-line "      : edit_box { label = \"D2 (Retorno):\"; key = \"d2\"; }" file_handle)
  (write-line "      : edit_box { label = \"D3 (Volta 90°):\"; key = \"d3\"; }" file_handle)
  (write-line "      : edit_box { label = \"D4 (Encaixe 180°):\"; key = \"d4\"; }" file_handle)
  (write-line "    }" file_handle)
  (write-line "  }" file_handle)
  (write-line "  : row { " file_handle)
  (write-line "    : button { label = \"Copiar ADN\"; key = \"btn_pick\"; }" file_handle)
  (write-line "    : button { label = \"Aplicar\"; key = \"btn_apply\"; is_default = true; }" file_handle)
  (write-line "    : button { label = \"Sair\"; key = \"btn_cancel\"; is_cancel = true; }" file_handle)
  (write-line "  } }" file_handle)
  (close file_handle)
  
  (setq dcl_id (load_dialog dcl_file))
  (if (not (new_dialog "tmd_aba" dcl_id)) (exit))
  
  (defun atualizar-campos (val)
    (mode_tile "d2" (if (= val "0") 1 0))
    (mode_tile "d3" (if (or (= val "0") (= val "1")) 1 0))
    (mode_tile "d4" (if (or (= val "0") (= val "1")) 1 0))
  )
  
  (set_tile "tipo" (cond ((= tipo-ini "L") "0") ((= tipo-ini "U") "1") (t "2")))
  (set_tile "corte" corte-ini)
  (set_tile "d1" (rtos d1-ini 2 2)) (set_tile "d2" (rtos d2-ini 2 2))
  (set_tile "d3" (rtos d3-ini 2 2)) (set_tile "d4" (rtos d4-ini 2 2))
  (atualizar-campos (get_tile "tipo"))
  (action_tile "tipo" "(atualizar-campos $value)")
  
  (action_tile "btn_apply" "(setq res (list 1 (get_tile \"tipo\") (get_tile \"d1\") (get_tile \"d2\") (get_tile \"d3\") (get_tile \"d4\") (get_tile \"corte\"))) (done_dialog 1)")
  (action_tile "btn_pick" "(setq res (list 2)) (done_dialog 2)")
  (action_tile "btn_cancel" "(done_dialog 0)")

  (setq status (start_dialog))
  (unload_dialog dcl_id)
  (vl-file-delete dcl_file)
  (if (> status 0) res nil)
)

;;; --- 3. LEITOR DE ADN B.I.M ---
(defun tmd:extrair-adn (ent-name pt-click / tipo-ent adn aba-id vla-obj param aba-list temp-adn pt-aba)
  (setq tipo-ent (cdr (assoc 0 (entget ent-name))))
  (setq adn nil aba-id nil)
  
  (if (= tipo-ent "LINE")
    (if (setq aba-id (vlax-ldata-get ent-name "TMD_ABA_ID"))
      (setq adn (vlax-ldata-get (handent (vlax-ldata-get ent-name "TMD_PARENT")) aba-id)
            ent-name (handent (vlax-ldata-get ent-name "TMD_PARENT")))
    )
    (if (= tipo-ent "LWPOLYLINE")
      (progn
        (setq aba-list (vlax-ldata-get ent-name "TMD_ABA_LIST"))
        (foreach id aba-list
          (setq temp-adn (vlax-ldata-get ent-name id))
          (foreach pt-aba (cdr (assoc "VTX_LIST" temp-adn))
            (if (< (distance (list (car pt-click) (cadr pt-click)) pt-aba) 100.0)
              (setq adn temp-adn aba-id id)
            )
          )
        )
      )
    )
  )
  (list adn aba-id ent-name)
)

;;; --- 4. MOTOR PRINCIPAL ---
(defun c:ABA_PARAM ( / doc reg-data t-ini d1-ini d2-ini d3-ini d4-ini corte-ini main-loop ui acao tipo 
                       d1 d2 d3 d4 corte apply-loop sel ent-name pt-click pt-click-wcs vla-obj 
                       param seg-idx adn-antigo aba-id pt1 pt2 area-val ang-linha ang-perp 
                       pt-lado-ucs pt-lado pt-closest ang-horiz ang-2A get-v-base p1-1 p1-2 
                       p1-3 p1-4 p2-1 p2-2 p2-3 p2-4 v2-b1 v4-b1 v2-b2 v4-b2 pts-insert pts-insert-2d 
                       pt1-2d h-list novas-linhas ent-dados new-dados old-pts achou result-adn e aba-list)

  (setvar "CMDECHO" 0)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))

  (setq sel (entsel "\n[TM DIGITAL] Selecione a aresta, vinco ou [ENTER] para Última Configuração: "))
  (if sel
    (progn
      (setq result-adn (tmd:extrair-adn (car sel) (trans (cadr sel) 1 0)))
      (setq adn-antigo (car result-adn))
    )
  )

  (if adn-antigo
    (setq t-ini (cdr (assoc "TIPO" adn-antigo))
          d1-ini (cdr (assoc "D1" adn-antigo)) d2-ini (cdr (assoc "D2" adn-antigo))
          d3-ini (cdr (assoc "D3" adn-antigo)) d4-ini (cdr (assoc "D4" adn-antigo))
          corte-ini (cond ((cdr (assoc "CORTE" adn-antigo))) ("0")))
    (setq reg-data (tmd:ler-registro)
          t-ini (nth 0 reg-data) d1-ini (nth 1 reg-data) d2-ini (nth 2 reg-data) 
          d3-ini (nth 3 reg-data) d4-ini (nth 4 reg-data) corte-ini (nth 5 reg-data))
  )

  (setq main-loop T)
  (while main-loop
    (setq ui (tmd:dcl-continuo t-ini d1-ini d2-ini d3-ini d4-ini corte-ini))

    (if (not ui)
      (setq main-loop nil)
      (progn
        (setq acao (car ui))

        (cond
          ((= acao 2) ; COPIAR ADN
            (setq sel (entsel "\n[TM DIGITAL] Selecione um Vinco ou Aresta com ABA para copiar: "))
            (if sel
              (progn
                (setq result-adn (tmd:extrair-adn (car sel) (trans (cadr sel) 1 0)))
                (if (car result-adn)
                  (progn
                    (setq adn-antigo (car result-adn)
                          t-ini (cdr (assoc "TIPO" adn-antigo))
                          d1-ini (cdr (assoc "D1" adn-antigo)) d2-ini (cdr (assoc "D2" adn-antigo))
                          d3-ini (cdr (assoc "D3" adn-antigo)) d4-ini (cdr (assoc "D4" adn-antigo))
                          corte-ini (cond ((cdr (assoc "CORTE" adn-antigo))) ("0")))
                    (princ "\n[BIM] Parâmetros copiados com sucesso!")
                  )
                  (princ "\nEsta aresta não possui dados B.I.M.")
                )
              )
            )
          )

          ((= acao 1) ; APLICAR
            (setq tipo (cond ((= (nth 1 ui) "0") "L") ((= (nth 1 ui) "1") "U") (t "P"))
                  d1 (atof (nth 2 ui)) d2 (atof (nth 3 ui))
                  d3 (atof (nth 4 ui)) d4 (atof (nth 5 ui))
                  corte (nth 6 ui))
            
            (tmd:salvar-registro tipo d1 d2 d3 d4 corte)
            (setq t-ini tipo d1-ini d1 d2-ini d2 d3-ini d3 d4-ini d4 corte-ini corte)

            (setq apply-loop T)
            (while apply-loop
              (setq sel (entsel (strcat "\nSelecione a aresta/vinco para aplicar " tipo " [ENTER para menu]: ")))
              
              (if (not sel)
                (setq apply-loop nil)
                (progn
                  (vla-StartUndoMark doc)

                  (setq result-adn (tmd:extrair-adn (car sel) (trans (cadr sel) 1 0)))
                  (setq adn-antigo (car result-adn) aba-id (cadr result-adn) ent-name (caddr result-adn))
                  (setq vla-obj (vlax-ename->vla-object ent-name))

                  (if (= (cdr (assoc 0 (entget ent-name))) "LWPOLYLINE")
                    (progn
                      (if adn-antigo
                        (setq pt1 (cdr (assoc "ORIG_P1" adn-antigo)) 
                              pt2 (cdr (assoc "ORIG_P2" adn-antigo)))
                        (progn
                          (setq pt-click-wcs (trans (cadr sel) 1 0)
                                pt-closest (vlax-curve-getClosestPointTo vla-obj pt-click-wcs)
                                param (vlax-curve-getParamAtPoint vla-obj pt-closest))
                          (if (not param) (setq param (vlax-curve-getParamAtDist vla-obj (vlax-curve-getDistAtPoint vla-obj pt-closest))))
                          (setq seg-idx (fix param))
                          (setq pt1 (vlax-curve-getPointAtParam vla-obj seg-idx)
                                pt2 (vlax-curve-getPointAtParam vla-obj (+ seg-idx 1))
                                aba-id (strcat "ABA_" (rtos (* (getvar "CDATE") 100000000) 2 0)))
                        )
                      )

                      ;; LÓGICA AUTOMÁTICA DE DIREÇÃO (OUTSIDE)
                      (setq ang-linha (angle pt1 pt2))
                      (setq area-val (tmd:poly-area ent-name))
                      
                      (if (> (abs area-val) 0.01)
                        (if (> area-val 0)
                          (setq ang-perp (- ang-linha (/ pi 2))) ; CCW -> Outside é a direita
                          (setq ang-perp (+ ang-linha (/ pi 2))) ; CW -> Outside é a esquerda
                        )
                        (progn ; Fallback se for linha aberta
                          (setq pt-lado-ucs (getpoint "\nPolilinha aberta. Clique no lado de FORA: "))
                          (if pt-lado-ucs
                            (progn
                              (setq pt-lado (trans pt-lado-ucs 1 0) ang-perp (+ ang-linha (/ pi 2)))
                              (if (> (distance pt-lado (polar pt1 ang-perp 10)) (distance pt-lado (polar pt1 (- ang-linha (/ pi 2)) 10)))
                                (setq ang-perp (- ang-linha (/ pi 2))))
                            )
                            (setq ang-perp (+ ang-linha (/ pi 2)))
                          )
                        )
                      )

                      ;; --- LÓGICA VETORIAL: MOTOR DE INTERSECÇÃO (BASEADO EM ABA_PERFIL) ---
                      
                      (if (and (> ang-perp (/ pi 2)) (< ang-perp (* 1.5 pi)))
                        (setq ang-horiz pi) ; Esquerda (180 graus)
                        (setq ang-horiz 0.0) ; Direita (0 graus)
                      )
                      
                      ;; O ângulo de reflexão para o retorno 180 graus
                      (setq ang-2A (- (* 2.0 ang-linha) ang-horiz))

                      ;; Override Manual (Corte Reto 90° para compensações extremas)
                      (if (= corte "1")
                        (setq ang-2A ang-perp ang-horiz ang-perp)
                      )

                      ;; Função Auxiliar para espessura perpendicular (Motor de Intersecção)
                      (defun get-v-base (pt dist) (polar pt ang-perp dist))

                      ;; --- CÁLCULO DOS PONTOS: LADO INICIAL (P1) ---
                      (setq p1-1 (polar pt1 ang-perp d1))

                      (if (or (= tipo "U") (= tipo "P"))
                        (progn
                          (setq v2-b1 (get-v-base pt1 (+ d1 d2)))
                          (setq p1-2 (inters p1-1 (polar p1-1 ang-2A 10) v2-b1 (polar v2-b1 ang-linha 10) nil))
                          (if (not p1-2) (setq p1-2 (polar p1-1 ang-perp d2))) ; Fallback
                        )
                      )

                      (if (= tipo "P")
                        (progn
                          (setq p1-3 (polar p1-2 ang-perp d3))
                          (setq v4-b1 (get-v-base pt1 (+ d1 d2 d3 d4)))
                          (setq p1-4 (inters p1-3 (polar p1-3 ang-horiz 10) v4-b1 (polar v4-b1 ang-linha 10) nil))
                          (if (not p1-4) (setq p1-4 (polar p1-3 ang-perp d4))) ; Fallback
                        )
                      )

                      ;; --- CÁLCULO DOS PONTOS: LADO FINAL (P2) ---
                      (setq p2-1 (polar pt2 ang-perp d1))

                      (if (or (= tipo "U") (= tipo "P"))
                        (progn
                          (setq v2-b2 (get-v-base pt2 (+ d1 d2)))
                          (setq p2-2 (inters p2-1 (polar p2-1 ang-2A 10) v2-b2 (polar v2-b2 ang-linha 10) nil))
                          (if (not p2-2) (setq p2-2 (polar p2-1 ang-perp d2))) ; Fallback
                        )
                      )

                      (if (= tipo "P")
                        (progn
                          (setq p2-3 (polar p2-2 ang-perp d3))
                          (setq v4-b2 (get-v-base pt2 (+ d1 d2 d3 d4)))
                          (setq p2-4 (inters p2-3 (polar p2-3 ang-horiz 10) v4-b2 (polar v4-b2 ang-linha 10) nil))
                          (if (not p2-4) (setq p2-4 (polar p2-3 ang-perp d4))) ; Fallback
                        )
                      )

                      ;; Montar Sequência do Perímetro
                      (setq pts-insert nil)
                      (cond
                        ((= tipo "L") (setq pts-insert (list p1-1 p2-1)))
                        ((= tipo "U") (setq pts-insert (list p1-1 p1-2 p2-2 p2-1)))
                        ((= tipo "P") (setq pts-insert (list p1-1 p1-2 p1-3 p1-4 p2-4 p2-3 p2-2 p2-1)))
                      )

                      ;; Converter para 2D OCS
                      (setq pts-insert-2d (mapcar '(lambda (p) (list (car (trans p 0 ent-name)) (cadr (trans p 0 ent-name)))) pts-insert))
                      (setq pt1-2d (list (car (trans pt1 0 ent-name)) (cadr (trans pt1 0 ent-name))))

                      ;; Limpar Vincos Antigos
                      (if (and adn-antigo (setq h-list (cdr (assoc "VINC_H" adn-antigo))))
                        (foreach h h-list (if (setq e (handent h)) (entdel e))))

                      ;; Substituição Geométrica In-Place
                      (setq ent-dados (entget ent-name) new-dados nil old-pts nil achou nil)
                      (if adn-antigo (setq old-pts (cdr (assoc "VTX_LIST" adn-antigo))))

                      (foreach item ent-dados
                        (if (= (car item) 10)
                          (progn
                            (if (and old-pts (not achou) (< (distance (cdr item) (car old-pts)) 1.0))
                              (progn
                                (setq achou T)
                                (foreach pt pts-insert-2d (setq new-dados (append new-dados (list (cons 10 pt) '(40 . 0.0) '(41 . 0.0) '(42 . 0.0)))))
                                (setq old-pts (cdr old-pts))
                              )
                              (progn
                                (if (and achou old-pts)
                                  (setq old-pts (cdr old-pts))
                                  (progn
                                    (setq new-dados (append new-dados (list item)))
                                    (if (and (not adn-antigo) (< (distance (cdr item) pt1-2d) 1.0))
                                      (foreach pt pts-insert-2d (setq new-dados (append new-dados (list (cons 10 pt) '(40 . 0.0) '(41 . 0.0) '(42 . 0.0)))))
                                    )
                                  )
                                )
                              )
                            )
                          )
                          (if (= (car item) 90)
                            (if adn-antigo
                              (setq new-dados (append new-dados (list (cons 90 (+ (cdr item) (- (length pts-insert-2d) (length (cdr (assoc "VTX_LIST" adn-antigo)))))))))
                              (setq new-dados (append new-dados (list (cons 90 (+ (cdr item) (length pts-insert-2d))))))
                            )
                            (setq new-dados (append new-dados (list item)))
                          )
                        )
                      )
                      (entmod new-dados) (entupd ent-name)

                      ;; GERAR VINCOS
                      (setq novas-linhas nil)
                      (if (not (tblsearch "LAYER" "TM-02-CORTE_ACM"))
                        (command "_.LAYER" "N" "TM-02-CORTE_ACM" "C" "6" "TM-02-CORTE_ACM" ""))

                      (defun desenhar-vinco (pA pB / pA-w pB-w e-linha)
                        (setq pA-w (trans pA 0 ent-name) pB-w (trans pB 0 ent-name))
                        (entmake (list '(0 . "LINE") '(8 . "TM-02-CORTE_ACM") (cons 10 pA-w) (cons 11 pB-w) '(62 . 6)))
                        (setq e-linha (entlast))
                        (vlax-ldata-put e-linha "TMD_ABA_ID" aba-id)
                        (vlax-ldata-put e-linha "TMD_PARENT" (cdr (assoc 5 (entget ent-name))))
                        (setq novas-linhas (append novas-linhas (list (cdr (assoc 5 (entget e-linha))))))
                      )
                      
                      (desenhar-vinco pt1 pt2) ; Vinco Base
                      (if (or (= tipo "U") (= tipo "P")) 
                        (desenhar-vinco p1-1 p2-1)) ; Dobra 1
                      (if (= tipo "P") 
                        (progn 
                          (desenhar-vinco p1-2 p2-2) ; Dobra 2
                          (desenhar-vinco p1-3 p2-3) ; Dobra 3
                        )
                      )

                      ;; Gravar ADN Principal
                      (setq aba-list (vlax-ldata-get ent-name "TMD_ABA_LIST"))
                      (if (not (vl-position aba-id aba-list))
                        (vlax-ldata-put ent-name "TMD_ABA_LIST" (append aba-list (list aba-id)))
                      )
                      
                      (vlax-ldata-put ent-name aba-id 
                        (list (cons "TIPO" tipo) (cons "D1" d1) (cons "D2" d2) (cons "D3" d3) (cons "D4" d4)
                              (cons "CORTE" corte) (cons "ORIG_P1" pt1) (cons "ORIG_P2" pt2) 
                              (cons "VTX_LIST" pts-insert-2d) (cons "VINC_H" novas-linhas)))
                      (vlax-ldata-put ent-name "TMD_CLASSE" "ACM")
                      
                      (princ "\n[BIM] Aba processada com motor de intersecção com sucesso.")
                    )
                    (princ "\n[ERRO] O elemento alvo deve ser uma LWPOLYLINE ou Vinco B.I.M.")
                  )
                  (vla-EndUndoMark doc)
                )
              )
            )
          )
        )
      )
    )
  )
  (princ "\nComando finalizado.")
  (princ)
)

(princ "\nMotor TM Aba BIM Carregado. Digite ABA_PARAM")
(princ)