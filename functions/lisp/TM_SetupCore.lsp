;;; ==========================================================================
;;; MÓDULO: TM DIGITAL - CORE SETUP (V4)
;;; Comando: TM_SETUP_CORE
;;; Função: Configura Unidades, Layers, Textos e Cotas (Sem Layouts/Carimbos).
;;; ==========================================================================

(vl-load-com)

(defun c:TM_SETUP_CORE ()
  (princ "\nIniciando configuracao do Core TM Digital...")

  ;; 1. VARIAVEIS DE AMBIENTE (Precisão para CNC)
  (setvar "INSUNITS" 4)    ; Milímetros
  (setvar "LUPREC" 2)      ; Precisao decimal (0.00)

  ;; 2. LAYERS PADRONIZADOS TM DIGITAL (O CORAÇÃO DO CTB)
  (command "_.-LAYER" 
    ;; --- GRUPO 0: ORGANIZAÇÃO GERAL ---
    "_M" "TM-00-MARGENS" "_C" "7" "" "_LW" "0.50" ""
    "_M" "TM-00-TEXTOS_COTAS" "_C" "1" "" "_LW" "0.15" ""
    
    ;; --- GRUPO 1: O PROJETO DA TM DIGITAL (FABRICAÇÃO) ---
    "_M" "TM-01-ESTRUTURA_METALICA" "_C" "5" "" "_LW" "0.50" "" ; Azul Forte
    "_M" "TM-02-CORTE_ACM" "_C" "4" "" "_LW" "0.40" ""          ; Ciano
    "_M" "TM-03-VINCO_ACM" "_C" "6" "" "_L" "DASHED" "" "_LW" "0.25" "" ; Magenta Tracejado
    "_M" "TM-04-DETALHAMENTO" "_C" "3" "" "_LW" "0.30" ""       ; Verde (Parafusos, Presilhas)
    "_M" "TM-05-PROJECOES" "_C" "2" "" "_L" "HIDDEN" "" "_LW" "0.20" "" ; Amarelo Tracejado
    
    ;; --- GRUPO 2: ARQUIVOS EXTERNOS E ARQUITETURA ---
    "_M" "TM-99-BASE_ARQUITETO" "_C" "8" "" "_LW" "0.09" ""     ; Cinza Fino (Fundo)
    ""
  )

  ;; 3. ESTILO DE TEXTO
  (if (not (tblsearch "STYLE" "TM_ARIAL"))
    (command "_.-STYLE" "TM_ARIAL" "Arial" "0" "1" "0" "_N" "_N")
  )
  (setvar "TEXTSTYLE" "TM_ARIAL")

  ;; 4. ESTILO DE COTA (TM_COTA_ACM)
  (setvar "DIMTXSTY" "TM_ARIAL")
  (setvar "DIMASZ" 2.5)   
  (setvar "DIMTXT" 2.5)   
  (setvar "DIMEXE" 1.0)   
  (setvar "DIMEXO" 1.0)   
  (setvar "DIMTAD" 1)     
  (setvar "DIMDEC" 1)     
  (vl-catch-all-apply 'setvar (list "DIMBLK" "_ARCHTICK"))
  
  (if (not (tblsearch "DIMSTYLE" "TM_COTA_ACM"))
    (command "_.-DIMSTYLE" "_S" "TM_COTA_ACM")
  )
  (command "_.-DIMSTYLE" "_R" "TM_COTA_ACM")

  ;; Define o layer de Corte como o ativo para já começar a desenhar
  (setvar "CLAYER" "TM-02-CORTE_ACM")
  
  (princ "\n✅ Core TM DIGITAL configurado! Layers, Textos e Cotas atualizados com sucesso.")
  (princ)
)