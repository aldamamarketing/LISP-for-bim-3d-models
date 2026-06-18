;;; ==========================================================================
;;; MÓDULO: TM DIGITAL - SETUP PROFISSIONAL ABNT (V2)
;;; Comando: TM_SETUP
;;; Função: Configura Layers, Cotas, Layouts A4/A3/A2 e cria Carimbo c/ Atributos.
;;; ==========================================================================

(vl-load-com)

(defun c:TM_SETUP ( / pt make-text make-attdef)
  (princ "\nIniciando configuracao do Ecossistema TM Digital...")

  ;; 1. VARIAVEIS DE AMBIENTE
  (setvar "INSUNITS" 4)    ; Milímetros
  (setvar "LUPREC" 2)      ; Precisao decimal

  ;; 2. LAYERS PADRONIZADOS TM DIGITAL
  (command "_.-LAYER" 
    "_M" "TM-00-MARGENS" "_C" "7" "" "_LW" "0.50" ""
    "_M" "TM-01-COTAS" "_C" "1" "" "_LW" "0.13" ""
    "_M" "TM-02-ESQUADRIAS" "_C" "2" "" "_LW" "0.20" ""
    "_M" "TM-03-VISTA" "_C" "3" "" "_LW" "0.30" ""
    "_M" "TM-04-CORTE_ACM" "_C" "4" "" "_LW" "0.40" ""
    "_M" "TM-05-TEXTOS" "_C" "7" "" "_LW" "0.20" ""
    "_M" "TM-06-ESTRUTURA" "_C" "5" "" "_LW" "0.50" ""
    "_M" "TM-ACM-VINCO" "_C" "6" "" "_L" "DASHED" "" "_LW" "0.25" ""
    ""
  )

  ;; 3. ESTILO DE TEXTO ARIAL
  (if (not (tblsearch "STYLE" "TM_ARIAL"))
    (command "_.-STYLE" "TM_ARIAL" "Arial" "0" "1" "0" "_N" "_N")
  )
  (setvar "TEXTSTYLE" "TM_ARIAL")

  ;; 4. ESTILO DE COTA (TM_COTA_ACM)
  (setvar "DIMTXSTY" "TM_ARIAL")
  (setvar "DIMASZ" 2.5)   ; Tamanho do traço arquitetônico
  (setvar "DIMTXT" 2.5)   ; Altura do texto
  (setvar "DIMEXE" 1.0)   ; Linha de extensão além da cota
  (setvar "DIMEXO" 1.0)   ; Offset da origem
  (setvar "DIMTAD" 1)     ; Texto acima da linha
  (setvar "DIMDEC" 1)     ; 1 casa decimal para ACM
  (vl-catch-all-apply 'setvar (list "DIMBLK" "_ARCHTICK"))
  (if (not (tblsearch "DIMSTYLE" "TM_COTA_ACM"))
    (command "_.-DIMSTYLE" "_S" "TM_COTA_ACM")
  )
  (command "_.-DIMSTYLE" "_R" "TM_COTA_ACM")

  ;; 5. DESENHO DO CARIMBO MESTRE (MODEL SPACE)
  (setvar "CTAB" "Model")
  (setvar "CLAYER" "TM-00-MARGENS")
  
  ;; Desenha a estrutura do carimbo (175x50mm) na coordenada 0,0
  (command "_.RECTANG" "0,0" "175,50")
  (command "_.LINE" "0,35" "175,35" "") ; Linha abaixo do Logo
  (command "_.LINE" "0,20" "175,20" "") ; Linha abaixo do Projeto
  (command "_.LINE" "0,10" "175,10" "") ; Linha abaixo do Endereço
  (command "_.LINE" "60,0" "60,10" "")  ; Divisão Data
  (command "_.LINE" "120,0" "120,10" "") ; Divisão Escala
  
  (setvar "CLAYER" "TM-05-TEXTOS")

  ;; Função Auxiliar para Textos Fixos
  (defun make-text (pt txt hgt)
    (entmake (list '(0 . "TEXT") (cons 10 pt) (cons 40 hgt) (cons 1 txt) '(7 . "TM_ARIAL")))
  )
  ;; Função Auxiliar para Atributos (Textos Dinâmicos)
  (defun make-attdef (tag prompt default pt hgt)
    (entmake (list '(0 . "ATTDEF") '(100 . "AcDbEntity") '(100 . "AcDbText")
                   (cons 10 pt) (cons 40 hgt) (cons 1 default) '(7 . "TM_ARIAL")
                   '(100 . "AcDbAttributeDefinition") (cons 2 tag) (cons 3 prompt) '(70 . 0)))
  )

  ;; Inserindo Textos Fixos (Títulos)
  (make-text '(75 39) "TM DIGITAL - SOLUÇÕES EM ACM" 4.0)
  (make-text '(2 29) "CLIENTE:" 1.5)
  (make-text '(2 15) "PROJETO:" 1.5)
  (make-text '(2 5) "DATA:" 1.5)
  (make-text '(62 5) "ESCALA:" 1.5)
  (make-text '(122 5) "PRANCHA:" 1.5)

  ;; Inserindo Atributos (Os que você vai preencher ao clicar no bloco)
  (make-attdef "CLIENTE" "Nome do Cliente?" "Nome do Cliente" '(2 23.5) 3.0)
  (make-attdef "PROJETO" "Descricao do Projeto?" "Revestimento Fachada" '(2 11.5) 2.5)
  (make-attdef "DATA" "Data do Projeto?" "00/00/0000" '(15 5) 2.0)
  (make-attdef "ESCALA" "Escala da Impressao?" "INDICADA" '(80 5) 2.0)
  (make-attdef "PRANCHA" "Numero da Prancha?" "01/01" '(145 5) 2.0)


  ;; 6. CRIAÇÃO DOS LAYOUTS (A4, A3, A2) COM MARGENS
  (setvar "CLAYER" "TM-00-MARGENS")

  ;; Layout A4 (Paisagem: 297x210)
  (command "_.LAYOUT" "_N" "A4_TM")
  (setvar "CTAB" "A4_TM")
  (command "_.ERASE" "_ALL" "")
  (command "_.RECTANG" "0,0" "297,210") ; Folha
  (command "_.RECTANG" "25,7" "290,203") ; Margem

  ;; Layout A3 (Paisagem: 420x297)
  (command "_.LAYOUT" "_N" "A3_TM")
  (setvar "CTAB" "A3_TM")
  (command "_.ERASE" "_ALL" "")
  (command "_.RECTANG" "0,0" "420,297") ; Folha
  (command "_.RECTANG" "25,7" "413,290") ; Margem

  ;; Layout A2 (Paisagem: 594x420)
  (command "_.LAYOUT" "_N" "A2_TM")
  (setvar "CTAB" "A2_TM")
  (command "_.ERASE" "_ALL" "")
  (command "_.RECTANG" "0,0" "594,420") ; Folha
  (command "_.RECTANG" "25,7" "587,413") ; Margem

  ;; Retorna ao Model e dá zoom no Carimbo
  (setvar "CTAB" "Model")
  (command "_.ZOOM" "_E")
  
  (princ "\n✅ Setup TM DIGITAL concluido! Carimbo gerado no Model, Layouts A4/A3/A2 criados.")
  (princ)
)