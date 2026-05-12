;;; ==================================================================
;;; TMD_Internal_Carimbo.lsp - TM Digital (v1.0)
;;; Generador de Carimbo Vertical Compacto para Producción Interna
;;; ==================================================================

(defun c:TMD_CARIMBO (/ size w h p_base p_tr p_bl p_path)
  (setq old_osmode (getvar "OSMODE"))
  (setvar "OSMODE" 0)
  (setvar "CMDECHO" 0)

  (initget "A4 A3")
  (setq size (getkword "\nSeleccione tamaño de hoja [A4/A3] <A4>: "))
  (if (null size) (setq size "A4"))

  ;; Configuración de dimensiones (Layout mm)
  (if (= size "A4")
    (setq w 210.0 h 283.0) ; A4 Vertical (Altura personalizada)
    (setq w 420.0 h 283.0) ; A3 Horizontal (Altura personalizada)
  )

  (setq p_base (list w 0 0)) ; Esquina inferior derecha
  (setq p_path (list 10 5 0)) ; Inicio del pie de página (rastro digital)

  (princ (strcat "\n[TMD] Generando Carimbo Vertical para " size "..."))

  ;; Determinar nombre del bloque
  (setq blk_name (strcat "TMD_CARIMBO_INT_" size))

  ;; 1. SI EL BLOQUE YA EXISTE, SOLO INSERTAR
  (if (tblsearch "BLOCK" blk_name)
    (progn
      (princ (strcat "\n[TMD] El bloque " blk_name " ya existe. Insertando..."))
      (command "_.insert" blk_name (list 0 0 0) 1 1 0)
    )
    (progn
      (princ (strcat "\n[TMD] Creando nuevo bloque maestro " blk_name "..."))
      
      ;; Iniciar Selección para el bloque
      (setq ss (ssadd))

      ;; A. DIBUJAR MARCO DE CARIMBO (Columna de 50mm)
      (command "_.rectang" (list (- w 50) 0) (list w h))
      (ssadd (entlast) ss)
      
      ;; 2. DIVISORES Y TEXTOS
      (setq y h)
      (defun draw_div (offset)
        (setq y (- y offset))
        (command "_.line" (list (- w 50) y) (list w y) "")
        (ssadd (entlast) ss)
      )

      ;; SECCIÓN LOGO
      (draw_div 30)
      (command "_.text" "_J" "_MC" (list (- w 25) (+ y 15)) 3.5 0 "TM PROJETOS")
      (ssadd (entlast) ss)

      ;; SECCIÓN IDENTIDAD
      (draw_div 40)
      (command "_.text" (list (- w 48) (- y -36)) 2.0 0 "CLIENTE:") (ssadd (entlast) ss)
      (TMD:add-attr "CLIENTE" "NOME DO CLIENTE" (list (- w 48) (- y -30)) 3.0) (ssadd (entlast) ss)
      (command "_.text" (list (- w 48) (- y -20)) 2.0 0 "PROJETO:") (ssadd (entlast) ss)
      (TMD:add-attr "PROJETO" "NOME DO PROJETO" (list (- w 48) (- y -14)) 3.0) (ssadd (entlast) ss)

      ;; ESPECIALIDAD Y TÍTULO
      (draw_div 40)
      (command "_.text" (list (- w 48) (- y -36)) 2.0 0 "ESPECIALIDADE:") (ssadd (entlast) ss)
      (TMD:add-attr "ESPEC" "SERRALHERIA / CORTE" (list (- w 48) (- y -30)) 3.5) (ssadd (entlast) ss)
      (command "_.text" (list (- w 48) (- y -20)) 2.0 0 "DESENHO (CONTEÚDO):") (ssadd (entlast) ss)
      (TMD:add-attr "TITULO" "PLANTA / CORTE / DETALHE" (list (- w 48) (- y -14)) 3.0) (ssadd (entlast) ss)

      ;; RESPONSABLES
      (draw_div 50)
      (command "_.text" (list (- w 48) (- y -10)) 1.8 0 "DESENHO:") (ssadd (entlast) ss)
      (TMD:add-attr "AUTOR" "NOME" (list (- w 25) (- y -10)) 2.0) (ssadd (entlast) ss)
      (command "_.text" (list (- w 48) (- y -20)) 1.8 0 "REVISÃO:") (ssadd (entlast) ss)
      (TMD:add-attr "REVISOR" "NOME" (list (- w 25) (- y -20)) 2.0) (ssadd (entlast) ss)
      (command "_.text" (list (- w 48) (- y -30)) 1.8 0 "APROV.:") (ssadd (entlast) ss)
      (TMD:add-attr "APROV" "NOME" (list (- w 25) (- y -30)) 2.0) (ssadd (entlast) ss)
      (command "_.text" (list (- w 48) (- y -45)) 1.8 0 "IMPRESSÃO:") (ssadd (entlast) ss)
      (command "_.text" (list (- w 25) (- y -45)) 2.0 0 "FECHA_FIELD") (ssadd (entlast) ss)

      ;; RECEPCIÓN
      (draw_div 40)
      (command "_.text" "_J" "_MC" (list (- w 25) (- y -8)) 2.0 0 "PROTOCOLO DE RECEBIMENTO") (ssadd (entlast) ss)
      (command "_.text" (list (- w 48) (- y -20)) 1.8 0 "RECEBIDO POR: ________________") (ssadd (entlast) ss)
      (command "_.text" (list (- w 48) (- y -35)) 1.8 0 "DATA: ____/____/____") (ssadd (entlast) ss)

      ;; PIE DE PÁGINA (RASTRO)
      (command "_.text" p_path 1.5 0 "ARQUIVO DIGITAL (RASTRO): [INSERIR FIELD FILENAME AQUI]") (ssadd (entlast) ss)

      ;; 3. CREAR EL BLOQUE DEFINITIVO
      (command "_.block" blk_name (list 0 0 0) ss "")
      
      ;; 4. INSERTAR EL BLOQUE CREADO
      (command "_.insert" blk_name (list 0 0 0) 1 1 0)
    )
  )

  (setvar "OSMODE" old_osmode)
  (princ (strcat "\n[OK] Carimbo " blk_name " insertado como bloque. ¡No olvides insertar los Fields!"))
  (princ)
)


;; Función auxiliar para crear Atributos
(defun TMD:add-attr (tag prompt point size / )
  (command "_.attdef" "" tag prompt tag "_J" "_L" point size 0)
)

(princ "\n[TMD] Comando TMD_CARIMBO cargado.")
(princ)
