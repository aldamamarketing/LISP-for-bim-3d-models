const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Lazy imports de módulos nativos
function getOpenAI() {
  const OpenAI = require("openai");
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
  });
}

// Lazy imports de módulos nativos
function getDeps() {
  return {
    fs: require("fs"),
    path: require("path"),
    admin: require("firebase-admin")
  };
}

function getDb() {
  const { admin } = getDeps();
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin.firestore();
}

exports.getRoutine = onRequest({ cors: true }, async (req, res) => {
  const { fs, path } = getDeps();
  // Soporte de compatibilidad y arquitectura SaaS: token/lispId (Nuevo) o apiKey/routine (Legacy)
  const rawToken = req.query.token || req.query.apiKey;
  const rawLispId = req.query.lispId || req.query.routine;
  const apiKey = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const routineId = Array.isArray(rawLispId) ? rawLispId[0] : rawLispId;
  const rawHwId = Array.isArray(req.query.hwId) ? req.query.hwId[0] : req.query.hwId;
  
  // Decodifica espacios y caracteres especiales de URL en el hardware ID
  const hwId = rawHwId ? decodeURIComponent(rawHwId) : null;

  if (!apiKey) {
    return res.status(400).send("Error: API Key faltante.");
  }

  try {
    const db = getDb();
    const snapshot = await db.collection("users").where("apiKey", "==", apiKey).limit(1).get();

    if (snapshot.empty) {
      if (apiKey !== "lispcentral_test_key" && !apiKey.startsWith("trial_tmd_")) {
        return res.status(401).send("Error: API Key no autorizada.");
      }
    }

    let userEmail = "Trial User";
    let userDocRef = null;
    let registeredDevice = null;
    let userData = null;

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      userDocRef = userDoc.ref;
      userData = userDoc.data();
      userEmail = userData.email || "Cliente Registrado";
      registeredDevice = userData.registeredDevice || null;
    }

    if (hwId && userDocRef && userData) {
      const maxSeats = userData.maxSeats || 1;
      const registeredDevices = userData.registeredDevices || [];

      if (!registeredDevices.includes(hwId)) {
        if (registeredDevices.length < maxSeats) {
          registeredDevices.push(hwId);
          await userDocRef.update({ 
            registeredDevices: registeredDevices,
            registeredDevice: hwId // Mantenemos compatibilidad con el Dashboard actual
          });
        } else {
          const drmAlert = `(alert "\\n[TM Digital] PROTECAO ATIVADA:\\nLimite de assentos atingido (${maxSeats}).\\n\\nAcesse o Painel Web para desvincular um equipamento antigo ou adquirir mais assentos.")\n(princ)`;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          return res.status(200).send(drmAlert);
        }
      }
    }

    const lispDir = path.join(__dirname, "lisp");
    let responseCode = "";
    let routinesLoaded = [];

    if (routineId && routineId.toUpperCase() === "INDEX") {
      // Si el usuario es antiguo y no tiene activeSuites, le damos acceso a las básicas de la beta
      const activeSuites = userData.activeSuites || ["core", "structures_pro", "architecture", "quantities"];
      const lispsRef = db.collection("lispFiles").where("tenantId", "==", userDocRef.id);
      const snapshotLisps = await lispsRef.get();
      
      const commands = [];
      snapshotLisps.forEach(docSnap => {
        const data = docSnap.data();
        commands.push({
          name: data.lispId,
          friendly: data.friendlyName || data.lispId,
          desc: data.description || "Comando Cloud",
          group: data.group || "Custom Tools",
          doc: "#",
          svgIcon: data.svgIcon || ""
        });
      });
      
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).send(JSON.stringify(commands));
    }

    if (!routineId || routineId.toUpperCase() === "ALL") {
      const files = fs.readdirSync(lispDir);
      
      files.forEach(file => {
        if (file.endsWith(".lsp") && file !== "acaddoc.lsp" && file !== "TMD_Loader.lsp" && file !== "TM_Setup.lsp" && file !== "TM_SetupCore.lsp") {
          const filepath = path.join(lispDir, file);
          let filecode = fs.readFileSync(filepath, "utf8");
          
          filecode = filecode.replace(/;+.*$/gm, ""); 
          filecode = filecode.replace(/^\s*[\r\n]/gm, "");
          
          const escapedCode = filecode
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');
          
          responseCode += `\n;;; ROUTINE: ${file}\n` +
                          `(vl-catch-all-apply 'eval (list (read "(progn\\n${escapedCode}\\n(princ)\\n)"))) (princ)\n`;
          
          routinesLoaded.push(file.replace(".lsp", ""));
        }
      });
      
      const header = `;;; =====================================================================================\n` +
                     `;;; SERVIDO POR LISPCENTRAL CLOUD PLATFORM v2.0 (SaaS)\n` +
                     `;;; Pacote Consolidado de Ferramentas Carregado em RAM\n` +
                     `;;; Licença Ativa: ${userEmail}\n` +
                     `;;; Módulos incluídos: ${routinesLoaded.join(", ")}\n` +
                     `;;; Timestamp: ${new Date().toISOString()}\n` +
                     `;;; =====================================================================================\n`;
      
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(header + responseCode);

    } else {
      const safeRoutineId = routineId.replace(/[^a-zA-Z0-9_-]/g, "");
      let filename = `${safeRoutineId}.lsp`;
      let isLC = safeRoutineId.startsWith("LC_");
      let originalName = safeRoutineId;
      let filepath = path.join(lispDir, filename);

      if (!fs.existsSync(filepath) && isLC) {
        filename = filename.replace("LC_", "TMD_");
        originalName = safeRoutineId.replace("LC_", "TMD_");
        filepath = path.join(lispDir, filename);
      }

      let code = "";

      if (!fs.existsSync(filepath)) {
        // Fallback: Buscar en el Workspace del Tenant (Firebase Storage)
        if (!userDocRef) {
          return res.status(404).send(`Error: Rutina ${originalName} no encontrada.`);
        }

        const lispsSnapshot = await db.collection("lispFiles")
          .where("tenantId", "==", userDocRef.id)
          .where("lispId", "==", safeRoutineId)
          .limit(1)
          .get();

        if (lispsSnapshot.empty) {
          return res.status(404).send(`Error: Rutina ${originalName} no encontrada en el servidor ni en tu Workspace.`);
        }

        const lispData = lispsSnapshot.docs[0].data();
        const { admin } = getDeps();
        const bucket = admin.storage().bucket("lispcentral.firebasestorage.app");
        const file = bucket.file(lispData.storagePath);
        
        try {
          const [content] = await file.download();
          code = content.toString("utf8");
        } catch (e) {
          return res.status(500).send(`Error: Fallo al descargar rutina del Workspace.`);
        }
      } else {
        // Leer localmente del Core
        code = fs.readFileSync(filepath, "utf8");
      }

      if (isLC) {
        code = code.replace(/c:TMD_/gi, "c:LC_");
        code = code.replace(/\(TMD_/gi, "(LC_");
      }

      // Minificación LISP estricta para inyección en RAM (Zero-Disk)
      code = code.replace(/;.*$/gm, ""); // Remover todos los comentarios
      code = code.replace(/\r\n/g, "\n"); // Normalizar saltos de línea
      // Envolvemos en progn en el backend para entregar una S-Expression perfecta
      code = `(progn\n${code}\n(princ)\n)`;


      const header = `;;; =====================================================================================\n` +
                     `;;; SERVIDO POR LISPCENTRAL CLOUD PLATFORM v2.0 (SaaS)\n` +
                     `;;; Licença Ativa: ${userEmail}\n` +
                     `;;; Timestamp: ${new Date().toISOString()}\n` +
                     `;;; =====================================================================================\n`;
      
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(header + code);
    }
  } catch (err) {
    console.error("Erro ao ler rotina:", err);
    return res.status(500).send("Error interno al leer la rutina.");
  }
});

exports.generateLoader = onRequest({ cors: true }, async (req, res) => {
  const { admin } = getDeps();
  const token = req.query.token || req.query.apiKey;
  if (!token) return res.status(400).send("Falta Token.");

  const db = getDb();
  const snapshot = await db.collection("users").where("apiKey", "==", token).limit(1).get();
  if (snapshot.empty) return res.status(404).send("Token invalido.");

  const tenantName = snapshot.docs[0].data().name || "Cliente";

  const loaderCode = `;;; ==========================================================================
;;; LISPCENTRAL CLOUD LOADER (SaaS Multi-Tenant)
;;; Licenciado para: ${tenantName}
;;; Não modifique o Seat Token abaixo. Ele vincula seu assento e empresa.
;;; ==========================================================================

(setq *LC-SEAT-TOKEN* "${token}")
(setq *LC-API-ENDPOINT* "https://getroutine-wgpjjgorxa-uc.a.run.app/getRoutine")

;; Gerando Hash de Hardware (Machine ID) e Versão do AutoCAD
(setq *LC-HWID* (strcat (getenv "COMPUTERNAME") "@" (getenv "USERNAME")))
(setq *LC-ACADVER* (getvar "ACADVER"))

;; Funcao profesional para Dialog Box (Yes/No)
(defun LC:MsgBox (title msg type / wsh res)
  (if (setq wsh (vlax-create-object "WScript.Shell"))
    (progn
      (setq res (vlax-invoke-method wsh 'Popup msg 0 title type))
      (vlax-release-object wsh)
      res
    )
    (progn (alert msg) 0)
  )
)

;; Funcao utilitaria para codificar espacos na URL
(defun LC:url-encode (str / res i len char)
  (setq res "")
  (setq i 1)
  (setq len (strlen str))
  (while (<= i len)
    (setq char (substr str i 1))
    (if (= char " ")
      (setq res (strcat res "%20"))
      (setq res (strcat res char))
    )
    (setq i (1+ i))
  )
  res
)

;; Funcao para baixar e avaliar codigo na memoria do AutoCAD sem gravar arquivos fisicos (Online-Only)
(defun LC:load-remote-routine (lisp_id / xmlhttp url status response)
  (princ (strcat "\\n[LispCentral] Baixando pacote '" lisp_id "'..."))
  ;; Usamos token y lispId como parametros semanticos
  (setq url (strcat *LC-API-ENDPOINT* "?token=" *LC-SEAT-TOKEN* "&hwId=" (LC:url-encode *LC-HWID*) "&lispId=" lisp_id))
  (setq xmlhttp (vlax-create-object "MSXML2.XMLHTTP.6.0"))
  (if xmlhttp
    (progn
      (vl-catch-all-apply
        '(lambda ()
           (vlax-invoke-method xmlhttp 'open "GET" url :vlax-false)
           (vlax-invoke-method xmlhttp 'send)
         )
      )
      (setq status (vl-catch-all-apply 'vlax-get-property (list xmlhttp 'status)))
      (if (= status 200)
        (progn
          (setq response (vlax-get-property xmlhttp 'responseText))
          ;; Executa o codigo em RAM de forma isolada
          (if (vl-catch-all-error-p (vl-catch-all-apply 'eval (list (read (strcat "(progn\\n" response "\\n(princ)\\n)")))))
            (progn
              (princ (strcat "\\n[❌] Erro de sintaxe na rotina: " lisp_id))
              (setvar "USERS1" (strcat lisp_id ":error"))
              nil
            )
            (progn
              (setvar "USERS1" (strcat lisp_id ":success"))
              (princ) ;; Silent success
              t
            )
          )
        )
        (progn
          (princ (strcat "\\n[❌] Falha ao baixar '" lisp_id "' (Status: " (vl-princ-to-string status) ")."))
          (setvar "USERS1" (strcat lisp_id ":error"))
          nil
        )
      )
      (vlax-release-object xmlhttp)
    )
    (progn
      (princ "\\n[❌] Falha ao instanciar o objeto XMLHTTP.")
      (setvar "USERS1" (strcat lisp_id ":error"))
      nil
    )
  )
  (princ)
)

;; Mapeamento de nome de arquivo para o comando real definido em LISP
(defun LC:get-command-name (lisp_id / r-upper)
  (setq r-upper (strcase lisp_id))
  (cond
    ((= r-upper "ABAPARAM") "ABA_PARAM")
    ((= r-upper "ABAPERFIL") "ABA_PERFIL")
    ((= r-upper "ACMMVP") "ACM")
    ((= r-upper "ACMTOOLS") "ABA_CRIAR")
    ((= r-upper "CORTARPAREDES") "CORTARPAREDE")
    ((= r-upper "ESTRUTURAMVP") "VIGA")
    ((= r-upper "PAREDEMVP") "PAREDE")
    ((= r-upper "PORTAMVP") "PORTA")
    ((= r-upper "TEJADOMVP") "TELHADO")
    (t lisp_id)
  )
)

;; Funcao para rodar um comando garantindo que esteja carregado
(defun LC:run-or-load (lisp_id / cmd-name cmd-sym)
  (setq cmd-name (LC:get-command-name lisp_id))
  (setq cmd-sym (read (strcat "c:" cmd-name)))
  (if (not (eval (list 'type cmd-sym)))
    (progn
      (princ) ;; Silent redirection
      (LC:load-remote-routine lisp_id)
    )
  )
  (if (eval (list 'type cmd-sym))
    (progn
      (eval (list cmd-sym))
    )
    (alert (strcat "\\n[❌] Erro: Nao foi possivel carregar o comando: " cmd-name))
  )
  (princ)
)

;; --------------------------------------------------------------------------
;; EVENT HUB: Reactor de Cambio de Documento para Paletas Web (LC_SESSION_HUB)
;; --------------------------------------------------------------------------
(defun LC:DocChanged-Callback (reactorObj eventList / activeDoc f-js event-js)
  (vl-catch-all-apply
    '(lambda ()
       (setq event-js (strcat (getenv "TEMP") "\\\\LC_DocEvent.js"))
       (setq event-js (vl-string-translate "\\\\" "/" event-js))
       
       (setq f-js (open event-js "w"))
       (if f-js
         (progn
           (write-line "if (typeof window !== 'undefined') {" f-js)
           (write-line "    window.dispatchEvent(new CustomEvent('lc_context_changed'));" f-js)
           (write-line "    console.log('[LC Event Hub] Cambio de documento activo notificado a las paletas.');" f-js)
           (write-line "}" f-js)
           (close f-js)
           (vl-cmdf "_.WEBLOAD" "_L" (strcat "\\"" event-js "\\""))
         )
       )
     )
  )
  (princ)
)

(defun LC:Init-EventHub ()
  (vl-load-com)
  (if (and (boundp '*LC-DOC-REACTOR*) *LC-DOC-REACTOR*)
    (vlr-remove *LC-DOC-REACTOR*)
  )
  (setq *LC-DOC-REACTOR*
    (vlr-docmanager-reactor 
      nil 
      (list (cons :vlr-documentBecameCurrent 'LC:DocChanged-Callback))
    )
  )
  (princ "\\n[LC Event Hub] Reactor Global de Sesión Inicializado.")
)

;; --------------------------------------------------------------------------
;; BASE64 DECODER
;; --------------------------------------------------------------------------
(defun LC:b64d (str / xmlNode stream txt)
  (setq xmlNode (vlax-create-object "MSXML2.DOMDocument.6.0"))
  (if xmlNode
    (progn
      (setq xmlNode (vlax-invoke-method xmlNode 'createElement "b64"))
      (vlax-put-property xmlNode 'dataType "bin.base64")
      (vlax-put-property xmlNode 'text str)
      (setq stream (vlax-create-object "ADODB.Stream"))
      (if stream
        (progn
          (vlax-put-property stream 'Type 1) ; adTypeBinary
          (vlax-invoke-method stream 'Open)
          (vlax-invoke-method stream 'Write (vlax-get-property xmlNode 'nodeTypedValue))
          (vlax-put-property stream 'Position 0)
          (vlax-put-property stream 'Type 2) ; adTypeText
          (vlax-put-property stream 'Charset "utf-8")
          (setq txt (vlax-invoke-method stream 'ReadText -1))
          (vlax-invoke-method stream 'Close)
          (vlax-release-object stream)
        )
      )
      (vlax-release-object xmlNode)
    )
  )
  (if txt txt "")
)

;; --------------------------------------------------------------------------
;; RESOURCE PALETTE: Aplicar Hatches e Linetypes dos favoritos cloud
;; --------------------------------------------------------------------------

;; Aplica um Hatch recebido da paleta de recursos (dados em Base64)
(defun LC_ApplyHatch (patName codeB64 / tmpDir tmpFile f)
  (setq tmpDir (getenv "TEMP"))
  (setq tmpFile (strcat tmpDir "\\\\LC_" patName ".pat"))
  (setq f (open tmpFile "w"))
  (if f
    (progn
      (write-line (strcat "*" patName ", LispCentral Cloud") f)
      ;; Decodifica Base64 inline: el frontend envia el patCode codificado
      (write-line (vl-catch-all-apply 'eval (list (read (strcat "(LC:b64d \\"" codeB64 "\\")")))) f)
      (close f)
      (setenv "ACAD" (strcat (getenv "ACAD") ";" tmpDir))
      (setvar "HPNAME" patName)
      (princ (strcat "\\\\n[LC] Hachura '" patName "' pronta. Use HATCH."))
    )
    (princ "\\\\n[LC] Erro ao salvar hachura temp.")
  )
  (princ)
)

;; Aplica um Linetype recebido da paleta de recursos
(defun LC_ApplyLinetype (linName codeB64 / tmpDir tmpFile f)
  (setq tmpDir (getenv "TEMP"))
  (setq tmpFile (strcat tmpDir "\\\\LC_" linName ".lin"))
  (setq f (open tmpFile "w"))
  (if f
    (progn
      (write-line (strcat "*" linName ", LispCentral Cloud") f)
      (write-line (vl-catch-all-apply 'eval (list (read (strcat "(LC:b64d \\"" codeB64 "\\")")))) f)
      (close f)
      (vl-cmdf "._-LINETYPE" "_Load" linName tmpFile "")
      (princ (strcat "\\\\n[LC] Linha '" linName "' carregada."))
    )
    (princ "\\\\n[LC] Erro ao salvar linha temp.")
  )
  (princ)
)

 ;; Comando Principal de la Paleta Unificada (CP1)
(defun c:CP1 (/ doc loader-js f-js)
  (vl-load-com)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)
  
  (princ "\\n[⚙] Abrindo LispCentral Palette...")
  
  ;; Construir URL
  (setq *LC-PALETTE-URL* (strcat "https://lispcentral.web.app/palette?token=" *LC-SEAT-TOKEN* "&hwid=" *LC-HWID*))
  
  ;; Solo inyectar si la paleta NO fue creada (previene duplicados)
  (if (not (boundp '*LC-PALETTE-ACTIVE*))
    (progn
      (setq loader-js (strcat (getenv "TEMP") "/LC_Palette_Loader.js"))
      (setq loader-js (vl-string-translate "\\\\" "/" loader-js))
      (setq f-js (open loader-js "w"))
      (if f-js
        (progn
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line (strcat "    Acad.Application.addPalette(\\\"Command Palette\\\", \\\"" *LC-PALETTE-URL* "\\\");") f-js)
          (write-line "}" f-js)
          (close f-js)
          (vl-cmdf "_.WEBLOAD" "_L" (strcat "\\"" loader-js "\\""))
          (setq *LC-PALETTE-ACTIVE* T)
          (LC:Init-EventHub)
          (princ "\\n[✔] LispCentral Palette pronta.")
        )
        (princ "\\n[❌] Erro ao criar arquivo JS da paleta.")
      )
    )
    (princ "\\n[✔] Paleta já ativa. LC_RESET para forçar.")
  )
  
  (vla-EndUndoMark doc)
  (princ)
)

;; Comando da Paleta de Recursos
(defun c:LC_RES (/ doc loader-js f-js)
  (vl-load-com)
  (setq doc (vla-get-ActiveDocument (vlax-get-acad-object)))
  (vla-StartUndoMark doc)
  
  (princ "\\n[⚙] Abrindo Resource Palette...")
  
  (setq *LC-RESOURCE-URL* (strcat "https://lispcentral.web.app/resource-palette?token=" *LC-SEAT-TOKEN* "&hwid=" *LC-HWID*))
  
  (if (not (boundp '*LC-RESOURCE-ACTIVE*))
    (progn
      (setq loader-js (strcat (getenv "TEMP") "/LC_Resource_Loader.js"))
      (setq loader-js (vl-string-translate "\\\\" "/" loader-js))
      (setq f-js (open loader-js "w"))
      (if f-js
        (progn
          (write-line "if (typeof Acad !== 'undefined') {" f-js)
          (write-line (strcat "    Acad.Application.addPalette(\\\"LispCentral Recursos\\\", \\\"" *LC-RESOURCE-URL* "\\\");") f-js)
          (write-line "}" f-js)
          (close f-js)
          (vl-cmdf "_.WEBLOAD" "_L" (strcat "\\"" loader-js "\\""))
          (setq *LC-RESOURCE-ACTIVE* T)
          (princ "\\n[✔] Resource Palette pronta.")
        )
        (princ "\\n[❌] Erro ao criar arquivo JS da paleta de recursos.")
      )
    )
    (princ "\\n[✔] Paleta de Recursos já ativa. LC_RESET para forçar.")
  )
  
  (vla-EndUndoMark doc)
  (princ)
)

;; Alias Oficiales
(defun c:LC_INSPECT () (c:CP1))
(defun c:TMD_INSPECT () (c:CP1))
(defun c:LC () (c:CP1))
(defun c:PALETA () (c:CP1))
(defun c:PALETTE () (c:CP1))

(defun c:RECURSOS () (c:LC_RES))
(defun c:HATCHES () (c:LC_RES))
(defun c:LINHAS () (c:LC_RES))

;; Reset: fuerza reabrir paleta
(defun c:LC_RESET ()
  (setq *LC-PALETTE-ACTIVE* nil)
  (setq *LC-PALETTE-URL* nil)
  (setq *LC-RESOURCE-ACTIVE* nil)
  (setq *LC-RESOURCE-URL* nil)
  (princ "\\n[LC] Paletas resetadas.")
  (c:CP1)
)

;; Ajuda
(defun c:LC_HELP ()
  (princ "\\n  LC / PALETA / CP1 .. Abrir Palette")
  (princ "\\n  LC_RES / RECURSOS .. Abrir Paleta de Recursos")
  (princ "\\n  LC_RESET .......... Reabrir paletas")
  (princ "\\n  LC_HELP ........... Esta ajuda")
  (princ "\\n")
  (princ)
)

;; Arranque
(princ "\\n[LispCentral] Inicializando...")
(c:CP1)
(princ "\\n[LispCentral] LC_HELP para comandos.")

`;

  res.setHeader("Content-Disposition", 'attachment; filename="LC_Loader.lsp"');
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.status(200).send(loaderCode);
});

// Endpoint para el Generador de Iconos IA
exports.generateIcons = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 300 }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { theme, styleOption, prompts } = req.body;

  if (!prompts || !Array.isArray(prompts)) {
    return res.status(400).send("Bad Request: prompts array required");
  }

  try {
    const openai = getOpenAI();

    const systemPrompt = `Eres un diseñador experto de iconos SVG.
Genera iconos limpios y profesionales basados en estos comandos o descripciones.

Contexto / Industria: ${theme}
El estilo visual que el usuario desea es: "${styleOption}". Usa esto como dirección de arte.

REGLAS DE DISEÑO ESTRICTAS (Bicolor/Tricolor):
1. Genera SIEMPRE 3 variaciones exactas para cada comando solicitado.
2. No uses colores hex (como #000000 o #FFFFFF). 
3. Para las líneas y trazados principales estáticos, usa EXACTAMENTE \`currentColor\`.
4. Para elementos dinámicos, flechas de acción o partes destacadas, usa EXACTAMENTE \`var(--icon-accent)\`.
5. Para rellenos suaves, sombras, elementos secundarios o fondos de apoyo, usa EXACTAMENTE \`var(--icon-secondary)\`.
6. Grosor de línea: Usa trazos finos y precisos (\`stroke-width="1.5"\` o \`1\`).
7. Bordes y uniones: Usa bordes rectos/cuadrados, NO redondeados. Usa \`stroke-linecap="square"\` y \`stroke-linejoin="miter"\`. Nada de "round".
8. El viewBox DEBE ser "0 0 32 32".
9. El código debe ser SVG puro. No pongas etiquetas XML extra. No pongas markdown. Solo el \`<svg>...</svg>\`.
10. FILTRO DE SEGURIDAD (CRÍTICO): RECHAZA cualquier icono de odio, desnudos, esvásticas, símbolos religiosos o discriminación. Si lo detectas, omítelo de los resultados.

INSTRUCCIONES DE FORMATO DE RESPUESTA:
Debes responder ÚNICAMENTE con un objeto JSON (sin markdown, sin bloques de código) con esta estructura exacta:
{
  "results": [
    { "id": "uuid1", "name": "Name in English", "category": "English Category", "filename": "SHORT_NAME", "description": "Short description in English", "svgCode": "<svg>...</svg>" },
    { "id": "uuid2", "filename": "NOMBRE_CORTO_VAR_2", "description": "Breve desc", "svgCode": "<svg>...</svg>" },
    { "id": "uuid3", "filename": "NOMBRE_CORTO_VAR_3", "description": "Breve desc", "svgCode": "<svg>...</svg>" }
  ]
}`;

    const userPrompt = `Comandos solicitados:\n${prompts.join('\n')}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "deepseek-v4-flash",
      response_format: { type: "json_object" }
    });

    const jsonResult = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error("Error generando iconos:", error);
    return res.status(500).send("Error: " + error.message + " - Stack: " + error.stack);
  }
});

// Endpoint para generar Hatch Patterns (.pat)
exports.generateHatch = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 300 }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const { prompts, theme } = req.body;
  if (!prompts || !Array.isArray(prompts)) return res.status(400).send("Bad Request");

  try {
    const openai = getOpenAI();
    const systemPrompt = `Eres un experto matemático y programador en AutoLISP.
Genera patrones de sombreado (Hatch) de AutoCAD (.pat) basados en estas descripciones.
Contexto: ${theme}

REGLAS DE DISEÑO:
1. El código PAT debe ser válido matemáticamente. Formato: "ángulo, x-origen, y-origen, delta-x, delta-y, dash-1, dash-2".
   - ATENCIÓN CRÍTICA: "delta-x" es el desplazamiento PARALELO a la línea. "delta-y" es el desplazamiento PERPENDICULAR a la línea (separación entre líneas de la familia).
   - ERROR COMÚN A EVITAR: Para líneas verticales (ángulo 90), la separación entre columnas DEBE ir en "delta-y", NO en "delta-x". (Ej. "90, 0,0, 0,41" separa las líneas verticales 41 unidades. Si escribes "90, 0,0, 41,0", todas se dibujan en la misma columna X).
2. Genera exactamente 1 patrón de alta calidad por cada descripción.
3. PRECISIÓN ESTRUCTURAL Y DIMENSIONAL (CRÍTICO): 
   - Respeta escrupulosamente la geometría solicitada (ej. "matajuntas" o "stretcher bond" NO es "herringbone" o "espina de pez").
   - Si el usuario provee medidas (ej. 40x20cm, juntas de 1cm, ángulos), DEBES aplicar la matemática exacta para que las proporciones del Hatch reflejen esas medidas a escala 1:1.
4. TRUCO PARA MATAJUNTAS (STRETCHER BOND): Para ladrillos intercalados, NUNCA uses una cuadrícula continua. Las líneas verticales DEBEN ser segmentadas y desfasadas usando dash y delta-x. Fórmula para bloque LxC (Largo x Alto):
   - Horizontales: "0, 0,0, 0,C"
   - Verticales: "90, 0,0, C,L, C,-C"
5. Formato de salida: JSON con "results" Array: { "id": "uuid", "name": "English Name", "category": "Architecture", "filename": "SHORT_NAME", "description": "Concise description (e.g. 'Stretcher bond 40x20cm blocks with 1cm joints')", "patCode": "0, 0,0..." }. Devuelve SOLO las líneas matemáticas en patCode.
6. FILTRO DE SEGURIDAD (CRÍTICO): RECHAZA símbolos de odio, esvásticas, cruces, etc. Devuelve "results" vacío si detectas esto.`;

    const userPrompt = `Descripciones:\n${prompts.join('\n')}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      model: "deepseek-v4-flash",
      response_format: { type: "json_object" }
    });

    const jsonResult = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error("Error generando hatch:", error);
    return res.status(500).send("Error: " + error.message);
  }
});

// Endpoint para generar Linetypes (.lin)
exports.generateLinetype = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 300 }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const { prompts } = req.body;
  if (!prompts || !Array.isArray(prompts)) return res.status(400).send("Bad Request");

  try {
    const openai = getOpenAI();
    const systemPrompt = `Eres un experto en AutoCAD.
Genera definiciones de tipos de línea complejos (.lin) basados en estas descripciones.

REGLAS DE DISEÑO:
1. El código LIN define la secuencia de pluma: trazo (positivo), espacio (negativo), punto (0), y texto/formas.
2. PRECISIÓN (CRÍTICO): Si el usuario provee medidas o textos, aplícalos de forma exacta en la definición LIN.
3. Formato de salida: Objeto JSON con una propiedad "results" que sea un Array con objetos: { "id": "uuid", "name": "Line Name in English", "category": "Engineering", "filename": "SHORT_NAME", "description": "DETAILED description in English including specs", "linCode": "A,10,-5..." }.
4. Devuelve SOLO la definición de la línea (empieza por A), NO incluyas el asterisco (*Nombre).
5. FILTRO DE SEGURIDAD (CRÍTICO): RECHAZA solicitudes con símbolos de odio, contenido adulto o discriminación devolviendo un "results" vacío.`;

    const userPrompt = `Descripciones:\n${prompts.join('\n')}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      model: "deepseek-v4-flash",
      response_format: { type: "json_object" }
    });

    const jsonResult = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(jsonResult);
  } catch (error) {
    console.error("Error generando linetype:", error);
    return res.status(500).send("Error: " + error.message);
  }
});

// Endpoint para que la paleta embebida en AutoCAD obtenga los favoritos del usuario
// Autenticación por apiKey (token del Loader), sin necesidad de Firebase Auth SDK
exports.getUserResources = onRequest({ cors: true }, async (req, res) => {
  const token = req.query.token || req.query.apiKey;
  const type = req.query.type || 'hatch'; // 'hatch', 'lin', 'icon'

  if (!token) {
    return res.status(400).json({ error: "Token ausente." });
  }

  try {
    const db = getDb();

    // Buscar usuario por apiKey
    const userSnap = await db.collection("users").where("apiKey", "==", token).limit(1).get();
    if (userSnap.empty) {
      return res.status(401).json({ error: "Token inválido." });
    }

    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;

    // Obtener IDs de favoritos del usuario
    const favSnap = await db.collection(`users/${userId}/favorites`).get();
    const favIds = favSnap.docs.map(d => d.id);

    if (favIds.length === 0) {
      return res.status(200).json([]);
    }

    // Obtener los assets públicos que coincidan con los favoritos y el tipo
    const assetsSnap = await db.collection("publicAssets").where("type", "==", type).get();
    const results = assetsSnap.docs
      .filter(d => favIds.includes(d.id))
      .map(d => ({ id: d.id, ...d.data() }));

    res.setHeader("Cache-Control", "public, max-age=30"); // Cache corto para sync rápido
    return res.status(200).json(results);
  } catch (err) {
    console.error("Error en getUserResources:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
});
