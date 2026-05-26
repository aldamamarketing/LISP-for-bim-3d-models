;;; ==========================================================================
;;; LISPCENTRAL - COMANDOS DE ESTRUCTURA 2D (MVP MOCKUPS)
;;; Archivo: LC_BOM_EXPORT.lsp
;;; Función: Escanea el dibujo, calcula cubicaciones y exporta JSON para la Paleta Web.
;;; ==========================================================================

(vl-load-com)

(defun c:LC_BOM_EXPORT ( / ss i ent obj dict_data tipo peso_lineal longitud peso_total json_str)
  (princ "\n[LC] Generando Tabla de Materiales (BOM)...")

  ;; Seleccionar todas las entidades en el dibujo (en prod, podría filtrarse por capa o selección del usuario)
  (setq ss (ssget "X" '((0 . "LWPOLYLINE,LINE"))))

  (setq json_str "[")

  (if ss
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq obj (vlax-ename->vla-object ent))

        ;; Leer el ADN (LDATA) de la entidad
        (setq dict_data (vlax-ldata-get ent "LC_BIM_DATA"))

        (if dict_data
          (progn
            ;; Extraer datos
            (setq tipo (cdr (assoc "TIPO" dict_data)))
            (setq peso_lineal (cdr (assoc "PESO_LINEAL_KG_M" dict_data)))

            ;; Calcular longitud real actual desde la geometría (AutoCAD la provee)
            (setq longitud (vlax-curve-getDistAtParam obj (vlax-curve-getEndParam obj)))

            ;; Calcular peso total
            ;; Longitud está en unidades de dibujo (asumimos MM). Convertir a Metros.
            (setq peso_total (* peso_lineal (/ longitud 1000.0)))

            ;; Construir fragmento JSON
            (setq json_str
                  (strcat json_str
                          "{\"id\": \"" (vl-princ-to-string (vla-get-Handle obj)) "\", "
                          "\"tipo\": \"" tipo "\", "
                          "\"longitud\": " (rtos longitud 2 2) ", "
                          "\"peso\": " (rtos peso_total 2 2) "},"
                  )
            )
          )
        )
        (setq i (1+ i))
      )

      ;; Limpiar coma final y cerrar JSON
      (if (> (strlen json_str) 1)
        (setq json_str (substr json_str 1 (1- (strlen json_str))))
      )
      (setq json_str (strcat json_str "]"))

      ;; COMUNICACIÓN AL FRONTEND:
      ;; Escribimos el JSON en una variable temporal o archivo que el JS leerá,
      ;; o evaluamos JS directamente si la API del inspector lo permite.
      ;; Por ahora, lo guardamos en un archivo temporal para simular el puente.
      (setq file (open "C:\\Temp\\lc_bom.json" "w"))
      (if file
        (progn
          (write-line json_str file)
          (close file)
          (princ "\n[LC] Datos BOM exportados a C:\\Temp\\lc_bom.json")
          ;; El frontend (JS) estaría escuchando este archivo o recibiría un trigger de Autocad.
        )
      )
    )
    (princ "\n[LC] No se encontraron elementos paramétricos LispCentral en el dibujo.")
  )
  (princ)
)
