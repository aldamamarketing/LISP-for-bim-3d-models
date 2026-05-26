;;; ==========================================================================
;;; MÓDULO: ALDAMA AUXILIARES E GERAIS
;;; Desenvolvido para AutoCAD 2021
;;; Comandos: GERAR_GRELHA
;;; ==========================================================================

(vl-load-com)

;;; ==========================================================================
;;; COMANDO: GERAR_GRELHA (Estilo Revit)
;;; ==========================================================================
(defun c:GERAR_GRELHA ( / pt-base ang-dir dist qtd eixo-ini eixo-atual tipo-eixo i pt-ins attr-val)
  
  (if (not (tblsearch "BLOCK" "EIXO_GRELHA"))
    (progn
      (princ "\nERRO: O bloco 'EIXO_GRELHA' não foi encontrado.")
      (princ "\nCrie o bloco com um atributo 'NUM_EIXO' antes de usar.")
      (exit)
    )
  )

  (setq pt-base (getpoint "\n[Grelha] Qual o ponto inicial do primeiro eixo? "))
  (if (not pt-base) (exit))

  (setq ang-dir (getangle pt-base "\nIndique a direção para onde os eixos vão crescer (clique em um ponto): "))
  (if (not ang-dir) (exit))

  (setq dist (getreal "\nQual a distância entre os eixos (em milímetros)? [Ex: 1200]: "))
  (if (not dist) (exit))

  (setq qtd (getint "\nQuantos eixos totais você quer gerar? [Ex: 10]: "))
  (if (not qtd) (exit))

  (setq eixo-ini (getstring "\nQual o nome do primeiro eixo? (Letra ou Número) [Ex: A ou 1]: "))
  (if (= eixo-ini "") (exit))

  (if (numberp (read eixo-ini))
    (setq tipo-eixo "NUMERO" eixo-atual (atoi eixo-ini))
    (setq tipo-eixo "LETRA"  eixo-atual (ascii (strcase eixo-ini))) 
  )

  (setq i 0)
  (while (< i qtd)
    (setq pt-ins (polar pt-base ang-dir (* i dist)))
    
    (if (= tipo-eixo "NUMERO")
      (setq attr-val (itoa eixo-atual))
      (setq attr-val (chr eixo-atual))
    )

    (aldama-inserir-bloco-atributo "EIXO_GRELHA" pt-ins attr-val)

    (setq i (1+ i))
    (setq eixo-atual (1+ eixo-atual))
  )

  (princ (strcat "\nGrelha com " (itoa qtd) " eixos gerada com sucesso!"))
  (princ)
)

;;; ==========================================================================
;;; FUNÇÃO AUXILIAR
;;; ==========================================================================
(defun aldama-inserir-bloco-atributo (nome-bloco pt valor / obj-vla attrs)
  (setq obj-vla (vla-InsertBlock 
                  (vla-get-ModelSpace (vla-get-ActiveDocument (vlax-get-acad-object))) 
                  (vlax-3d-point pt) 
                  nome-bloco 
                  1.0 1.0 1.0 0.0))
  
  (if (= (vla-get-HasAttributes obj-vla) :vlax-true)
    (progn
      (setq attrs (vlax-invoke obj-vla 'GetAttributes))
      (foreach att attrs
        (if (= (strcase (vla-get-TagString att)) "NUM_EIXO")
          (vla-put-TextString att valor)
        )
      )
    )
  )
)

(princ "\n=== MÓDULO ALDAMA AUXILIARES CARREGADO ===")
(princ "\nComando disponível: GERAR_GRELHA")
(princ)