;;; =====================================================================================
;;; TM DIGITAL - MOTOR PARAMÉTRICO DE ABAS (TMD_Abas.lsp)
;;; Función: Integra el motor matemático exacto con fallbacks para líneas horizontales.
;;;          Aplica Zigzag absoluto sobre el Eje X o Chanfro paramétrico según configuración.
;;;          Soporta el flujo de Trabajo "Edición Continua" (Loop + Enter para DCL).
;;; =====================================================================================

(vl-load-com)

;;; Verificação de dependências
(if (not TMD:bim-get-aba-adn)
  (if (findfile "TMD_Utils.lsp")
    (load "TMD_Utils.lsp")
    (princ "\n[ERRO] TMD_Utils.lsp não encontrado! O comando TMD_ABAS pode falhar.")
  )
)

;;; -------------------------------------------------------------------------------------
;;; 1. INTERFAZ DCL EN MODO CONTINUO
;;; -------------------------------------------------------------------------------------

(defun TMD:ui-dcl-abas (tipo-ini d1-ini d2-ini d3-ini d4-ini chanfro-ini / dcl_id dcl_file file_handle res status)
  (setq dcl_file (vl-filename-mktemp "tmd_aba.dcl"))
  (setq file_handle (open dcl_file "w"))
  (write-line "tmd_aba : dialog { label = \"TM Digital - Creador de Abas BIM\"; " file_handle)
  (write-line "  : column { " file_handle)
  (write-line "    : popup_list { label = \"Perfil de Aba:\"; key = \"tipo\"; list = \"L (Simples)\\nU (Cassete)\\nP (Especial)\"; width = 20; }" file_handle)
  (write-line "    : boxed_column { label = \"Dimensiones (mm)\"; " file_handle)
  (write-line "      : edit_box { label = \"Lomo (D1):\"; key = \"d1\"; }" file_handle)
  (write-line "      : edit_box { label = \"Retorno Par. (D2):\"; key = \"d2\"; }" file_handle)
  (write-line "      : edit_box { label = \"Volta 90g (D3):\"; key = \"d3\"; }" file_handle)
  (write-line "      : edit_box { label = \"Encaixe 180g (D4):\"; key = \"d4\"; }" file_handle)
  (write-line "    }" file_handle)
  (write-line "    : toggle { label = \"Chanfro a 45 graus nos encontros\"; key = \"chanfro\"; }" file_handle)
  (write-line "  }" file_handle)
  (write-line "  : row { " file_handle)
  (write-line "    : button { label = \"Aplicar\"; key = \"btn_apply\"; is_default = true; }" file_handle)
  (write-line "    : button { label = \"Cancelar\"; key = \"btn_cancel\"; is_cancel = true; }" file_handle)
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
  (set_tile "d1" (rtos d1-ini 2 2)) (set_tile "d2" (rtos d2-ini 2 2))
  (set_tile "d3" (rtos d3-ini 2 2)) (set_tile "d4" (rtos d4-ini 2 2))
  (set_tile "chanfro" chanfro-ini)
  (atualizar-campos (get_tile "tipo"))
  (action_tile "tipo" "(atualizar-campos $value)")
  
  (action_tile "btn_apply" "(setq res (list 1 (get_tile \"tipo\") (get_tile \"d1\") (get_tile \"d2\") (get_tile \"d3\") (get_tile \"d4\") (get_tile \"chanfro\"))) (done_dialog 1)")
  (action_tile "btn_cancel" "(done_dialog 0)")

  (setq status (start_dialog))
  (unload_dialog dcl_id)
  (vl-file-delete dcl_file)
  (if (> status 0) res nil)
)

;;; -------------------------------------------------------------------------------------
;;; 2. COMANDO PRINCIPAL (DISEÑO CONTINUO Y EDICIÓN)
;;; -------------------------------------------------------------------------------------

(defun c:TMD_ABAS ( / ui t-ini d1-ini d2-ini d3-ini d4-ini chanfro-ini tipo d1 d2 d3 d4 chanfro adn-antigo aba-id
                      ent ent-name pt-click ent-dados tipo-ent param seg-idx 
                      pt1 pt2 ang-linha ang-perp area-val pt-lado pt-lado-ucs
                      ang-cut1-even ang-cut2-even
                      p1-1 p1-2 p1-3 p1-4 p2-1 p2-2 p2-3 p2-4
                      pts-insert new-dados vtx-count num-new-vtx vla-obj pt-closest doc 
                      novas-linhas aba-list h-list old-pts achou pt1-2d pts-insert-2d
                      is-closed calc-inters
                      main-loop apply-loop result-adn sel pt-click-wcs e)
  
  (setvar "CMDECHO" 0)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))

  ;; CICLO PRINCIPAL (Lee del registro, detecta clicks iniciales, muestra DCL)
  (setq main-loop T)
  (while main-loop
    (initget "Help")
    (setq sel (entsel "\n[TM DIGITAL] Selecione a aresta/vinco para Editar ou [ENTER] p/ DCL [Help]: "))
    (if (= sel "Help") (progn (TMD:util-help "TMD_ABAS") (setq sel (entsel "\nSelecione a aresta/vinco para Editar ou [ENTER] p/ DCL: "))))
    
    (setq adn-antigo nil)
    (if sel
      (progn
        (setq result-adn (TMD:bim-get-aba-adn (car sel) (trans (cadr sel) 1 0)))
        (setq adn-antigo (car result-adn))
      )
    )

    ;; Cargar parámetros prioritarios: primero del ADN seleccionado, luego del Registro
    (if adn-antigo
      (setq t-ini (cdr (assoc "TIPO" adn-antigo))
            d1-ini (cdr (assoc "D1" adn-antigo))
            d2-ini (cdr (assoc "D2" adn-antigo))
            d3-ini (cdr (assoc "D3" adn-antigo))
            d4-ini (cdr (assoc "D4" adn-antigo))
            chanfro-ini (cond ((cdr (assoc "CHANFRO" adn-antigo))) ("0")))
      (setq t-ini (TMD:bim-get-reg "Tipo" "L")
            d1-ini (atof (TMD:bim-get-reg "D1" "30.0"))
            d2-ini (atof (TMD:bim-get-reg "D2" "20.0"))
            d3-ini (atof (TMD:bim-get-reg "D3" "15.0"))
            d4-ini (atof (TMD:bim-get-reg "D4" "15.0"))
            chanfro-ini (TMD:bim-get-reg "Chanfro" "0"))
    )

    (setq ui (TMD:ui-dcl-abas t-ini d1-ini d2-ini d3-ini d4-ini chanfro-ini))
    
    (if (not ui)
      (setq main-loop nil) ;; Usuario canceló DCL
      (progn
        ;; Extraer valores
        (setq tipo (cond ((= (nth 1 ui) "0") "L") ((= (nth 1 ui) "1") "U") (t "P")))
        (setq d1 (atof (nth 2 ui)) d2 (atof (nth 3 ui)) d3 (atof (nth 4 ui)) d4 (atof (nth 5 ui)) chanfro (nth 6 ui))
        
        ;; Guardar memoria en el sistema
        (TMD:bim-set-reg "Tipo" tipo)
        (TMD:bim-set-reg "D1" (rtos d1 2 2))
        (TMD:bim-set-reg "D2" (rtos d2 2 2))
        (TMD:bim-set-reg "D3" (rtos d3 2 2))
        (TMD:bim-set-reg "D4" (rtos d4 2 2))
        (TMD:bim-set-reg "Chanfro" chanfro)

        ;; CICLO DE APLICACIÓN CONTINUA
        (setq apply-loop T)
        (while apply-loop
          (initget "Help")
          (setq sel (entsel (strcat "\nSelecione a aresta/vinco para aplicar " tipo " [ENTER para menu / Help]: ")))
          (if (= sel "Help") (progn (TMD:util-help "TMD_ABAS") (setq sel (entsel (strcat "\nSelecione a aresta/vinco para aplicar " tipo " [ENTER para menu]: ")))))
          
          (if (not sel)
            (setq apply-loop nil) ;; Regresa al DCL
            (progn
              (vla-StartUndoMark doc)

              (setq result-adn (TMD:bim-get-aba-adn (car sel) (trans (cadr sel) 1 0)))
              (setq adn-antigo (car result-adn) aba-id (cadr result-adn) ent-name (caddr result-adn))
              
              (if (= (cdr (assoc 0 (entget ent-name))) "LWPOLYLINE")
                (progn
                  (setq vla-obj (vlax-ename->vla-object ent-name))
                  
                  ;; Recuperar o calcular P1 y P2 base
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

                  ;; AUTO-ORIENTACIÓN (Outside)
                  (setq ang-linha (angle pt1 pt2))
                  (setq area-val (TMD:util-poly-area ent-name))
                  
                  (if (> (abs area-val) 0.01)
                    (if (> area-val 0)
                      (setq ang-perp (- ang-linha (/ pi 2))) ; CCW
                      (setq ang-perp (+ ang-linha (/ pi 2))) ; CW
                    )
                    (progn ; Fallback Polilínea Abierta
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

                  ;; NUEVA LÓGICA DE ÁNGULOS DE RECORTE (Extraída directamente de AbaPerfil.lsp)
                  (if (= chanfro "1")
                    ;; Lógica de Chanfro a 45 grados simétrico hacia adentro
                    (progn
                      (if (> area-val 0)
                        (setq ang-chanfro1 (+ ang-perp (/ pi 4)) ang-chanfro2 (- ang-perp (/ pi 4))) 
                        (setq ang-chanfro1 (- ang-perp (/ pi 4)) ang-chanfro2 (+ ang-perp (/ pi 4))) 
                      )
                      (setq ang-cut1-d2 ang-chanfro1 ang-cut1-d4 ang-chanfro1)
                      (setq ang-cut2-d2 ang-chanfro2 ang-cut2-d4 ang-chanfro2)
                    )
                    ;; Lógica de AbaPerfil.lsp: D2 usa reflexión 180, D4 usa horizontal pura
                    (progn
                      (if (and (> ang-perp (/ pi 2)) (< ang-perp (* 1.5 pi)))
                        (setq ang-horiz pi) ; Esquerda (180 graus)
                        (setq ang-horiz 0.0) ; Direita (0 graus)
                      )
                      (setq ang-2A (- (* 2.0 ang-linha) ang-horiz))
                      
                      (setq ang-cut1-d2 ang-2A)
                      (setq ang-cut2-d2 ang-2A) ; AbaPerfil usa el mismo angulo para ambos lados
                      (setq ang-cut1-d4 ang-horiz)
                      (setq ang-cut2-d4 ang-horiz)
                    )
                  )

                  ;; MOTOR DE INTERSECCIÓN CON FALLBACK PARA LÍNEAS PARALELAS/HORIZONTALES
                  (defun calc-inters (p-start ang-cut dist-offset p-ref / v-base res)
                    (setq v-base (polar p-ref ang-perp dist-offset))
                    (setq res (inters p-start (polar p-start ang-cut 1.0) v-base (polar v-base ang-linha 1.0) nil))
                    (if res res (polar p-ref ang-perp dist-offset))
                  )

                  ;; Construcción Vectorial Rígida (D1 y D3 ortogonales a la base, D2 y D4 proyectan AbaPerfil)
                  (setq p1-1 (polar pt1 ang-perp d1))
                  (if (or (= tipo "U") (= tipo "P"))
                    (setq p1-2 (calc-inters p1-1 ang-cut1-d2 (+ d1 d2) pt1))
                  )
                  (if (= tipo "P")
                    (progn
                      (setq p1-3 (polar p1-2 ang-perp d3))
                      (setq p1-4 (calc-inters p1-3 ang-cut1-d4 (+ d1 d2 d3 d4) pt1))
                    )
                  )

                  (setq p2-1 (polar pt2 ang-perp d1))
                  (if (or (= tipo "U") (= tipo "P"))
                    (setq p2-2 (calc-inters p2-1 ang-cut2-d2 (+ d1 d2) pt2))
                  )
                  (if (= tipo "P")
                    (progn
                      (setq p2-3 (polar p2-2 ang-perp d3))
                      (setq p2-4 (calc-inters p2-3 ang-cut2-d4 (+ d1 d2 d3 d4) pt2))
                    )
                  )

                  ;; Consolidación del Perímetro
                  (setq pts-insert nil)
                  (cond
                    ((= tipo "L") (setq pts-insert (list p1-1 p2-1)))
                    ((= tipo "U") (setq pts-insert (list p1-1 p1-2 p2-2 p2-1)))
                    ((= tipo "P") (setq pts-insert (list p1-1 p1-2 p1-3 p1-4 p2-4 p2-3 p2-2 p2-1)))
                  )

                  ;; DESTRUCCIÓN DE ADN VIEJO (Para sobreescritura in-place veloz)
                  (setq pts-insert-2d (mapcar '(lambda (p) (list (car (trans p 0 ent-name)) (cadr (trans p 0 ent-name)))) pts-insert))
                  (setq pt1-2d (list (car (trans pt1 0 ent-name)) (cadr (trans pt1 0 ent-name))))

                  ;; Eliminar líneas de doblez de visualización (layer cortes)
                  (if (and adn-antigo (setq h-list (cdr (assoc "VINC_H" adn-antigo))))
                    (foreach h h-list (if (setq e (handent h)) (entdel e))))

                  ;; Modificar la polilínea borrando los vértices viejos para meter los nuevos
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
                              (setq old-pts (cdr old-pts)) ; Seguimos saltando vértices viejos de esta Aba específica
                              (progn
                                (setq new-dados (append new-dados (list item))) ; Vértice original se mantiene
                                ;; Si es una aba nueva y vamos pasando por el vértice inicial, inyectamos la forma
                                (if (and (not adn-antigo) (< (distance (cdr item) pt1-2d) 1.0))
                                  (foreach pt pts-insert-2d (setq new-dados (append new-dados (list (cons 10 pt) '(40 . 0.0) '(41 . 0.0) '(42 . 0.0)))))
                                )
                              )
                            )
                          )
                        )
                      )
                      (if (= (car item) 90) ; Cantidad de vértices dictada por DXF Code 90
                        (if adn-antigo
                          (setq new-dados (append new-dados (list (cons 90 (+ (cdr item) (- (length pts-insert-2d) (length (cdr (assoc "VTX_LIST" adn-antigo)))))))))
                          (setq new-dados (append new-dados (list (cons 90 (+ (cdr item) (length pts-insert-2d))))))
                        )
                        (setq new-dados (append new-dados (list item)))
                      )
                    )
                  )
                  (entmod new-dados) (entupd ent-name)

                  ;; DIBUJO DE NUEVOS VINCOS (Doblado real y referencias CAM)
                  (setq novas-linhas nil)
                  (if (not (tblsearch "LAYER" "TM-04-CORTE_ACM"))
                    (command "_.LAYER" "N" "TM-04-CORTE_ACM" "C" "4" "TM-04-CORTE_ACM" ""))

                  (defun desenhar-vinco (pA pB / pA-w pB-w e-linha)
                    (setq pA-w (trans pA 0 ent-name) pB-w (trans pB 0 ent-name))
                    (entmake (list '(0 . "LINE") '(8 . "TM-04-CORTE_ACM") (cons 10 pA-w) (cons 11 pB-w) '(62 . 6)))
                    (setq e-linha (entlast))
                    (vlax-ldata-put e-linha "TMD_ABA_ID" aba-id)
                    (vlax-ldata-put e-linha "TMD_PARENT" (cdr (assoc 5 (entget ent-name))))
                    (setq novas-linhas (append novas-linhas (list (cdr (assoc 5 (entget e-linha))))))
                  )
                  
                  (desenhar-vinco pt1 pt2) ; Vinco Base dictametríca
                  (if (or (= tipo "U") (= tipo "P")) (desenhar-vinco p1-1 p2-1)) ; Primer Doblez (D1 / D2)
                  (if (= tipo "P") 
                    (progn (desenhar-vinco p1-2 p2-2) (desenhar-vinco p1-3 p2-3)) ; Múltiples Dobleces Específicos
                  )

                  ;; RE-INYECCIÓN DE ADN B.I.M APROBADO CON EL NUEVO STANDARD
                  (setq aba-list (vlax-ldata-get ent-name "TMD_ABA_LIST"))
                  (if (not (vl-position aba-id aba-list))
                    (vlax-ldata-put ent-name "TMD_ABA_LIST" (append aba-list (list aba-id)))
                  )
                  
                  (vlax-ldata-put ent-name aba-id 
                    (list (cons "TIPO" tipo) (cons "D1" d1) (cons "D2" d2) (cons "D3" d3) (cons "D4" d4)
                          (cons "CHANFRO" chanfro)
                          (cons "ORIG_P1" pt1) (cons "ORIG_P2" pt2) 
                          (cons "VTX_LIST" pts-insert-2d) (cons "VINC_H" novas-linhas)))
                  
                  (vlax-ldata-put ent-name "TMD_CLASSE" "ACM")
                  (vlax-ldata-put ent-name "TMD_TIPO" "BANDEJA_ACM")
                  
                  (princ "\n[TM Digital] Aba Acoplada con Éxito (X-Axis/Chamfer Sync).")
                )
                (princ "\n[ERRO] O elemento alvo deve ser uma LWPOLYLINE.")
              )
              (vla-EndUndoMark doc)
            )
          )
        )
      )
    )
  )
  (princ)
)

(princ "\n[TM Digital] TMD_Abas.lsp cargado. USE: TMD_ABAS")
(princ)
