;;; =====================================================================================
;;; TM DIGITAL - CORTE POR FACE (TMD_FACE_CUT.lsp)
;;; =====================================================================================
;;; Aplica um SLICE limpo em uma viga (vítima) usando o plano da FACE de outra viga (mestre).
;;;
;;; Útil quando vigas de seções diferentes se encontram e o SUBTRACT (Flush) não funciona
;;; por falta de sobreposição geométrica.
;;;
;;; FLUXO:
;;;   1. Definir modo global: [V]ertical (padrão) ou [H]orizontal
;;;   2. Selecionar MESTRE (viga cuja face define o plano de corte)
;;;   3. Loop de VÍTIMAS: clicar em cada viga a cortar (ENTER → novo mestre / ESC → sair)
;;;
;;; COMANDOS:
;;;   TMD_FACE_CUT  → comando principal
;;;
;;; DEPENDÊNCIAS: TMD_Utils.lsp, TMD_Vigas.lsp (para j2:get-wire via TMD_JOINTS_V2 ou inline)
;;; =====================================================================================

(vl-load-com)

;;; Carregar dependências
(if (not TMD:util-vector-unit)
  (progn
    (setq _p (findfile "TMD_Utils.lsp"))
    (if _p (load _p) (princ "\n[⚠] TMD_Utils.lsp não encontrado!"))
  )
)

;;; Variável global de modo
(if (not *FC-MODO*) (setq *FC-MODO* "V"))  ; V=Vertical  H=Horizontal

;;; =====================================================================================
;;; 1. UTILIDADES LOCAIS
;;; =====================================================================================

;; Resolve wire a partir de Linha TMD ou Sólido 3D filho
(defun fc:get-wire (ent / t0 ph)
  (if (and ent (entget ent))
    (progn
      (setq t0 (cdr (assoc 0 (entget ent))))
      (cond
        ((= t0 "LINE")
         (if (= (vlax-ldata-get ent "TMD_CLASSE") "ESTRUTURA_LINE") ent nil))
        ((= t0 "3DSOLID")
         (setq ph (vlax-ldata-get ent "TMD_PARENT_WIRE"))
         (if ph (handent ph) nil))
        (t nil)
      )
    )
  )
)

;; Retorna o sólido filho de uma wire
(defun fc:get-solid (wire / h s)
  (setq h (vlax-ldata-get wire "TMD_CHILD_SOLID"))
  (if (and h (setq s (handent h)) (entget s)) s nil)
)

;; Determina qual extremo (A ou B) da wire_a está mais próximo de wire_b
(defun fc:near-end (wire_a wire_b / pa pb pa_b pb_b p_int da db)
  (setq pa   (cdr (assoc 10 (entget wire_a)))
        pb   (cdr (assoc 11 (entget wire_a)))
        pa_b (cdr (assoc 10 (entget wire_b)))
        pb_b (cdr (assoc 11 (entget wire_b))))
  (setq p_int (inters pa pb pa_b pb_b nil))
  (if (not p_int)
    (setq p_int (if (< (distance pa pa_b) (distance pa pb_b)) pa_b pb_b))
  )
  (if (< (distance pa p_int) (distance pb p_int)) "A" "B")
)

;;; =====================================================================================
;;; 2. FRAME LOCAL DA VIGA MESTRE
;;; =====================================================================================

;; Calcula frame local: (pa pb vx vy vz) respeitando rotação do perfil
(defun fc:wire-frame (wire / pa pb v_z up v_x v_y adn rot ang cos_r sin_r rx ry)
  (setq pa  (cdr (assoc 10 (entget wire)))
        pb  (cdr (assoc 11 (entget wire))))
  (setq adn (vlax-ldata-get wire "TMD_PARAMS"))
  (setq rot (cdr (assoc "ROTACAO" adn)))
  (setq rot (cond ((= (type rot) 'STR) (atof rot)) (rot rot) (t 0.0)))

  ;; Eixo do perfil
  (setq v_z (TMD:util-vector-unit (mapcar '- pb pa)))

  ;; Referência perpendicular (evitar colinearidade com Z)
  (setq up (if (> (abs (nth 2 v_z)) 0.9) '(1.0 0.0 0.0) '(0.0 0.0 1.0)))

  ;; Frame base
  (setq v_x (TMD:util-vector-unit (TMD:util-vector-cross v_z up)))
  (setq v_y (TMD:util-vector-unit (TMD:util-vector-cross v_x v_z)))

  ;; Rotação (Rodrigues simplificado no plano da seção)
  (if (/= rot 0.0)
    (progn
      (setq ang   (/ (* rot pi) 180.0)
            cos_r (cos ang)
            sin_r (sin ang))
      (setq rx (mapcar '+ (mapcar '(lambda (c) (* c cos_r)) v_x)
                          (mapcar '(lambda (c) (* (- sin_r) c)) v_y)))
      (setq ry (mapcar '+ (mapcar '(lambda (c) (* c sin_r)) v_x)
                          (mapcar '(lambda (c) (* c cos_r)) v_y)))
      (setq v_x rx v_y ry)
    )
  )
  (list pa pb v_x v_y v_z)
)

;;; =====================================================================================
;;; 3. CÁLCULO DA FACE DO MESTRE
;;; =====================================================================================

;; Retorna (pt_face normal) da face do mestre mais próxima ao ponto dado
(defun fc:get-face-plane (wire_m pt_ref / frame pa pb v_x v_y v_z adn p_x p_y just
                                           sx sy t_par center dir_ref faces best_f best_dot f d)
  (setq frame (fc:wire-frame wire_m))
  (setq pa  (car frame)   pb   (cadr frame)
        v_x (caddr frame) v_y  (cadddr frame) v_z (nth 4 frame))

  (setq adn  (vlax-ldata-get wire_m "TMD_PARAMS"))
  (setq p_x  (cdr (assoc "DIM_X" adn))
        p_y  (cdr (assoc "DIM_Y" adn))
        just (cdr (assoc "JUSTIFICACAO" adn)))
  (setq p_x  (cond ((= (type p_x) 'STR) (atof p_x)) (p_x p_x) (t 50.0))
        p_y  (cond ((= (type p_y) 'STR) (atof p_y)) (p_y p_y) (t 50.0)))

  ;; Offsets de justificação
  (setq sx (cond ((and just (vl-string-search "L" just))  (/ p_x 2.0))
                 ((and just (vl-string-search "R" just)) (- (/ p_x 2.0)))
                 (t 0.0))
        sy (cond ((and just (vl-string-search "B" just))  (/ p_y 2.0))
                 ((and just (vl-string-search "T" just)) (- (/ p_y 2.0)))
                 (t 0.0)))

  ;; Centro da seção no ponto mais próximo a pt_ref (projeção no eixo)
  (setq t_par (/ (TMD:util-vector-dot (mapcar '- pt_ref pa) v_z)
                 (TMD:util-vector-dot v_z v_z)))
  (setq center (mapcar '+ pa (mapcar '(lambda (c) (* c t_par)) v_z)))
  (setq center (mapcar '+ center
                  (mapcar '(lambda (c) (* c sx)) v_x)
                  (mapcar '(lambda (c) (* c sy)) v_y)))

  ;; 4 faces: ±vx, ±vy
  (setq faces
    (list
      (list (mapcar '+ center (mapcar '(lambda (c) (* c (/ p_x 2.0))) v_x))  v_x)
      (list (mapcar '- center (mapcar '(lambda (c) (* c (/ p_x 2.0))) v_x))  (mapcar '- v_x))
      (list (mapcar '+ center (mapcar '(lambda (c) (* c (/ p_y 2.0))) v_y))  v_y)
      (list (mapcar '- center (mapcar '(lambda (c) (* c (/ p_y 2.0))) v_y))  (mapcar '- v_y))
    )
  )

  ;; Escolher a face cuja normal mais aponta para pt_ref
  (setq dir_ref  (TMD:util-vector-unit (mapcar '- pt_ref center))
        best_f   nil
        best_dot -9999.0)
  (foreach f faces
    (setq d (TMD:util-vector-dot dir_ref (cadr f)))
    (if (> d best_dot) (progn (setq best_dot d best_f f)))
  )
  best_f
)

;;; =====================================================================================
;;; 4. OPERAÇÃO DE CORTE
;;; =====================================================================================

(defun fc:do-cut (solid_v wire_v ev wire_m modo / pa_v pb_v pt_cut p_mid
                                                    fp pt_f n_f nx ny n_h n_u p1 p2 p3)
  (setq pa_v (cdr (assoc 10 (entget wire_v)))
        pb_v (cdr (assoc 11 (entget wire_v))))

  ;; Extremo a cortar e ponto de permanência (ponto médio = sempre seguro)
  (setq pt_cut (if (= ev "A") pa_v pb_v))
  (setq p_mid  (mapcar '(lambda (a b) (/ (+ a b) 2.0)) pa_v pb_v))

  ;; Face do mestre
  (setq fp (fc:get-face-plane wire_m pt_cut))
  (if (not fp) (progn (princ "\n  [ERRO] Face não calculada.") (exit)))
  (setq pt_f (car fp)  n_f (cadr fp))

  ;; Modo VERTICAL → forçar normal horizontal (Z=0)
  ;; Modo HORIZONTAL → forçar normal vertical (X=Y=0)
  (setq nx (car n_f) ny (cadr n_f) nz (caddr n_f))
  (cond
    ((= modo "V")
     ;; Normal horizontal: zera componente Z
     (setq n_h (list nx ny 0.0))
     (setq n_u (if (> (distance '(0 0 0) n_h) 0.001)
                (TMD:util-vector-unit n_h)
                n_f))
     ;; Plano vertical: contém eixo Z
     ;; P2 = sobe / P3 = perpendicular horizontal
     (setq p1 pt_f
           p2 (list (car pt_f) (cadr pt_f) (+ (caddr pt_f) 1000.0))
           p3 (list (+ (car pt_f) (- (cadr n_u)))
                    (+ (cadr pt_f) (car n_u))
                    (caddr pt_f)))
    )
    (t
     ;; Modo HORIZONTAL: normal só tem componente Z
     (setq n_u '(0.0 0.0 1.0))
     ;; Plano horizontal: contém X e Y
     (setq p1 pt_f
           p2 (list (+ (car pt_f) 1000.0) (cadr pt_f) (caddr pt_f))
           p3 (list (car pt_f) (+ (cadr pt_f) 1000.0) (caddr pt_f)))
    )
  )

  (princ (strcat "\n  [FACE] Modo=" modo " | Normal=" (vl-princ-to-string n_u)))
  (princ (strcat "\n  [FACE] Plano em: " (vl-princ-to-string p1)))

  ;; Aplicar SLICE
  (vl-cmdf "_.UCS" "_World")
  (vl-cmdf "_.SLICE" solid_v "" "_3points"
            "_non" p1 "_non" p2 "_non" p3
            "_non" p_mid)
)

;;; =====================================================================================
;;; 5. COMANDO PRINCIPAL
;;; =====================================================================================

(defun c:TMD_FACE_CUT ( / opt sel_m wire_m sel_v wire_v solid_v ev em h_m cuts running)

  (setq running t)

  (while running

    ;; --- MENU GLOBAL ---
    (princ (strcat "\n\n[TMD FACE CUT] ========================"))
    (princ (strcat "\n  Modo atual: [" *FC-MODO* "] (" (if (= *FC-MODO* "V") "Vertical" "Horizontal") ")"))
    (princ "\n  [V] Vertical  [H] Horizontal  [ESC] Sair")
    (initget "V H Help")
    (setq opt (getkword "\n  Modo [V/H/Help] <manter atual>: "))
    (if (= opt "Help") (progn (TMD:util-help "TMD_FACE_CUT") (setq opt nil)))
    (if opt (setq *FC-MODO* opt))

    ;; --- SELECIONAR MESTRE ---
    (initget "Help")
    (setq sel_m (entsel "\nSelecione o MESTRE (viga cuja face define o corte) [Help]: "))
    (if (= sel_m "Help") (progn (TMD:util-help "TMD_FACE_CUT") (setq sel_m (entsel "\nSelecione o MESTRE: "))))

    (if (not sel_m)
      (setq running nil)  ; ESC → sair
      (progn
        (setq wire_m (fc:get-wire (car sel_m)))
        (if (not wire_m)
          (princ "\n[!] Seleção inválida. Selecione uma viga TMD.")
          (progn
            (redraw (car sel_m) 3)  ; destaca o mestre
            (princ (strcat "\n  [MESTRE] " (vl-princ-to-string (vlax-ldata-get wire_m "TMD_NOME"))))
            (princ "\n  Agora selecione as VÍTIMAS (ENTER = novo mestre):")

            ;; --- LOOP DE VÍTIMAS ---
            (setq sel_v (entsel "\n  Vítima: "))
            (while sel_v
              (setq wire_v (fc:get-wire (car sel_v)))
              (if (and wire_v (/= wire_v wire_m))
                (progn
                  (setq solid_v (fc:get-solid wire_v))
                  (if solid_v
                    (progn
                      ;; Determinar extremo envolvido
                      (setq ev (fc:near-end wire_v wire_m))
                      (setq em (fc:near-end wire_m wire_v))

                      ;; Aplicar corte
                      (fc:do-cut solid_v wire_v ev wire_m *FC-MODO*)

                      ;; Gravar LData no vértice
                      (setq h_m  (cdr (assoc 5 (entget wire_m))))
                      (setq cuts (vlax-ldata-get wire_v "TMD_CUTTERS"))
                      (if (not (listp cuts)) (setq cuts nil))
                      ;; Remove registro anterior do mesmo par/extremo
                      (setq cuts (vl-remove-if
                                   '(lambda (x) (and (listp x) (= (car x) h_m) (= (nth 4 x) ev)))
                                   cuts))
                      (vlax-ldata-put wire_v "TMD_CUTTERS"
                                      (cons (list h_m "FaceCut" 0.0 *FC-MODO* ev em) cuts))
                      (princ (strcat "\n  [✔] FaceCut(" *FC-MODO* ") aplicado → extremo " ev))
                    )
                    (princ "\n  [!] Vítima sem sólido 3D — execute TMD_BUILD primeiro.")
                  )
                )
                (princ "\n  [!] Seleção inválida ou mesma viga que o mestre.")
              )
              ;; Próxima vítima (ENTER sai do loop de vítimas)
              (setq sel_v (entsel "\n  Vítima (ENTER = novo mestre): "))
            )
            (redraw (car sel_m) 4)  ; remove destaque do mestre
          )
        )
      )
    )
  )

  (princ "\n[TMD] TMD_FACE_CUT encerrado.")
  (princ)
)

(princ "\n[TMD] TMD_FACE_CUT Carregado. Comando: TMD_FACE_CUT")
(princ)
