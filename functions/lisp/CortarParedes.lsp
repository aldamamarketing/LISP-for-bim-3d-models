;;; =====================================================================================
;;; TM DIGITAL - A GUILHOTINA (Corte Inteligente de Paredes via Telhado)
;;; Lê o ADN do Telhado e apara paredes na inclinação perfeita.
;;; =====================================================================================

(vl-load-com)

(defun c:CORTARPAREDE ( / old_osmode sel_t ent_t tmd_pts tmd_params
                          p1 p2 p3 e_espessura t_espessura ref_z v_altura shift_z z_corte
                          ss_paredes cp1 cp2 cp3 p_keep)
  
  (setq old_osmode (getvar "OSMODE"))
  (vl-cmdf "_.UCS" "_World")

  (princ "\n[TM Digital] - Guilhotina de Paredes")
  
  ;;; 1. SELECIONAR A FACA (O TELHADO)
  (setq sel_t (entsel "\n1. Selecione o TELHADO paramétrico (que servirá de limite): "))
  (if (not sel_t) (progn (princ "\n[TMD] Comando cancelado.") (exit)))
  
  (setq ent_t (car sel_t))
  
  ;; Tenta ler o ADN
  (setq tmd_pts (vlax-ldata-get ent_t "TMD_PTS"))
  (setq tmd_params (vlax-ldata-get ent_t "TMD_PARAMS"))

  (if (or (not tmd_pts) (not tmd_params))
    (progn 
      (princ "\n[Erro] O objeto selecionado não possui o ADN de um Telhado TM Digital.") 
      (exit)
    )
  )

  ;; Extrai os dados salvos no Telhado
  (setq p1 (nth 0 tmd_pts) 
        p2 (nth 1 tmd_pts) 
        p3 (nth 2 tmd_pts))
        
  (setq v_altura (atof (nth 1 tmd_params))
        e_espessura (atof (nth 4 tmd_params))
        t_espessura (atof (nth 5 tmd_params))
        ref_z (atoi (nth 6 tmd_params)))

  ;;; 2. SELECIONAR OS ALVOS (AS PAREDES)
  (princ "\n2. Selecione as PAREDES 3D que serão cortadas: ")
  (setq ss_paredes (ssget '((0 . "3DSOLID"))))
  (if (not ss_paredes) (progn (princ "\n[TMD] Nenhuma parede selecionada. Cancelando.") (exit)))

  ;;; 3. CÁLCULO DA FACA INVISÍVEL (Z-Shift)
  ;; Descobre onde está a linha "0" do telhado baseado na preferência do usuário
  (setq shift_z 
    (cond 
      ((= ref_z 0) (* -1.0 (+ e_espessura t_espessura))) ; Baseado no topo da telha
      ((= ref_z 1) 0.0)                                  ; Baseado no OSB
      ((= ref_z 2) v_altura)                             ; Baseado no fundo do caibro
    )
  )

;; A faca deve passar exatamente na base do Entablado/OSB (Paredes engolem as vigas)
  (setq z_corte shift_z)

  ;;; 4. EXECUÇÃO MATEMÁTICA
  (setvar "OSMODE" 0)
  
  ;; Gira o AutoCAD para o plano do telhado
  (vl-cmdf "_.UCS" "_3P" "_non" p1 "_non" p2 "_non" p3)

  ;; Cria 3 pontos para a ferramenta SLICE baseados no plano Z calculado
  (setq cp1 (list 0.0 0.0 z_corte))
  (setq cp2 (list 10.0 0.0 z_corte))
  (setq cp3 (list 0.0 10.0 z_corte))

  ;; Ponto de referência para MANTER (Um ponto lá no fundo da terra, garantindo que a casa fique)
  (setq p_keep (list 0.0 0.0 (- z_corte 10000.0)))

  ;; Fatiamento em lote!
  (vl-cmdf "_.SLICE" ss_paredes "" "_3P" "_non" cp1 "_non" cp2 "_non" cp3 "_non" p_keep)

  ;;; 5. LIMPEZA
  (vl-cmdf "_.UCS" "_World")
  (setvar "OSMODE" old_osmode)
  
  (princ (strcat "\n[TM Digital] Guilhotina executada! " (itoa (sslength ss_paredes)) " parede(s) ajustada(s) perfeitamente."))
  (princ)
)

(princ "\n[TMD] Digite CORTARPAREDE para iniciar.")
(princ)