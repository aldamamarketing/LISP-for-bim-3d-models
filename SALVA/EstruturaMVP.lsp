;;; =====================================================================================
;;; TM DIGITAL - GERADOR DE ESTRUTURAS METÁLICAS (V2.3 - Final MVP Completo)
;;; Inclui: Todas as formas geométricas restauradas com Justificação e Rotação.
;;; =====================================================================================

(vl-load-com)

;;; Variáveis Globais (Persistem entre comandos)
(if (not *tmd_viga_perfil_idx*) (setq *tmd_viga_perfil_idx* 1))
(if (not *tmd_viga_just*) (setq *tmd_viga_just* "MC")) 
(if (not *tmd_viga_rot*) (setq *tmd_viga_rot* 0.0))

;;; FUNÇÃO AUXILIAR: Fatiar a linha do CSV
(defun tmd-split-string (str delim / pos lst)
  (while (setq pos (vl-string-search delim str))
    (setq lst (cons (substr str 1 pos) lst))
    (setq str (substr str (+ pos 1 (strlen delim))))
  )
  (reverse (cons str lst))
)

;;; FUNÇÃO AUXILIAR: Ler o arquivo CSV
(defun tmd-load-csv ( / f line data catalog file_path)
  (setq catalog nil)
  (setq file_path (findfile "catalogo_metal.csv"))
  (if (not file_path) (setq file_path (strcat (getvar "DWGPREFIX") "catalogo_metal.csv")))

  (if (and file_path (setq f (open file_path "r")))
    (progn
      (read-line f) 
      (while (setq line (read-line f))
        (if (/= line "")
          (progn
            (setq data (tmd-split-string line ","))
            (setq catalog (append catalog (list data)))
          )
        )
      )
      (close f)
    )
    (princ (strcat "\n[Erro] Arquivo 'catalogo_metal.csv' não encontrado.\nLocal verificado: " (if file_path file_path "Indefinido")))
  )
  catalog
)

;;; COMANDO PRINCIPAL
(defun c:VIGA ( / old_cmdecho old_osmode catalog i choice kwd_action perfil_data
                  p_nome p_forma p_x p_y p_espessura
                  pt_a pt_b dist p1 p2 p3 p4 p_gap1 p_gap2
                  ent_outer ent_inner ent_gap nivel_global
                  shift_x shift_y kwd_just kwd_rot loop_active pt_start pt_next)

  (setq old_cmdecho (getvar "CMDECHO"))
  (setq old_osmode (getvar "OSMODE"))
  (setvar "CMDECHO" 0)

  (princ "\n[TM Digital] - Estrutura Metálica Contínua")
  
  ;; 1. CARREGAR CATÁLOGO
  (setq catalog (tmd-load-csv))
  (if (not catalog) (exit))

  ;; 2. MENU DE CONFIGURAÇÃO
  (setq perfil_data (nth (1- *tmd_viga_perfil_idx*) catalog))
  (setq p_nome (nth 0 perfil_data))

  (princ (strcat "\n[Atual] Perfil: " p_nome " | Justificativa: " *tmd_viga_just* " | Rotação: " (rtos *tmd_viga_rot* 2 0) "º"))
  
  (initget "Configurar Desenhar")
  (setq kwd_action (getkword "\nVocê deseja [Configurar] ou [Desenhar] direto? <Desenhar>: "))
  
  (if (= kwd_action "Configurar")
    (progn
      (princ "\n--- CATÁLOGO ---")
      (setq i 1)
      (foreach item catalog (princ (strcat "\n " (itoa i) " - " (nth 0 item))) (setq i (1+ i)))
      (setq choice (getint (strcat "\nEscolha o número do perfil [" (itoa *tmd_viga_perfil_idx*) "]: ")))
      (if (and choice (>= choice 1) (<= choice (length catalog))) (setq *tmd_viga_perfil_idx* choice))
      
      (setq perfil_data (nth (1- *tmd_viga_perfil_idx*) catalog))
      (setq p_nome (nth 0 perfil_data))

      (initget "TL TC TR ML MC MR BL BC BR")
      (setq kwd_just (getkword (strcat "\nJustificação [TL/TC/TR/ML/MC/MR/BL/BC/BR] <" *tmd_viga_just* ">: ")))
      (if kwd_just (setq *tmd_viga_just* kwd_just))

      (setq kwd_rot (getreal (strcat "\nRotação do perfil em graus (Ex: 0, 90, 180) <" (rtos *tmd_viga_rot* 2 0) ">: ")))
      (if kwd_rot (setq *tmd_viga_rot* kwd_rot))
    )
  )

  (setq p_forma (nth 1 perfil_data) p_x (atof (nth 2 perfil_data)) p_y (atof (nth 3 perfil_data)) p_espessura (atof (nth 4 perfil_data)))

  ;; CÁLCULO DE JUSTIFICAÇÃO MATEMÁTICA
  (setq shift_x 
    (cond ((vl-string-search "L" *tmd_viga_just*) (/ p_x 2.0))     
          ((vl-string-search "R" *tmd_viga_just*) (- (/ p_x 2.0))) 
          (t 0.0)
    )
  )
  (setq shift_y 
    (cond ((vl-string-search "B" *tmd_viga_just*) (/ p_y 2.0))     
          ((vl-string-search "T" *tmd_viga_just*) (- (/ p_y 2.0))) 
          (t 0.0)
    )
  )

  ;; 3. O LOOP DE CONTINUIDADE
  (setq loop_active T)
  (setvar "OSMODE" 39)
  
  (vl-cmdf "_.UCS" "_World")
  (setq pt_start (getpoint "\nClique no Ponto INICIAL da viga: "))
  (if (not pt_start) (setq loop_active nil))

  (while loop_active
    (vl-cmdf "_.UCS" "_World")
    (setq pt_next (getpoint pt_start "\nClique no Ponto FINAL (ou [ENTER] para sair): "))
    
    (if pt_next
      (progn
        (setq pt_a pt_start pt_b pt_next)
        (setq dist (distance pt_a pt_b))

        (vl-cmdf "_.UCS" "_ZAxis" "_non" pt_a "_non" pt_b)
        (if (/= *tmd_viga_rot* 0.0) (vl-cmdf "_.UCS" "_Z" *tmd_viga_rot*))

        ;; ==============================================================
        ;; GEOMETRIA COMPLETA PARA TODAS AS FORMAS
        ;; ==============================================================
        (cond
          ;; METALON
          ((= p_forma "RECT_VAZIO")
            (setq p1 (list (+ (- (/ p_x 2.0)) shift_x) (+ (- (/ p_y 2.0)) shift_y) 0.0))
            (setq p2 (list (+ (/ p_x 2.0) shift_x) (+ (/ p_y 2.0) shift_y) dist))
            (vl-cmdf "_.BOX" "_non" p1 "_non" p2)
            (setq ent_outer (entlast))

            (setq p3 (list (+ (+ (- (/ p_x 2.0)) p_espessura) shift_x) (+ (+ (- (/ p_y 2.0)) p_espessura) shift_y) -1.0))
            (setq p4 (list (+ (- (/ p_x 2.0) p_espessura) shift_x) (+ (- (/ p_y 2.0) p_espessura) shift_y) (+ dist 1.0)))
            (vl-cmdf "_.BOX" "_non" p3 "_non" p4)
            (setq ent_inner (entlast))

            (vl-cmdf "_.SUBTRACT" ent_outer "" ent_inner "")
            (setq ent_outer (entlast))
          )

          ;; VIGA U
          ((= p_forma "PERFIL_U")
            (setq p1 (list (+ (- (/ p_x 2.0)) shift_x) (+ (- (/ p_y 2.0)) shift_y) 0.0))
            (setq p2 (list (+ (/ p_x 2.0) shift_x) (+ (/ p_y 2.0) shift_y) dist))
            (vl-cmdf "_.BOX" "_non" p1 "_non" p2)
            (setq ent_outer (entlast))

            (setq p3 (list (+ (+ (- (/ p_x 2.0)) p_espessura) shift_x) (+ (+ (- (/ p_y 2.0)) p_espessura) shift_y) -1.0))
            (setq p4 (list (+ (+ (/ p_x 2.0) 10.0) shift_x) (+ (- (/ p_y 2.0) p_espessura) shift_y) (+ dist 1.0)))
            (vl-cmdf "_.BOX" "_non" p3 "_non" p4)
            (setq ent_inner (entlast))

            (vl-cmdf "_.SUBTRACT" ent_outer "" ent_inner "")
            (setq ent_outer (entlast))
          )

          ;; VIGA C
          ((= p_forma "PERFIL_C")
            (setq p1 (list (+ (- (/ p_x 2.0)) shift_x) (+ (- (/ p_y 2.0)) shift_y) 0.0))
            (setq p2 (list (+ (/ p_x 2.0) shift_x) (+ (/ p_y 2.0) shift_y) dist))
            (vl-cmdf "_.BOX" "_non" p1 "_non" p2)
            (setq ent_outer (entlast))

            (setq p3 (list (+ (+ (- (/ p_x 2.0)) p_espessura) shift_x) (+ (+ (- (/ p_y 2.0)) p_espessura) shift_y) -1.0))
            (setq p4 (list (+ (- (/ p_x 2.0) p_espessura) shift_x) (+ (- (/ p_y 2.0) p_espessura) shift_y) (+ dist 1.0)))
            (vl-cmdf "_.BOX" "_non" p3 "_non" p4)
            (setq ent_inner (entlast))
            (vl-cmdf "_.SUBTRACT" ent_outer "" ent_inner "")
            (setq ent_outer (entlast))

            (setq p_gap1 (list (+ (- (/ p_x 2.0) p_espessura 1.0) shift_x) (+ (+ (- (/ p_y 2.0)) 10.0) shift_y) -1.0))
            (setq p_gap2 (list (+ (+ (/ p_x 2.0) 10.0) shift_x) (+ (- (/ p_y 2.0) 10.0) shift_y) (+ dist 1.0)))
            (vl-cmdf "_.BOX" "_non" p_gap1 "_non" p_gap2)
            (setq ent_gap (entlast))
            (vl-cmdf "_.SUBTRACT" ent_outer "" ent_gap "")
            (setq ent_outer (entlast))
          )

          ;; TUBO REDONDO
          ((= p_forma "CIRC_VAZIO")
            (vl-cmdf "_.CYLINDER" "_non" (list shift_x shift_y 0.0) (/ p_x 2.0) dist)
            (setq ent_outer (entlast))
            (vl-cmdf "_.CYLINDER" "_non" (list shift_x shift_y -1.0) (- (/ p_x 2.0) p_espessura) (+ dist 2.0))
            (setq ent_inner (entlast))
            (vl-cmdf "_.SUBTRACT" ent_outer "" ent_inner "")
            (setq ent_outer (entlast))
          )
        )
        ;; ==============================================================

        ;; INJEÇÃO DE ADN
        (if ent_outer
          (progn
            (setq nivel_global (vlax-ldata-get "dict_TMDigital" "NIVEL_GLOBAL"))
            (if (not nivel_global) (setq nivel_global 0.0))

            (vlax-ldata-put ent_outer "TMD_CLASSE" "ESTRUTURA")
            (vlax-ldata-put ent_outer "TMD_TIPO" "VIGA")
            (vlax-ldata-put ent_outer "TMD_NOME" p_nome)
            (vlax-ldata-put ent_outer "TMD_MATERIAL" "Aço Carbono")
            (vlax-ldata-put ent_outer "TMD_NIVEL" nivel_global)
            (vlax-ldata-put ent_outer "TMD_PTS" (list pt_a pt_b))
            (vlax-ldata-put ent_outer "TMD_PARAMS" (list p_forma p_x p_y p_espessura dist *tmd_viga_just* *tmd_viga_rot*))
          )
        )

        (setq pt_start pt_next)
      )
      (setq loop_active nil)
    )
  )

  (vl-cmdf "_.UCS" "_World")
  (setvar "OSMODE" old_osmode)
  (setvar "CMDECHO" old_cmdecho)

  (princ "\n[TM Digital] Comando Finalizado.")
  (princ)
)

(princ "\n[TMD] Estruturas V2.3 Carregado. Digite VIGA.")
(princ)