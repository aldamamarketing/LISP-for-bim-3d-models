;;; ==========================================================================
;;; LISPCENTRAL - COMANDOS DE ESTRUCTURA 2D (MVP MOCKUPS)
;;; Archivo: LC_STEEL_DRAW.lsp
;;; Función: Dibuja perfiles e inyecta "ADN" (LDATA).
;;; ==========================================================================

(vl-load-com)

;;; Comando Principal invocado por el HTML de la Paleta
;;; En producción, este comando recibiría parámetros de alguna manera
;;; (ej. variables globales seteadas vía JS antes de ejecutar, o leyendo args).
;;; Para este mockup, simulamos la lectura de parámetros.
(defun c:LC_STEEL_DRAW ( / perfil_tipo vista p1 p2 obj_pline dict_data)
  (princ "\n[LC] Iniciando trazado de perfil inteligente...")

  ;; Simulación de datos recibidos desde la Web (En prod, JS escribiría estas vars)
  (setq perfil_tipo (getvar "USERS1")) ; Ej: "W12x26"
  (setq vista (getvar "USERS2"))       ; Ej: "TOP", "FRONT", "SECTION"
  (if (or (= perfil_tipo "") (= vista ""))
    (progn
      (setq perfil_tipo "W12x26")
      (setq vista "TOP")
    )
  )

  (setq p1 (getpoint "\n[LC] Especifique el punto inicial: "))
  (if p1
    (setq p2 (getpoint p1 "\n[LC] Especifique el punto final: "))
  )

  (if (and p1 p2)
    (progn
      ;; DIBUJO GEOMÉTRICO (Mockup de la línea central en Planta)
      ;; En producción, esto generaría la extrusión 2D o sección exacta según la 'vista'
      (command "_.PLINE" "_non" p1 "_w" "0" "0" "_non" p2 "")
      (setq obj_pline (entlast))

      ;; CAMBIO DE LAYER / PROPIEDADES (Según configuración LispCentral)
      (command "_.CHPROP" obj_pline "" "_C" "5" "")

      ;; INYECCIÓN DE ADN (LDATA)
      ;; Aquí es donde la "magia" sucede. Guardamos los metadatos en la polilínea.
      ;; Usamos vlax-ldata-put para vincular los datos al diccionario global, atados a la entidad.
      ;; (Nota: en la arquitectura TMD se usa 'TMD_BIM_DATA', aquí usamos 'LC_BIM_DATA')

      (setq dict_data (list
                        (cons "TIPO" perfil_tipo)
                        (cons "MATERIAL" "A36")
                        (cons "PESO_LINEAL_KG_M" 38.7) ; Vendría de la base de datos
                        (cons "FAMILIA" "VIGA_W")
                      ))

      (vlax-ldata-put obj_pline "LC_BIM_DATA" dict_data)

      (princ (strcat "\n[LC] Perfil " perfil_tipo " dibujado con éxito e inyectado con LDATA."))
    )
    (princ "\n[LC] Operación cancelada.")
  )
  (princ)
)
