(defun c:ColumnaCorintia ( / dcl_id result alt_total tog_auto alt_base alt_fuste alt_capitel p0 radio p_fuste p_capitel old_osmode )
  
  ;; Valores por defecto
  (setq alt_total 10.0)
  
  ;; Cargar el archivo DCL
  (setq dcl_id (load_dialog "ColumnaCorintia.dcl"))
  (if (not (new_dialog "ColumnaCorintia" dcl_id))
    (progn 
      (princ "\nError: No se encuentra el archivo ColumnaCorintia.dcl. Verifica las rutas de soporte.") 
      (exit)
    )
  )

  ;; Función interna para calcular proporciones clásicas
  (defun calc-props ( h )
    (setq alt_base (* h 0.05))
    (setq alt_fuste (* h 0.83))
    (setq alt_capitel (* h 0.12))
    ;; Actualizar los campos en el DCL
    (set_tile "alt_base" (rtos alt_base 2 3))
    (set_tile "alt_fuste" (rtos alt_fuste 2 3))
    (set_tile "alt_capitel" (rtos alt_capitel 2 3))
  )

  ;; Función interna para actualizar el estado del UI (Bloquear/Desbloquear)
  (defun update-ui ( / h mode )
    (setq h (atof (get_tile "alt_total")))
    (setq mode (get_tile "tog_auto"))
    
    (if (= mode "1")
      (progn
        ;; Si está marcado, recalcular y bloquear
        (calc-props h)
        (mode_tile "alt_base" 1)
        (mode_tile "alt_fuste" 1)
        (mode_tile "alt_capitel" 1)
      )
      (progn
        ;; Si se desmarca, liberar campos para edición manual
        (mode_tile "alt_base" 0)
        (mode_tile "alt_fuste" 0)
        (mode_tile "alt_capitel" 0)
      )
    )
  )

  ;; Inicializar valores en el cuadro de diálogo
  (set_tile "alt_total" (rtos alt_total 2 3))
  (set_tile "tog_auto" "1")
  (update-ui)

  ;; Asignar acciones a los componentes (Listeners)
  (action_tile "alt_total" "(update-ui)")
  (action_tile "tog_auto" "(update-ui)")

  ;; Acción del botón OK
  (action_tile "accept"
    "(setq alt_total (atof (get_tile \"alt_total\"))
           alt_base (atof (get_tile \"alt_base\"))
           alt_fuste (atof (get_tile \"alt_fuste\"))
           alt_capitel (atof (get_tile \"alt_capitel\"))
     ) (done_dialog 1)"
  )
  
  ;; Acción del botón Cancelar
  (action_tile "cancel" "(done_dialog 0)")

  ;; Arrancar el diálogo
  (setq result (start_dialog))
  (unload_dialog dcl_id)

  ;; Ejecución del modelado 3D si el usuario presionó OK
  (if (= result 1)
    (progn
      (setq p0 (getpoint "\nSelecciona el punto de inserción para la base de la columna: "))
      (if p0
        (progn
          ;; Guardar y apagar OSNAP para evitar que los cilindros se peguen a puntos erróneos
          (setq old_osmode (getvar "OSMODE"))
          (setvar "OSMODE" 0)

          ;; El diámetro es la décima parte de la altura. El radio es la mitad del diámetro.
          (setq radio (/ alt_total 20.0)) 

          ;; 1. Crear Base (Cilindro principal)
          (command "_.CYLINDER" p0 radio alt_base)

          ;; 2. Crear Fuste (Ligeramente más estrecho para simular la textura)
          (setq p_fuste (list (car p0) (cadr p0) (+ (caddr p0) alt_base)))
          (command "_.CYLINDER" p_fuste (* radio 0.9) alt_fuste)

          ;; 3. Crear Capitel (Más ancho para representar el volumen de las hojas de acanto)
          (setq p_capitel (list (car p0) (cadr p0) (+ (caddr p0) alt_base alt_fuste)))
          (command "_.CYLINDER" p_capitel (* radio 1.1) alt_capitel)

          ;; Restaurar OSNAP
          (setvar "OSMODE" old_osmode)
          
          (princ "\n¡Volumen de la Columna Corintia generado con éxito!")
        )
        (princ "\nComando cancelado: No se seleccionó punto de inserción.")
      )
    )
    (princ "\nComando cancelado por el usuario.")
  )
  (princ)
)

(princ "\nCargado correctamente. Escribe COLUMNACORINTIA para iniciar.")
(princ)