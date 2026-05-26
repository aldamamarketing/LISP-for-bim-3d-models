;;; =====================================================================================
;;; TM DIGITAL - INSERIDOR DE PORTAS MVP (Etapa 1.1: Correção do Sistema de Coordenadas)
;;; =====================================================================================

(vl-load-com)

(defun c:PORTA ( / old_osmode sel_parede ent_parede tmd_tipo tmd_params espessura handle_parede
                   pt_insert pt_dir ang pt_y v_largura v_altura str_largura str_altura
                   p_furo1 p_furo2 box_furo ent_folha ss_porta i ent_peca)

  (setq old_osmode (getvar "OSMODE"))
  (vl-cmdf "_.UCS" "_World")

  (princ "\n[TM Digital] - Inseridor de Portas e Esquadrias")

  ;; 1. LER A PAREDE
  (setq sel_parede (entsel "\n1. Selecione a Parede 3D TM Digital: "))
  (if (not sel_parede) (progn (princ "\nCancelado.") (exit)))
  
  (setq ent_parede (car sel_parede))
  (setq tmd_tipo (vlax-ldata-get ent_parede "TMD_TIPO"))
  
  (if (/= tmd_tipo "PAREDE")
    (progn (princ "\n[Erro] O objeto selecionado não é uma Parede gerada pela TM Digital.") (exit))
  )

  ;; Extrai a espessura do ADN
  (setq tmd_params (vlax-ldata-get ent_parede "TMD_PARAMS"))
  (setq espessura (atof (nth 0 tmd_params)))
  (setq handle_parede (cdr (assoc 5 (entget ent_parede))))
  (princ (strcat "\n[!] Parede reconhecida. Espessura lida: " (rtos espessura 2 1) " mm"))

  ;; 2. CAPTURAR POSIÇÃO E DIREÇÃO
  (setvar "OSMODE" 39) ; End, Mid, Int
  (setq pt_insert (getpoint "\n2. Clique no Ponto Inicial da Porta (Canto no chão): "))
  (setq pt_dir (getpoint pt_insert "\n3. Clique na direção da Parede (Para o lado que a porta corre): "))
  (setvar "OSMODE" 0)

  ;; 3. DEFINIR MEDIDAS
  (setq v_largura "800.0" v_altura "2100.0")
  (setq str_largura (getstring (strcat "\nLargura da Porta <" v_largura ">: ")))
  (if (/= str_largura "") (setq v_largura str_largura))
  (setq str_altura (getstring (strcat "\nAltura da Porta <" v_altura ">: ")))
  (if (/= str_altura "") (setq v_altura str_altura))

  (setq v_largura (atof v_largura) v_altura (atof v_altura))

  ;; 4. GIRAR O MUNDO PARA ALINHAR COM A PAREDE (CORREÇÃO VETORIAL)
  ;; Calculamos o ângulo exato da parede na planta baixa
  (setq ang (angle pt_insert pt_dir))
  ;; Criamos um ponto imaginário a exatos 90 graus (pi/2 radianos) para definir a profundidade
  (setq pt_y (polar pt_insert (+ ang (/ pi 2.0)) 10.0)) 

  ;; Travamos o UCS usando os 3 pontos: Origem, Eixo X, Eixo Y
  (vl-cmdf "_.UCS" "_3P" "_non" pt_insert "_non" pt_dir "_non" pt_y)

  ;; 5. O FURO MÁGICO
  ;; A caixa de furo atravessa um pouco os limites (Y de -10 até espessura + 10) para garantir corte limpo
  (setq p_furo1 (list 0.0 -10.0 0.0))
  (setq p_furo2 (list v_largura (+ espessura 10.0) v_altura))
  
  (vl-cmdf "_.BOX" "_non" p_furo1 "_non" p_furo2)
  (setq box_furo (entlast))

  ;; Executa a operação Booleana (a parede vira um 3DSolid regular aqui, mas não perde a posição)
  (vl-cmdf "_.SUBTRACT" ent_parede "" box_furo "")

  ;; 6. DESENHAR A PORTA
  (setq ss_porta (ssadd))

  ;; Marco/Batente (Lateral Esquerda)
  (vl-cmdf "_.BOX" "_non" '(0.0 0.0 0.0) "_non" (list 30.0 espessura v_altura))
  (ssadd (entlast) ss_porta)
  
  ;; Marco/Batente (Lateral Direita)
  (vl-cmdf "_.BOX" "_non" (list (- v_largura 30.0) 0.0 0.0) "_non" (list v_largura espessura v_altura))
  (ssadd (entlast) ss_porta)

  ;; Marco/Batente (Topo)
  (vl-cmdf "_.BOX" "_non" (list 30.0 0.0 (- v_altura 30.0)) "_non" (list (- v_largura 30.0) espessura v_altura))
  (ssadd (entlast) ss_porta)

  ;; Folha da Porta (35mm de espessura)
  (vl-cmdf "_.BOX" "_non" '(30.0 0.0 0.0) "_non" (list (- v_largura 30.0) 35.0 (- v_altura 30.0)))
  (ssadd (entlast) ss_porta)

  ;; 7. INJEÇÃO DE ADN NA PORTA
  (setq i 0)
  (while (< i (sslength ss_porta))
    (setq ent_peca (ssname ss_porta i))
    (vlax-ldata-put ent_peca "TMD_TIPO" "PORTA")
    (vlax-ldata-put ent_peca "TMD_PAREDE_PAI" handle_parede)
    (vlax-ldata-put ent_peca "TMD_DIMENSOES" (list v_largura v_altura))
    (setq i (1+ i))
  )

  (vl-cmdf "_.-GROUP" "_Create" "*" "TMD_Porta" ss_porta "")

  ;; Restaura o mundo
  (vl-cmdf "_.UCS" "_World")
  (setvar "OSMODE" old_osmode)
  
  (princ "\n[TM Digital] Porta inserida perfeitamente!")
  (princ)
)

(princ "\n[TMD] Digite PORTA para iniciar.")
(princ)