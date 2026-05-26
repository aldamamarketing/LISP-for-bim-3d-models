;;; =====================================================================================
;;; TM DIGITAL - SISTEMA DE ETIQUETADO INTELIGENTE (TMD_Tags.lsp)
;;; v1.0 - Anotación Vinculada por MLeader
;;; =====================================================================================

(vl-load-com)

;;; -------------------------------------------------------------------------------------
;;; 1. UTILIDADES DE BUSQUEDA
;;; -------------------------------------------------------------------------------------

(defun TMD:tag-get-wire (ent / etype ph)
  (setq etype (cdr (assoc 0 (entget ent))))
  (cond 
    ((= etype "LINE") (if (vlax-ldata-get ent "TMD_CLASSE") ent nil))
    ((= etype "3DSOLID") (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE")) (if ph (handent ph) nil))
    (t nil)))

;;; -------------------------------------------------------------------------------------
;;; 2. MOTOR DE ETIQUETADO (MLEADER)
;;; -------------------------------------------------------------------------------------

(defun TMD:tag-create-mleader (w_ent pt_leader pt_landing / doc space mark mleader obj h_w)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))
        space (if (= (getvar "CVPORT") 1) (vla-get-PaperSpace doc) (vla-get-ModelSpace doc)))
  
  (setq mark (vlax-ldata-get w_ent "TMD_MARK"))
  (if (or (not mark) (= mark "")) (setq mark "??"))
  
  (setq h_w (cdr (assoc 5 (entget w_ent))))
  
  ;; Criar MLeader via ActiveX
  (setq mleader (vla-AddMLeader space 
                  (vlax-make-variant 
                    (vlax-safearray-fill (vlax-make-safearray vlax-vbDouble '(0 . 5)) 
                      (append pt_leader pt_landing))) 
                  0))
  
  (vla-put-TextString mleader mark)
  
  ;; Vincular etiqueta ao objeto pai (Traceability)
  (vlax-ldata-put mleader "TMD_TAG_PARENT" h_w)
  (vlax-ldata-put mleader "TMD_TAG_TYPE" "BIM_TAG")
  
  (if (not (tblsearch "LAYER" "TMD-TAGS"))
    (vl-cmdf "_.-LAYER" "_M" "TMD-TAGS" "_C" 2 "" "")
  )
  (vla-put-Layer mleader "TMD-TAGS")
  mleader)

;;; -------------------------------------------------------------------------------------
;;; 3. COMANDOS
;;; -------------------------------------------------------------------------------------

(defun c:TMD_TAG_ADD ( / sel w_ent pt_mid pt_land mlead running)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq running t)
  (princ "\n[TMD] Adicionar Etiquetas (MLeader) [ENTER para re-selecionar / ESC para sair]...")
  
  (while running
    (setq sel (entsel "\nSelecione a viga: "))
    (if sel
      (progn
        (setq w_ent (TMD:tag-get-wire (car sel)))
        (if w_ent
          (progn
            (setq pt_mid (mapcar '(lambda (a b) (/ (+ a b) 2.0)) 
                                 (cdr (assoc 10 (entget w_ent))) 
                                 (cdr (assoc 11 (entget w_ent)))))
            (setq pt_land (getpoint pt_mid "\nLocal da etiqueta: "))
            (if pt_land (TMD:tag-create-mleader w_ent pt_mid pt_land))
          )
          (princ "\n[!] Não é viga TMD.")
        )
      )
      (setq running nil) ;; ENTER ou ESC no entsel sai
    )
  )
  (princ "\n[TMD] Etiquetado encerrado.") (princ))

(defun c:TMD_TAG_SYNC ( / doc ss i ent h_p w_ent mark current_text count)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object))) (vla-StartUndoMark doc)
  (princ "\n[TMD] Sincronizando Etiquetas BIM...")
  
  (setq ss (ssget "_X" '((0 . "MULTILEADER"))))
  (setq count 0)
  (if ss
    (progn
      (setq i 0)
      (repeat (sslength ss)
        (setq ent (ssname ss i))
        (setq h_p (vlax-ldata-get ent "TMD_TAG_PARENT"))
        (if (and h_p (setq w_ent (handent h_p)) (entget w_ent))
          (progn
            (setq mark (vlax-ldata-get w_ent "TMD_MARK"))
            (if (or (not mark) (= mark "")) (setq mark "??"))
            
            (setq obj (vlax-ename->vla-object ent))
            (setq current_text (vla-get-TextString obj))
            
            (if (/= current_text mark)
              (progn
                (vla-put-TextString obj mark)
                (setq count (1+ count))
              )
            )
          )
        )
        (setq i (1+ i))
      )
    )
  )
  (vla-EndUndoMark doc)
  (princ (strcat "\n[✔] Sincronizacao concluida. " (itoa count) " etiquetas atualizadas.")) (princ))

(defun c:TMD_TAG_3D ( / ss doc i ent w_ent pt_mid pt_a pt_b v_z mark txt space running)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (setq running t)
  (while running
    (princ "\n[TMD] Gerar Etiquetas 3D [Seleção / ENTER para nova / ESC para sair]:")
    (setq ss (ssget '((-4 . "<OR") (0 . "LINE") (0 . "3DSOLID") (-4 . "OR>"))))
    (if ss
      (progn
        (vla-StartUndoMark doc)
        (setq space (if (= (getvar "CVPORT") 1) (vla-get-PaperSpace doc) (vla-get-ModelSpace doc)))
        (if (not (tblsearch "LAYER" "TMD-TAGS-3D")) (vl-cmdf "_.-LAYER" "_M" "TMD-TAGS-3D" "_C" 4 "" ""))
        (setq i 0)
        (repeat (sslength ss)
          (setq ent (ssname ss i))
          (if (setq w_ent (TMD:tag-get-wire ent))
            (progn
              (setq pt_a (cdr (assoc 10 (entget w_ent)))
                    pt_b (cdr (assoc 11 (entget w_ent)))
                    pt_mid (mapcar '(lambda (a b) (/ (+ a b) 2.0)) pt_a pt_b))
              (setq mark (vlax-ldata-get w_ent "TMD_MARK"))
              (if (or (not mark) (= mark "")) (setq mark "??"))
              (setq txt (vla-AddMText space (vlax-3d-point pt_mid) 0.0 mark))
              (vla-put-Layer txt "TMD-TAGS-3D")
              (vla-put-Height txt 2.5)
              (vla-put-AttachmentPoint txt 5)
              (setq v_z (mapcar '- pt_b pt_a))
              (vla-put-Rotation txt (angle '(0 0 0) (list (car v_z) (cadr v_z) 0.0)))
              (vlax-ldata-put (vlax-vla-object->ename txt) "TMD_TAG_PARENT" (cdr (assoc 5 (entget w_ent))))
            )
          )
          (setq i (1+ i))
        )
        (vla-EndUndoMark doc)
        (princ "\n[✔] Etiquetas 3D criadas.")
      )
      (setq running nil)
    )
  )
  (princ))

(princ "\n[TMD] Sistema de Etiquetas v1.0 Carregado.") (princ)

;;; -------------------------------------------------------------------------------------
;;; 4. MODO GHOST (PASO 1: TOGGLE BÁSICO)
;;; -------------------------------------------------------------------------------------

(defun TMD:tag-cleanup-ghost ( / ss i ent)
  (setq ss (ssget "_X" '((0 . "TEXT,MTEXT") (8 . "TMD-GHOST-VIEW"))))
  (if ss
    (progn
      (setq i 0)
      (repeat (sslength ss)
        (setq ent (ssname ss i))
        (if (entget ent) (entdel ent))
        (setq i (1+ i))
      )
    )
  )
)

(defun c:TMD_TAG_GHOST ( / ss i ent mark nome count_ghost doc loop mode opt display_txt p1 p2 pm pg ang params base offset dist side)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  
  ;; Inicializar variables globales si no existen
  (if (not *TMD-GHOST-MODE*)  (setq *TMD-GHOST-MODE* "A"))
  (if (not *TMD-GHOST-ALIGN*) (setq *TMD-GHOST-ALIGN* t))
  (if (not *TMD-GHOST-SIZE*)  (setq *TMD-GHOST-SIZE* 50.0))
  
  ;; Lógica de Toggle: Si ya hay marcas, apagar y salir
  (if (ssget "_X" '((8 . "TMD-GHOST-VIEW")))
    (progn 
      (TMD:tag-cleanup-ghost)
      (princ "\n[TMD] Inspeção OFF.")
    )
    (progn
      (setq loop t mode *TMD-GHOST-MODE*)
      (while loop
        (TMD:tag-cleanup-ghost)
        (if (/= mode "O")
          (progn
            (setq ss (ssget "_X" '((0 . "LINE"))))
            (if ss
              (progn
                (setq i 0 count_ghost 0)
                (repeat (sslength ss)
                  (setq ent (ssname ss i))
                  (if (vlax-ldata-get ent "TMD_CLASSE")
                    (progn
                      (setq mark (vlax-ldata-get ent "TMD_MARK")
                            nome (vlax-ldata-get ent "TMD_NOME")
                            params (vlax-ldata-get ent "TMD_PARAMS"))
                      
                      ;; Extraer base (ancho) para el offset
                      (setq base (if (assoc "BASE" params) (cdr (assoc "BASE" params)) 100.0))
                      (if (not (numberp base)) (setq base (atof (vl-princ-to-string base))))
                      
                      (setq display_txt (cond 
                        ((= mode "A") (strcat (if mark (vl-princ-to-string mark) "??") " | " (if nome nome "??")))
                        ((= mode "P") (if mark (vl-princ-to-string mark) "??"))
                        ((= mode "V") (if nome nome "??"))))
                      
                      (setq p1 (cdr (assoc 10 (entget ent)))
                            p2 (cdr (assoc 11 (entget ent)))
                            pm (mapcar '(lambda (a b) (/ (+ a b) 2.0)) p1 p2)
                            ang (angle p1 p2))
                      
                      ;; Normalizar ángulo para lectura (siempre entre -90 y 90 grados)
                      (setq ang_txt ang)
                      (if (and (> ang_txt (/ pi 2.0)) (<= ang_txt (* 1.5 pi)))
                        (setq ang_txt (+ ang_txt pi))
                      )
                      
                      ;; Offset consistente: siempre al mismo lado de la dirección de lectura
                      (setq dist (+ (/ base 2.0) (/ *TMD-GHOST-SIZE* 0.8)))
                      (setq pg (polar pm (+ ang_txt (/ pi 2.0)) dist))
                      
                      (entmake (list '(0 . "TEXT") '(8 . "TMD-GHOST-VIEW") 
                                     (cons 10 pg) (cons 40 *TMD-GHOST-SIZE*) 
                                     (cons 1 display_txt) 
                                     (cons 50 (if *TMD-GHOST-ALIGN* ang_txt 0.0))
                                     '(72 . 1) (cons 11 pg) '(73 . 2)))
                      (setq count_ghost (1+ count_ghost))))
                  (setq i (1+ i)))
                (vla-Regen doc acActiveViewport)
                (princ (strcat "\n[✔] " (itoa count_ghost) " Vigas em inspeção."))))))

        (initget "Ambos Pos Viga Linha Off")
        (setq opt (getkword (strcat "\n[TMD] Ghost: [Ambos/Pos/Viga/Linha/Off] <" mode ">: ")))
        
        (cond
          ((not opt) (setq loop nil)) ;; ENTER sale manteniendo lo que hay
          ((= opt "Ambos") (setq mode "A" *TMD-GHOST-MODE* "A"))
          ((= opt "Pos")   (setq mode "P" *TMD-GHOST-MODE* "P"))
          ((= opt "Viga")  (setq mode "V" *TMD-GHOST-MODE* "V"))
          ((= opt "Linha") (setq *TMD-GHOST-ALIGN* (not *TMD-GHOST-ALIGN*)))
          ((= opt "Off")   (setq mode "O" loop nil))
        )
      )
    )
  )
  (princ)
)
