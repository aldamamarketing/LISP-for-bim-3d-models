;;; ==========================================================================
;;; SYSTEMA TM DIGITAL - WEB PALETTE BRIDGE (BIM v5.1)
;;; ==========================================================================
;;; Descrição: Servidor LISP de dados e controle para a Paleta Web (HTML/JS).
;;;            Escrito para suportar o fluxo modeless no AutoCAD 2021+.
;;; Idioma da documentação interna: Português (Regra do Projeto).
;;; Idioma de interação com o usuário: Espanhol (Regra do Projeto).
;;; ==========================================================================

;;; ==========================================================================
;;; 1. COMANDO PRINCIPAL: c:TMD_INSPECT
;;; ==========================================================================
;;; Descrição: Comando para carregar a paleta lateral e iniciar a escuta.
(defun c:TMD_INSPECT (/ doc bridge-dir html-path loader-js f-js)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)
  
  (princ "\n[⚙] Cargando interfaz de usuario premium...")
  
  ;; 1. Localizar o diretório do LISP dinamicamente
  (setq bridge-dir (vl-filename-directory (findfile "TMD_Palette_Bridge.lsp")))
  (if (not bridge-dir)
    (setq bridge-dir "Z:/Autocad Config/LISP") ; Fallback para rede corporativa
  )
  
  ;; 2. Construir o caminho para o arquivo HTML da paleta
  (setq html-path (strcat bridge-dir "/web/inspector.html"))
  ;; Substituir contra-barras por barras para compatibilidade JavaScript
  (setq html-path (vl-string-translate "\\" "/" html-path))
  
  ;; Garantir formato file:/// e codificar espaços como %20 para Chromium
  (if (not (vl-string-search "file:///" html-path))
    (if (= (substr html-path 1 1) "/")
      (setq html-path (strcat "file://" html-path))
      (setq html-path (strcat "file:///" html-path))
    )
  )
  
  ;; Codificar espaços para URL válido do navegador
  (while (vl-string-search " " html-path)
    (setq html-path (vl-string-subst "%20" " " html-path))
  )
  
  ;; Forçar bypass de cache no Chromium adicionando um timestamp único
  (setq html-path (strcat html-path "?v=" (rtos (getvar "CDATE") 2 6)))
  
  ;; 3. Criar arquivo JavaScript de inicialização (WEBLOAD) na pasta 'web' (seguro com TRUSTEDPATHS)
  (setq loader-js (strcat bridge-dir "/web/TMD_Palette_Loader.js"))
  (setq loader-js (vl-string-translate "\\" "/" loader-js))
  
  (setq f-js (open loader-js "w"))
  (if f-js
    (progn
      (write-line "if (typeof Acad !== 'undefined') {" f-js)
      ;; Sempre adicionamos e focamos a paleta ao rodar o comando, resolvendo o bug de fechar/reabrir
      (write-line (strcat "    Acad.Application.addPalette(\"TMD BIM Inspector\", \"" html-path "\");") f-js)
      (write-line "    Acad.Editor.writeMessage(\"\\n[✔] TMD WebPalette: Paleta 'TMD BIM Inspector' cargada.\\n\");" f-js)
      (write-line "} else {" f-js)
      (write-line "    console.error(\"[❌] Error: API de JavaScript de AutoCAD (Acad) no detectada.\");" f-js)
      (write-line "}" f-js)
      (close f-js)
      
      ;; Carrega o script que executa e compila na hora. Usamos aspas duplas adicionais 
      ;; para evitar que espaços na rota sejam interpretados como pressionamento de Enter.
      (vl-cmdf "_.WEBLOAD" "_L" (strcat "\"" loader-js "\""))
    )
    (princ "\n[❌] Error: No se pudo generar el cargador de la paleta.")
  )
  
  ;; Ativa o reactor de seleção automática em tempo real
  (TMD:reactor-on)
  
  ;; Dispara uma primeira consulta automática (silenciosa)
  (TMD:query-active-selection nil)
  
  (vla-EndUndoMark doc)
  (princ "\n[✔] TMD WebInspector cargado correctamente en el panel lateral.")
  (princ)
)

;;; ==========================================================================
;;; 2. COMANDO DE CONSULTA DE DADOS E MONITOR DE SELEÇÃO
;;; ==========================================================================
;;; Descrição: Comando manual interativo.
(defun c:TMD_PALETTE_QUERY ()
  (TMD:query-active-selection t)
  (princ)
)

;;; Descrição: Função núcleo de consulta de seleção e propriedades.
;;;            interactive: T para permitir pickbox entsel se nada estiver selecionado.
;;;                         nil para consulta silenciosa e segura em reatores.
(defun TMD:query-active-selection (interactive / ss ent selEnt handle parent-handle params seccion rotacion justificacion largo marca cutters jsonPath adnActive tipoEnt origEnt f)
  (vl-load-com)
  
  ;; 1. Tenta obter a seleção implícita atual (User seleccionou antes)
  (setq ss (ssget "_I"))
  (if (and ss (> (sslength ss) 0))
    (setq ent (ssname ss 0))
  )
  
  ;; 2. Se não houver seleção ativa e for interativo, pede seleção direta com entsel
  (if (and (not ent) interactive)
    (progn
      (setq selEnt (entsel "\n[ℹ] Seleccione una viga (Wire) o Sólido para inspeccionar: "))
      (if selEnt
        (setq ent (car selEnt))
      )
    )
  )
  
  ;; 3. Se selecionou um Sólido 3D, resolvemos para o seu Wire pai (TMD_PARENT_WIRE)
  (if ent
    (progn
      (setq origEnt ent)
      (if (= (cdr (assoc 0 (entget ent))) "3DSOLID")
        (progn
          (setq parent-handle (vlax-ldata-get ent "TMD_PARENT_WIRE"))
          (if (and parent-handle (handent parent-handle))
            (setq ent (handent parent-handle))
          )
        )
        (setq parent-handle nil)
      )
      
      (setq handle (cdr (assoc 5 (entget ent))))
      
      ;; Extração dos LData do Wire analítico
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (setq marca (vlax-ldata-get ent "TMD_MARK"))
      (setq largo (vlax-ldata-get ent "TMD_LEN_PHYS"))
      (setq cutters (vlax-ldata-get ent "TMD_CUTTERS"))
      
      ;; Identifica se tem ADN TMD ativo
      (if params
        (progn
          (setq adnActive 1)
          ;; Lógica de Sombra de Handle (Handle Shadowing) para detectar clones (COPY/MIRROR)
          (setq tmd-uuid (vlax-ldata-get ent "TMD_UUID"))
          (setq saved-handle (vlax-ldata-get ent "TMD_HOST_HANDLE"))
          (if (and tmd-uuid saved-handle (/= handle saved-handle))
            (progn
              ;; ¡ES UN CLON NATIVO DE AUTOCAD!
              (setq tmd-uuid (strcat "TMD-" (rtos (getvar "CDATE") 2 8) "-" (itoa (fix (* (rem (getvar "DATE") 1.0) 1000000)))))
              (vlax-ldata-put ent "TMD_UUID" tmd-uuid)
              (vlax-ldata-put ent "TMD_HOST_HANDLE" handle)
              (vlax-ldata-put ent "TMD_MARK" nil) ;; Resetear marca
              (setq marca nil cutters nil)
              (princ (strcat "\n[TMD] Clon detectado. Nuevo UUID asignado: " tmd-uuid))
            )
            ;; Si es válido o apenas creado
            (if (not tmd-uuid)
              (progn
                (setq tmd-uuid (strcat "TMD-" (rtos (getvar "CDATE") 2 8) "-" (itoa (fix (* (rem (getvar "DATE") 1.0) 1000000)))))
                (vlax-ldata-put ent "TMD_UUID" tmd-uuid)
                (vlax-ldata-put ent "TMD_HOST_HANDLE" handle)
              )
            )
          )
        )
        (progn
          (setq adnActive 0)
          ;; Valores padrões provisórios caso o Wire seja genérico
          (setq params '(("NOME" . "H100") ("ROTACAO" . 0) ("JUSTIFICACAO" . "Centro")))
          (setq tmd-uuid nil)
        )
      )
      
      (setq m_pta nil m_ptb nil)
      ;; Determina a descrição elegante do tipo de objeto nativo
      (setq tipoEnt (cdr (assoc 0 (entget origEnt))))
      (cond
        ((= tipoEnt "LINE") (setq tipoEnt "Línea (LINE)"))
        ((= tipoEnt "LWPOLYLINE") (setq tipoEnt "Polilínea (LWPOLYLINE)"))
        ((= tipoEnt "3DSOLID") 
         (if parent-handle
           (setq tipoEnt "Solido Resolvido (3DSOLID)")
           (setq tipoEnt "Solido Generico (3DSOLID)")
         )
        )
        (t (setq tipoEnt (strcat "Objeto (" tipoEnt ")")))
      )
      
      ;; Cálculo de comprimento geométrico real caso não tenha largo físico LData
      (if (or (not largo) (= largo 0.0))
        (setq largo (TMD:get-entity-length ent))
      )
      
      (if (= (cdr (assoc 0 (entget ent))) "3DSOLID")
        (progn
          (setq analytical_line (TMD:get-analytical-line ent))
          (if analytical_line
            (setq m_pta (car analytical_line)
                  m_ptb (cadr analytical_line))
            (progn
              (if (not (type TMD:GetSolidMetrics)) (vl-catch-all-apply 'load (list "TMD_BOM.lsp")))
              (if (type TMD:GetSolidMetrics)
                (progn
                  (setq metrics (TMD:GetSolidMetrics (vlax-ename->vla-object ent)))
                  (setq m_pta (nth 3 metrics) m_ptb (nth 4 metrics))
                )
              )
            )
          )
        )
      )
      
      ;; Parsers de segurança para cada campo do ADN
      (setq seccion (cdr (assoc "NOME" params)))
      (if (not seccion) (setq seccion "H100"))
      
      (setq rotacion (cdr (assoc "ROTACAO" params)))
      (if (not rotacion) (setq rotacion 0))
      
      (setq justificacion (cdr (assoc "JUSTIFICACAO" params)))
      (setq justificacion (TMD:normalize-just justificacion))
      
      ;; Gravação do arquivo JS temporário em todas as rotas possíveis (CORS local safe)
      (TMD:write-to-all-paths handle seccion rotacion justificacion largo marca cutters adnActive tipoEnt)
      
      (if (and interactive (not parent-handle))
        (princ (strcat "\n[✔] Datos de viga <" handle "> leídos y sincronizados."))
      )
      (if (and interactive parent-handle)
        (princ (strcat "\n[✔] Sólido resuelto al Wire <" handle ">. Datos sincronizados."))
      )
    )
    (progn
      ;; Se nada foi selecionado, gravamos JS para resetar a interface
      (TMD:write-to-all-paths nil nil nil nil 0.0 nil nil 0 nil)
    )
  )
  (princ)
)

;;; ==========================================================================
;;; 2.5. NORMALIZAÇÃO DE JUSTIFICAÇÃO E CÁLCULO DE EIXO ANALÍTICO
;;; ==========================================================================

(defun TMD:normalize-just (just)
  (cond
    ((not just) "MC")
    ((= (type just) 'STR)
     (cond
       ((or (= just "Centro") (= just "MC") (= just "MIDDLE_CENTER")) "MC")
       ((or (= just "Superior") (= just "TC") (= just "TOP_CENTER")) "TC")
       ((or (= just "Inferior") (= just "BC") (= just "BOTTOM_CENTER")) "BC")
       ((or (= just "Esquerda") (= just "ML") (= just "MIDDLE_LEFT")) "ML")
       ((or (= just "Direita") (= just "MR") (= just "MIDDLE_RIGHT")) "MR")
       (t "MC")
     )
    )
    (t "MC")
  )
)

(defun TMD:geom-normalize (v / len)
  (setq len (sqrt (apply '+ (mapcar '(lambda (x) (* x x)) v))))
  (if (> len 1e-8)
    (mapcar '(lambda (x) (/ x len)) v)
    v
  )
)

(defun TMD:geom-cross (u v)
  (list
    (- (* (cadr u) (caddr v)) (* (caddr u) (cadr v)))
    (- (* (caddr u) (car v)) (* (car u) (caddr v)))
    (- (* (car u) (cadr v)) (* (cadr u) (car v)))
  )
)

(defun TMD:geom-arbitrary-axis (z-vec / ux uy)
  (setq z-vec (TMD:geom-normalize z-vec))
  (if (and (< (abs (car z-vec)) 0.015625)
           (< (abs (cadr z-vec)) 0.015625))
    (setq ux (TMD:geom-cross '(0.0 1.0 0.0) z-vec))
    (setq ux (TMD:geom-cross '(0.0 0.0 1.0) z-vec))
  )
  (setq ux (TMD:geom-normalize ux))
  (setq uy (TMD:geom-cross z-vec ux))
  (setq uy (TMD:geom-normalize uy))
  (list ux uy)
)

(defun TMD:geom-rotated-axes (uz rot_deg / rad cos_a sin_a axes ux uy ux_rot uy_rot)
  (setq rad (* rot_deg (/ pi 180.0)))
  (setq cos_a (cos rad) sin_a (sin rad))
  (setq axes (TMD:geom-arbitrary-axis uz))
  (setq ux (car axes) uy (cadr axes))
  (setq ux_rot (mapcar '+ (mapcar '(lambda (x) (* x cos_a)) ux) (mapcar '(lambda (x) (* x sin_a)) uy)))
  (setq uy_rot (mapcar '- (mapcar '(lambda (x) (* x cos_a)) uy) (mapcar '(lambda (x) (* x sin_a)) ux)))
  (list ux_rot uy_rot)
)

(defun TMD:get-analytical-line (ent / params just rot p_x p_y metrics m_pta m_ptb cx cy uz axes ux uy pt_a pt_b)
  (if (not (type TMD:GetSolidMetrics)) (vl-catch-all-apply 'load (list "TMD_BOM.lsp")))
  (setq metrics (if (type TMD:GetSolidMetrics) (TMD:GetSolidMetrics (vlax-ename->vla-object ent)) nil))
  (setq params (vlax-ldata-get ent "TMD_PARAMS"))
  (if (and metrics params)
    (progn
      (setq m_pta (nth 3 metrics)
            m_ptb (nth 4 metrics)
            just (cdr (assoc "JUSTIFICACAO" params))
            rot (cdr (assoc "ROTACAO" params))
            p_x (cdr (assoc "DIM_X" params))
            p_y (cdr (assoc "DIM_Y" params)))
      
      (setq just (TMD:normalize-just just))
      (if (not rot) (setq rot 0.0))
      (if (not p_x) (setq p_x 100.0))
      (if (not p_y) (setq p_y 100.0))
      (setq p_x (atof (vl-princ-to-string p_x))
            p_y (atof (vl-princ-to-string p_y))
            rot (atof (vl-princ-to-string rot)))
      
      ;; 1. Calcular offsets de justificación
      (setq cx (cond ((vl-string-search "L" just) (/ p_x 2.0)) ((vl-string-search "R" just) (* -1.0 (/ p_x 2.0))) (t 0.0)))
      (setq cy (cond ((vl-string-search "B" just) (/ p_y 2.0)) ((vl-string-search "T" just) (* -1.0 (/ p_y 2.0))) (t 0.0)))
      
      ;; 2. Obtener dirección longitudinal uz y los ejes X e Y locales rotados
      (setq uz (TMD:geom-normalize (mapcar '- m_ptb m_pta)))
      (setq axes (TMD:geom-rotated-axes uz rot))
      (setq ux (car axes) uy (cadr axes))
      
      ;; 3. Restar cx y cy de m_pta y m_ptb para obtener pt_a y pt_b reales (eje analítico)
      (setq pt_a (mapcar '- m_pta (mapcar '(lambda (x) (* x cx)) ux) (mapcar '(lambda (y) (* y cy)) uy)))
      (setq pt_b (mapcar '- m_ptb (mapcar '(lambda (x) (* x cx)) ux) (mapcar '(lambda (y) (* y cy)) uy)))
      
      (list pt_a pt_b)
    )
    nil
  )
)

;;; ==========================================================================
;;; 3. CÁLCULO DE COMPRIMENTO GEOMÉTRICO REAL
;;; ==========================================================================
;;; Descrição: Lê as propriedades geométricas nativas de curvas no AutoCAD
;;;            usando vl-catch-all-apply para segurança total contra quebras.
(defun TMD:get-entity-length (ent / obj len endParam)
  (vl-load-com)
  (setq obj (vlax-ename->vla-object ent))
  (cond
    ;; Metodo 0: 3DSOLID usando TMD:GetSolidMetrics (Inercia)
    ((= (cdr (assoc 0 (entget ent))) "3DSOLID")
     (if (not (type TMD:GetSolidMetrics)) (vl-catch-all-apply 'load (list "TMD_BOM.lsp")))
     (if (type TMD:GetSolidMetrics) ; Asegurar que TMD_BOM.lsp este cargado
       (setq len (car (TMD:GetSolidMetrics obj)))
       (setq len 0.0)
     )
    )
    ;; Método 1: Propriedade Length (comum para LINE, LWPOLYLINE)
    ((vlax-property-available-p obj 'Length)
     (setq len (vl-catch-all-apply 'vla-get-length (list obj)))
     (if (vl-catch-all-error-p len)
       (progn
         (princ "\n[ℹ] Detalle: Error al leer propiedad Length.")
         0.0
       )
       len
     )
    )
    ;; Método 2: Obter distância através da curva analítica
    ((and (vl-catch-all-apply 'vlax-curve-getEndParam (list ent))
          (not (vl-catch-all-error-p (vl-catch-all-apply 'vlax-curve-getEndParam (list ent)))))
     (setq endParam (vlax-curve-getEndParam ent))
     (setq len (vl-catch-all-apply 'vlax-curve-getDistAtParam (list ent endParam)))
     (if (vl-catch-all-error-p len)
       (progn
         (princ "\n[ℹ] Detalle: Error al calcular distancia de curva.")
         0.0
       )
       len
     )
    )
    (t 0.0)
  )
)

;;; ==========================================================================
;;; 3.5. ESCRITOR MULTI-CAMINHO E AUXILIARES
;;; ==========================================================================
(defun TMD:remove-duplicates-and-nils (lst / res item)
  (foreach item lst
    (if (and item (not (member item res)))
      (setq res (cons item res))
    )
  )
  (reverse res)
)

(defun TMD:write-to-all-paths (handle seccion rotacion justificacion largo marca cutters adnActive tipoEnt / paths bridge-dir p jsonPath)
  (vl-load-com)
  (setq paths (list
    "Z:/Autocad Config/LISP"
    "C:/Users/TM PROJETOS/3D Objects/Projetos/AutoCadTools"
  ))
  ;; Adiciona o caminho detectado dinamicamente para garantir compatibilidade
  (setq bridge-dir (vl-filename-directory (findfile "TMD_Palette_Bridge.lsp")))
  (if bridge-dir (setq paths (cons bridge-dir paths)))
  (if (and (boundp '*TMD-LISP-PATH-RAW*) *TMD-LISP-PATH-RAW*)
    (setq paths (cons *TMD-LISP-PATH-RAW* paths))
  )
  
  ;; Remove duplicados e nils
  (setq paths (TMD:remove-duplicates-and-nils paths))
  
  ;; Escreve em cada diretório válido
  (foreach p paths
    (if (and p (vl-file-directory-p p))
      (progn
        (setq jsonPath (strcat (vl-string-translate "\\" "/" p) "/web/current_viga.js"))
        (TMD:write-viga-js jsonPath handle seccion rotacion justificacion largo marca cutters adnActive tipoEnt)
      )
    )
  )
)

;;; ==========================================================================
;;; 4. ESCRITOR DE ARQUIVO JAVASCRIPT (JSONP)
;;; ==========================================================================
;;; Descrição: Utilitário purista que gera o arquivo JS executável contendo os dados.
(defun TMD:write-viga-js (filePath handle seccion rotacion justificacion largo marca cutters adnActive tipoEnt / f cList cStr catData catalogItems item _err)
  ;; ── SANITIZAÇÃO DEFENSIVA DE TODOS OS INPUTS ──
  (if (not seccion) (setq seccion "H100"))
  (if (not justificacion) (setq justificacion "Centro"))
  (if (not tipoEnt) (setq tipoEnt "Desconhecido"))
  (if (or (not largo) (not (numberp largo))) (setq largo 0.0))
  (if (or (not rotacion) (not (numberp rotacion))) (setq rotacion 0))
  (if (or (not adnActive) (not (numberp adnActive))) (setq adnActive 0))
  
  (setq f (open filePath "w"))
  (if f
    (progn
      ;; ── Bloco principal protegido contra erros ──
      (setq _err (vl-catch-all-apply
        '(lambda ()
          (if (and handle (= (type handle) 'STR) (/= handle ""))
            (progn
              (write-line "if (typeof tmdUpdateInspectorData === 'function') {" f)
              (write-line "  tmdUpdateInspectorData({" f)
              (write-line (strcat "    \"handle\": \"" handle "\",") f)
              (write-line (strcat "    \"seccion\": \"" seccion "\",") f)
              (write-line (strcat "    \"rotacion\": " (vl-princ-to-string rotacion) ",") f)
              (write-line (strcat "    \"justificacion\": \"" justificacion "\",") f)
              (write-line (strcat "    \"largo_fisico\": " (rtos largo 2 4) ",") f)
              (if tmd-uuid
                (write-line (strcat "    \"uuid\": \"" tmd-uuid "\",") f)
              )
              
              (if m_pta
                (write-line (strcat "    \"pta\": \"" (rtos (car m_pta) 2 2) ", " (rtos (cadr m_pta) 2 2) ", " (rtos (caddr m_pta) 2 2) "\",") f)
              )
              (if m_ptb
                (write-line (strcat "    \"ptb\": \"" (rtos (car m_ptb) 2 2) ", " (rtos (cadr m_ptb) 2 2) ", " (rtos (caddr m_ptb) 2 2) "\",") f)
              )
              (write-line (strcat "    \"adn_active\": " (if (= adnActive 1) "true" "false") ",") f)
              (write-line (strcat "    \"tipo_objeto\": \"" tipoEnt "\",") f)
              
              ;; Marca posicional (BIM POS)
              (if (and marca (= (type marca) 'STR))
                (write-line (strcat "    \"marca\": \"" marca "\",") f)
                (write-line "    \"marca\": null," f)
              )
              
              ;; Juntas/cortes registrados (cutters) como array de objetos
              (write-line "    \"cutters\": [" f)
              (if (and cutters (listp cutters))
                (progn
                  (setq cList nil)
                  (foreach cut cutters
                    (if (listp cut)
                      (setq cList (cons
                        (strcat "{\"handle\": \"" (if (car cut) (vl-princ-to-string (car cut)) "") "\", \"tipo\": \"" (if (cadr cut) (vl-princ-to-string (cadr cut)) "FLUSH") "\"}")
                        cList))
                      (setq cList (cons (strcat "{\"handle\": \"" (vl-princ-to-string cut) "\", \"tipo\": \"FLUSH\"}") cList))
                    )
                  )
                  (setq cList (reverse cList))
                  (if cList
                    (progn
                      (write-line (strcat "      " (car cList)) f)
                      (foreach s (cdr cList)
                        (write-line (strcat "      , " s) f)
                      )
                    )
                  )
                )
              )
              (write-line "    ]" f)
              (write-line "  });" f)
              (write-line "}" f)
            )
            (progn
              (write-line "if (typeof tmdUpdateInspectorData === 'function') {" f)
              (write-line "  tmdUpdateInspectorData(null);" f)
              (write-line "}" f)
            )
          )
        )
      ))
      
      ;; ── CATÁLOGO DINÂMICO (protegido separadamente) ──
      (write-line "window.tmdCatalog = [" f)
      (vl-catch-all-apply
        '(lambda ()
          (if (and TMD:viga-load-catalog
                   (setq catData (TMD:viga-load-catalog))
                   (cadr catData))
            (progn
              (setq catalogItems (cadr catData))
              (setq cList nil)
              (foreach item catalogItems
                (if (and item (>= (length item) 5))
                  (setq cList (cons
                    (strcat "{\"nome\": \"" (nth 0 item)
                            "\", \"forma\": \"" (nth 1 item)
                            "\", \"x\": " (vl-princ-to-string (nth 2 item))
                            ", \"y\": " (vl-princ-to-string (nth 3 item))
                            ", \"e\": " (vl-princ-to-string (nth 4 item)) "}")
                    cList))
                )
              )
              (setq cList (reverse cList))
              (if cList
                (progn
                  (write-line (strcat "  " (car cList)) f)
                  (foreach s (cdr cList)
                    (write-line (strcat "  , " s) f)
                  )
                )
              )
            )
          )
        )
      )
      (write-line "];" f)
      
      ;; ── CLOSE é GARANTIDO mesmo se houve erros acima ──
      (close f)
      (if (vl-catch-all-error-p _err)
        (progn (princ (strcat "\n[⚠] Aviso: Error parcial al escribir JS: " (vl-catch-all-error-message _err))) nil)
        t
      )
    )
    nil
  )
)

;;; ==========================================================================
;;; 5. ATUALIZADOR DE PARÂMETROS BIM (CHAMADO POR JS)
;;; ==========================================================================
(defun TMD:palette-update-param (handle paramName val / ent params rotVal doc catData catList foundItem p_nome p_forma p_x p_y p_e p_labio p_material just rot metrics m_pta m_ptb dist ent_name tmd_uuid analytical_line pt_a pt_b)
  (setq ent (handent handle))
  (if ent
    (progn
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)
      
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (if (not params) (setq params '(("NOME" . "H100") ("ROTACAO" . 0) ("JUSTIFICACAO" . "MC"))))
      
      ;; Obtener UUID actual o generar uno nuevo
      (setq tmd_uuid (vlax-ldata-get ent "TMD_UUID"))
      (if (not tmd_uuid) (setq tmd_uuid (strcat "TMD-" (rtos (getvar "CDATE") 2 8) "-" (itoa (fix (* (rem (getvar "DATE") 1.0) 1000000))))))
      
      ;; Extraer línea analítica real ANTES de aplicar los nuevos parámetros
      (setq analytical_line (TMD:get-analytical-line ent))
      (if (and analytical_line (= (cdr (assoc 0 (entget ent))) "3DSOLID"))
        (setq pt_a (car analytical_line)
              pt_b (cadr analytical_line))
        (progn
          ;; Fallback si no es un 3DSOLID o no tiene metrics/params viejos
          (if (not (type TMD:GetSolidMetrics)) (vl-catch-all-apply 'load (list "TMD_BOM.lsp")))
          (setq metrics (if (type TMD:GetSolidMetrics) (TMD:GetSolidMetrics (vlax-ename->vla-object ent)) nil))
          (if metrics
            (setq pt_a (nth 3 metrics) pt_b (nth 4 metrics))
            (setq pt_a (cdr (assoc 10 (entget ent)))
                  pt_b (cdr (assoc 11 (entget ent))))
          )
        )
      )
      (setq dist (distance pt_a pt_b))
      
      (cond
        ((= paramName "SECCION")
         (setq params (TMD:subst-assoc "NOME" val params))
         ;; Buscar dimensiones en el catalogo
         (if TMD:viga-load-catalog
           (progn
             (setq catData (TMD:viga-load-catalog))
             (if (cadr catData)
               (progn
                 (setq catList (cadr catData) foundItem nil)
                 (foreach item catList (if (= (nth 0 item) val) (setq foundItem item)))
                 (if foundItem
                   (progn
                     (setq params (TMD:subst-assoc "FORMA" (nth 1 foundItem) params))
                     (setq params (TMD:subst-assoc "DIM_X" (nth 2 foundItem) params))
                     (setq params (TMD:subst-assoc "DIM_Y" (nth 3 foundItem) params))
                     (setq params (TMD:subst-assoc "ESPESSURA" (nth 4 foundItem) params))
                   )
                 )
               )
             )
           )
         )
        )
        ((= paramName "ROTACION")
         (setq rotVal (atof val))
         (setq params (TMD:subst-assoc "ROTACAO" rotVal params))
        )
        ((= paramName "JUSTIFICACION")
         (setq params (TMD:subst-assoc "JUSTIFICACAO" (TMD:normalize-just val) params))
        )
      )
      
      (vlax-ldata-put ent "TMD_PARAMS" params)
      (vlax-ldata-put ent "TMD_MARK" nil)
      (vlax-ldata-put ent "TMD_LEN_PHYS" nil)
      
      ;; Si es un 3DSOLID V5 reconstruir directamente con TMD:viga-build-geom
      (if (= (cdr (assoc 0 (entget ent))) "3DSOLID")
        (progn
          (setq p_nome (cdr (assoc "NOME" params))
                p_forma (cdr (assoc "FORMA" params))
                p_x (atof (vl-princ-to-string (cdr (assoc "DIM_X" params))))
                p_y (atof (vl-princ-to-string (cdr (assoc "DIM_Y" params))))
                p_e (atof (vl-princ-to-string (cdr (assoc "ESPESSURA" params))))
                p_labio (cdr (assoc "LABIO" params))
                p_material (cdr (assoc "MATERIAL" params))
                just (cdr (assoc "JUSTIFICACAO" params))
                rot (atof (vl-princ-to-string (cdr (assoc "ROTACAO" params)))))
          (if (not p_labio) (setq p_labio 0.0) (setq p_labio (atof (vl-princ-to-string p_labio))))
          (if (not p_material) (setq p_material "ACO"))
          
          (setq ent_name (TMD:viga-build-geom ent pt_a pt_b just rot p_nome p_forma p_x p_y p_e p_labio p_material dist))
          (if ent_name
            (progn
              (vlax-ldata-put ent_name "TMD_CLASSE" "ESTRUTURA")
              (vlax-ldata-put ent_name "TMD_TIPO" (vlax-ldata-get ent "TMD_TIPO"))
              (vlax-ldata-put ent_name "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object ent_name)))
              (vlax-ldata-put ent_name "TMD_UUID" tmd_uuid)
              (vlax-ldata-put ent_name "TMD_HOST_HANDLE" (vla-get-handle (vlax-ename->vla-object ent_name)))
              (vlax-ldata-put ent_name "TMD_JUSTIFICACAO" just)
              (vlax-ldata-put ent_name "TMD_ROTACAO" rot)
            )
          )
        )
        (TMD:build-single-wire ent)
      )
      
      (vla-EndUndoMark doc)
      (if ent_name (sssetfirst nil (ssadd ent_name)))
      (TMD:query-active-selection nil)
      (princ (strcat "\n[✔] " paramName " actualizado a " val " en la viga <" handle ">."))
    )
  )
  (princ)
)

(defun c:TMD_DO_PICK ()
  (if (and *tmd-pick-handle* *tmd-pick-type*)
    (progn
      (TMD:palette-pick-point *tmd-pick-handle* *tmd-pick-type*)
      (setq *tmd-pick-handle* nil *tmd-pick-type* nil)
    )
  )
  (princ)
)

(defun TMD:palette-pick-point (handle ptType / ent doc pt_val params metrics m_pta m_ptb dist p_nome p_forma p_x p_y p_e p_labio p_material just rot ent_name tmd_uuid analytical_line pt_a pt_b)
  (setq ent (handent handle))
  (if ent
    (progn
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      
      ;; Extraer línea analítica real ANTES de preguntar, para la línea elástica (rubber-band)
      (setq analytical_line (TMD:get-analytical-line ent))
      (if (and analytical_line (= (cdr (assoc 0 (entget ent))) "3DSOLID"))
        (setq pt_a (car analytical_line)
              pt_b (cadr analytical_line))
        (progn
          (if (not (type TMD:GetSolidMetrics)) (vl-catch-all-apply 'load (list "TMD_BOM.lsp")))
          (setq metrics (if (type TMD:GetSolidMetrics) (TMD:GetSolidMetrics (vlax-ename->vla-object ent)) nil))
          (if metrics
            (setq pt_a (nth 3 metrics) pt_b (nth 4 metrics))
            (setq pt_a (cdr (assoc 10 (entget ent)))
                  pt_b (cdr (assoc 11 (entget ent))))
          )
        )
      )
      
      (if (and pt_a pt_b)
        (progn
          (if (= ptType "PT_A")
            (setq pt_val (getpoint pt_b "\n[TMD] Selecione nova coordenada para PT_A (Inicio): "))
            (setq pt_val (getpoint pt_a "\n[TMD] Selecione nova coordenada para PT_B (Fim): "))
          )
          
          (if pt_val
            (progn
              (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
              (vla-StartUndoMark doc)
              
              ;; Obtener UUID actual o generar uno nuevo
              (setq tmd_uuid (vlax-ldata-get ent "TMD_UUID"))
              (if (not tmd_uuid) (setq tmd_uuid (strcat "TMD-" (rtos (getvar "CDATE") 2 8) "-" (itoa (fix (* (rem (getvar "DATE") 1.0) 1000000))))))
          
              (if (= ptType "PT_A") (setq pt_a pt_val) (setq pt_b pt_val))
              (setq dist (distance pt_a pt_b))
              
              (setq p_nome (cdr (assoc "NOME" params))
                    p_forma (cdr (assoc "FORMA" params))
                    p_x (atof (vl-princ-to-string (cdr (assoc "DIM_X" params))))
                    p_y (atof (vl-princ-to-string (cdr (assoc "DIM_Y" params))))
                    p_e (atof (vl-princ-to-string (cdr (assoc "ESPESSURA" params))))
                    p_labio (cdr (assoc "LABIO" params))
                    p_material (cdr (assoc "MATERIAL" params))
                    just (cdr (assoc "JUSTIFICACAO" params))
                    rot (atof (vl-princ-to-string (cdr (assoc "ROTACAO" params)))))
                    
              (if (not p_labio) (setq p_labio 0.0) (setq p_labio (atof (vl-princ-to-string p_labio))))
              (if (not p_material) (setq p_material "ACO"))
              
              (setq ent_name (TMD:viga-build-geom ent pt_a pt_b just rot p_nome p_forma p_x p_y p_e p_labio p_material dist))
              (if ent_name
                (progn
                  (vlax-ldata-put ent_name "TMD_CLASSE" "ESTRUTURA")
                  (vlax-ldata-put ent_name "TMD_TIPO" (vlax-ldata-get ent "TMD_TIPO"))
                  (vlax-ldata-put ent_name "TMD_SELF_HANDLE" (vla-get-handle (vlax-ename->vla-object ent_name)))
                  (vlax-ldata-put ent_name "TMD_UUID" tmd_uuid)
                  (vlax-ldata-put ent_name "TMD_HOST_HANDLE" (vla-get-handle (vlax-ename->vla-object ent_name)))
                  (vlax-ldata-put ent_name "TMD_JUSTIFICACAO" just)
                  (vlax-ldata-put ent_name "TMD_ROTACAO" rot)
                )
              )
              (if doc (vla-EndUndoMark doc))
              (if ent_name (sssetfirst nil (ssadd ent_name)))
              (TMD:query-active-selection nil)
            )
          )
        )
      )
    )
  )
  (princ)
)

;;; ==========================================================================
;;; 6. GESTÃO DOS REATORES DE SELEÇÃO AUTOMÁTICA
;;; ==========================================================================
;;; Descrição: Registra ou limpa reatores de editor para suportar atualização
;;;            automática ao alterar seleção de objetos (PickFirst).

(defun TMD:pickfirst-callback (reactorObj eventList)
  ;; Evitamos re-entradas perigosas capturando erros silenciosamente
  (vl-catch-all-apply 'TMD:query-active-selection '(nil))
  (princ)
)

(defun TMD:reactor-on ()
  (vl-load-com)
  ;; Remove reatores duplicados antes de registrar o novo
  (TMD:reactor-off)
  (if (not *TMD-PF-REACTOR*)
    (progn
      (setq *TMD-PF-REACTOR*
        (vlr-miscellaneous-reactor 
          nil 
          (list (cons :vlr-pickfirstModified 'TMD:pickfirst-callback))
        )
      )
      (princ "\n[⚙] Reactor de selección en tiempo real activo.")
    )
  )
  (princ)
)

(defun TMD:reactor-off ()
  (if (and (boundp '*TMD-PF-REACTOR*) *TMD-PF-REACTOR*)
    (progn
      (vlr-remove *TMD-PF-REACTOR*)
      (setq *TMD-PF-REACTOR* nil)
      (princ "\n[⚙] Reactor de selección desactivado.")
    )
  )
  (princ)
)

(defun c:TMD_REACTOR_ON ()
  (TMD:reactor-on)
  (princ)
)

(defun c:TMD_REACTOR_OFF ()
  (TMD:reactor-off)
  (princ)
)

;;; ==========================================================================
;;; 7. FUNÇÃO UTILITÁRIA DE SUBSTITUIÇÃO EM ALIST
;;; ==========================================================================
(defun TMD:subst-assoc (key newVal alist / item)
  (setq item (assoc key alist))
  (if item
    (subst (cons key newVal) item alist)
    (cons (cons key newVal) alist)
  )
)

;;; ==========================================================================
;;; 8. COMANDOS DE PALETA PARA INTERAÇÃO COM JUNTAS (CUTTERS)
;;;    Reutiliza padrões de TMD_JOINTS.lsp (TMD_JOINTS_INSPECT / _CLEAR)
;;; ==========================================================================

;;; Descrição: Localiza visualmente uma junta na viewport.
;;;   Reutiliza o padrão de marcadores visuais do TMD_JOINTS_INSPECT:
;;;   entmake CIRCLE + TEXT no endpoint do wire correspondente ao extremo da junta.
(defun TMD:palette-zoom-cutter (wireHandle cutterHandle / wireEnt cuts c h_m ev pt found)
  (setq wireEnt (handent wireHandle))
  (if (and wireEnt (entget wireEnt))
    (progn
      (setq cuts (vlax-ldata-get wireEnt "TMD_CUTTERS"))
      (setq found nil)
      (if (and cuts (listp cuts))
        (foreach c cuts
          (if (and (not found) (listp c)
                   (= (vl-princ-to-string (car c)) cutterHandle))
            (progn
              (setq found c)
              (setq h_m (car c) ev (nth 4 c))
              ;; Endpoint: A=p10, B=p11 (mesmo padrão TMD_JOINTS_INSPECT L585)
              (setq pt (if (equal ev "A")
                         (cdr (assoc 10 (entget wireEnt)))
                         (cdr (assoc 11 (entget wireEnt)))))
              ;; Zoom ao punto
              (vl-cmdf "_.ZOOM" "_C" pt 500.0)
              ;; Marcadores visuais (padrão TMD_JOINTS_INSPECT L586-587)
              (entmake (list '(0 . "CIRCLE") (cons 10 pt) '(40 . 15.0) '(62 . 1) (cons 8 "0")))
              (entmake (list '(0 . "TEXT") (cons 10 (mapcar '+ pt '(18 5 0))) (cons 40 6.0)
                             (cons 1 (strcat "JUNTA: " h_m " [" (if (nth 1 c) (nth 1 c) "FLUSH") "]"))
                             '(62 . 1) (cons 8 "0")))
              (princ (strcat "\n[TMD] Junta <" cutterHandle "> localizada en extremo " ev ". Marcadores en rojo (temporales)."))
            )
          )
        )
      )
      (if (not found)
        (princ (strcat "\n[!] Junta <" cutterHandle "> no encontrada en el ADN del wire <" wireHandle ">."))
      )
    )
    (princ "\n[!] Wire no encontrado.")
  )
  (princ)
)

;;; Descrição: Remove uma junta específica do LData TMD_CUTTERS de um Wire.
;;;   Reutiliza o padrão de limpeza do TMD_JOINTS_CLEAR (vlax-ldata-put nil)
;;;   + rebuild sólido com TMD:build-single-wire + re-sync paleta.
(defun TMD:palette-remove-cutter (wireHandle cutterHandle / wireEnt cutters newCutters cut cutH doc)
  (vl-load-com)
  (setq wireEnt (handent wireHandle))
  (if (and wireEnt (entget wireEnt))
    (progn
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)
      (setq cutters (vlax-ldata-get wireEnt "TMD_CUTTERS"))
      (if (and cutters (listp cutters))
        (progn
          ;; Filtrar: manter tudo excepto o cutter alvo (padrão TMD_JOINTS_CLEAR)
          (setq newCutters nil)
          (foreach cut cutters
            (setq cutH (if (listp cut) (vl-princ-to-string (car cut)) (vl-princ-to-string cut)))
            (if (/= cutH cutterHandle)
              (setq newCutters (cons cut newCutters))
            )
          )
          (setq newCutters (reverse newCutters))
          ;; Gravar LData limpo (padrão TMD_JOINTS_CLEAR L553-555)
          (vlax-ldata-put wireEnt "TMD_CUTTERS" (if newCutters newCutters nil))
          (vlax-ldata-put wireEnt "TMD_MARK" nil)
          (vlax-ldata-put wireEnt "TMD_LEN_PHYS" nil)
          ;; Rebuild sólido sin a junta removida
          (if TMD:build-single-wire (TMD:build-single-wire wireEnt))
          ;; Re-sync paleta web
          (TMD:query-active-selection nil)
          (princ (strcat "\n[TMD] Junta <" cutterHandle "> eliminada. Sólido reconstruido."))
        )
        (princ "\n[i] La viga no tiene juntas registradas.")
      )
      (vla-EndUndoMark doc)
    )
    (princ "\n[!] Wire no encontrado.")
  )
  (princ)
)

(princ)
