;;; =====================================================================================
;;; TM DIGITAL - GENERADOR BIM DE TELHA TRAPÉZIO 25 (TR25)
;;; Comando: TMD_TEJA_TR25
;;; Función: Dibuja paramétricamente secciones de teja trapezoidal entre dos puntos.
;;; =====================================================================================

(vl-load-com)

(defun c:TMD_TEJA_TR25 ( / pt1 pt2 d a old_os pattern cur_x prev_x prev_y done pts px py dx dy ny r a2 p_final ent_name)
  (setq pt1 (getpoint "\n[TM Digital] Clique no ponto inicial da telha: "))
  (if pt1
    (progn
      (setq pt2 (getpoint pt1 "\nClique no ponto final (direção e comprimento): "))
      (if pt2
        (progn
          (setq d (distance pt1 pt2))
          (setq a (angle pt1 pt2))
          
          ;; Geometría del perfil estandar de un período (170mm)
          (setq pattern
            '(
              (0.0 0.0)      ; Inicio (Base)
              (21.0 25.0)    ; Subida a Pico
              (47.0 25.0)    ; Cresta 26mm
              (68.0 0.0)     ; Bajada a Valle
              (89.0 0.0)     ; Plano hasta Nervio 1 (21mm)
              (94.0 2.0)     ; Cumbre Nervio 1
              (99.0 0.0)     ; Fin Nervio 1
              (139.0 0.0)    ; Plano Central (40mm)
              (144.0 2.0)    ; Cumbre Nervio 2
              (149.0 0.0)    ; Fin Nervio 2
              (170.0 0.0)    ; Fin de Período
            )
          )
          
          (setq pts nil)
          (setq cur_x 0.0)
          (setq prev_x 0.0 prev_y 0.0)
          (setq done nil)
          
          ;; Loop para ensamblar períodos hasta alcanzar el tamaño exacto del usuario
          (while (not done)
            (foreach p pattern
              (if (not done)
                (progn
                  (setq px (+ cur_x (car p)) py (cadr p))
                  (if (> px d)
                    (progn
                      ;; Interpolación para un corte exacto en el punto requerido
                      (setq dx (- px prev_x) dy (- py prev_y))
                      (if (= dx 0)
                        (setq ny py)
                        (setq ny (+ prev_y (* dy (/ (- d prev_x) dx))))
                      )
                      (setq pts (append pts (list (list d ny))))
                      (setq done T)
                    )
                    (progn
                      (if (or (not pts) (> px prev_x))
                        (setq pts (append pts (list (list px py))))
                      )
                      (setq prev_x px prev_y py)
                    )
                  )
                )
              )
            )
            (setq cur_x (+ cur_x 170.0))
            (if (> cur_x (+ d 170.0)) (setq done T)) ; Fallback de seguridad
          )
          
          ;; Transformación vectorial y dibujado Polyline
          (setq old_os (getvar "OSMODE"))
          (setvar "OSMODE" 0)
          (setvar "CMDECHO" 0)
          (command "_.PLINE")
          (foreach p pts
            (setq r (distance '(0 0) p))
            (setq a2 (angle '(0 0) p))
            (setq p_final (polar pt1 (+ a a2) r))
            (command "_non" p_final)
          )
          (command "")
          
          (setvar "OSMODE" old_os)
          
          ;; Inyección de ADN BIM Inteligente
          (setq ent_name (entlast))
          (if (and ent_name (= (cdr (assoc 0 (entget ent_name))) "LWPOLYLINE"))
            (progn
              (if (eval 'TMD:bim-set-adn)
                (progn
                  (vlax-ldata-put ent_name "TMD_CLASSE" "ARQUITETURA")
                  (vlax-ldata-put ent_name "TMD_TIPO" "TELHA_TR25")
                  (TMD:bim-set-adn ent_name (list (cons "TIPO" "TR25") (cons "COMPRIMENTO" d)))
                )
              )
            )
          )
          (princ (strcat "\n[TM Digital] Telha TR25 xerada con éxito: " (rtos d 2 1) "mm."))
        )
      )
    )
  )
  (princ)
)
(princ "\n[TM Digital] Módulo Teja TR25 Cargado. Digite TMD_TEJA_TR25")
(princ)
