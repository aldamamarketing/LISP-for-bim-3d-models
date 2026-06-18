;;; =====================================================================================
;;; TM DIGITAL - ECOSSISTEMA BIM PROPRIETÁRIO (NÚCLEO E DICIONÁRIOS)
;;; Arquivo Maestro: TMD_Core.lsp
;;; Criado/Atualizado na Etapa de Brainstorming e MVP (Abril 2026)
;;; =====================================================================================
;;; HISTÓRICO DE DECISÕES ARQUITETONICA:
;;; 1. Usamos LData (Dictionaries) anexados aos objetos (3DSolid, Blocks) como nosso Banco de Dados.
;;; 2. Decidimos evitar interfaces DCL Modais complexas para a Barra de Propriedades neste MVP, 
;;;    pois travam a tela do AutoCAD. O Inspecionamento inicial será via Linha de Comando.
;;; 3. Objetos 3D "conversam" através de chaves estrangeiras (Ex: Porta salva o Handle da Parede Pai).
;;; =====================================================================================

;;; =====================================================================================
;;; DOCUMENTAÇÃO PADRÃO DO ADN (ESTRUTURA LDATA)
;;; Todo objeto inteligente deve possuir estas chaves universais:
;;; - "TMD_CLASSE"   : "ARQUITETURA", "COM_VISUAL", "ESTRUTURA"
;;; - "TMD_TIPO"     : "PAREDE", "PORTA", "TELHADO", "BANDEJA_ACM", "TOTEM"
;;; - "TMD_MATERIAL" : Ex: "ACM Vermelho", "Vidro Temperado"
;;; - "TMD_NIVEL"    : Float (Z de inserção base)
;;; - "TMD_NOME"     : String (Identificador humano)
;;; 
;;; Chaves Específicas:
;;; - "TMD_PARAMS"   : Lista com os parâmetros matemáticos que geraram o objeto.
;;; - "TMD_PAREDE_PAI" : (Apenas para furos/portas) Handle do Sólido perfurado.
;;; =====================================================================================

(vl-load-com)

;;; =====================================================================================
;;; FUNÇÃO: TMD_CONVERTER (O "Batizador" de Modelos Importados)
;;; Objetivo: Pega um Bloco burro (ex: do 3D Warehouse) e injeta o ADN da TM Digital.
;;; =====================================================================================
;; [LEGACY] TMD_CORE_CONVERTER - Substituído por TMD_MATCH para maior eficiência
(defun c:TMD_CORE_CONVERTER ( / sel ent classe tipo mat)
  (princ "\n[TM Digital] Conversor BIM")
  (initget "Help")
  (setq sel (entsel "\nSelecione o objeto/bloco para batizar com ADN TM Digital [Help]: "))
  (if (= sel "Help") (progn (TMD:util-help "TMD_CORE_CONVERTER") (setq sel (entsel "\nSelecione o objeto/bloco: "))))
  
  (if sel
    (progn
      (setq ent (car sel))
      (setq classe (getstring "\nClasse (ex: ARQUITETURA, COM_VISUAL): "))
      (setq tipo (getstring "\nTipo (ex: PORTA, TOTEM, MOBILIARIO): "))
      (setq mat (getstring T "\nMaterial: ")) ;; 'T' permite espaços na string
      
      (vlax-ldata-put ent "TMD_CLASSE" (strcase classe))
      (vlax-ldata-put ent "TMD_TIPO" (strcase tipo))
      (vlax-ldata-put ent "TMD_MATERIAL" mat)
      (vlax-ldata-put ent "TMD_NOME" (strcat tipo " Importado"))
      
      (princ "\n[!] Sucesso: Objeto convertido para Entidade TM Digital.")
    )
    (princ "\n[TMD] Comando cancelado.")
  )
  (princ)
)

;;; =====================================================================================
;;; FUNÇÃO: TMD_PROP (O Inspetor de Propriedades BIM - MVP)
;;; Objetivo: Clica em um objeto e lê tudo que há no Dicionário dele para a tela.
;;; Futuro: Isso será transformado em uma Paleta Modeless (ObjectARX/C#) ou DCL com gatilhos de edição.
;;; =====================================================================================
(defun c:TMD_CORE_PROP ( / sel ent ldata_list key val)
  (princ "\n[TM Digital] Inspetor de Propriedades")
  (initget "Help")
  (setq sel (entsel "\nSelecione um objeto para inspecionar [Help]: "))
  (if (= sel "Help") (progn (TMD:util-help "TMD_CORE_PROP") (setq sel (entsel "\nSelecione um objeto: "))))
  
  (if sel
    (progn
      (setq ent (car sel))
      
      ;; Verifica se é um objeto TM Digital buscando a chave mestre
      (if (vlax-ldata-get ent "TMD_TIPO")
        (progn
          (princ "\n=======================================")
          (princ "\n     PROPRIEDADES BIM - TM DIGITAL     ")
          (princ "\n=======================================")
          
          (princ (strcat "\n >> HANDLE (ID Único): " (cdr (assoc 5 (entget ent)))))
          
          ;; Lê as chaves universais
          (princ (strcat "\n >> CLASSE     : " (vl-princ-to-string (vlax-ldata-get ent "TMD_CLASSE"))))
          (princ (strcat "\n >> TIPO       : " (vl-princ-to-string (vlax-ldata-get ent "TMD_TIPO"))))
          (princ (strcat "\n >> NOME       : " (vl-princ-to-string (vlax-ldata-get ent "TMD_NOME"))))
          (princ (strcat "\n >> MATERIAL   : " (vl-princ-to-string (vlax-ldata-get ent "TMD_MATERIAL"))))
          
          ;; Lê chaves específicas se existirem
          (if (vlax-ldata-get ent "TMD_PAREDE_PAI")
            (princ (strcat "\n >> PAREDE PAI : " (vlax-ldata-get ent "TMD_PAREDE_PAI")))
          )
          
          ;; Lê os parâmetros geométricos (Lista)
          (if (vlax-ldata-get ent "TMD_PARAMS")
            (progn
              (princ "\n >> PARÂMETROS MATEMÁTICOS:")
              (princ (strcat "\n    " (vl-princ-to-string (vlax-ldata-get ent "TMD_PARAMS"))))
            )
          )
          
          (princ "\n=======================================\n")
        )
        (princ "\n[Aviso] Objeto comum. Não possui ADN TM Digital. Use TMD_CONVERTER para batizá-lo.")
      )
    )
    (princ "\n[TMD] Comando cancelado.")
  )
  (princ)
)

(princ "\n[TM Digital] NÚCLEO BIM CARREGADO.")
(princ "\nComandos disponíveis: TMD_CORE_CONVERTER, TMD_CORE_PROP")
(princ)