;;; =====================================================================================
;;; TM DIGITAL - GERADOR DE PAREDES DINÂMICAS MVP (V1.1 - ADN Padrão Completo)
;;; Usa o motor nativo POLYSOLID + Injeção de Dicionários (ADN)
;;; =====================================================================================

(vl-load-com)

(defun c:PAREDE ( / old_cmdecho reg_path v_largura v_altura v_just 
                    str_largura str_altura str_just
                    last_ent ss_novas nxt piece nivel_global i)

  (setq old_cmdecho (getvar "CMDECHO"))
  (setvar "CMDECHO" 1) ; Precisamos ver os prompts na linha de comando

  ;;; 1. MEMÓRIA GLOBAL (Registro Windows)
  (setq reg_path "HKEY_CURRENT_USER\\Software\\TMDigital\\Paredes")
  (defun get-reg (k d / v) (setq v (vl-registry-read reg_path k)) (if v v d))
  (defun set-reg (k v) (vl-registry-write reg_path k v))

  ;; Carrega os últimos valores usados
  (setq v_largura (get-reg "p_largura" "150.0")
        v_altura  (get-reg "p_altura" "2800.0")
        v_just    (get-reg "p_just" "Center")) ; Left, Center, Right

  (princ "\n[TM Digital] -- Ferramenta de Paredes Dinâmicas --")

  ;;; 2. INPUTS NA LINHA DE COMANDO
  ;; Altura
  (setq str_altura (getstring (strcat "\nEspecifique a ALTURA da parede <" v_altura ">: ")))
  (if (and (/= str_altura "") (atof str_altura)) (setq v_altura str_altura))

  ;; Largura
  (setq str_largura (getstring (strcat "\nEspecifique a LARGURA/Espessura <" v_largura ">: ")))
  (if (and (/= str_largura "") (atof str_largura)) (setq v_largura str_largura))

  ;; Alinhamento (Justification)
  (initget "Interior Centro Exterior")
  (setq str_just (getkword (strcat "\nAlinhamento da linha de desenho [Interior/Centro/Exterior] <" 
                                   (cond ((= v_just "Left") "Interior")
                                         ((= v_just "Right") "Exterior")
                                         (t "Centro")) ">: ")))
  
  (if str_just
    (setq v_just (cond ((= str_just "Interior") "Left")
                       ((= str_just "Exterior") "Right")
                       ((= str_just "Centro") "Center")))
  )

  ;; Salva para a próxima vez
  (set-reg "p_altura" v_altura)
  (set-reg "p_largura" v_largura)
  (set-reg "p_just" v_just)

  ;;; 3. RASTREAMENTO DE ENTIDADES (O truque mágico)
  ;; Marcamos qual foi a última entidade do desenho ANTES de começar a parede
  (setq last_ent (entlast))

  ;;; 4. EXECUÇÃO DO MOTOR DINÂMICO (POLYSOLID)
  (princ "\n[DICA] Clique para iniciar. Desenhe como uma linha comum. Pressione ENTER para finalizar e injetar o ADN.")
  
  (command "_.POLYSOLID" "_Height" v_altura "_Width" v_largura "_Justify" v_just)
  
  (while (> (getvar "CMDACTIVE") 0)
    (command pause)
  )

  ;;; -----------------------------------------------------------------------
  ;;; BLOCO CORRIGIDO: RASTREAMENTO DAS PAREDES NOVAS
  ;;; -----------------------------------------------------------------------
  (setq ss_novas (ssadd))
  (setq nxt (if last_ent (entnext last_ent) (entnext)))
  
  (while nxt
    (if (= (cdr (assoc 0 (entget nxt))) "3DSOLID")
      (ssadd nxt ss_novas)
    )
    (setq nxt (entnext nxt))
  )

  ;;; 5. INJEÇÃO DO ADN (LData) Alinhado com o Documento Padrão
  (setq nivel_global (vlax-ldata-get "dict_TMDigital" "NIVEL_GLOBAL"))
  (if (not nivel_global) (setq nivel_global 0.0))

  (if (> (sslength ss_novas) 0)
    (progn
      (setq i 0)
      (while (< i (sslength ss_novas))
        (setq piece (ssname ss_novas i))
        
        ;; Propriedades Universais
        (vlax-ldata-put piece "TMD_CLASSE" "ARQUITETURA")
        (vlax-ldata-put piece "TMD_TIPO" "PAREDE")
        (vlax-ldata-put piece "TMD_NOME" "Parede Básica")
        (vlax-ldata-put piece "TMD_MATERIAL" "Alvenaria")
        (vlax-ldata-put piece "TMD_NIVEL" nivel_global)
        
        ;; Propriedades Específicas (Matemática)
        (vlax-ldata-put piece "TMD_PARAMS" (list v_largura v_altura v_just))
        
        (setq i (1+ i))
      )
      (princ (strcat "\n[TM Digital] Sucesso! " (itoa (sslength ss_novas)) " parede(s) criadas com ADN Universal."))
    )
    (princ "\n[Aviso] Nenhuma parede nova foi detectada para injeção.")
  )

  (setvar "CMDECHO" old_cmdecho)
  (princ)
)

(princ "\n[TMD] Digite PAREDE para iniciar.")
(princ)