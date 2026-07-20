;;; ==============================================================================
;;; COMANDO: SUPERFLATTEN
;;; DESCRIPCIÓN: Aplasta la geometría a Z=0 usando el hack de desplazamiento infinito (1e99)
;;; CREADO POR: LispCentral (https://lispcentral.web.app)
;;; ==============================================================================

(defun c:SUPERFLATTEN ( / ss oldEcho ssGeom i ent entData type insPt newPt )
  (vl-load-com)
  ;; Guardar variables de sistema para no ensuciar la consola
  (setq oldEcho (getvar "CMDECHO"))
  (setvar "CMDECHO" 0)
  
  (princ "\nSelecciona los objetos para llevar a Z=0 (o presiona ENTER para seleccionar TODO el dibujo): ")
  (setq ss (ssget))
  
  ;; Si el usuario presiona Enter sin seleccionar nada, seleccionamos todo
  (if (not ss)
    (progn
      (setq ss (ssget "X")) 
      (princ "\nSeleccionando todo el dibujo...")
    )
  )
  
  (if ss
    (progn
      (setq ssGeom (ssadd))
      (setq i 0)
      
      (princ "\nProtegiendo bloques dinámicos y dimensiones...")
      
      ;; 1. Clasificamos los objetos. Los bloques se rompen con el infinito, 
      ;;    así que a los bloques les ponemos Z=0 directamente en sus propiedades.
      (while (< i (sslength ss))
        (setq ent (ssname ss i))
        (setq entData (entget ent))
        (setq type (cdr (assoc 0 entData)))
        
        (if (wcmatch type "INSERT,DIMENSION,MULTILEADER")
          (progn
            ;; Método suave (Modificando las propiedades del bloque/cota)
            (setq insPt (assoc 10 entData))
            (if insPt
              (progn
                ;; (10 X Y Z) -> (10 X Y 0.0)
                (setq newPt (list 10 (cadr insPt) (caddr insPt) 0.0))
                (setq entData (subst newPt insPt entData))
                (entmod entData)
                (entupd ent)
              )
            )
          )
          ;; Método fuerte: Líneas, curvas, polys van al grupo del hack de infinito
          (ssadd ent ssGeom)
        )
        (setq i (1+ i))
      )
      
      ;; 2. Hack del infinito (solo para líneas simples y curvas)
      (if (> (sslength ssGeom) 0)
        (progn
          (princ "\nAplastando geometría simple con el Hack del Infinito (1e99)...")
          ;; Mover al infinito positivo
          (command "_.MOVE" ssGeom "" '(0.0 0.0 0.0) '(0.0 0.0 1e99))
          
          ;; Mover de regreso desde el infinito (Previous selection)
          (command "_.MOVE" "_P" "" '(0.0 0.0 0.0) '(0.0 0.0 -1e99))
        )
      )
      
      (princ "\n[ÉXITO] ¡Magia! Toda la geometría (y tus bloques) han sido aplanados a Z=0.")
    )
    (princ "\nNo hay objetos para aplanar.")
  )
  
  ;; Restaurar variables de sistema
  (setvar "CMDECHO" oldEcho)
  (princ)
)

(princ "\nComando SUPERFLATTEN (Versión Segura para Bloques) cargado. Visita https://lispcentral.web.app")
(princ)
