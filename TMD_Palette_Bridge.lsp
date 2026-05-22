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
        (setq adnActive 1)
        (progn
          (setq adnActive 0)
          ;; Valores padrões provisórios caso o Wire seja genérico
          (setq params '(("SECCION" . "H100") ("ROTATION" . 0) ("JUSTIFICATION" . "Centro")))
        )
      )
      
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
      
      ;; Parsers de segurança para cada campo do ADN
      (setq seccion (cdr (assoc "SECCION" params)))
      (if (not seccion) (setq seccion "H100"))
      
      (setq rotacion (cdr (assoc "ROTATION" params)))
      (if (not rotacion) (setq rotacion 0))
      
      (setq justificacion (cdr (assoc "JUSTIFICATION" params)))
      (if (not justificacion) (setq justificacion "Centro"))
      
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
              (write-line (strcat "    \"rotacion\": " (itoa rotacion) ",") f)
              (write-line (strcat "    \"justificacion\": \"" justificacion "\",") f)
              (write-line (strcat "    \"largo_fisico\": " (rtos largo 2 4) ",") f)
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
;;; Descrição: Recebe a ordem da paleta HTML, localiza a entidade pelo handle,
;;;            atualiza seu LData TMD_PARAMS, limpa a Marca Frágil e dispara
;;;            a regeneração física 3D do sólido.
(defun TMD:palette-update-param (handle paramName val / ent params rotVal doc)
  (setq ent (handent handle))
  (if ent
    (progn
      (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
      (vla-StartUndoMark doc)
      
      ;; 1. Obtém e inyecta os parâmetros no ADN (LData)
      (setq params (vlax-ldata-get ent "TMD_PARAMS"))
      (if (not params)
        (setq params '(("SECCION" . "H100") ("ROTATION" . 0) ("JUSTIFICATION" . "Centro")))
      )
      
      (cond
        ((= paramName "SECCION")
         (setq params (TMD:subst-assoc "SECCION" val params))
        )
        ((= paramName "ROTACION")
         (setq rotVal (atoi val))
         (setq params (TMD:subst-assoc "ROTATION" rotVal params))
        )
        ((= paramName "JUSTIFICACION")
         (setq params (TMD:subst-assoc "JUSTIFICATION" val params))
        )
      )
      
      (vlax-ldata-put ent "TMD_PARAMS" params)
      
      ;; 2. Protocolo de Trazabilidade Frágil (Invalidar marcas)
      (vlax-ldata-put ent "TMD_MARK" nil)
      (vlax-ldata-put ent "TMD_LEN_PHYS" nil)
      
      ;; 3. Regeneração Física do Sólido 3D
      (TMD:build-single-wire ent)
      
      (vla-EndUndoMark doc)
      
      ;; 4. Re-sincroniza a paleta regravando o arquivo JS com o novo estado
      (TMD:query-active-selection nil)
      (princ (strcat "\n[✔] " paramName " actualizado a " val " en la viga <" handle ">."))
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
