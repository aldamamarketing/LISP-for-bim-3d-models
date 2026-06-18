;;; =====================================================================================
;;; TMD_LData_Debug.lsp — Diagnóstico de ADN BIM (Wire + Sólido)
;;; Uso: Cargar con (load "TMD_LData_Debug.lsp") y ejecutar TMD_LDATA_PAR
;;; =====================================================================================
(vl-load-com)

(defun TMD:debug-dump-ldata (ent label / vla-obj h xdict dict-name dict-obj i item key val)
  (princ (strcat "\n\n========== " label " =========="))
  (if (not ent)
    (progn (princ "\n  [NULL] Entidade nao encontrada.") (princ) nil)
    (progn
      (setq vla-obj (vlax-ename->vla-object ent))
      (setq h (cdr (assoc 5 (entget ent))))
      (princ (strcat "\n  Tipo DXF   : " (cdr (assoc 0 (entget ent)))))
      (princ (strcat "\n  Handle     : " (if h h "???")))
      (princ (strcat "\n  Layer      : " (cdr (assoc 8 (entget ent)))))
      
      ;; Endpoints (solo LINE)
      (if (= (cdr (assoc 0 (entget ent))) "LINE")
        (progn
          (princ (strcat "\n  P1 (10)    : " (vl-princ-to-string (cdr (assoc 10 (entget ent))))))
          (princ (strcat "\n  P2 (11)    : " (vl-princ-to-string (cdr (assoc 11 (entget ent))))))
          (princ (strcat "\n  Comprimento: " (rtos (distance (cdr (assoc 10 (entget ent))) (cdr (assoc 11 (entget ent)))) 2 2)))
        )
      )
      
      ;; BoundingBox (solo 3DSOLID)
      (if (= (cdr (assoc 0 (entget ent))) "3DSOLID")
        (progn
          (vla-getboundingbox vla-obj 'minp 'maxp)
          (setq pmin (vlax-safearray->list minp) pmax (vlax-safearray->list maxp))
          (princ (strcat "\n  BBox Min   : " (vl-princ-to-string pmin)))
          (princ (strcat "\n  BBox Max   : " (vl-princ-to-string pmax)))
        )
      )
      
      ;; LData Keys
      (princ "\n  --- LData (ADN BIM) ---")
      (setq found nil)
      (foreach k '("TMD_CLASSE" "TMD_TIPO" "TMD_NOME" "TMD_PARAMS" 
                    "TMD_PARENT_WIRE" "TMD_CHILD_SOLID" "TMD_SELF_HANDLE"
                    "TMD_COMPILADO" "TMD_MARK" "TMD_LEN_PHYS" "TMD_CUTTERS"
                    "TMD_JUSTIFICACAO" "TMD_ROTACAO" "TMD_NIVEL"
                    "TMD_ABA_LIST" "TMD_ABA_ID" "TMD_PARENT"
                    "TMD_TAB_DATA" "TMD_TAB_TYPE" "TMD_TAB_SOURCE")
        (setq val (vlax-ldata-get ent k))
        (if val
          (progn
            (setq found T)
            (princ (strcat "\n    " k " = " 
              (cond
                ((= (type val) 'STR) (strcat "\"" val "\""))
                ((= (type val) 'INT) (itoa val))
                ((= (type val) 'REAL) (rtos val 2 4))
                ((= (type val) 'LIST) (vl-princ-to-string val))
                (T (strcat "[" (vl-princ-to-string (type val)) "]"))
              )
            ))
          )
        )
      )
      (if (not found) (princ "\n    [VAZIO] Nenhum LData TMD encontrado."))
      
      ;; Validar cross-reference
      (cond
        ((= (cdr (assoc 0 (entget ent))) "LINE")
          (setq val (vlax-ldata-get ent "TMD_CHILD_SOLID"))
          (if val
            (progn
              (princ "\n  --- Validacao Cruzada ---")
              (princ (strcat "\n    TMD_CHILD_SOLID aponta para: " val))
              (if (and (handent val) (entget (handent val)))
                (progn
                  (princ (strcat "\n    [OK] Handle resolve para tipo: " (cdr (assoc 0 (entget (handent val))))))
                  (princ (strcat "\n    Handle real: " (cdr (assoc 5 (entget (handent val))))))
                )
                (princ "\n    [ERRO!] handent retorna NIL - Handle INVALIDO/PERDIDO! O solido original FOI DESTRUIDO.")
              )
            )
            (princ "\n  [INFO] Sem TMD_CHILD_SOLID (nao tem filho vinculado)")
          )
        )
        ((= (cdr (assoc 0 (entget ent))) "3DSOLID")
          (setq val (vlax-ldata-get ent "TMD_PARENT_WIRE"))
          (if val
            (progn
              (princ "\n  --- Validacao Cruzada ---")
              (princ (strcat "\n    TMD_PARENT_WIRE aponta para: " val))
              (if (and (handent val) (entget (handent val)))
                (progn
                  (princ (strcat "\n    [OK] Handle resolve para tipo: " (cdr (assoc 0 (entget (handent val))))))
                  (princ (strcat "\n    Handle real: " (cdr (assoc 5 (entget (handent val))))))
                )
                (princ "\n    [ERRO!] handent retorna NIL - Handle INVALIDO/PERDIDO! O wire original FOI DESTRUIDO.")
              )
            )
            (princ "\n  [INFO] Sem TMD_PARENT_WIRE (nao tem pai vinculado)")
          )
        )
      )
      
      (princ (strcat "\n================================"))
      h ;; retorna handle
    )
  )
)

(defun c:TMD_LDATA_PAR ( / ent1 ent2 e1 e2)
  (princ "\n[DEBUG] Selecione o PRIMEIRO elemento (Wire ou Solido): ")
  (setq e1 (entsel))
  (if (not e1) (progn (princ "\nCancelado.") (exit)))
  (setq ent1 (car e1))
  
  (princ "\n[DEBUG] Selecione o SEGUNDO elemento (Wire ou Solido): ")
  (setq e2 (entsel))
  (if (not e2) (progn (princ "\nCancelado.") (exit)))
  (setq ent2 (car e2))
  
  (TMD:debug-dump-ldata ent1 "ELEMENTO 1")
  (TMD:debug-dump-ldata ent2 "ELEMENTO 2")
  
  (princ "\n\n[RESUMO] Comparacao de Handles:")
  (setq h1 (cdr (assoc 5 (entget ent1))))
  (setq h2 (cdr (assoc 5 (entget ent2))))
  (setq link1 (vlax-ldata-get ent1 "TMD_PARENT_WIRE"))
  (setq link2 (vlax-ldata-get ent1 "TMD_CHILD_SOLID"))
  (setq link3 (vlax-ldata-get ent2 "TMD_PARENT_WIRE"))
  (setq link4 (vlax-ldata-get ent2 "TMD_CHILD_SOLID"))
  
  (if (or (equal link1 h2) (equal link4 h1))
    (princ "\n  [OK] Ent1 aponta para Ent2 (vinculo INTEGRO)")
    (if (or (equal link3 h1) (equal link2 h2))
      (princ "\n  [OK] Ent2 aponta para Ent1 (vinculo INTEGRO)")
      (princ "\n  [ALERTA!] Nenhum vinculo cruzado valido entre os dois elementos!")
    )
  )
  
  (princ "\n\n[FIM] Debug concluido.\n")
  (princ)
)

(princ "\n[TM Digital] TMD_LData_Debug.lsp carregado. Comando: TMD_LDATA_PAR")
(princ)
